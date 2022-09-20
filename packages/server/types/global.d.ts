import { FastifyLoggerInstance } from 'fastify';

declare global {
  const log: FastifyLoggerInstance & { time: <T>(name: string, action: () => Promise<T>) => Promise<T> };
  const pollingLog: FastifyLoggerInstance;
}
