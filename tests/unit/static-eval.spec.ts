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

describe('staticEval optional chaining', () => {
  it('accesses a property on a present object', () => {
    expect(evalExpression('({ a: 1 })?.a')).toBe(1);
    expect(evalExpression('({ a: { b: 2 } }).a?.b')).toBe(2);
  });

  it('short-circuits to undefined on a null/undefined base', () => {
    expect(evalExpression('undefined?.foo')).toBeUndefined();
    expect(evalExpression('null?.foo')).toBeUndefined();
    // `.constraints` is missing (undefined), so `?.length` short-circuits instead of throwing.
    expect(evalExpression('({}).missing?.length')).toBeUndefined();
  });

  it('handles optional element access', () => {
    expect(evalExpression('[10, 20, 30]?.[1]')).toBe(20);
    expect(evalExpression('undefined?.[0]')).toBeUndefined();
  });

  it('handles optional calls', () => {
    expect(evalExpression('((x) => x + 1)?.(5)')).toBe(6);
    expect(evalExpression('undefined?.()')).toBeUndefined();
  });

  it('supports the models/index.ts pattern (`x?.length || y`)', () => {
    const project = new Project({ useInMemoryFileSystem: true });
    project.createSourceFile(
      'm.ts',
      `
      const model = { name: 'Admin' };
      export const value = (model.constraints?.length || model.name) ? 'yes' : 'no';
    `,
      { overwrite: true },
    );
    const declaration = project
      .getSourceFileOrThrow('m.ts')
      .getVariableDeclarationOrThrow('value')
      .getInitializerOrThrow();
    expect(staticEval(declaration, {})).toBe('yes');
  });
});

describe('staticEval additional operators', () => {
  it('evaluates the `in` operator', () => {
    expect(evalExpression("'a' in { a: 1 }")).toBe(true);
    expect(evalExpression("'b' in { a: 1 }")).toBe(false);
  });

  it('evaluates the `instanceof` operator', () => {
    expect(evalExpression('[] instanceof Array')).toBe(true);
    expect(evalExpression('new Date() instanceof Date')).toBe(true);
    expect(evalExpression('({}) instanceof Array')).toBe(false);
  });

  it('evaluates bitwise operators', () => {
    expect(evalExpression('5 & 3')).toBe(1);
    expect(evalExpression('5 | 2')).toBe(7);
    expect(evalExpression('5 ^ 1')).toBe(4);
    expect(evalExpression('1 << 4')).toBe(16);
    expect(evalExpression('16 >> 2')).toBe(4);
    expect(evalExpression('-1 >>> 28')).toBe(15);
  });
});
