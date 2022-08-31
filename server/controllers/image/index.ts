import { FastifyRegister } from 'fastify';
import { type, string } from 'io-ts';
import { NotFound } from 'http-errors';
import LRUCache from 'lru-cache';
import { ImageFile } from '~/orm';
import { assertValidation } from '~/utils';

interface ImageCacheItem { buffer: Buffer, mineType: string }
const cache = new LRUCache<string, ImageCacheItem>({
  max: 100,
});

export const imageController: Parameters<FastifyRegister>[0] = (fastify, _opts, done) => {
  fastify.get('/:groupId/:trxId', async (req, res) => {
    const params = assertValidation(type({
      groupId: string,
      trxId: string,
    }).decode(req.params));
    const key = `${params.groupId}-${params.trxId}`;
    let item: ImageCacheItem | null = null;

    if (cache.has(key)) {
      item = cache.get(key)!;
    }
    const image = await ImageFile.get(params.groupId, params.trxId);
    if (image) {
      const buffer = Buffer.from(image.content, 'base64');
      item = { buffer, mineType: image.mineType };
      cache.set(key, item);
    }

    if (!item) {
      throw new NotFound();
    }
    res.type(item.mineType);
    return item.buffer;
  });

  done();
};
