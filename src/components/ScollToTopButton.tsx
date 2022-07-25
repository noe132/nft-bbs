import { useEffect, useRef } from 'react';
import classNames from 'classnames';
import { action } from 'mobx';
import { observer, useLocalObservable } from 'mobx-react-lite';
import { Button, ButtonProps, Fade } from '@mui/material';
import { ArrowUpward } from '@mui/icons-material';

export const ScrollToTopButton = observer((props: ButtonProps & { threshold?: number }) => {
  const state = useLocalObservable(() => ({
    content: '',
    showTopButton: false,
    scrollBox: null as null | HTMLElement,
  }));

  const buttonRef = useRef<HTMLButtonElement>(null);

  const handleScrollToTop = () => {
    state.scrollBox?.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  };

  useEffect(() => {
    const onScroll = action(() => {
      state.showTopButton = scrollBox!.scrollTop > (props.threshold ?? 200);
    });
    let scrollBox: null | HTMLElement = buttonRef.current;
    while (scrollBox) {
      if (scrollBox.classList.contains('scroll-box')) {
        break;
      }
      scrollBox = scrollBox.parentElement;
    }
    if (scrollBox) {
      state.scrollBox = scrollBox;
    }
    scrollBox?.addEventListener('scroll', onScroll);
    return () => {
      scrollBox?.removeEventListener('scroll', onScroll);
    };
  }, []);

  const { className, threshold, ...restProps } = props;

  return (
    <Fade in={state.showTopButton}>
      <Button
        className={classNames(
          'rounded-full h-12 w-12 min-w-0 p-0 flex-center text-white',
          className,
        )}
        color="inherit"
        variant="outlined"
        onClick={handleScrollToTop}
        ref={buttonRef}
        {...restProps}
      >
        <ArrowUpward className="text-26" />
      </Button>
    </Fade>
  );
});
