import { observable, runInAction } from 'mobx';

const state = observable({
  open: false,
  image: null as null | HTMLImageElement,
});

const openImage = async (img: HTMLImageElement | string) => {
  const image = typeof img === 'string'
    ? new Image()
    : img.cloneNode() as HTMLImageElement;
  if (typeof img === 'string') {
    image.src = img;
  }
  await new Promise((rs) => {
    image.addEventListener('load', rs);
  });
  runInAction(() => {
    state.image = image;
    state.open = true;
  });
};

export const imageZoomService = {
  state,
  openImage,
};
