export type Value = unknown;

export type Values = {
  name: string;
  values: Value;
}[];

export type Directive = {
  name: string;
  values?: Values | undefined;
};
