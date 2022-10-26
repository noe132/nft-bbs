import { either, function as fp } from 'fp-ts';
import { request } from '~/request';
import { snackbarService } from '~/service/snackbar';
import { API_BASE_URL } from './common';

export const create = async (groupId: string, TrxItem: string) => {
  const item = await request<{ trx_id: string }>({
    url: `${API_BASE_URL}/trx`,
    method: 'post',
    data: { groupId, TrxItem },
  });
  return fp.pipe(
    item,
    either.getOrElseW((v) => {
      if (v.response?.status !== 404) {
        snackbarService.networkError(v);
      }
      return null;
    }),
  );
};
