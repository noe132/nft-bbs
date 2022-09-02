import { FastifyLoggerInstance } from 'fastify';

declare global {
  const log: FastifyLoggerInstance;
  const pollingLog: FastifyLoggerInstance;
}
