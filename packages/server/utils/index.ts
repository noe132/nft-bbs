import { WriteStream } from 'fs';
import { either } from 'fp-ts';
import { Type } from 'io-ts';
import { PathReporter } from 'io-ts/lib/PathReporter';
import { BadRequest } from 'http-errors';
import { Logger } from 'pino';
import { performance } from 'perf_hooks';
import { FastifyBaseLogger } from 'fastify';

export * from './PollingTask';
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

export const getLoggerWrite = (file: WriteStream) => function write(msg: string) {
  /* eslint-disable no-console */
  const obj = JSON.parse(msg);
  console.log(msg.trim());
  if (obj.level === 50) {
    if (obj.stack) {
      console.log('');
      console.log(obj.stack);
    } else if (obj.err?.stack) {
      console.log('');
      console.log(obj.err.stack);
    }
  }
  file.write(msg);
  /* eslint-enable no-console */
};

export const patchLogger = (logger: Logger | FastifyBaseLogger) => {
  (logger as any).time = <T>(name: string, action: () => Promise<T>) => {
    const start = performance.now();
    const p = action();
    p.then(() => {
      const time = Number((performance.now() - start).toFixed(2));
      log.info(`${name} in ${time}ms`);
    });
    return p;
  };
};

export const parseQuorumTimestamp = (timestamp: string) => {
  const time = parseInt(timestamp.slice(0, -6), 10);
  return time;
};

export const notNullFilter = <T>(v: T | undefined | null): v is T => v !== undefined && v !== null;
