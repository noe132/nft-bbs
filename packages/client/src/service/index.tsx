import { ImageZoomView } from './imageZoom/ImageZoomView';
import { SnackbarContainer } from './snackbar/SnackbarContainer';
import { langService } from './lang';
import { nodeService } from './node';
import { viewService } from './view';
import { keyService } from './key';
import { DialogContainer } from './dialog/DialogContainer';

export * from './dialog';
export * from './imageZoom';
export * from './key';
export * from './lang';
export * from './node';
export * from './snackbar';
export * from './view';

export const initService = () => {
  (window as any).nodeService = nodeService;
  (window as any).viewService = viewService;
  (window as any).keyService = keyService;

  const disposes = [
    langService.init(),
    viewService.init(),
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
