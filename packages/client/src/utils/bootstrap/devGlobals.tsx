import * as apis from '~/apis';
import * as services from '~/service';
import * as rumsdk from 'rum-sdk-browser';

if (process.env.NODE_ENV === 'development') {
  [apis, services, { rumsdk }].forEach((map) => {
    Object.entries(map).forEach(([k, v]) => {
      (window as any)[k] = v;
    });
  });
}
