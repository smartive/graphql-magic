import upperCase from 'lodash/upperCase';

export const constantCase = (str: string) => upperCase(str).replace(/ /g, '_');
