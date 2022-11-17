export const API_BASE_URL = `${location.protocol}//${location.hostname}:${location.port}/api`;
export const VAULT_API_BASE_URL = 'https://vault.rumsystem.net/v1';

export interface AdminApiParams {
  address: string
  nonce: number
  sign: string
}
