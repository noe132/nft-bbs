import React, { useRef } from 'react';
import { action, runInAction } from 'mobx';
import { observer, useLocalObservable } from 'mobx-react-lite';
import { Close } from '@mui/icons-material';
import { CircularProgress, Dialog, IconButton, OutlinedInput, Tooltip } from '@mui/material';

import { createPromise, sleep, ThemeLight } from '~/utils';
import { pixabayApi } from '~/api';
import { modalViewState } from './helper/modalViewState';

export const imageLib = action(() => {
  const p = createPromise<string | null>();
  modalViewState.push({
    component: ImageLib,
    resolve: p.rs,
  });
  return p.p;
});

interface ModalProps {
  rs: (file: string | null) => unknown
}

const ImageLib = observer((props: ModalProps) => {
  const state = useLocalObservable(() => ({
    open: true,
  }));

  const handleClose = action(() => {
    props.rs(null);
    state.open = false;
  });

  return (
    <ThemeLight>
      <Dialog open={state.open} onClose={handleClose} maxWidth={false}>
        <div className="flex-col relative ">
          <IconButton
            className="absolute top-2 right-2"
            onClick={handleClose}
          >
            <Close />
          </IconButton>
          <A rs={props.rs} />
        </div>
      </Dialog>
    </ThemeLight>
  );
});

const containsChinese = (s: string) => {
  const pattern = /[\u4E00-\u9FA5]|[\uFE30-\uFFA0]/gi;
  if (pattern.exec(s)) {
    return true;
  }
  return false;
};
const LIMIT = 24;

const A = observer((props: { rs: (url: string) => unknown }) => {
  const state = useLocalObservable(() => ({
    isFetching: false,
    isFetched: false,
    page: 1,
    searchKeyword: '',
    hasMore: true,
    total: 0,
    images: [] as any,
    tooltipDisableHoverListener: true,
    get ids() {
      return this.images.map((image: any) => image.id);
    },
  }));
  const RATIO = 16 / 9;

  const sentryRef = useRef<HTMLDivElement>(null);

  const handleInputKeyDown = action((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter') { return; }
    const value = e.target.value;
    state.images = [];
    state.page = 1;
    state.isFetched = false;
    state.searchKeyword = value;
  });

  React.useEffect(() => {
    const io = new IntersectionObserver(action((entries) => {
      if (entries[0].intersectionRatio > 0.5) {
        state.page += 1;
      }
    }), { threshold: 0.5 });

    if (sentryRef.current) {
      io.observe(sentryRef.current);
    }

    return () => io.disconnect();
  }, []);

  React.useEffect(() => {
    if (state.isFetching || !state.hasMore) {
      return;
    }
    runInAction(() => {
      state.isFetching = true;
    });
    (async () => {
      try {
        const query: string = state.searchKeyword.split(' ').join('+');
        const res: any = await pixabayApi.search({
          q: query,
          page: state.page,
          per_page: LIMIT,
          lang: containsChinese(query) ? 'zh' : 'en',
        });
        runInAction(() => {
          for (const image of res.hits) {
            if (!state.ids.includes(image.id)) {
              state.images.push(image);
            }
          }
          state.total = res.totalHits;
          state.hasMore = res.hits.length === LIMIT;
        });
      } catch (err) {
        runInAction(() => {
          state.hasMore = false;
        });
        // eslint-disable-next-line no-console
        console.log(err);
      }
      runInAction(() => {
        state.isFetching = false;
        state.isFetched = true;
      });
      if (state.tooltipDisableHoverListener) {
        await sleep(2000);
        runInAction(() => {
          state.tooltipDisableHoverListener = false;
        });
      }
    })();
  }, [state.page, state.searchKeyword]);

  return (
    <div className="pixabay-image-lib bg-white rounded-0 text-center p-0 w-[640px]">
      <div className="relative">
        <div className="flex justify-center mt-6">
          <OutlinedInput
            className="w-64 rounded-full"
            size="small"
            placeholder="关键词"
            onKeyDown={handleInputKeyDown}
          />
        </div>
        <Tooltip
          placement="top"
          arrow
          title="图片由 Pixabay 提供，都是免费可自由使用的"
        >
          <a
            href="https://pixabay.com/zh"
            target="_blank"
            rel="noopener noreferrer"
            className="absolute top-5 left-5 w-20"
          >
            <img src="https://i.xue.cn/172e1214.png" alt="pixabay" />
          </a>
        </Tooltip>
        <div className="mt-2 overflow-y-auto p-1 h-[400px]">
          <div
            className="grid-container grid gap-4 p-4 justify-center"
            style={{
              gridTemplateColumns: 'repeat(4, 132px)',
            }}
          >
            {state.images.map((image: any) => (
              <div key={image.id} id={image.id}>
                <Tooltip
                  placement="left"
                  arrow
                  enterDelay={800}
                  enterNextDelay={800}
                  disableHoverListener={state.tooltipDisableHoverListener}
                  disableTouchListener
                  title={
                    <img
                      className="max-w-none"
                      style={{
                        width: Math.min(image.webformatWidth, 280),
                        height:
                          (Math.min(image.webformatWidth, 280)
                            * image.webformatHeight)
                          / image.webformatWidth,
                      }}
                      src={image.webformatURL.replace('_640', '_340')}
                      alt="image"
                    />
                  }
                >
                  <div
                    className="rounded image cursor-pointer"
                    style={{
                      backgroundImage: `url(${image.webformatURL.replace(
                        '_640',
                        '_180',
                      )})`,
                      width: 132,
                      height: 132 / RATIO,
                    }}
                    onClick={() => props.rs(image.webformatURL)}
                  />
                </Tooltip>
              </div>
            ))}
          </div>
          {state.isFetched && state.total === 0 && (
            <div className="py-20 text-center text-gray-500 text-14">
              没有搜索到相关的图片呢
              <br />
              <div className="mt-1">换个关键词试试</div>
              <div className="mt-1">也可以换英文试一试</div>
            </div>
          )}
          {state.isFetched
            && state.total > 0
            && state.total === state.images.length && (
            <div className="pb-5 pt-5">
              <div className="text-gray-500 flex items-center justify-center">
                <span className="h-px bg-gray-300 w-16 mr-2" />
                <span className="text-gray-300">·</span>
                <span className="h-px bg-gray-300 w-16 ml-2" />
              </div>
            </div>
          )}
          <div className="h-px w-full" ref={sentryRef} />
          {!state.isFetched && (
            <div className="pt-20 mt-2">
              <CircularProgress className="text-gray-af" size={32} />
            </div>
          )}
          {state.isFetched && state.hasMore && (
            <div className="py-8 flex items-center justify-center">
              <CircularProgress className="text-gray-af" size={32} />
            </div>
          )}
        </div>
        <style>
          {`
            .pixabay-image-lib .image {
              background-size: cover;
              background-position: center center;
            }
            // .pixabay-image-lib .grid-container {
            //   padding: 10px 4px;
            //   width: 100%;
            //   display: grid;
            //   grid-template-columns: repeat(4, 1fr);
            //   grid-auto-rows: minmax(62px, 62px);
            //   row-gap: 24px;
            //   column-gap: 0;
            //   align-items: center;
            //   justify-items: center;
            // }
            // .pixabay-image-lib .grid-container.sm {
            //   padding: 10px 12px;
            //   grid-template-columns: repeat(2, 1fr);
            //   row-gap: 38px;
            // }
          `}
        </style>
      </div>
    </div>
  );
});
