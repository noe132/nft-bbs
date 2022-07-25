import React, { ImgHTMLAttributes } from 'react';
import { useWiderThan } from '~/utils';

type Props = ImgHTMLAttributes<Element> & {
  mbWidth?: number | string
  mbHeight?: number | string
  retainSize?: boolean
};

/** img with size hint to prevent layout shift */
export const ImgBox = (props: Props) => {
  const {
    width,
    height,
    mbWidth,
    mbHeight,
    ...restProps
  } = props;

  const isPC = useWiderThan(960);
  const isMobile = !isPC;

  const imgRef = React.useRef<HTMLImageElement>(null);

  const [size, setSize] = React.useState({
    ...width && isPC ? { width: `${width}px` } : {},
    ...height && isPC ? { height: `${height}px` } : {},
    ...mbWidth && isMobile ? { width: `${mbWidth}px` } : {},
    ...mbHeight && isMobile ? { height: `${mbHeight}px` } : {},
  });

  const handleOnLoad = () => {
    if (props.retainSize) { return; }
    setSize({});
  };

  return (
    <img
      {...restProps}
      style={size}
      ref={imgRef}
      onLoad={handleOnLoad}
    />
  );
};
