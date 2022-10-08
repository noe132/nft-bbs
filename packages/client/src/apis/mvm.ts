import { either, function as fp } from 'fp-ts';
import { request } from '~/request';
import { snackbarService } from '~/service/snackbar';

const groupId = '7000103413';

export const mixinAuth = async (userId: string) => {
  const item = await request<null>(
    {
      url: 'https://prs-bp2.press.one/api/groups/mixinauth',
      method: 'post',
      data: { groupId, 'userId': userId },
    },
  );

  return fp.pipe(
    item,
    either.orElse((e) => {
      if (e.response?.status === 304) {
        return either.right(null);
      }
      return either.left(e);
    }),
    either.mapLeft((e) => {
      const errorMessage = e.response?.data?.error ?? '';
      const errors = [
        'Invalid Mixin user id.',
        'Invalid user state.',
      ];
      if (!errors.includes(errorMessage)) {
        snackbarService.networkError(e);
      }
      return e;
    }),
  );
};

export interface NFTTransactions {
  data: Array<{
    asset: string
    blockHash: string
    blockNumber: number
    cy_tenantid: string
    from: string
    params: null
    timestamp: string
    to: string
    tokenId: string
    transactionHash: string
    type: string
    uri: string
  }>
  error: null
  success: boolean
}

export const getNFT = async (address: string) => {
  const item = await request<NFTTransactions>({
    url: `https://prs-bp2.press.one/api/nfts/transactions?account=${address}&count=100`,
  });

  return fp.pipe(
    item,
    either.mapLeft((e) => {
      const errorMessage = e.response?.data?.error ?? '';
      const errors = [
        'Invalid Mixin user id.',
        'Invalid user state.',
      ];
      if (!errors.includes(errorMessage)) {
        snackbarService.networkError(e);
      }
      return e;
    }),
  );
};
