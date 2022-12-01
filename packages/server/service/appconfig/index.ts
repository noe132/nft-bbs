import * as QuorumLightNodeSDK from 'quorum-light-node-sdk-nodejs';

export const state = {
  map: {} as Record<number, Record<string, QuorumLightNodeSDK.IAppConfigItem>>,
};

export const appConfigService = {
  state,
};
