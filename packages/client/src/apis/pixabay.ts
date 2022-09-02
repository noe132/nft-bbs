import qs from 'query-string';
import request from '~/request';

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

export const search = (options: any = {}) => request(
  `/api/?key=13927481-1de5dcccace42d9447c90346f&safesearch=true&image_type=photo&${qs.stringify(options)}`,
  {
    base: 'https://pixabay.com',
    minPendingDuration: 300,
  },
) as Promise<PixabayResponse>;
