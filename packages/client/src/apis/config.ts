import { either, function as fp } from 'fp-ts';
import { request } from '~/request';
import { snackbarService } from '~/service/snackbar';
import { API_BASE_URL } from './common';

export interface SiteConfig {
  mixinLogin: boolean
  keystoreLogin: boolean
  checkNFT: boolean
  seedUrl: string
}

export const getConfig = async () => {
  const item = await request<SiteConfig>({
    url: `${API_BASE_URL}/config`,
  });
  return fp.pipe(
    item,
    either.mapLeft((v) => {
      snackbarService.networkError(v);
      return v;
    }),
  );
};
