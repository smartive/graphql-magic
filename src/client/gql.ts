// This tag does nothing (just generates a string) - it is here for the tooling (syntax highlighting, formatting and type generation)
export const gql = (chunks: TemplateStringsArray, ...variables: (string | number | boolean)[]): string => {
  return chunks.reduce(
    (accumulator, chunk, index) => `${accumulator}${chunk}${index in variables ? variables[index] : ''}`,
    ''
  );
};
