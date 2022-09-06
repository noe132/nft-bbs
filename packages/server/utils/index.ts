import { either } from 'fp-ts';
import { Validation } from 'io-ts';
import { PathReporter } from 'io-ts/lib/PathReporter';
import { BadRequest } from 'http-errors';

export * from './constant';
export * from './store';
export * from './truncate';

export const sleep = (n = 500) =>
  new Promise<void>((resolve) => {
    setTimeout(() => {
      resolve();
    }, n);
  });

export type EntityConstructorParams<T, E = ''> = {
  // eslint-disable-next-line @typescript-eslint/ban-types
  [K in keyof T as K extends E ? never : T[K] extends Function ? never : K ]: T[K]
};

export const assertValidation: <T>(v: Validation<T>) => T = <T>(v: Validation<T>) => {
  if (either.isLeft(v)) {
    throw new BadRequest(PathReporter.report(v).join(', '));
  }
  return v.right;
};

export const parseIntFromString = (s: string | undefined, defaultValue: number) => {
  if (!s) { return defaultValue; }
  const n = parseInt(s, 10);
  if (Number.isNaN(n)) {
    return defaultValue;
  }
  return n;
};
