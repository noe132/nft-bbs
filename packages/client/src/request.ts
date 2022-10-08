import axios, { AxiosRequestConfig, AxiosError } from 'axios';
import { either, taskEither, function as fp } from 'fp-ts';

export const request = async <T = unknown>(config: AxiosRequestConfig<unknown>): Promise<either.Either<AxiosError<any>, T>> => {
  const run = fp.pipe(
    taskEither.tryCatch(
      () => axios(config),
      (e) => e as AxiosError,
    ),
    taskEither.map((v) => v.data),
  );

  return run();
};
