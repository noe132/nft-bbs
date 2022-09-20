import * as apis from '~/apis';
import * as services from '~/service';
import * as QuorumLightNodeSdk from 'quorum-light-node-sdk';

if (process.env.NODE_ENV === 'development') {
  [apis, services, { QuorumLightNodeSdk }].forEach((map) => {
    Object.entries(map).forEach(([k, v]) => {
      (window as any)[k] = v;
    });
  });
}
