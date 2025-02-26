import { Dayjs, isDayjs } from 'dayjs';
import { DateTime } from 'luxon';

export type DateLibrary = 'luxon' | 'dayjs';

export const DATE_CLASS: Record<DateLibrary, string> = {
  luxon: 'DateTime',
  dayjs: 'Dayjs',
};

export const DATE_CLASS_IMPORT = {
  luxon: `import { DateTime } from 'luxon';`,
  dayjs: `import { Dayjs } from 'dayjs';`,
};

export type AnyDateType = DateTime | Dayjs | Date | string;

export const anyDateToLuxon = (date: unknown, zone: string | undefined, fallbackToNow = false) => {
  if (!date) {
    if (fallbackToNow) {
      return DateTime.local({ zone });
    }

    return undefined;
  }

  if (DateTime.isDateTime(date)) {
    return date.setZone(zone);
  }

  if (isDayjs(date)) {
    return DateTime.fromISO(date.toISOString(), { zone });
  }

  if (date instanceof Date) {
    return DateTime.fromJSDate(date, { zone });
  }

  if (typeof date === 'string' && date) {
    return DateTime.fromISO(date, { zone });
  }

  if (typeof date === 'number') {
    return DateTime.fromMillis(date, { zone });
  }

  throw new Error(`Unsupported date format: ${date} (${date.constructor.name})`);
};
