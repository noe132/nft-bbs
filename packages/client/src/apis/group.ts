import { either, function as fp } from 'fp-ts';
import request from '~/request';
import { snackbarService } from '~/service/snackbar';
import { API_BASE_URL } from './common';

export const join = async (seedUrl: string) => {
  const item = await request<{ status: 0, msg: string }>(
    `${API_BASE_URL}/group/join`,
    {
      method: 'post',
      body: { seedUrl },
      json: true,
    },
  );
  return fp.pipe(
    item,
    either.getOrElseW((v) => {
      if (v.status !== 404) {
        snackbarService.networkError(v);
      }
      return null;
    }),
  );
};
