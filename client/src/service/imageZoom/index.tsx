import { action, observable } from 'mobx';

const state = observable({
  open: false,
  image: null as null | HTMLImageElement,
});

const openImage = action((img: HTMLImageElement | string) => {
  let image;
  if (typeof img === 'string') {
    image = new Image();
    image.src = img;
  } else {
    image = img.cloneNode() as HTMLImageElement;
  }
  state.image = image;
  state.open = true;
});

export const imageZoomService = {
  state,
  openImage,
};
