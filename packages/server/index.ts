import 'reflect-metadata';
import './utils/alias';
import './utils/env';
import * as path from 'path';
import { createWriteStream } from 'fs';
import * as fs from 'fs/promises';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import pino from 'pino';

import { initDB } from '~/orm';
import { controllers } from '~/controllers';
import { initService, disposeService } from '~/service';

export type {
  Comment, GroupInfo, ImageFile,
  Notification, Post, Profile, UniqueCounter,
} from '~/orm/entity';

export type { SocketIOEventMap } from '~/service/socket';

const port = Number(process.env.PORT) || 8002;

const main = async () => {
  await fs.mkdir(path.join(__dirname, 'logs')).catch(() => 1);

  const appLogFile = createWriteStream(path.join(__dirname, 'logs/app.log'), { flags: 'a' });
  const pollingLogFile = createWriteStream(path.join(__dirname, 'logs/polling.log'), { flags: 'a' });

  await initDB();

  const fastify = Fastify({
    logger: {
      level: 'info',
      base: undefined,
      stream: {
        write(msg) {
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
          appLogFile.write(msg);
          /* eslint-enable no-console */
        },
      },
    },
    // ...cert && key ? { https: { cert, key } } : {},
  });

  (globalThis as any).log = fastify.log;
  (globalThis as any).pollingLog = pino({
    level: 'info',
    base: undefined,
  }, {
    write(msg) {
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
      pollingLogFile.write(msg);
      /* eslint-enable no-console */
    },
  });
  (globalThis as any).s = fastify;

  fastify.addContentTypeParser(
    'application/json',
    { parseAs: 'string' },
    fastify.getDefaultJsonParser('ignore', 'ignore'),
  );

  fastify.register(cors, {
    credentials: true,
    origin: true,
  });

  fastify.addHook('onClose', (_fastify, done) => {
    appLogFile.end();
    pollingLogFile.end();
    disposeService();
    done();
  });

  fastify.register(controllers);

  initService(fastify);

  await fastify.listen({ host: '::', port }).then(() => {
    fastify.log.info(`app listen on port ${port}.`);
  });
};

main();
