import { Kind, print } from 'graphql';
import { value } from '../../src/schema/utils';

describe('enum default values', () => {
  it('prints a symbol default as an enum value, not a quoted string', () => {
    const node = value(Symbol('STRICT'));

    expect(node.kind).toBe(Kind.ENUM);
    // `Enum = STRICT`, not `Enum = "STRICT"` — graphql 17 rejects the quoted form
    // as an invalid default value (graphql 16 merely tolerated it).
    expect(print(node)).toBe('STRICT');
  });

  it('still prints a plain string default as a string', () => {
    const node = value('STRICT');

    expect(node.kind).toBe(Kind.STRING);
    expect(print(node)).toBe('"STRICT"');
  });

  it('keeps symbols inside lists as enum values', () => {
    const node = value([Symbol('STRICT'), Symbol('PERMISSIVE')]);

    expect(print(node)).toBe('[STRICT, PERMISSIVE]');
  });
});
