import { existsSync } from 'fs';
import { IndentationText, Project } from 'ts-morph';
import { staticEval } from '../bin/gqm/static-eval';
import { findDeclarationInFile } from '../bin/gqm/utils';

export type ParsedFunction = {
  name: string;
  signature: string;
  body: string;
  fullDefinition: string;
  isAggregate: boolean;
};

const normalizeWhitespace = (str: string): string => {
  return str
    .replace(/\s+/g, ' ')
    .replace(/\s*\(\s*/g, '(')
    .replace(/\s*\)\s*/g, ')')
    .replace(/\s*,\s*/g, ',')
    .replace(/\s*;\s*/g, ';')
    .trim();
};

const normalizeFunctionBody = (body: string): string => {
  return normalizeWhitespace(body);
};

const normalizeAggregateDefinition = (definition: string): string => {
  let normalized = normalizeWhitespace(definition);

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
    .split(/\s*,\s*/)
    .map((arg) => {
      return arg.trim().replace(/\s+/g, ' ');
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

  const project = new Project({
    manipulationSettings: {
      indentationText: IndentationText.TwoSpaces,
    },
  });
  const sourceFile = project.addSourceFileAtPath(filePath);

  try {
    const functionsDeclaration = findDeclarationInFile(sourceFile, 'functions');
    const functionsArray = staticEval(functionsDeclaration, {}) as string[];

    if (!Array.isArray(functionsArray)) {
      return [];
    }

    const parsedFunctions: ParsedFunction[] = [];

    for (const definition of functionsArray) {
      if (!definition || typeof definition !== 'string') {
        continue;
      }

      const trimmedDefinition = definition.trim();
      const isAggregate = /CREATE\s+(OR\s+REPLACE\s+)?AGGREGATE/i.test(trimmedDefinition);
      const signature = extractFunctionSignature(trimmedDefinition, isAggregate);

      if (!signature) {
        continue;
      }

      const nameMatch = signature.match(/^([^(]+)\(/);
      const name = nameMatch ? nameMatch[1].trim().split('.').pop() || '' : '';
      const body = isAggregate ? trimmedDefinition : extractFunctionBody(trimmedDefinition);

      parsedFunctions.push({
        name,
        signature,
        body: isAggregate ? normalizeAggregateDefinition(body) : normalizeFunctionBody(body),
        fullDefinition: trimmedDefinition,
        isAggregate,
      });
    }

    return parsedFunctions;
  } catch (error) {
    return [];
  }
};
