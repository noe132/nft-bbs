import qs from 'query-string';
import request from './request';

export const search = (options: any = {}) => request(
  `/api/?key=13927481-1de5dcccace42d9447c90346f&safesearch=true&image_type=photo&${qs.stringify(options)}`,
  {
    base: 'https://pixabay.com',
    minPendingDuration: 300,
  },
);
