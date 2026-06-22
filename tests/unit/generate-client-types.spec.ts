import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * Regression test for the duplicate-identifier breakage that the graphql-codegen v7 upgrade (#490)
 * surfaced in the generated client types.
 *
 * Since `@graphql-codegen/typescript-operations` v6, the operations plugin re-emits every enum and
 * input-object type used by an operation into its own output unless `importSchemaTypesFrom` is set.
 * Running it together with the `typescript` plugin in a single file therefore declared every used
 * `*Where`/`Create*`/`Update*` input and every used enum twice (`TS2300`), and enums additionally
 * clashed as an `enum` vs a string-literal `type` alias (`TS2567`). The fix (see `codegen.ts`)
 * emits schema types and operation types into separate files and wires the operations plugin to the
 * shared schema types via `importSchemaTypesFrom`.
 *
 * This asserts the generated client output (regenerated and committed via `gqm generate`) is free of
 * duplicate declarations — the exact check that would have caught #490.
 */
describe('generated client types', () => {
  const clientDir = join(__dirname, '..', 'generated', 'client');
  const files = ['schema.ts', 'index.ts'];

  const declarationsOf = (content: string) =>
    [...content.matchAll(/^(?:export )?(?:type|enum|interface) (\w+)\b/gm)].map((match) => match[1]);

  it.each(files)('does not declare any identifier twice in %s', (file) => {
    const declarations = declarationsOf(readFileSync(join(clientDir, file), 'utf8'));
    const duplicates = [...new Set(declarations.filter((name, index) => declarations.indexOf(name) !== index))];
    expect(duplicates).toEqual([]);
  });

  it('declares each schema type exactly once across the client output', () => {
    const declarations = files.flatMap((file) => declarationsOf(readFileSync(join(clientDir, file), 'utf8')));

    // These were each emitted twice before the fix (once by `typescript`, once by `typescript-operations`).
    for (const name of ['CreateReview', 'UpdateReview', 'ReactionType', 'ReviewWhere', 'UserWhere']) {
      expect({ name, count: declarations.filter((declaration) => declaration === name).length }).toEqual({
        name,
        count: 1,
      });
    }
  });
});
