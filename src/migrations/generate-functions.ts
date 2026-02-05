import { Knex } from 'knex';

export const generateFunctionsFromDatabase = async (knex: Knex): Promise<string> => {
  const regularFunctions = await knex.raw(`
    SELECT 
      pg_get_functiondef(p.oid) as definition
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
      pg_catalog.format_type(a.aggtranstype, NULL) as state_type
    FROM pg_proc p
    JOIN pg_aggregate a ON p.oid = a.aggfnoid
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
    ORDER BY p.proname, pg_get_function_identity_arguments(p.oid)
  `);

  const functions: string[] = [];

  for (const row of regularFunctions.rows || []) {
    if (row.definition) {
      functions.push(row.definition.trim());
    }
  }

  for (const row of aggregateFunctions.rows || []) {
    const name = row.name || '';
    const argumentsStr = row.arguments || '';
    const transFunc = row.trans_func || '';
    const finalFunc = row.final_func || '';
    const initVal = row.init_val;
    const stateType = row.state_type || '';

    if (!name || !transFunc || !stateType) {
      continue;
    }

    let aggregateDef = `CREATE AGGREGATE ${name}(${argumentsStr}) (\n`;
    aggregateDef += `  SFUNC = ${transFunc},\n`;
    aggregateDef += `  STYPE = ${stateType}`;

    if (finalFunc) {
      aggregateDef += `,\n  FINALFUNC = ${finalFunc}`;
    }

    if (initVal !== null && initVal !== undefined) {
      const initValStr = typeof initVal === 'string' ? `'${initVal}'` : String(initVal);
      aggregateDef += `,\n  INITCOND = ${initValStr}`;
    }

    aggregateDef += '\n);';

    functions.push(aggregateDef);
  }

  if (functions.length === 0) {
    return `export const functions: string[] = [];\n`;
  }

  const functionsArrayString = functions.map((func) => `  ${JSON.stringify(func)}`).join(',\n');

  return `export const functions: string[] = [\n${functionsArrayString},\n];\n`;
};
