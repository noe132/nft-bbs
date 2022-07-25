import React, { useEffect } from 'react';
import { action, observable, runInAction } from 'mobx';
import bezier from 'bezier-easing';
import { observer, useLocalObservable } from 'mobx-react-lite';
import classNames from 'classnames';

const timingFunc = bezier(0.4, 0, 0.2, 1);

interface Props {
  className?: string
  wrapperClassName?: string
  fold: boolean
  children?: React.ReactNode
  duration?: number
  foldHeight?: number
}

export const Foldable = observer((props: Props) => {
  const state = useLocalObservable(() => ({
    height: props.fold ? props.foldHeight ?? 0 : 'auto',
    current: null as null | {
      animation: Animation
      startTime: number
      startPosition: number
    },
    get foldHeight() {
      return props.foldHeight ?? 0;
    },
    get duration() {
      return props.duration ?? 300;
    },
  }));

  const root = React.createRef<HTMLDivElement>();
  const wrapper = React.createRef<HTMLDivElement>();

  const doFold = () => {
    const full = wrapper.current!.clientHeight;
    let startHeight = full;

    if (state.current) {
      const animationFrom = state.current.startPosition;
      const animationTo = full;
      const animationDistance = animationTo - animationFrom;
      const timeDiff = performance.now() - state.current.startTime;
      const animationTimePosition = timeDiff / state.duration;
      const currentPosition = animationFrom + timingFunc(animationTimePosition) * animationDistance;

      startHeight = currentPosition;
      state.current.animation.cancel();
    }

    const animation = root.current!.animate([
      { height: `${startHeight}px` },
      { height: `${state.foldHeight}px` },
    ], {
      duration: state.duration,
      easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
    });

    const current = observable({
      animation,
      startTime: performance.now(),
      startPosition: startHeight,
    });

    runInAction(() => {
      state.current = current;
      state.height = `${state.foldHeight}px`;
    });

    window.setTimeout(action(() => {
      if (state.current === current) {
        state.current = null;
      }
    }), state.duration);
  };

  const doExpand = () => {
    let startHeight = state.foldHeight;
    const full = wrapper.current!.clientHeight;

    if (state.current) {
      const animationFrom = state.current.startPosition;
      const animationTo = state.foldHeight;
      const animationDistance = animationFrom - animationTo;
      const timeDiff = performance.now() - state.current.startTime;
      const animationTimePosition = timeDiff / state.duration;
      const animationPassed = timingFunc(animationTimePosition) * animationDistance;
      const currentPosition = animationFrom - animationPassed;

      startHeight = currentPosition;
      state.current.animation.cancel();
    }

    runInAction(() => {
      state.height = `${state.foldHeight}px`;
    });

    const animation = root.current!.animate([
      { height: `${startHeight}px` },
      { height: `${full}px` },
    ], {
      duration: state.duration,
      easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
    });

    const current = observable({
      animation,
      startTime: performance.now(),
      startPosition: startHeight,
    });

    runInAction(() => {
      state.current = current;
      state.height = 'auto';
    });

    window.setTimeout(action(() => {
      if (state.current === current) {
        state.current = null;
      }
    }), state.duration);

    // window.setTimeout(action(() => {
    //   state.folding = false;
    // }), state.duration);
  };

  useEffect(() => {
    if (props.fold) {
      doFold();
    } else {
      doExpand();
    }
  }, [props.fold]);

  return (
    <div
      className={classNames(
        'foldable-box w-full ease-in-out overflow-hidden',
        props.wrapperClassName,
      )}
      ref={root}
      style={{
        transitionDuration: `${state.duration}ms`,
        height: state.height,
      }}
    >
      <div
        className={classNames(
          'foldable-wrapper flex-col',
          props.wrapperClassName,
        )}
        ref={wrapper}
      >
        {props.children}
      </div>
    </div>
  );
});
