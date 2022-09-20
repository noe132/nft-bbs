import { either, function as fp } from 'fp-ts';
import request from '~/request';
import { snackbarService } from '~/service/snackbar';

const groupId = '7000103413';

export const mixinAuth = async (userId: string) => {
  const item = await request(
    'https://prs-bp2.press.one/api/groups/mixinauth',
    {
      method: 'post',
      json: true,
      body: {
        groupId,
        'userId': userId,
      },
    },
  );

  return fp.pipe(
    item,
    either.mapLeft((v) => {
      const errorMessage = v.resData?.error ?? '';
      const errors = [
        'Invalid Mixin user id.',
        'Invalid user state.',
      ];
      if (!errors.includes(errorMessage)) {
        snackbarService.networkError(errorMessage || v);
      }
      return v;
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
  const item = await request<NFTTransactions>(
    `https://prs-bp2.press.one/api/nfts/transactions?account=${address}&count=100`,
  );

  return fp.pipe(
    item,
    either.mapLeft((v) => {
      const errorMessage = v.resData?.error ?? '';
      const errors = [
        'Invalid Mixin user id.',
        'Invalid user state.',
      ];
      if (!errors.includes(errorMessage)) {
        snackbarService.networkError(errorMessage || v);
      }
      return v;
    }),
  );
};
