import React, { useRef } from 'react';
import { action, runInAction } from 'mobx';
import { observer, useLocalObservable } from 'mobx-react-lite';
import { Close } from '@mui/icons-material';
import { CircularProgress, Dialog, IconButton, OutlinedInput, Tooltip } from '@mui/material';

import { createPromise, lang, runLoading, sleep, ThemeLight } from '~/utils';
import { PixabayApi } from '~/apis';
import { Scrollable } from '~/components';
import { modalViewState } from './helper/modalViewState';

export const imageLib = action(() => {
  const p = createPromise<Blob | null>();
  modalViewState.push({
    component: ImageLib,
    resolve: p.rs,
  });
  return p.p;
});

interface ModalProps {
  rs: (file: Blob | null) => unknown
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
        <div className="flex-col relative">
          <IconButton
            className="absolute top-2 right-2 z-50"
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

const A = observer((props: { rs: (file: Blob) => unknown }) => {
  const state = useLocalObservable(() => ({
    isFetching: false,
    isFetched: false,
    page: 1,
    searchKeyword: '',
    hasMore: true,
    total: 0,
    images: [] as PixabayApi.PixabayResponse['hits'],
    tooltipDisableHoverListener: true,

    loading: false,
    get ids() {
      return this.images.map((image) => image.id);
    },
  }));
  const RATIO = 16 / 9;

  const sentryRef = useRef<HTMLDivElement>(null);

  const handleInputKeyDown = action((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter') { return; }
    const target = e.target as HTMLInputElement;
    const value = target.value;
    state.images = [];
    state.page = 1;
    state.isFetched = false;
    state.searchKeyword = value;
  });

  const handleSelectImage = (url: string) => {
    if (!url) { return; }
    runLoading(
      (l) => { state.loading = l; },
      async () => {
        const blob = await (await fetch(url)).blob();
        props.rs(blob);
      },
    );
  };

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

  const loadData = async () => {
    if (state.isFetching || !state.hasMore) { return; }
    await runLoading(
      (l) => { state.isFetched = l; },
      async () => {
        try {
          const query = state.searchKeyword.split(' ').join('+');
          const res = await PixabayApi.search({
            q: query,
            page: state.page,
            per_page: LIMIT,
            lang: containsChinese(query) ? 'zh' : 'en',
          });
          if (!res) { return; }
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
          state.isFetched = true;
        });
        if (state.tooltipDisableHoverListener) {
          await sleep(2000);
          runInAction(() => {
            state.tooltipDisableHoverListener = false;
          });
        }
      },
    );
  };

  React.useEffect(() => {
    loadData();
  }, [state.page, state.searchKeyword]);

  return (
    <div className="relative pixabay-image-lib bg-white rounded-0 text-center p-0 w-[640px]">
      {state.loading && (
        <div className="flex flex-center absolute inset-0 bg-black/50 z-10">
          <CircularProgress className="text-white" />
        </div>
      )}
      <div className="relative">
        <div className="flex justify-center mt-6">
          <OutlinedInput
            className="w-64 rounded-full"
            size="small"
            placeholder={lang.imageLib.keywords}
            onKeyDown={handleInputKeyDown}
          />
        </div>
        <Tooltip
          placement="top"
          arrow
          title={lang.imageLib.tip}
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
        <Scrollable className="mt-2 p-1 h-[400px]">
          <div
            className="grid-container grid gap-4 p-4 justify-center"
            style={{
              gridTemplateColumns: 'repeat(4, 132px)',
            }}
          >
            {state.images.map((image) => (
              <div key={image.id}>
                <Tooltip
                  placement="top"
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
                    className="rounded image cursor-pointer bg-cover bg-center"
                    style={{
                      backgroundImage: `url(${image.webformatURL.replace(
                        '_640',
                        '_180',
                      )})`,
                      width: 132,
                      height: 132 / RATIO,
                    }}
                    onClick={() => handleSelectImage(image.webformatURL)}
                  />
                </Tooltip>
              </div>
            ))}
          </div>
          {state.isFetched && state.total === 0 && (
            <div className="py-20 text-center text-gray-500 text-14">
              {lang.imageLib.noImages.map((v, i) => (
                <p className="mt-1" key={i}>{v}</p>
              ))}
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
        </Scrollable>
      </div>
    </div>
  );
});
