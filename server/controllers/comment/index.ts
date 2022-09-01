import { FastifyRegister } from 'fastify';
import { type, string, partial, intersection } from 'io-ts';
import { NotFound } from 'http-errors';
import { Comment } from '~/orm';
import { assertValidation, parseIntFromString, truncate } from '~/utils';

export const commentController: Parameters<FastifyRegister>[0] = (fastify, _opts, done) => {
  fastify.get('/:groupId/:trxId', async (req) => {
    const params = assertValidation(type({ groupId: string, trxId: string }).decode(req.params));
    const comment = await Comment.get({ groupId: params.groupId, trxId: params.trxId });
    if (!comment) {
      throw new NotFound();
    }
    const data = await Comment.appendExtra(comment);
    return data;
  });

  fastify.get('/:groupId', async (req) => {
    const params = assertValidation(type({ groupId: string }).decode(req.params));
    const query = assertValidation(intersection([
      type({
        objectId: string,
      }),
      partial({
        limit: string,
        offset: string,
        viewer: string,
        truncatedLength: string,
      }),
    ]).decode(req.query));

    let comments = await Comment.list({
      groupId: params.groupId,
      objectId: query.objectId,
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
    const params = assertValidation(type({ groupId: string }).decode(req.params));
    const query = assertValidation(type({ userAddress: string, viewer: string }).decode(req.query));

    let comment = await Comment.getFirst({
      groupId: params.groupId,
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
