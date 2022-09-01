import { sleep } from './utils';

const BASE = '';
type RequestOptions = Omit<RequestInit, 'body'> & {
  base?: string
  minPendingDuration?: number
  isTextResponse?: boolean
  body?: any
  json?: boolean
};
export default async (url: any, options: RequestOptions = {}) => {
  if (options.json) {
    options.headers = {
      ...options.headers,
      'Content-Type': 'application/json',
    };
    options.body = JSON.stringify(options.body);
  }
  if (!options.base) {
    options.credentials = 'include';
  }
  const result = await Promise.all([
    fetch(new Request((options.base || BASE) + url), options),
    sleep(options.minPendingDuration ? options.minPendingDuration : 0),
  ]);
  const res: any = result[0];
  let resData;
  if (options.isTextResponse) {
    resData = await res.text();
  } else {
    resData = await res.json();
  }
  if (res.ok) {
    return resData;
  }
  throw Object.assign(new Error(), {
    code: resData.code,
    status: res.status,
    message: resData.message,
  });
};
