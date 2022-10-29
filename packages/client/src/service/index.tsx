import { ImageZoomView } from './imageZoom/ImageZoomView';
import { SnackbarContainer } from './snackbar/SnackbarContainer';
import { langService } from './lang';
import { DialogContainer } from './dialog/DialogContainer';
import { nftService } from './nft';
import { nodeService } from './node';
import { RouterHooksView } from './router/RouterHooksView';

export * from './dialog';
export * from './imageZoom';
export * from './key';
export * from './lang';
export * from './nft';
export * from './node';
export * from './snackbar';
export * from './router';

export const initService = () => {
  const disposes = [
    nftService.init(),
    langService.init(),
    nodeService.init(),
  ];

  return () => {
    disposes.forEach((v) => v());
  };
};

export const ServiceViews = () => (<>
  <ImageZoomView />
  <SnackbarContainer />
  <DialogContainer />
  <RouterHooksView />
</>);
