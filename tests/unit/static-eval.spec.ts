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
    const declaration = project.getSourceFileOrThrow('m.ts').getVariableDeclarationOrThrow('value').getInitializerOrThrow();
    expect(staticEval(declaration, {})).toBe('yes');
  });
});

describe('staticEval array methods', () => {
  it('joins an array into a string', () => {
    expect(evalExpression("['a', 'b', 'c'].join('_')")).toBe('a_b_c');
    expect(evalExpression("['a', 'b'].join()")).toBe('a,b');
  });

  it('joins a mapped array (the derived-name pattern)', () => {
    expect(evalExpression("['providerId', 'fileId'].map((f) => f).join('_')")).toBe('providerId_fileId');
  });

  it('slices and concatenates arrays', () => {
    expect(evalExpression('[1, 2, 3, 4].slice(1, 3)')).toEqual([2, 3]);
    expect(evalExpression('[1, 2].concat([3, 4])')).toEqual([1, 2, 3, 4]);
  });

  it('reduces, sorts, flattens and indexes', () => {
    expect(evalExpression('[1, 2, 3, 4].reduce((a, b) => a + b, 0)')).toBe(10);
    expect(evalExpression("['b', 'a', 'c'].sort()")).toEqual(['a', 'b', 'c']);
    expect(evalExpression('[[1], [2, 3]].flat()')).toEqual([1, 2, 3]);
    expect(evalExpression("['a', 'b', 'c'].at(-1)")).toBe('c');
    expect(evalExpression("['a', 'b', 'c'].indexOf('b')")).toBe(1);
    expect(evalExpression('[1, 2, 3].every((n) => n > 0)')).toBe(true);
    expect(evalExpression('[1, 2, 3].findIndex((n) => n === 2)')).toBe(1);
  });
});

describe('staticEval string methods', () => {
  it('splits, trims and changes case', () => {
    expect(evalExpression("'a_b_c'.split('_')")).toEqual(['a', 'b', 'c']);
    expect(evalExpression("'  padded  '.trim()")).toBe('padded');
    expect(evalExpression("'a-b-c'.replaceAll('-', '_')")).toBe('a_b_c');
  });

  it('tests, pads and slices', () => {
    expect(evalExpression("'fileId'.startsWith('file')")).toBe(true);
    expect(evalExpression("'fileId'.endsWith('Id')")).toBe(true);
    expect(evalExpression("'7'.padStart(3, '0')")).toBe('007');
    expect(evalExpression("'hello'.includes('ell')")).toBe(true);
    expect(evalExpression("'hello'.at(-1)")).toBe('o');
  });
});

describe('staticEval number methods', () => {
  it('formats numbers', () => {
    expect(evalExpression('(3.14159).toFixed(2)')).toBe('3.14');
    expect(evalExpression('(255).toString(16)')).toBe('ff');
  });
});

describe('staticEval global namespaces', () => {
  it('evaluates Math (deterministic subset)', () => {
    expect(evalExpression('Math.max(1, 5, 3)')).toBe(5);
    expect(evalExpression('Math.min(1, 5, 3)')).toBe(1);
    expect(evalExpression('Math.round(2.6)')).toBe(3);
    expect(evalExpression('Math.abs(-4)')).toBe(4);
    expect(evalExpression('Math.floor(Math.PI)')).toBe(3);
  });

  it('rejects Math.random (non-deterministic)', () => {
    expect(() => evalExpression('Math.random()')).toThrow(/Cannot handle method random/);
  });

  it('evaluates JSON round-trips', () => {
    expect(evalExpression("JSON.stringify({ a: 1, b: [2, 3] })")).toBe('{"a":1,"b":[2,3]}');
    expect(evalExpression('JSON.parse(\'{"a":1}\')')).toEqual({ a: 1 });
  });

  it('evaluates Object.fromEntries and Object.entries', () => {
    expect(evalExpression("Object.fromEntries([['a', 1], ['b', 2]])")).toEqual({ a: 1, b: 2 });
    expect(evalExpression("Object.fromEntries(Object.entries({ a: 1 }).map(([k, v]) => [k, v * 2]))")).toEqual({ a: 2 });
  });

  it('destructures array parameters in arrow functions', () => {
    expect(evalExpression('[[1, 2], [3, 4]].map(([a, b]) => a + b)')).toEqual([3, 7]);
    expect(evalExpression('[[1, 2, 3]].map(([first, ...rest]) => rest)')).toEqual([[2, 3]]);
    expect(evalExpression('[[1]].map(([a, b = 9]) => a + b)')).toEqual([10]);
  });

  it('evaluates Number and Array statics', () => {
    expect(evalExpression("Number.isInteger(4)")).toBe(true);
    expect(evalExpression("Number.parseInt('42px', 10)")).toBe(42);
    expect(evalExpression('Array.isArray([])')).toBe(true);
    expect(evalExpression("Array.from('ab')")).toEqual(['a', 'b']);
  });

  it('evaluates numeric global functions', () => {
    expect(evalExpression("parseInt('0xFF', 16)")).toBe(255);
    expect(evalExpression("parseFloat('3.5kg')")).toBe(3.5);
    expect(evalExpression('isNaN(NaN)')).toBe(true);
    expect(evalExpression('isFinite(Infinity)')).toBe(false);
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
