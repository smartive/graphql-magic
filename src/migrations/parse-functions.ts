import { existsSync, readFileSync } from 'fs';

export type ParsedFunction = {
  name: string;
  signature: string;
  body: string;
  fullDefinition: string;
  isAggregate: boolean;
};

const normalizeFunctionBody = (body: string): string => {
  return body
    .replace(/\s+/g, ' ')
    .replace(/\s*\(\s*/g, '(')
    .replace(/\s*\)\s*/g, ')')
    .replace(/\s*,\s*/g, ',')
    .trim();
};

const normalizeAggregateDefinition = (definition: string): string => {
  let normalized = definition
    .replace(/\s+/g, ' ')
    .replace(/\s*\(\s*/g, '(')
    .replace(/\s*\)\s*/g, ')')
    .replace(/\s*,\s*/g, ',')
    .trim();

  const initCondMatch = normalized.match(/INITCOND\s*=\s*([^,)]+)/i);
  if (initCondMatch) {
    const initCondValue = initCondMatch[1].trim();
    const unquoted = initCondValue.replace(/^['"]|['"]$/g, '');
    if (/^\d+$/.test(unquoted)) {
      normalized = normalized.replace(/INITCOND\s*=\s*[^,)]+/i, `INITCOND = '${unquoted}'`);
    }
  }

  return normalized;
};

const extractFunctionSignature = (definition: string, isAggregate: boolean): string | null => {
  if (isAggregate) {
    const createMatch = definition.match(/CREATE\s+(OR\s+REPLACE\s+)?AGGREGATE\s+([^(]+)\(/i);
    if (!createMatch) {
      return null;
    }

    const functionNamePart = createMatch[2].trim().replace(/^[^.]+\./, '');
    const argsMatch = definition.match(/CREATE\s+(OR\s+REPLACE\s+)?AGGREGATE\s+[^(]+\(([^)]*)\)/i);
    const args = argsMatch ? argsMatch[2].trim() : '';

    return `${functionNamePart}(${args})`;
  }

  const createMatch = definition.match(/CREATE\s+(OR\s+REPLACE\s+)?FUNCTION\s+([^(]+)\(/i);
  if (!createMatch) {
    return null;
  }

  const functionNamePart = createMatch[2].trim().replace(/^[^.]+\./, '');
  const fullArgsMatch = definition.match(
    /CREATE\s+(OR\s+REPLACE\s+)?FUNCTION\s+[^(]+\(([\s\S]*?)\)\s*(RETURNS|LANGUAGE|AS|STRICT|IMMUTABLE|STABLE|VOLATILE|SECURITY)/i,
  );

  if (!fullArgsMatch) {
    return null;
  }

  const argsSection = fullArgsMatch[2].trim();
  const args = argsSection
    .split(',')
    .map((arg) => {
      const trimmed = arg.trim();
      const typeMatch = trimmed.match(/(\w+)\s+(\w+(?:\s*\[\])?)/);
      if (typeMatch) {
        return `${typeMatch[1]} ${typeMatch[2]}`;
      }

      return trimmed;
    })
    .join(', ');

  return `${functionNamePart}(${args})`;
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

export const parseFunctionsFile = (filePath: string): ParsedFunction[] => {
  if (!existsSync(filePath)) {
    return [];
  }

  const content = readFileSync(filePath, 'utf-8');
  const functions: ParsedFunction[] = [];

  const functionRegex =
    /CREATE\s+(OR\s+REPLACE\s+)?(FUNCTION|AGGREGATE)\s+[\s\S]*?(?=CREATE\s+(OR\s+REPLACE\s+)?(FUNCTION|AGGREGATE)|$)/gi;
  let match;
  let lastIndex = 0;

  while ((match = functionRegex.exec(content)) !== null) {
    if (match.index < lastIndex) {
      continue;
    }
    lastIndex = match.index + match[0].length;

    const definition = match[0].trim();
    const isAggregate = /CREATE\s+(OR\s+REPLACE\s+)?AGGREGATE/i.test(definition);
    const signature = extractFunctionSignature(definition, isAggregate);

    if (!signature) {
      continue;
    }

    const nameMatch = signature.match(/^([^(]+)\(/);
    const name = nameMatch ? nameMatch[1].trim().split('.').pop() || '' : '';
    const body = isAggregate ? definition : extractFunctionBody(definition);

    functions.push({
      name,
      signature,
      body: isAggregate ? normalizeAggregateDefinition(body) : normalizeFunctionBody(body),
      fullDefinition: definition,
      isAggregate,
    });
  }

  return functions;
};
