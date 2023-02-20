import { IAppConfigItem } from 'rum-sdk-nodejs';

export const state = {
  map: {} as Record<number, Record<string, IAppConfigItem>>,
};

export const appConfigService = {
  state,
};
