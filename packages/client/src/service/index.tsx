import { ImageZoomView } from './imageZoom/ImageZoomView';
import { SnackbarContainer } from './snackbar/SnackbarContainer';
import { langService } from './lang';
import { DialogContainer } from './dialog/DialogContainer';
import { nftService } from './nft';

export * from './dialog';
export * from './imageZoom';
export * from './key';
export * from './lang';
export * from './nft';
export * from './node';
export * from './snackbar';

export const initService = () => {
  const disposes = [
    nftService.init(),
    langService.init(),
  ];

  return () => {
    disposes.forEach((v) => v());
  };
};

export const ServiceViews = () => (<>
  <ImageZoomView />
  <SnackbarContainer />
  <DialogContainer />
</>);
