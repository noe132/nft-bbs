import React from 'react';
import classNames from 'classnames';
import { action } from 'mobx';
import { observer, useLocalObservable } from 'mobx-react-lite';

import { getScrollBarWidth } from './getScrollbarWdith';

interface Props {
  children?: React.ReactNode
  className?: string
  wrapperClassName?: string
  trackClassName?: string
  thumbClassName?: string
  scrollBoxRef?: React.MutableRefObject<HTMLDivElement | null>
  scrollBoxProps?: Partial<React.HTMLAttributes<HTMLDivElement>>
  scrollBoxClassName?: string
  onScroll?: () => unknown
  light?: boolean
  hideTrackOnMobile?: boolean
  autoHideMode?: boolean
  size?: 'small' | 'normal' | 'large' | {
    thumb: number
    thumbHover: number
    track: number
  }
}

const widthMap = {
  small: {
    thumb: 6,
    thumbHover: 8,
    track: 12,
  },
  normal: {
    thumb: 8,
    thumbHover: 10,
    track: 16,
  },
  large: {
    thumb: 10,
    thumbHover: 13,
    track: 20,
  },
};

export const Scrollable = observer((props: Props) => {
  const state = useLocalObservable(() => ({
    hide: !!props.autoHideMode,
    hover: false,
    drag: {
      start: false,
      startY: 0,
      startScrollTop: 0,
    },
    noScrollBar: true,
    scrollbar: {
      track: {
        top: 0,
      },
      thumb: {
        height: 0,
        size: '0',
        position: '0',
      },
    },
    scrollbarWidth: getScrollBarWidth(),

    get thumbStyle() {
      return {
        height: `${state.scrollbar.thumb.size}%`,
        top: `${state.scrollbar.thumb.position}%`,
      };
    },
    get scrollBoxStyle() {
      return {
        'marginRight': `${-state.scrollbarWidth}px`,
      };
    },
  }));

  const containerRef = React.useRef() as React.MutableRefObject<HTMLDivElement | null>;
  const contentWrapperRef = React.useRef<HTMLDivElement>(null);
  const thumb = React.useRef<HTMLDivElement>(null);

  const calcScrollbarWidth = action(() => {
    state.scrollbarWidth = getScrollBarWidth();
  });

  const handleScrollbarThumbClick = action((e: React.MouseEvent) => {
    if (!containerRef.current) {
      return;
    }
    e.preventDefault();
    state.drag.start = true;
    state.drag.startY = e.clientY;
    state.drag.startScrollTop = containerRef.current.scrollTop;
  });

  const handleScrollbarThumbMousemove = action((e: MouseEvent) => {
    if (!containerRef.current) {
      return;
    }
    if (state.drag.start) {
      e.preventDefault();

      const {
        scrollHeight,
        clientHeight,
      } = containerRef.current;

      const scrollSpacePixel = scrollHeight - clientHeight;
      const scrollWindowPixel = clientHeight * (1 - state.scrollbar.thumb.height);
      const mouseMovePixel = e.clientY - state.drag.startY;
      const movePercentage = mouseMovePixel / scrollWindowPixel;
      const scrollDeltaPixel = scrollSpacePixel * movePercentage;

      let targetScrollTop = state.drag.startScrollTop + scrollDeltaPixel;
      if (targetScrollTop > scrollSpacePixel) {
        targetScrollTop = scrollSpacePixel;
      }
      if (targetScrollTop < 0) {
        targetScrollTop = 0;
      }

      containerRef.current.scrollTop = targetScrollTop;
    }
  });

  const handleScrollbarThumbMouseup = action(() => {
    state.drag.start = false;
  });

  const handleTrackClick = (e: React.MouseEvent) => {
    if (!containerRef.current) { return; }
    if (e.target !== e.currentTarget) { return; }
    const rect = e.currentTarget.getBoundingClientRect();
    const clickPosition = ((e.clientY - rect.top) / rect.height) * 100;
    const isTop = clickPosition < Number(state.scrollbar.thumb.position);
    const isBottom = clickPosition > (Number(state.scrollbar.thumb.position) + Number(state.scrollbar.thumb.height));
    if (isTop) {
      containerRef.current.scrollTo({
        top: containerRef.current.scrollTop - containerRef.current.clientHeight,
      });
    }
    if (isBottom) {
      containerRef.current.scrollTo({
        top: containerRef.current.scrollTop + containerRef.current.clientHeight,
      });
    }
  };

  const calcScrollbar = action(() => {
    if (!containerRef.current) {
      return;
    }
    const {
      scrollTop,
      scrollHeight,
      clientHeight,
    } = containerRef.current;

    const sizePercentage = clientHeight / scrollHeight;
    const scrollSpace = scrollHeight - clientHeight;
    const scrollPercentage = scrollTop / scrollSpace;

    const thumbHeight = Math.max(sizePercentage, 0.04);
    const thumbTop = (1 - thumbHeight) * scrollPercentage;

    state.noScrollBar = sizePercentage >= 1;

    const thumbSize = (thumbHeight * 100).toFixed(4);
    const thumbPosition = (thumbTop * 100).toFixed(4);

    // prevent infinite update
    if (state.scrollbar.track.top !== scrollTop) {
      state.scrollbar.track.top = scrollTop;
    }
    if (state.scrollbar.thumb.height !== thumbHeight) {
      state.scrollbar.thumb.height = thumbHeight;
    }
    if (state.scrollbar.thumb.size !== thumbSize) {
      state.scrollbar.thumb.size = thumbSize;
    }
    if (state.scrollbar.thumb.position !== thumbPosition) {
      state.scrollbar.thumb.position = thumbPosition;
    }
  });

  React.useEffect(() => {
    window.addEventListener('resize', calcScrollbarWidth, false);
    window.addEventListener('mousemove', handleScrollbarThumbMousemove, false);
    window.addEventListener('mouseup', handleScrollbarThumbMouseup, false);

    const ro = new ResizeObserver(calcScrollbar);
    window.setTimeout(() => {
      if (containerRef.current) {
        ro.observe(containerRef.current);
      }
      if (contentWrapperRef.current) {
        ro.observe(contentWrapperRef.current);
      }
    });

    calcScrollbar();

    return () => {
      window.removeEventListener('resize', calcScrollbarWidth, false);
      window.removeEventListener('mousemove', handleScrollbarThumbMousemove, false);
      window.removeEventListener('mouseup', handleScrollbarThumbMouseup, false);
      ro.disconnect();
    };
  }, []);

  React.useEffect(() => {
    calcScrollbar();
  });

  const sizes = typeof props.size === 'object'
    ? props.size
    : widthMap[props.size ?? 'normal'];

  return (
    <div
      className={classNames(
        'scrollable relative flex overflow-hidden',
        props.className,
      )}
      onMouseEnter={action(() => { if (props.autoHideMode) { state.hide = false; } })}
      onMouseLeave={action(() => { if (props.autoHideMode) { state.hide = true; } })}
    >
      {!(!state.scrollbarWidth && props.hideTrackOnMobile) && (
        <div
          className={classNames(
            'scroll-bar-track absolute top-[3px] right-0 bottom-[3px] z-[200]',
            state.noScrollBar && 'no-scroll-bar',
            !!props.autoHideMode && 'duration-150',
            !!props.autoHideMode && state.hide && 'opacity-0',
            props.trackClassName,
          )}
          style={{ width: `${sizes.track}px` }}
          onClick={handleTrackClick}
          onMouseEnter={action(() => { state.hover = true; })}
          onMouseLeave={action(() => { state.hover = false; })}
        >
          {!state.noScrollBar && (
            <div
              className={classNames(
                'scroll-bar-thumb-box absolute flex justify-center h-0 left-0 right-0 cursor-pointer',
                props.thumbClassName,
              )}
              onMouseDown={handleScrollbarThumbClick}
              style={{ width: `${sizes.track}px`, ...state.thumbStyle }}
            >
              <div
                className={classNames(
                  'scroll-bar-thumb ease-in-out duration-100 rounded-full',
                  !props.light && 'bg-black/15 group-hover:bg-black/25',
                  props.light && 'bg-white/25 group-hover:bg-white/40',
                  !props.light && state.drag.start && 'bg-black/25',
                  props.light && state.drag.start && 'bg-white/40',
                )}
                ref={thumb}
                style={{ width: `${state.hover || state.drag.start ? sizes.thumbHover : sizes.thumb}px` }}
              />
            </div>
          )}
        </div>
      )}
      <div className="scroll-content flex-col flex-auto overflow-hidden">
        <div
          style={state.scrollBoxStyle}
          className={classNames(
            'scroll-box flex-col flex-auto overflow-x-hidden overflow-y-scroll',
            state.noScrollBar && 'pr-0',
            props.scrollBoxClassName,
          )}
          onScroll={() => {
            calcScrollbar();
            if (props.onScroll) {
              props.onScroll();
            }
          }}
          onMouseEnter={calcScrollbar}
          ref={(a) => {
            if (props.scrollBoxRef) {
              props.scrollBoxRef.current = a;
            }
            containerRef.current = a || null;
          }}
          {...props.scrollBoxProps}
        >
          <div
            className={classNames(
              'content-wrapper flex-1 w-full h-max',
              props.wrapperClassName,
            )}
            ref={contentWrapperRef}
          >
            {props.children}
          </div>
        </div>
      </div>
    </div>
  );
});
