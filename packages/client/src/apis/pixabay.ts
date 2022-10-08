import { either, function as fp } from 'fp-ts';
import { request } from '~/request';
import { snackbarService } from '~/service/snackbar';

export interface PixabayResponse {
  total: number
  totalHits: number
  hits: Array<{
    id: number
    pageURL: string
    type: string
    tags: string
    previewURL: string
    previewWidth: number
    previewHeight: number
    webformatURL: string
    webformatWidth: number
    webformatHeight: number
    largeImageURL: string
    imageWidth: number
    imageHeight: number
    imageSize: number
    views: number
    downloads: number
    collections: number
    likes: number
    comments: number
    user_id: number
    user: string
    userImageURL: string
  }>
}

export const search = async (options: any = {}) => {
  const item = await request<PixabayResponse>({
    url: 'https://pixabay.com/api',
    params: {
      key: '13927481-1de5dcccace42d9447c90346f',
      safesearch: 'true',
      image_type: 'photo',
      ...options,
    },
  });

  return fp.pipe(
    item,
    either.getOrElseW((v) => {
      snackbarService.networkError(v);
      return null;
    }),
  );
};
