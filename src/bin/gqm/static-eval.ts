import { camelCase, Dictionary, kebabCase, lowerFirst, snakeCase, startCase, upperFirst } from 'lodash';
import {
  BindingElement,
  CaseClause,
  ElementAccessExpression,
  Identifier,
  ImportSpecifier,
  Node,
  ObjectLiteralExpression,
  PrefixUnaryExpression,
  ShorthandPropertyAssignment,
  StringLiteral,
  SyntaxKind,
  TemplateExpression,
  TemplateTail,
  ts,
} from 'ts-morph';
import { Models } from '../../models/models';
import { visit, Visitor } from './visitor';

const KNOWN_IDENTIFIERS: Record<string, unknown> = {
  undefined,
  process,
  Symbol,
  Models,
  Object,
  Array,
  Boolean,
  Number,
  String,
  Function,
  Promise,
  Map,
  Set,
  WeakMap,
  WeakSet,
  Date,
  RegExp,
  Error,
  upperFirst,
  lowerFirst,
  camelCase,
  kebabCase,
  snakeCase,
  startCase,
};

export const staticEval = (node: Node | undefined, context: Dictionary<unknown>) =>
  visit<unknown, Dictionary<unknown>>(node, context, VISITOR);

const VISITOR: Visitor<unknown, Dictionary<unknown>> = {
  undefined: () => undefined,
  [SyntaxKind.BindingElement]: (node: BindingElement, context) => context[node.getName()],
  [SyntaxKind.VariableDeclaration]: (node, context) => staticEval(node.getInitializer(), context),
  [SyntaxKind.ArrayLiteralExpression]: (node, context) => {
    const values: unknown[] = [];
    for (const value of node.getElements()) {
      if (value.isKind(SyntaxKind.SpreadElement)) {
        values.push(...(staticEval(value, context) as unknown[]));
      } else {
        values.push(staticEval(value, context));
      }
    }
    return values;
  },
  [SyntaxKind.ObjectLiteralExpression]: (node: ObjectLiteralExpression, context) => {
    const result: Dictionary<unknown> = {};
    for (const property of node.getProperties()) {
      Object.assign(result, staticEval(property, context));
    }
    return result;
  },
  [SyntaxKind.StringLiteral]: (node) => node.getLiteralValue(),
  [SyntaxKind.PropertyAssignment]: (node, context) => ({
    [node.getName()]: staticEval(node.getInitializer(), context),
  }),
  [SyntaxKind.ShorthandPropertyAssignment]: (node: ShorthandPropertyAssignment, context) => ({
    [node.getName()]: staticEval(node.getNameNode(), context),
  }),
  [SyntaxKind.SpreadElement]: (node, context) => staticEval(node.getExpression(), context),
  [SyntaxKind.SpreadAssignment]: (node, context) => staticEval(node.getExpression(), context),
  [SyntaxKind.ImportSpecifier]: (node: ImportSpecifier, context) => {
    const nameNode = node.getNameNode();
    const name = nameNode.getText();

    if (name in KNOWN_IDENTIFIERS) {
      return KNOWN_IDENTIFIERS[name];
    }

    if (nameNode instanceof StringLiteral) {
      throw new Error(`Cannot handle computed import specifier: ${name}. Only static imports are supported.`);
    }

    const definitions = nameNode.getDefinitionNodes();
    // Filter out the node itself to prevent infinite recursion
    // We compare compilerNode references to handle distinct ts-morph wrapper instances
    let externalDefinition = definitions.find((d) => d.compilerNode !== node.compilerNode);

    // Fallback: If definition navigation fails (e.g. path aliases), try resolving module manually
    if (!externalDefinition) {
      const importDeclaration = node.getImportDeclaration();
      let sourceFile = importDeclaration.getModuleSpecifierSourceFile();

      // If ts-morph failed to find the file (common with aliases without project config), try manual lookup
      if (!sourceFile) {
        const moduleSpecifier = importDeclaration.getModuleSpecifierValue();
        const project = node.getProject();

        if (moduleSpecifier.startsWith('@/')) {
          const suffix = moduleSpecifier.substring(2);

          // 1. Check if the file is already loaded in the project
          sourceFile = project.getSourceFiles().find((sf) => {
            const filePath = sf.getFilePath();
            // Check for direct match or index file
            return (
              filePath.endsWith(`/${suffix}.ts`) ||
              filePath.endsWith(`/${suffix}.tsx`) ||
              filePath.endsWith(`/${suffix}/index.ts`) ||
              filePath.endsWith(`/${suffix}/index.tsx`)
            );
          });

          // 2. If not loaded, try to find and add it from disk (heuristic: @/ -> src/)
          if (!sourceFile) {
            const candidates = [
              `src/${suffix}.ts`,
              `src/${suffix}.tsx`,
              `src/${suffix}/index.ts`,
              `src/${suffix}/index.tsx`,
            ];

            for (const candidate of candidates) {
              try {
                // addSourceFileAtPathIfExists resolves relative to CWD
                const added = project.addSourceFileAtPathIfExists(candidate);
                if (added) {
                  sourceFile = added;
                  break;
                }
              } catch {
                // Ignore load errors
              }
            }
          }
        }
      }

      if (sourceFile) {
        // Use property path if aliased (import { RealName as Alias }), otherwise name
        // The import specifier is { propertyName as name }
        // If propertyName is undefined, then propertyName is name
        // We want the original propertyName to look up exports
        const localName = node.getName();
        const propertyName = node.compilerNode.propertyName?.getText();
        const exportedName = propertyName ?? localName;

        const exportedDeclarations = sourceFile.getExportedDeclarations();
        const declarations = exportedDeclarations.get(exportedName);
        const declaration = declarations?.[0];

        if (declaration) {
          externalDefinition = declaration;
        }
      }
    }

    // Handle re-exports: if the definition is another ImportSpecifier (in a different file), recurse
    if (externalDefinition && externalDefinition.getKind() === SyntaxKind.ImportSpecifier) {
      return staticEval(externalDefinition, context);
    }

    if (!externalDefinition) {
      const importDeclaration = node.getImportDeclaration();
      throw new Error(
        `No definition node found for import specifier '${name}' imported from '${importDeclaration.getModuleSpecifierValue()}'.`,
      );
    }

    return staticEval(externalDefinition, context);
  },
  [SyntaxKind.Identifier]: (node: Identifier, context) => {
    const identifierName = node.getText();
    if (identifierName in KNOWN_IDENTIFIERS) {
      return KNOWN_IDENTIFIERS[identifierName];
    }
    const definitionNodes = node.getDefinitionNodes();
    if (!definitionNodes.length) {
      throw new Error(`No definition node found for identifier ${node.getText()}.`);
    }
    return staticEval(definitionNodes[0], context);
  },
  [SyntaxKind.ParenthesizedExpression]: (node, context) => staticEval(node.getExpression(), context),
  [SyntaxKind.AsExpression]: (node, context) => staticEval(node.getExpression(), context),
  [SyntaxKind.ConditionalExpression]: (node, context) =>
    staticEval(node.getCondition(), context)
      ? staticEval(node.getWhenTrue(), context)
      : staticEval(node.getWhenFalse(), context),
  [SyntaxKind.TrueKeyword]: () => true,
  [SyntaxKind.FalseKeyword]: () => false,
  [SyntaxKind.NumericLiteral]: (node) => node.getLiteralValue(),
  [SyntaxKind.BigIntLiteral]: (node) => node.getLiteralValue(),
  [SyntaxKind.CallExpression]: (node, context) => {
    const method = staticEval(node.getExpression(), context) as (...args: unknown[]) => unknown;
    const args = node.getArguments().map((arg) => staticEval(arg, context));
    return method(...args);
  },
  [SyntaxKind.PropertyAccessExpression]: (node, context) => {
    const target = staticEval(node.getExpression(), context);
    const property = target[node.getName()];
    if (typeof property === 'function') {
      if (Array.isArray(target)) {
        switch (node.getName()) {
          case 'map':
          case 'flatMap':
          case 'includes':
          case 'some':
          case 'find':
          case 'filter':
            return target[node.getName()].bind(target);
        }
      } else if (typeof target === 'string') {
        const name = node.getName() as keyof string;
        switch (name) {
          case 'slice':
          case 'toUpperCase':
          case 'toLowerCase':
            return target[name].bind(target);
        }
      } else if (typeof target === 'function') {
        const name = node.getName();
        if (target === Object) {
          switch (name) {
            case 'keys':
            case 'values':
            case 'entries':
            case 'assign':
            case 'hasOwnProperty':
              return target[name].bind(target);
          }
        }
      }
      throw new Error(`Cannot handle method ${node.getName()} on type ${typeof target}`);
    }

    return property;
  },
  [SyntaxKind.ArrowFunction]: (node, context) => {
    return (...args: unknown[]) => {
      const parameters: Dictionary<unknown> = {};
      let i = 0;
      for (const parameter of node.getParameters()) {
        const argument = args[i];

        if (parameter.isRestParameter()) {
          parameters[parameter.getName()] = args.slice(i);
        } else {
          const nameNode = parameter.getNameNode();
          if (Node.isObjectBindingPattern(nameNode)) {
            const value = (argument ?? {}) as Dictionary<unknown>;
            const usedKeys = new Set<string>();

            for (const element of nameNode.getElements()) {
              if (element.getDotDotDotToken()) {
                // Handle rest element (...args)
                const restName = element.getName();
                const restValue: Dictionary<unknown> = {};
                for (const key in value) {
                  if (!usedKeys.has(key)) {
                    restValue[key] = value[key];
                  }
                }
                parameters[restName] = restValue;
              } else {
                // Handle property destructuring (prop: alias = defaultValue)
                const propertyNameNode = element.getPropertyNameNode();
                const elementDetails = element.getNameNode();

                // If "prop: alias", key is "prop". If just "alias", key is "alias".
                const key = propertyNameNode ? propertyNameNode.getText() : elementDetails.getText();
                const variableName = elementDetails.getText();

                usedKeys.add(key);

                let propertyValue = value[key];

                // Handle default values (= defaultValue)
                if (propertyValue === undefined && element.hasInitializer()) {
                  propertyValue = staticEval(element.getInitializer(), { ...context, ...parameters });
                }

                parameters[variableName] = propertyValue;
              }
            }
          } else {
            parameters[parameter.getName()] = argument;
          }
        }
        i++;
      }
      return staticEval(node.getBody(), { ...context, ...parameters });
    };
  },
  [SyntaxKind.Block]: (node, context) => {
    for (const statement of node.getStatements()) {
      return staticEval(statement, context);
    }
  },
  [SyntaxKind.CaseClause]: (node, context) => {
    const statements = node.getStatements();
    if (statements.length !== 1) {
      console.error(node.getText());
      throw new Error(`Can only handle code blocks with 1 statement.`);
    }
    return staticEval(statements[0], context);
  },
  [SyntaxKind.DefaultClause]: (node, context) => {
    const statements = node.getStatements();
    if (statements.length !== 1) {
      console.error(node.getText());
      throw new Error(`Can only handle code blocks with exactly 1 statement.`);
    }
    return staticEval(statements[0], context);
  },
  [SyntaxKind.ReturnStatement]: (node, context) => {
    return staticEval(node.getExpression(), context);
  },
  [SyntaxKind.SwitchStatement]: (node, context) => {
    const value = staticEval(node.getExpression(), context);
    let active = false;
    for (const clause of node.getCaseBlock().getClauses()) {
      switch (clause.getKind()) {
        case SyntaxKind.DefaultClause:
          return staticEval(clause, context);
        case SyntaxKind.CaseClause: {
          const caseClause: CaseClause = clause.asKindOrThrow(SyntaxKind.CaseClause);
          if (caseClause.getStatements().length && active) {
            return staticEval(clause, context);
          }
          const caseValue = staticEval(caseClause.getExpression(), context);
          if (value === caseValue) {
            active = true;
            if (caseClause.getStatements().length) {
              return staticEval(clause, context);
            }
          }
        }
      }
    }
  },
  [SyntaxKind.Parameter]: (node, context) => context[node.getName()],
  [SyntaxKind.BinaryExpression]: (node, context) => {
    const mapping: Partial<Record<ts.BinaryOperator, (left: unknown, right: () => unknown) => unknown>> = {
      [SyntaxKind.EqualsEqualsEqualsToken]: (left: unknown, right: () => unknown) => left === right(),
      [SyntaxKind.ExclamationEqualsEqualsToken]: (left: unknown, right: () => unknown) => left !== right(),
      [SyntaxKind.BarBarToken]: (left: unknown, right: () => unknown) => left || right(),
      [SyntaxKind.AmpersandAmpersandToken]: (left: unknown, right: () => unknown) => left && right(),
      [SyntaxKind.EqualsEqualsToken]: (left: unknown, right: () => unknown) => left == right(),
      [SyntaxKind.ExclamationEqualsToken]: (left: unknown, right: () => unknown) => left != right(),
      [SyntaxKind.QuestionQuestionToken]: (left: unknown, right: () => unknown) => left ?? right(),
    };
    if (node.getOperatorToken().getKind() in mapping) {
      return mapping[node.getOperatorToken().getKind()](staticEval(node.getLeft(), context), () =>
        staticEval(node.getRight(), context),
      );
    }

    throw new Error(`Cannot handle operator of kind ${node.getOperatorToken().getKindName()}`);
  },
  [SyntaxKind.SatisfiesExpression]: (node, context) => staticEval(node.getExpression(), context),
  [SyntaxKind.TemplateExpression]: (node: TemplateExpression, context) =>
    node.getHead().getLiteralText() +
    node
      .getTemplateSpans()
      .map((span) => (staticEval(span.getExpression(), context) as string) + staticEval(span.getLiteral(), context))
      .join(''),
  [SyntaxKind.TemplateTail]: (node: TemplateTail) => node.getLiteralText(),
  [SyntaxKind.TemplateMiddle]: (node) => node.getLiteralText(),
  [SyntaxKind.PrefixUnaryExpression]: (node: PrefixUnaryExpression, context) => {
    switch (node.getOperatorToken()) {
      case SyntaxKind.PlusToken:
        return +staticEval(node.getOperand(), context);
      case SyntaxKind.MinusToken:
        return -staticEval(node.getOperand(), context);
      case SyntaxKind.TildeToken:
        return ~staticEval(node.getOperand(), context);
      case SyntaxKind.ExclamationToken:
        return !staticEval(node.getOperand(), context);
      case SyntaxKind.PlusPlusToken:
      case SyntaxKind.MinusMinusToken:
        throw new Error(`Cannot handle assignments.`);
    }
  },
  [SyntaxKind.ElementAccessExpression]: (node: ElementAccessExpression, context) => {
    const target = staticEval(node.getExpression(), context);
    const argument = staticEval(node.getArgumentExpression(), context) as string;
    return target[argument];
  },
  [SyntaxKind.NoSubstitutionTemplateLiteral]: (node) => node.getLiteralValue(),
  [SyntaxKind.NullKeyword]: () => null,
  [SyntaxKind.NewExpression]: (node, context) =>
    new (staticEval(node.getExpression(), context))(...node.getArguments().map((arg) => staticEval(arg, context))),
  [SyntaxKind.TypeOfExpression]: (node, context) => typeof staticEval(node.getExpression(), context),
};
