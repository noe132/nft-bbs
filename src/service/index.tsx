import { ImageZoomView } from './imageZoom/ImageZoomView';
import { SnackbarContainer } from './snackbar/SnackbarContainer';
import { langService } from './lang';
import { nodeService } from './node';

export * from './imageZoom';
export * from './key';
export * from './lang';
export * from './node';
export * from './snackbar';
export * from './view';

export const initService = () => {
  (window as any).nodeService = nodeService;

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
</>);
