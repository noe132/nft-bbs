import React from 'react';

type SetItem = [number, React.Dispatch<React.SetStateAction<boolean>>];
const widerListeners = new Set<SetItem>();
const lessListeners = new Set<SetItem>();
const handleResize = () => {
  const innerWidth = window.innerWidth;
  Array.from(lessListeners).forEach((v) => {
    v[1](innerWidth < v[0]);
  });
  Array.from(widerListeners).forEach((v) => {
    v[1](innerWidth >= v[0]);
  });
};

if (typeof document !== 'undefined') {
  window.addEventListener('resize', handleResize);
}

export const useLessThan = (width: number) => {
  if (typeof document === 'undefined') {
    return width < 960;
  }
  const [state, setState] = React.useState(window.innerWidth < width);

  React.useEffect(() => {
    const item: SetItem = [width, setState];
    lessListeners.add(item);
    return () => {
      lessListeners.delete(item);
    };
  }, []);

  return state;
};

/** 当屏幕宽度大于指定值时 */
export const useWiderThan = (width: number) => {
  if (typeof document === 'undefined') {
    return width >= 960;
  }
  const [state, setState] = React.useState(window.innerWidth >= width);

  React.useEffect(() => {
    const item: SetItem = [width, setState];
    widerListeners.add(item);
    return () => {
      widerListeners.delete(item);
    };
  }, []);

  return state;
};
