import { FastifyRegister } from 'fastify';

import { rootController } from './root';
import { commentController } from './comment';
import { configController } from './config';
import { groupController } from './group';
import { groupInfoController } from './groupInfo';
import { imageController } from './image';
import { notificationController } from './notification';
import { postController } from './post';
import { profileController } from './profile';

export const controllers: Parameters<FastifyRegister>[0] = (fastify, _opts, done) => {
  fastify.register(rootController, { prefix: '/api' });
  fastify.register(commentController, { prefix: '/api/comment' });
  fastify.register(configController, { prefix: '/api/config' });
  fastify.register(groupController, { prefix: '/api/group' });
  fastify.register(groupInfoController, { prefix: '/api/groupinfo' });
  fastify.register(imageController, { prefix: '/api/image' });
  fastify.register(notificationController, { prefix: '/api/notification' });
  fastify.register(postController, { prefix: '/api/post' });
  fastify.register(profileController, { prefix: '/api/profile' });

  done();
};
