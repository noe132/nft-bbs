import { FastifyRegister } from 'fastify';

import { rootController } from './root';
import { postController } from './post';
import { commentController } from './comment';
import { profileController } from './profile';
import { notificationController } from './notification';
import { imageController } from './image';
import { groupInfoController } from './groupInfo';

export const controllers: Parameters<FastifyRegister>[0] = (fastify, _opts, done) => {
  fastify.register(rootController, { prefix: '/api' });
  fastify.register(postController, { prefix: '/api/post' });
  fastify.register(commentController, { prefix: '/api/comment' });
  fastify.register(profileController, { prefix: '/api/profile' });
  fastify.register(notificationController, { prefix: '/api/notification' });
  fastify.register(imageController, { prefix: '/api/image' });
  fastify.register(groupInfoController, { prefix: '/api/groupinfo' });

  done();
};
