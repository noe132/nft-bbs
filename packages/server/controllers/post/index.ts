import { FastifyRegister } from 'fastify';
import { type, string, partial, literal, union, intersection } from 'io-ts';
import { NotFound } from 'http-errors';
import { Post } from '~/orm';
import { assertValidation, parseIntFromString, truncate } from '~/utils';

export const postController: Parameters<FastifyRegister>[0] = (fastify, _opts, done) => {
  fastify.get('/:groupId/:trxId', async (req) => {
    const params = assertValidation(req.params, type({ groupId: string, trxId: string }));
    const query = assertValidation(req.query, partial({ viewer: string }));
    const post = await Post.get({ groupId: params.groupId, trxId: params.trxId });
    if (!post) {
      throw new NotFound();
    }
    const data = await Post.appendExtra(post, { viewer: query.viewer });
    return data;
  });

  fastify.get('/:groupId', async (req) => {
    const params = assertValidation(req.params, type({ groupId: string }));
    const query = assertValidation(req.query, partial({
      order: union([literal('asc'), literal('desc')]),
      limit: string,
      offset: string,
      viewer: string,
      userAddress: string,
      truncatedLength: string,
      search: string,
    }));

    let posts = await Post.list({
      groupId: params.groupId,
      order: query.order === 'asc' ? 'ASC' : 'DESC',
      userAddress: query.userAddress,
      limit: Math.min(parseIntFromString(query.limit, 10), 100),
      offset: parseIntFromString(query.offset, 10),
      search: query.search,
    });
    posts = await Post.appendExtra(posts, {
      viewer: query.viewer,
    });
    const truncatedLength = parseIntFromString(query.truncatedLength, 0);
    if (truncatedLength) {
      posts = posts.map((item) => {
        item.content = truncate(item.content, truncatedLength);
        return item;
      });
    }
    return posts;
  });

  fastify.get('/:groupId/first', async (req) => {
    const params = assertValidation(req.params, type({ groupId: string }));
    const query = assertValidation(req.query, intersection([
      type({ userAddress: string }),
      partial({ viewer: string }),
    ]));

    let post = await Post.getFirst({
      groupId: params.groupId,
      userAddress: query.userAddress,
    });
    if (post && query.viewer) {
      post = await Post.appendExtra(post, { viewer: query.viewer });
    }
    return post;
  });

  fastify.get('/count/:groupId/:userAddress', (req) => {
    const params = assertValidation(req.params, type({ groupId: string, userAddress: string }));
    return Post.count(params.groupId, params.userAddress);
  });

  done();
};
