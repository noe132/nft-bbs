import { either } from 'fp-ts';
import { sleep } from './utils';

type RequestOptions = Omit<RequestInit, 'body'> & {
  minPendingDuration?: number
  isTextResponse?: boolean
  body?: any
  json?: boolean
};

export class ResponseError {
  res: Response;
  resData: any;
  status: number;
  message: string;

  public constructor(params: {
    res: Response
    resData: any
    status: number
    message: string
  }) {
    this.res = params.res;
    this.resData = params.resData;
    this.status = params.status;
    this.message = params.message;
  }
}

export default async <T = unknown>(url: any, options: RequestOptions = {}): Promise<either.Either<ResponseError, T>> => {
  if (options.json) {
    options.headers = {
      ...options.headers,
      'Content-Type': 'application/json',
    };
    options.body = JSON.stringify(options.body);
  }
  const result = await Promise.all([
    fetch(new Request(url), options),
    sleep(options.minPendingDuration ? options.minPendingDuration : 0),
  ]);
  const res = result[0];
  let resData;
  if (options.isTextResponse) {
    resData = await res.text().catch(() => null);
  } else {
    resData = await res.json().catch(() => null);
  }
  if (res.ok) {
    return either.right(resData as T);
  }
  return either.left(new ResponseError({
    res,
    resData,
    status: res.status,
    message: resData?.message ?? '',
  }));
};
