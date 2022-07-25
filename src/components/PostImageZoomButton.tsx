import { useEffect, useRef } from 'react';
import classNames from 'classnames';
import { action, runInAction } from 'mobx';
import { observer, useLocalObservable } from 'mobx-react-lite';
import ZoomInIcon from 'boxicons/svg/regular/bx-zoom-in.svg?fill-icon';

export const PostImageZoomButton = observer((props: { className?: string }) => {
  const state = useLocalObservable(() => ({
    show: false,
    top: 0,
    left: 0,
    parent: null as null | HTMLElement,
    currentImg: null as null | HTMLImageElement,
  }));

  const icon = useRef<HTMLDivElement>(null);

  const handleMouseEnter = action((e: MouseEvent) => {
    if (!(e.target instanceof HTMLImageElement)) {
      return;
    }
    if (e.target.clientHeight < 50 || e.target.clientWidth < 50) {
      return;
    }
    let top = e.target.clientHeight;
    let left = 0;
    let el: HTMLElement | null = e.target;
    while (el) {
      top += el.offsetTop;
      left += el.offsetLeft;
      if (el.offsetParent === state.parent) {
        break;
      }
      el = el.offsetParent as HTMLElement | null;
    }
    state.top = top;
    state.left = left;
    state.show = true;
    state.currentImg = e.target;
  });

  const handleMouseLeave = action((e: MouseEvent) => {
    if (e.target instanceof HTMLImageElement) {
      state.currentImg = null;
      state.show = false;
    }
  });

  useEffect(() => {
    const parent = icon.current?.parentElement;
    if (!parent) { return; }
    runInAction(() => {
      state.parent = parent;
    });
    parent.addEventListener('mouseover', handleMouseEnter);
    parent.addEventListener('mouseout', handleMouseLeave);
    return () => {
      parent.removeEventListener('mouseover', handleMouseEnter);
      parent.removeEventListener('mouseout', handleMouseLeave);
    };
  }, []);

  return (
    <div
      className={classNames(
        'absolute -translate-y-full pointer-events-none',
        !state.show && 'hidden',
        props.className,
      )}
      ref={icon}
      style={{
        top: `${state.top}px`,
        left: `${state.left}px`,
      }}
    >
      <ZoomInIcon />
    </div>
  );
});
