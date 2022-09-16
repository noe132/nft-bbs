import { ImageZoomView } from './imageZoom/ImageZoomView';
import { SnackbarContainer } from './snackbar/SnackbarContainer';
import { langService } from './lang';
import { nodeService } from './node';
import { keyService } from './key';
import { DialogContainer } from './dialog/DialogContainer';

export * from './dialog';
export * from './imageZoom';
export * from './key';
export * from './lang';
export * from './node';
export * from './snackbar';

export const initService = () => {
  if (process.env.NODE_ENV === 'development') {
    (window as any).nodeService = nodeService;
    (window as any).keyService = keyService;
  }

  const disposes = [
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
