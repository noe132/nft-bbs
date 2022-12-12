import React, { useCallback, useEffect, useRef } from 'react';
import classNames from 'classnames';
import { action, reaction } from 'mobx';
import { observer, useLocalObservable } from 'mobx-react-lite';
import { Button, Fade, IconButton, Modal, Tooltip } from '@mui/material';
import { Close, Fullscreen, RotateRight } from '@mui/icons-material';
import ZoomInIcon from 'boxicons/svg/regular/bx-zoom-in.svg?fill-icon';
import ZoomOutIcon from 'boxicons/svg/regular/bx-zoom-out.svg?fill-icon';
import { imageZoomService } from '.';
import { lang } from '~/utils';

const ZOOM_RATIO = 1.1;

export const ImageZoomView = observer(() => {
  const state = useLocalObservable(() => ({
    width: 0,
    height: 0,
    zoom: 0,
    left: 0,
    top: 0,
    rotate: 0,
    requestAnimationFrame: false,
    dragStart: null as null | { isBackDrop: boolean, left: number, top: number, clientX: number, clientY: number },
    get img() {
      return imageZoomService.state.image!;
    },
  }));

  const box = useRef<HTMLDivElement>(null);
  const imageWrapBox = useRef<HTMLDivElement>(null);
  const imageBox = useRef<HTMLDivElement>(null);

  const handleMouseDown = useCallback(action((e: React.MouseEvent) => {
    state.dragStart = {
      isBackDrop: !(e.target instanceof HTMLImageElement),
      left: state.left,
      top: state.top,
      clientX: e.clientX,
      clientY: e.clientY,
    };
  }), []);

  const handleZoom = useCallback(action((delta: 1 | -1) => {
    const newZoom = state.zoom + delta;
    if (newZoom < -32 || newZoom > 32) { return; }
    state.zoom = newZoom;
  }), []);

  const handleExpandScreen = useCallback(action(() => {
    const imageWidth = state.img.naturalWidth;
    const imageHeight = state.img.naturalHeight;
    const imgRatio = state.img.naturalWidth / state.img.naturalHeight;
    const viewPortRatio = window.innerWidth / window.innerHeight;
    if (imgRatio > viewPortRatio) {
      state.zoom = Math.floor(Math.log(window.innerWidth / imageWidth) / Math.log(ZOOM_RATIO));
    } else {
      state.zoom = Math.floor(Math.log(window.innerHeight / imageHeight) / Math.log(ZOOM_RATIO));
    }
    state.left = 0;
    state.top = 0;
  }), []);

  const handleRestore = useCallback(action(() => {
    state.zoom = 0;
    state.left = 0;
    state.top = 0;
  }), []);

  const handleRotate = useCallback(action(() => {
    state.rotate += 90;
  }), []);

  const handleMouseUp = useCallback(action((e: MouseEvent) => {
    if (state.dragStart?.isBackDrop) {
      const deltaX = state.dragStart.clientX - e.clientX;
      const deltaY = state.dragStart.clientY - e.clientY;
      const distanceSquare = deltaX ** 2 + deltaY ** 2;
      if (distanceSquare < 5 ** 2) {
        handleClose();
      }
    }
    state.dragStart = null;
  }), []);

  const handleMouseMove = useCallback(action((e: MouseEvent) => {
    if (!state.dragStart) { return; }
    state.top = state.dragStart.top + e.clientY - state.dragStart.clientY;
    state.left = state.dragStart.left + e.clientX - state.dragStart.clientX;
  }), []);

  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -1 : 1;
    handleZoom(delta);
  }, []);

  const handleClose = useCallback(action(() => {
    imageZoomService.state.open = false;
  }), []);

  useEffect(() => {
    setTimeout(() => {
      box.current?.addEventListener('wheel', handleWheel, false);
    });
    const disposes = [
      reaction(
        () => imageZoomService.state.open,
        action(() => {
          if (imageZoomService.state.open) {
            const img = state.img;
            imageBox.current!.innerHTML = '';
            imageBox.current!.append(img);
            img.style.transitionDuration = '.15s';
            img.style.backgroundColor = 'white';
            state.zoom = 0;
            state.left = 0;
            state.top = 0;

            const imageWidth = img.naturalWidth;
            const imageHeight = img.naturalHeight;

            img.draggable = false;
            img.style.width = `${imageWidth}px`;
            img.style.minWidth = `${imageWidth}px`;
            img.style.maxWidth = `${imageWidth}px`;
            img.style.height = `${imageHeight}px`;
            img.style.minHeight = `${imageHeight}px`;
            img.style.maxHeight = `${imageHeight}px`;
            if (window.innerWidth < imageWidth || window.innerHeight < imageHeight) {
              handleExpandScreen();
            }
          }
        }),
      ),
      reaction(
        () => [state.zoom, state.top, state.left, state.rotate],
        () => {
          state.img.style.transform = [
            `scale(${ZOOM_RATIO ** state.zoom})`,
            `rotate(${state.rotate}deg)`,
          ].join(' ');
          imageBox.current!.style.transform = `translate(${state.left}px, ${state.top}px)`;
        },
      ),
      () => {
        box.current?.removeEventListener('wheel', handleWheel, false);
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      },
    ];
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      disposes.forEach((v) => v());
    };
  }, []);

  return (
    <Modal
      slotProps={{
        backdrop: { className: 'bg-black/80' },
      }}
      open={imageZoomService.state.open}
      onClose={handleClose}
      disableScrollLock
      keepMounted
    >
      <Fade in={imageZoomService.state.open}>
        <div
          className="relative flex-col text-white h-full"
          ref={box}
        >
          <IconButton
            className="absolute z-10 top-3 right-3"
            onClick={handleClose}
          >
            <Close />
          </IconButton>
          <div
            className="flex flex-center image-zoom-box flex-1 overflow-hidden select-none cursor-grab active:cursor-grabbing"
            ref={imageWrapBox}
            onMouseDown={handleMouseDown}
          >
            <div ref={imageBox} />
          </div>
          <div className="absolute bottom-0 left-0 right-0 flex flex-center py-2 gap-x-2 select-none">
            <div className="flex flex-center bg-gray-4a/40 hover:bg-gray-4a/60 py-2 px-4 rounded-lg shadow-4 gap-x-2">
              {[
                {
                  className: 'w-10',
                  onClick: handleExpandScreen,
                  tooltip: lang.imageZoom.fitImage,
                  children: <Fullscreen className="text-30" />,
                },
                {
                  className: 'w-10',
                  onClick: () => handleZoom(-1),
                  tooltip: lang.imageZoom.shrink,
                  children: <ZoomOutIcon className="text-24" />,
                },
                {
                  className: 'w-16',
                  onClick: handleRestore,
                  tooltip: lang.imageZoom.restore,
                  children: `${Math.floor((ZOOM_RATIO ** state.zoom) * 100)}%`,
                },
                {
                  className: 'w-10',
                  onClick: () => handleZoom(1),
                  tooltip: lang.imageZoom.expand,
                  children: <ZoomInIcon className="text-24" />,
                },
                {
                  className: 'w-10',
                  onClick: handleRotate,
                  tooltip: lang.imageZoom.rotateRight,
                  children: <RotateRight className="text-24" />,
                },
              ].map((v, i) => (
                <Tooltip title={v.tooltip} key={i} placement="top" disableInteractive>
                  <Button
                    className={classNames(
                      'h-10 p-0 rounded-lg min-w-0',
                      v.className,
                    )}
                    variant="text"
                    color="inherit"
                    onClick={v.onClick}
                  >
                    {v.children}
                  </Button>
                </Tooltip>
              ))}
            </div>
          </div>
        </div>
      </Fade>
    </Modal>
  );
});
