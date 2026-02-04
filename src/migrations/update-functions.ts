import { Knex } from 'knex';
import { ParsedFunction, parseFunctionsFile } from './parse-functions';

type DatabaseFunction = {
  name: string;
  signature: string;
  body: string;
  isAggregate: boolean;
  definition?: string;
};

const normalizeFunctionBody = (body: string): string => {
  return body
    .replace(/\s+/g, ' ')
    .replace(/\s*\(\s*/g, '(')
    .replace(/\s*\)\s*/g, ')')
    .replace(/\s*,\s*/g, ',')
    .trim();
};

const extractFunctionBody = (definition: string): string => {
  const dollarQuoteMatch = definition.match(/AS\s+\$([^$]*)\$([\s\S]*?)\$\1\$/i);
  if (dollarQuoteMatch) {
    return dollarQuoteMatch[2].trim();
  }

  const bodyMatch = definition.match(/AS\s+\$\$([\s\S]*?)\$\$/i) || definition.match(/AS\s+['"]([\s\S]*?)['"]/i);
  if (bodyMatch) {
    return bodyMatch[1].trim();
  }

  return definition;
};

const getDatabaseFunctions = async (knex: Knex): Promise<DatabaseFunction[]> => {
  const regularFunctions = await knex.raw(`
    SELECT 
      p.proname as name,
      pg_get_function_identity_arguments(p.oid) as arguments,
      pg_get_functiondef(p.oid) as definition,
      false as is_aggregate
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
    AND NOT EXISTS (SELECT 1 FROM pg_aggregate a WHERE a.aggfnoid = p.oid)
    ORDER BY p.proname, pg_get_function_identity_arguments(p.oid)
  `);

  const aggregateFunctions = await knex.raw(`
    SELECT 
      p.proname as name,
      pg_get_function_identity_arguments(p.oid) as arguments,
      a.aggtransfn::regproc::text as trans_func,
      a.aggfinalfn::regproc::text as final_func,
      a.agginitval as init_val,
      pg_catalog.format_type(a.aggtranstype, NULL) as state_type,
      true as is_aggregate
    FROM pg_proc p
    JOIN pg_aggregate a ON p.oid = a.aggfnoid
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
    ORDER BY p.proname, pg_get_function_identity_arguments(p.oid)
  `);

  const result: DatabaseFunction[] = [];

  for (const row of regularFunctions.rows || []) {
    const definition = row.definition || '';
    const name = row.name || '';
    const argumentsStr = row.arguments || '';

    if (!definition) {
      continue;
    }

    const signature = `${name}(${argumentsStr})`;
    const body = normalizeFunctionBody(extractFunctionBody(definition));

    result.push({
      name,
      signature,
      body,
      isAggregate: false,
      definition,
    });
  }

  for (const row of aggregateFunctions.rows || []) {
    const name = row.name || '';
    const argumentsStr = row.arguments || '';
    const transFunc = row.trans_func || '';
    const finalFunc = row.final_func || '';
    const initVal = row.init_val;
    const stateType = row.state_type || '';

    const signature = `${name}(${argumentsStr})`;

    let aggregateDef = `CREATE AGGREGATE ${name}(${argumentsStr}) (`;
    aggregateDef += `SFUNC = ${transFunc}, STYPE = ${stateType}`;

    if (finalFunc) {
      aggregateDef += `, FINALFUNC = ${finalFunc}`;
    }

    if (initVal !== null && initVal !== undefined) {
      const initValStr = typeof initVal === 'string' ? `'${initVal}'` : String(initVal);
      aggregateDef += `, INITCOND = ${initValStr}`;
    }

    aggregateDef += ');';

    result.push({
      name,
      signature,
      body: normalizeFunctionBody(aggregateDef),
      isAggregate: true,
      definition: aggregateDef,
    });
  }

  return result;
};

const compareFunctions = (defined: ParsedFunction, db: DatabaseFunction): { changed: boolean; diff?: string } => {
  const definedBody = normalizeFunctionBody(defined.body);
  const dbBody = normalizeFunctionBody(db.body);

  if (definedBody !== dbBody) {
    const definedPreview = definedBody.length > 200 ? `${definedBody.substring(0, 200)}...` : definedBody;
    const dbPreview = dbBody.length > 200 ? `${dbBody.substring(0, 200)}...` : dbBody;
    return {
      changed: true,
      diff: `Definition changed:\n  File: ${definedPreview}\n  DB:   ${dbPreview}`,
    };
  }
  return { changed: false };
};

export const updateFunctions = async (knex: Knex, functionsFilePath: string): Promise<void> => {
  const definedFunctions = parseFunctionsFile(functionsFilePath);

  if (definedFunctions.length === 0) {
    console.log('No functions found in functions.sql file.');
    return;
  }

  const dbFunctions = await getDatabaseFunctions(knex);
  const dbFunctionsBySignature = new Map<string, DatabaseFunction>();
  for (const func of dbFunctions) {
    dbFunctionsBySignature.set(func.signature, func);
  }

  console.log(`Found ${definedFunctions.length} function(s) in file, ${dbFunctions.length} function(s) in database.`);

  let updatedCount = 0;
  let skippedCount = 0;

  for (const definedFunc of definedFunctions) {
    const dbFunc = dbFunctionsBySignature.get(definedFunc.signature);

    if (!dbFunc) {
      try {
        await knex.raw(definedFunc.fullDefinition);
        console.log(`✓ Created ${definedFunc.isAggregate ? 'aggregate' : 'function'}: ${definedFunc.signature}`);
        updatedCount++;
      } catch (error: any) {
        console.error(
          `✗ Failed to create ${definedFunc.isAggregate ? 'aggregate' : 'function'} ${definedFunc.signature}:`,
          error.message,
        );
        throw error;
      }
    } else {
      const comparison = compareFunctions(definedFunc, dbFunc);
      if (comparison.changed) {
        console.log(`\n⚠ ${definedFunc.isAggregate ? 'Aggregate' : 'Function'} ${definedFunc.signature} has changes:`);
        if (comparison.diff) {
          console.log(comparison.diff);
        }
        try {
          if (definedFunc.isAggregate) {
            const dropMatch = definedFunc.fullDefinition.match(/CREATE\s+(OR\s+REPLACE\s+)?AGGREGATE\s+([^(]+)\(/i);
            if (dropMatch) {
              const functionName = dropMatch[2].trim();
              const argsMatch = definedFunc.fullDefinition.match(/CREATE\s+(OR\s+REPLACE\s+)?AGGREGATE\s+[^(]+\(([^)]*)\)/i);
              const args = argsMatch ? argsMatch[2].trim() : '';
              await knex.raw(`DROP AGGREGATE IF EXISTS ${functionName}${args ? `(${args})` : ''}`);
            }
          }
          await knex.raw(definedFunc.fullDefinition);
          console.log(`✓ Updated ${definedFunc.isAggregate ? 'aggregate' : 'function'}: ${definedFunc.signature}\n`);
          updatedCount++;
        } catch (error: any) {
          console.error(
            `✗ Failed to update ${definedFunc.isAggregate ? 'aggregate' : 'function'} ${definedFunc.signature}:`,
            error.message,
          );
          throw error;
        }
      } else {
        console.log(`○ Skipped ${definedFunc.isAggregate ? 'aggregate' : 'function'} (unchanged): ${definedFunc.signature}`);
        skippedCount++;
      }
    }
  }

  console.log(`\nSummary: ${updatedCount} updated, ${skippedCount} skipped`);
  if (updatedCount > 0) {
    console.log('Functions updated successfully.');
  } else {
    console.log('All functions are up to date.');
  }
};
