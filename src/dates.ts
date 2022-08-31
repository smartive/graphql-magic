import { DateTime } from 'luxon';
import { doThrow } from './throw';

export type WithDate = { date: DateTime };

type MaybeObject<T> = T | null | undefined;

export type MaybeDay = MaybeObject<DateTime>;

const DATE_OPTIONS = { zone: 'Europe/Zurich' };

export const date = (s: Date | string | number | null = '') =>
  s instanceof Date
    ? DateTime.fromJSDate(s, DATE_OPTIONS)
    : typeof s === 'number'
    ? DateTime.fromMillis(s, DATE_OPTIONS)
    : s
    ? DateTime.fromISO(s, DATE_OPTIONS)
    : process.env.NEXT_PUBLIC_NOW
    ? DateTime.fromISO(process.env.NEXT_PUBLIC_NOW, DATE_OPTIONS)
    : DateTime.local(DATE_OPTIONS);

export const dmyDate = (s: string) =>
  DateTime.fromFormat(
    s,
    s.length === 10 ? 'dd.MM.yyyy' : s.length === 8 ? 'dd.MM.yy' : doThrow(new Error(`Invalid date format`)),
    DATE_OPTIONS
  );

/**
 * Designed to correct a date that has been wrongly initialized as being wall time in the environment (node/browser) time zone (usually by an external library).
 * This function returns a date where the original input has been interpreted as wall time in Europe/Zurich.
 *
 * E.g. in a node with TZ=utc:
 *
 * date(new Date('2020-01-01T00:00:00.000'))               // => 2020-01-01T00:00:00.000+00:00 WRONG!
 * dateAsEuropeZurich(new Date('2020-01-01T00:00:00.000')) // => 2020-01-01T00:00:00.000+01:00 CORRECT!
 */
export const dateAsEuropeZurich = (d: Date) =>
  date(new Date(2 * +d - +new Date(d.toLocaleString('en-US', { timeZone: 'Europe/Zurich' }))));

export const sqlDate = (s: string) => DateTime.fromSQL(s, DATE_OPTIONS);

const dayToNumber = (date: MaybeDay) => (date ? date.toMillis() : Number.MAX_VALUE);

export const byDate = ({ date: a }: { date: MaybeObject<DateTime> }, { date: b }: { date: MaybeObject<DateTime> }) =>
  dayToNumber(a) - dayToNumber(b);

export const byDateDESC = ({ date: a }: { date: MaybeObject<DateTime> }, { date: b }: { date: MaybeObject<DateTime> }) =>
  dayToNumber(b) - dayToNumber(a);

export const byEndDateDESC = (
  { endDate: a }: { endDate: MaybeObject<DateTime> },
  { endDate: b }: { endDate: MaybeObject<DateTime> }
) => dayToNumber(b) - dayToNumber(a);
