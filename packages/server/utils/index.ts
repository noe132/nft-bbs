import { either } from 'fp-ts';
import { Type } from 'io-ts';
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

/** 验证参数，参数错误则 throw 400 BadRequest */
export const assertValidation: <A>(data: unknown, t: Type<A>) => A = <A>(data: unknown, t: Type<A>) => {
  const result = t.decode(data);
  if (either.isLeft(result)) {
    throw new BadRequest(PathReporter.report(result).join(', '));
  }
  return result.right;
};

export const parseIntFromString = (s: string | undefined, defaultValue: number) => {
  if (!s) { return defaultValue; }
  const n = parseInt(s, 10);
  if (Number.isNaN(n)) {
    return defaultValue;
  }
  return n;
};
