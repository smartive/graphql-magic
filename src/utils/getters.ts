import assert from 'assert';
import lodashGet from 'lodash/get';

export const summonByName = <T extends { name: string }>(array: T[], value: string) => summonByKey(array, 'name', value);

export const summonByKey = <T>(array: readonly T[] | undefined, key: string, value: unknown) =>
  summon(array, (element: T) => lodashGet(element, key) === value, `No element found with ${key} ${value}`);

export const summon = <T>(array: readonly T[] | undefined, cb: Parameters<T[]['find']>[1], errorMessage?: string) => {
  if (array === undefined) {
    console.trace();
    throw new Error('Base array is not defined.');
  }
  const result = array.find(cb);
  if (result === undefined) {
    console.trace();
    throw new Error(errorMessage || 'Element not found.');
  }
  return result;
};

type ForSure<T> = T extends undefined | null ? never : T;

export const it = <T>(object: T | null | undefined): ForSure<T> => {
  if (object === undefined || object === null) {
    console.trace();
    throw new Error('Base object is not defined.');
  }

  return object as ForSure<T>;
};

export const get = <T, U extends keyof ForSure<T>>(object: T | null | undefined, key: U): ForSure<ForSure<T>[U]> => {
  const value = it(object)[key];
  if (value === undefined || value === null) {
    const error = new Error(`Object doesn't have ${String(key)}`);
    console.warn(error);
    throw error;
  }
  return value as ForSure<ForSure<T>[U]>;
};

export const getString = (v: unknown) => {
  assert(typeof v === 'string');
  return v;
};
