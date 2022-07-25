import { action, observable } from 'mobx';

const state = observable({
  open: false,
  image: null as null | HTMLImageElement,
});

const openImage = action((img: HTMLImageElement) => {
  const clone = img.cloneNode() as HTMLImageElement;
  state.image = clone;
  state.open = true;
});

export const imageZoomService = {
  state,
  openImage,
};
