import { Project } from 'ts-morph';
import { staticEval } from '../../src/bin/gqm/static-eval';

const evalExpression = (expression: string) => {
  const project = new Project({ useInMemoryFileSystem: true });
  const sourceFile = project.createSourceFile('eval.ts', `const value = ${expression};`, {
    overwrite: true,
  });
  const declaration = sourceFile.getVariableDeclarationOrThrow('value');
  return staticEval(declaration.getInitializer(), {});
};

describe('staticEval arithmetic', () => {
  it('evaluates multiplication', () => {
    expect(evalExpression('30 * 60 * 1000')).toBe(1_800_000);
  });

  it('evaluates numeric separators in literals', () => {
    expect(evalExpression('30_000')).toBe(30_000);
  });

  it('evaluates addition, subtraction, division, modulo, and exponentiation', () => {
    expect(evalExpression('1 + 2')).toBe(3);
    expect(evalExpression('10 - 3')).toBe(7);
    expect(evalExpression('20 / 4')).toBe(5);
    expect(evalExpression('10 % 3')).toBe(1);
    expect(evalExpression('2 ** 10')).toBe(1024);
  });

  it('evaluates comparison operators', () => {
    expect(evalExpression('3 > 2')).toBe(true);
    expect(evalExpression('2 >= 2')).toBe(true);
    expect(evalExpression('1 < 2')).toBe(true);
    expect(evalExpression('2 <= 1')).toBe(false);
  });

  it('evaluates knexfile-style pool timeout expressions', () => {
    const project = new Project({ useInMemoryFileSystem: true });
    project.createSourceFile(
      'knexfile.ts',
      `
      const POOL_IDLE_TIMEOUT_MS = 30_000;
      const POOL_MAX_CONNECTION_LIFETIME_MS = 30 * 60 * 1000;
      export const knexConfig = {
        pool: {
          idleTimeoutMillis: POOL_IDLE_TIMEOUT_MS,
          maxConnectionLifetimeMillis: POOL_MAX_CONNECTION_LIFETIME_MS,
        },
      };
    `,
      { overwrite: true },
    );

    const configDeclaration = project
      .getSourceFileOrThrow('knexfile.ts')
      .getVariableDeclarationOrThrow('knexConfig')
      .getInitializerOrThrow();

    expect(staticEval(configDeclaration, {})).toEqual({
      pool: {
        idleTimeoutMillis: 30_000,
        maxConnectionLifetimeMillis: 1_800_000,
      },
    });
  });
});
