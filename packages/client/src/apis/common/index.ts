export enum TrxStorage {
  cache = 'cache',
  chain = 'chain',
}

export enum TrxType {
  post = 'post',
  comment = 'comment',
  profile = 'profile',
  counter = 'counter',
  discounter = 'discounter',
  image = 'image',
}

// export const API_BASE_URL = 'http://localhost:8002/api';
export const API_BASE_URL = `${location.protocol}//${location.hostname}:${location.port}/api`;
