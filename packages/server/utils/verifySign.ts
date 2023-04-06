import { either, function as fp } from 'fp-ts';
import { createHash } from 'crypto';
import { ethers } from 'ethers';
import { BadRequest } from 'http-errors';
import LRUCache from 'lru-cache';
import { config } from '~/config';

interface VerifySignParams {
  address: string
  nonce: number
  sign: string
}
const lruCache = new LRUCache<string, true>({
  max: 1000,
  ttl: 1000 * 60 * 60 * 2,
});

export const assertVerifySign = (params: VerifySignParams) => {
  const result = fp.pipe(
    verifySign(params),
    either.chainW((address) => {
      if (address !== params.address) {
        return either.left(new Error('invalid sign'));
      }
      return either.right(null);
    }),
    either.chainW(() => {
      const key = `${params.address}-${params.nonce}`;
      if (lruCache.has(key)) {
        return either.left(new Error('no replay request'));
      }
      lruCache.set(key, true);
      return either.right(null);
    }),
    either.mapLeft((e) => new BadRequest(e.message)),
  );
  if (either.isLeft(result)) {
    throw result.left;
  }
};

export const verifySign = (params: VerifySignParams) => either.tryCatch(
  () => {
    const key = `${params.address}-${params.nonce}`;
    const sha256Hash = createHash('sha256');
    sha256Hash.update(key);
    const hash = sha256Hash.digest().toString('hex');
    const pubkey = ethers.utils.recoverPublicKey(`0x${hash}`, `0x${params.sign}`);
    const address = ethers.utils.computeAddress(pubkey);
    return address;
  },
  (e) => e as Error,
);

export const assertAdmin = (address: string) => {
  const isAdmin = !!config.admin?.some((v) => v === address);
  if (!isAdmin) {
    throw new BadRequest('admin required');
  }
};
