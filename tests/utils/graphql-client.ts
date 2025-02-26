type Variables = Record<string, unknown>;

interface GraphQLResponse<T = any> {
  data?: T;
  errors?: {
    message: string;
    locations?: { line: number; column: number }[];
    path?: string[];
    extensions?: Record<string, unknown>;
  }[];
}

/**
 * Simple GraphQL client using native fetch
 */
export const graphqlRequest = async <T = any>(
  url: string,
  query: string,
  variables?: Variables,
  headers?: HeadersInit,
): Promise<T> => {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: JSON.stringify({
      query,
      variables,
    }),
  });

  if (!response.ok) {
    throw new Error(`HTTP error! Status: ${response.status}.`);
  }

  const result = (await response.json()) as GraphQLResponse<T>;

  if (result.errors?.length) {
    throw new Error(`GraphQL Error: ${result.errors.map((e) => e.message).join(', ')}.`);
  }

  if (!result.data) {
    throw new Error('No data returned from GraphQL request.');
  }

  return result.data;
};
