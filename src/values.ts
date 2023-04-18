import { DateTime } from 'luxon';

export class Enum {
  constructor(public value: string) {}
}

export type BasicValue = undefined | null | boolean | string | number | DateTime;

export type Value = any; // BasicValue | Enum | Enum[] | Record<string, Value> | Value[];

export type Values = {
  name: string;
  values: Value;
}[];

export type Directive = {
  name: string;
  values?: Values | undefined;
};
