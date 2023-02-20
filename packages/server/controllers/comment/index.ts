import { FastifyRegister } from 'fastify';
import { type, string, partial, intersection } from 'io-ts';
import { NotFound } from 'http-errors';
import { Comment } from '~/orm';
import { assertValidation, parseIntAssert, parseIntFromString, truncate } from '~/utils';

export const commentController: Parameters<FastifyRegister>[0] = (fastify, _opts, done) => {
  fastify.get('/:groupId/:id', async (req) => {
    const params = assertValidation(req.params, type({
      groupId: string,
      id: string,
    }));
    const query = assertValidation(req.query, type({
      viewer: string,
    }));
    const groupId = parseIntAssert(params.groupId);
    const comment = await Comment.get({ groupId, id: params.id });
    if (!comment) {
      throw new NotFound();
    }
    const data = await Comment.appendExtra(comment, { viewer: query.viewer });
    return data;
  });

  fastify.get('/:groupId', async (req) => {
    const params = assertValidation(req.params, type({ groupId: string }));
    const query = assertValidation(req.query, intersection([
      type({
        objectId: string,
      }),
      partial({
        limit: string,
        offset: string,
        viewer: string,
        truncatedLength: string,
      }),
    ]));
    const groupId = parseIntAssert(params.groupId);

    let comments = await Comment.list({
      groupId,
      postId: query.objectId,
      limit: Math.min(parseIntFromString(query.limit, 10), 100),
      offset: parseIntFromString(query.offset, 0),
    });

    comments = await Comment.appendExtra(comments, {
      viewer: query.viewer,
    });
    const truncatedLength = parseIntFromString(query.truncatedLength, 0);
    if (truncatedLength) {
      comments = comments.map((item) => {
        item.content = truncate(item.content, truncatedLength);
        return item;
      });
    }
    return comments;
  });

  fastify.get('/:groupId/first', async (req) => {
    const params = assertValidation(req.params, type({ groupId: string }));
    const query = assertValidation(req.query, type({ userAddress: string, viewer: string }));
    const groupId = parseIntAssert(params.groupId);

    let comment = await Comment.getFirst({
      groupId,
      userAddress: query.userAddress,
    });
    if (!comment) { return null; }

    comment = await Comment.appendExtra(comment, {
      viewer: query.viewer,
    });

    return comment;
  });

  done();
};
