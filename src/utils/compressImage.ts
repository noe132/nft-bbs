const drawImage = (img: HTMLImageElement, width: number, height: number, quality?: number) => {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  canvas.getContext('2d')!.drawImage(img, 0, 0, width, height);
  // return canvas.toDataURL('image/jpeg', quality);
  return new Promise<Blob | null>((rs) => {
    canvas.toBlob((v) => rs(v), 'image/jpeg', quality);
  });
};
const MAX_SIZE = 200 * 1024;

/**
 * @param maxSize - in byte (default 200kb)
 */
export const compressImage = async (file: Blob, maxSize = MAX_SIZE) => {
  if (file.size < maxSize) {
    return {
      img: file,
      mineType: file.type,
    };
  }

  const img = new Image();
  const objectUrl = URL.createObjectURL(file);
  img.src = objectUrl;
  await new Promise((rs) => img.addEventListener('load', rs));

  const MAX_WIDTH = 2000;
  const MAX_HEIGHT = 1400;
  let height = img.naturalHeight;
  let width = img.naturalWidth;
  if (img.naturalWidth > MAX_WIDTH) {
    width = MAX_WIDTH;
    height = Math.round((width * img.naturalHeight) / img.naturalWidth);
  }
  if (height > MAX_HEIGHT) {
    height = MAX_HEIGHT;
    width = Math.round((height * img.naturalWidth) / img.naturalHeight);
  }

  const qualities = [0.9, 0.8, 0.7, 0.6, 0.5, 0.4, 0.3];
  let newImage;
  for (const quality of qualities) {
    newImage = await drawImage(img, width, height, quality);
    if (newImage && newImage.size < maxSize) {
      break;
    }
  }

  URL.revokeObjectURL(objectUrl);

  return newImage
    ? {
      img: newImage,
      mineType: 'image/jpeg',
    }
    : null;
};

export const blobToDataUrl = (blob: Blob) => {
  const reader = new FileReader();
  reader.readAsDataURL(blob);
  return new Promise<string>((rs) => {
    reader.addEventListener('loadend', () => {
      rs(reader.result as string);
    });
  });
};
