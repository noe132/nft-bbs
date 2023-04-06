import { WriteStream } from 'fs';
import { either } from 'fp-ts';
import { Type } from 'io-ts';
import { PathReporter } from 'io-ts/lib/PathReporter';
import { BadRequest } from 'http-errors';
import { Logger } from 'pino';
import { performance } from 'perf_hooks';
import { FastifyBaseLogger } from 'fastify';
import { PostType } from 'rum-port-types';
import { parseISO } from 'date-fns';

export * from './PollingTask';
export * from './store';
export * from './truncate';
export * from './verifySign';

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

export const parseIntAssert = (s: string) => {
  const n = parseInt(s, 10);
  if (Number.isNaN(n)) {
    throw new BadRequest(`invalid value ${s}`);
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

// TODO: timestamp type should be string
export const parseActivityTimestamp = (published: string | undefined, timestamp: any) => {
  if (published) {
    return parseISO(published).getTime();
  }
  if (timestamp) {
    return Number(timestamp?.slice(0, -6));
  }
  return Date.now();
};

export const notNullFilter = <T>(v: T | undefined | null): v is T => v !== undefined && v !== null;

type SetLoading = (l: boolean) => unknown;
type UnknownFunction = (...p: Array<any>) => unknown;
type RunLoading = <
  T extends UnknownFunction,
  R = ReturnType<T> extends Promise<unknown> ? ReturnType<T> : Promise<ReturnType<T>>,
>(s: SetLoading, fn: T) => R;
/**
 * 立即执行异步函数 fn。
 * 执行前调用 setLoading(true)，执行完毕调用 setLoading(false)
 */
export const runLoading: RunLoading = (async (setLoading: SetLoading, fn: UnknownFunction) => {
  setLoading(true);
  try {
    const result = await fn();
    return result as ReturnType<typeof fn>;
  } finally {
    setLoading(false);
  }
}) as any;
