type Digit = '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9';
type Hour = `0${Digit}` | `1${Digit}` | `2${'0' | '1' | '2' | '3'}`;
type Minute = `${'0' | '1' | '2' | '3' | '4' | '5'}${Digit}`;

export type Time = `${Hour}:${Minute}`;

const PARSE_TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;
const SERIALIZE_TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)(?::[0-5]\d(?:\.\d+)?)?$/;

export const parseTime = (value: unknown): Time => {
  if (typeof value !== 'string') {
    throw new Error(`Time must be a string in HH:mm format. Received: ${typeof value}`);
  }
  const match = value.match(PARSE_TIME_RE);
  if (!match) {
    throw new Error(`Invalid Time value "${value}". Expected HH:mm in 24-hour format.`);
  }

  return `${match[1]}:${match[2]}` as Time;
};

export const serializeTime = (value: unknown): Time => {
  if (typeof value !== 'string') {
    throw new Error(`Time must be a string in HH:mm format. Received: ${typeof value}`);
  }
  const match = value.match(SERIALIZE_TIME_RE);
  if (!match) {
    throw new Error(`Invalid Time value "${value}". Expected HH:mm or HH:mm:ss.`);
  }

  return `${match[1]}:${match[2]}` as Time;
};
