import { FastifyRegister } from 'fastify';
import { type, string, partial, literal, union, intersection } from 'io-ts';
import { NotFound } from 'http-errors';
import { Brackets } from 'typeorm';

import { Post } from '~/orm';
import { assertValidation, parseIntAssert, parseIntFromString, truncate } from '~/utils';
import { AppDataSource } from '~/orm/data-source';

export const postController: Parameters<FastifyRegister>[0] = (fastify, _opts, done) => {
  fastify.get('/:groupId/:id', async (req) => {
    const params = assertValidation(req.params, type({ groupId: string, id: string }));
    const query = assertValidation(req.query, partial({ viewer: string }));
    const groupId = parseIntAssert(params.groupId);
    const post = await Post.get({ groupId, id: params.id });
    if (!post) {
      throw new NotFound();
    }
    const data = await Post.appendExtra(post, { viewer: query.viewer });
    return data;
  });

  fastify.get('/:groupId', async (req) => {
    const params = assertValidation(req.params, type({ groupId: string }));
    const groupId = parseIntAssert(params.groupId);
    const query = assertValidation(req.query, partial({
      order: union([literal('asc'), literal('desc')]),
      limit: string,
      offset: string,
      viewer: string,
      userAddress: string,
      truncatedLength: string,
      search: string,
      hot: union([literal('all'), literal('week'), literal('month'), literal('year')]),
    }));

    const dbQuery = AppDataSource.manager.createQueryBuilder()
      .select('post')
      .from(Post, 'post')
      .where({ groupId })
      .limit(Math.min(parseIntFromString(query.limit, 10), 100))
      .offset(parseIntFromString(query.offset, 10));

    if (query.userAddress) {
      dbQuery.andWhere({ userAddress: query.userAddress });
    }

    if (query.hot) {
      if (query.hot !== 'all') {
        const hotTime = {
          week: '1 week',
          month: '1 month',
          year: '1 year',
        }[query.hot];
        dbQuery.andWhere(`post.timestamp > now() - interval '${hotTime}'`);
      }
      dbQuery.addOrderBy('post.hot', 'DESC');
    }

    dbQuery.addOrderBy('post.timestamp', query.order === 'asc' ? 'ASC' : 'DESC');

    if (query.search) {
      const keywords = query.search.split(' ').filter((v) => v);
      keywords.forEach((keyword, i) => {
        dbQuery.andWhere(new Brackets((qb) => {
          qb
            .where(`post.content like :keyword${i}`, { [`keyword${i}`]: `%${keyword}%` })
            .orWhere(`post.title like :keyword${i}`, { [`keyword${i}`]: `%${keyword}%` });
        }));
      });
    }

    let posts = await dbQuery.getMany();

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
    const groupId = parseIntAssert(params.groupId);

    let post = await Post.getFirst({
      groupId,
      userAddress: query.userAddress,
    });
    if (post && query.viewer) {
      post = await Post.appendExtra(post, { viewer: query.viewer });
    }
    return post;
  });

  fastify.get('/count/:groupId/:userAddress', (req) => {
    const params = assertValidation(req.params, type({ groupId: string, userAddress: string }));
    const groupId = parseIntAssert(params.groupId);
    return Post.count(groupId, params.userAddress);
  });

  done();
};
