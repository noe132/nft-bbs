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
    return { img: file, mineType: file.type };
  }

  const img = new Image();
  const objectUrl = URL.createObjectURL(file);
  img.src = objectUrl;
  await new Promise((rs) => img.addEventListener('load', rs));

  const height = img.naturalHeight;
  const width = img.naturalWidth;

  const strategies = [
    { quality: 0.95, resize: false },
    { quality: 0.92, resize: false },
    { quality: 0.9, resize: false },
    { quality: 0.85, resize: false },
    { quality: 0.8, resize: false },
    { quality: 0.9, resize: [2000, 1400] },
    { quality: 0.85, resize: [2000, 1400] },
    { quality: 0.8, resize: [2000, 1400] },
    { quality: 0.9, resize: [1280, 720] },
    { quality: 0.85, resize: [1280, 720] },
    { quality: 0.8, resize: [1280, 720] },
    { quality: 0.7, resize: [1280, 720] },
    { quality: 0.6, resize: [1280, 720] },
    { quality: 0.8, resize: [1024, 576] },
    { quality: 0.7, resize: [1024, 576] },
    { quality: 0.6, resize: [1024, 576] },
    { quality: 0.8, resize: [768, 432] },
    { quality: 0.7, resize: [768, 432] },
    { quality: 0.6, resize: [768, 432] },
    { quality: 0.5, resize: [768, 432] },
    { quality: 0.5, resize: [768, 432] },
    { quality: 0.6, resize: [512, 360] },
    { quality: 0.5, resize: [512, 360] },
    { quality: 0.4, resize: [512, 360] },
    { quality: 0.3, resize: [512, 360] },
  ] as const;

  let resultImage: Blob | null = null;
  for (const strategy of strategies) {
    let newWidth = width;
    let newHeight = height;
    if (strategy.resize) {
      const ratio = width / height;
      const resizeRatio = strategy.resize[0] / strategy.resize[1];
      newWidth = ratio > resizeRatio ? strategy.resize[0] : strategy.resize[1] * ratio;
      newHeight = ratio < resizeRatio ? strategy.resize[1] : strategy.resize[0] / ratio;
    }
    const newImage = await drawImage(img, newWidth, newHeight, strategy.quality);
    // use base64 encoded size (about 1.37x larger)
    if (!newImage) { continue; }
    const sizeInbyte = newImage?.size;

    if (sizeInbyte * 1.37 < maxSize) {
      resultImage = newImage;
      break;
    }
  }

  URL.revokeObjectURL(objectUrl);

  return resultImage
    ? {
      img: resultImage,
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
