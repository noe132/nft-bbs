import { useRef } from 'react';
import classNames from 'classnames';
import { action } from 'mobx';
import { observer, useLocalObservable } from 'mobx-react-lite';
import { Button, IconButton, Popover, Tooltip } from '@mui/material';

// import LockIcon from 'boxicons/svg/regular/bx-lock-alt.svg?fill-icon';
import ExpandIcon from 'boxicons/svg/regular/bx-expand-alt.svg?fill-icon';
import CollapseIcon from 'boxicons/svg/regular/bx-collapse-alt.svg?fill-icon';

import { ThemeLight } from '~/utils';
import { nftService } from '~/service';

interface Props {
  className?: string
}

export const NFTSideBox = observer((props: Props) => {
  const state = useLocalObservable(() => ({
    ntfPopup: {
      nft: null,
      open: false,
    } as {
      nft: typeof nftService.state.nfts[0] | null
      open: boolean
    },
    get nfts() {
      // const list = Array(4).fill(0).map((_, i) => i);
      // return Array(Math.ceil(list.length / 2)).fill(0).map((_, i) => list.slice(i * 2, i * 2 + 2));
      return nftService.state.nfts;
    },
  }));
  const nftSmallIconBox = useRef<HTMLDivElement>(null);

  return (<>
    <div
      className={classNames(
        'flex-col flex-center relative',
        props.className,
      )}
      ref={nftSmallIconBox}
    >
      <div
        className="grid gap-5 w-full px-3 justify-center justify-items-center"
        style={{ gridTemplateColumns: 'repeat(auto-fill, 36px)' }}
      >
        {/* <Tooltip title={<ExpandIcon className="text-20 -mx-1" />}> */}
        {/* {Array(2).fill(0).map((_, i) => (
          <Tooltip key={i} title="通过所持 NFT 进行权限验证功能开发中">
            <button
              className="flex items-stretch w-9 h-9 p-1 border border-white/80"
            // onClick={action(() => { state.ntfPopup = true; })}
            >
              <div className="flex flex-center flex-1 bg-white/20">
                <LockIcon className="text-white text-18" />
              </div>
            </button>
          </Tooltip>
        ))} */}
        {state.nfts.map((v) => (
          <Tooltip key={v.blockNumber} title={<ExpandIcon className="text-20 -mx-1" />}>
            <button
              className="flex items-stretch w-9 h-9 p-1 border border-white/80"
              onClick={action(() => { state.ntfPopup = { open: true, nft: v }; })}
            >
              <div className="flex flex-center flex-1 bg-white/60">
                {v.tokenId}
                {/* <LockIcon className="text-white text-18" /> */}
              </div>
            </button>
          </Tooltip>
        ))}
      </div>
    </div>

    <ThemeLight>
      <Popover
        className="mt-6"
        open={state.ntfPopup.open}
        anchorEl={nftSmallIconBox.current}
        onClose={action(() => { state.ntfPopup.open = false; })}
        transformOrigin={{
          horizontal: 'center',
          vertical: 'top',
        }}
        anchorOrigin={{
          horizontal: 'center',
          vertical: 'bottom',
        }}
        disableScrollLock
      >
        <div className="flex-col items-center relative w-[280px]">
          <IconButton
            className="absolute top-1 right-1"
            size="small"
            onClick={action(() => { state.ntfPopup.open = false; })}
          >
            <CollapseIcon className="text-link text-20" />
          </IconButton>

          {!!state.ntfPopup.nft && (
            <div className="break-all">
              {JSON.stringify(state.ntfPopup.nft)}
            </div>
          )}

          {/* <div className="flex-col gap-y-4 mt-8">
            {state.nfts.map((row, i) => (
              <div
                className="flex gap-x-4 flex-center"
                key={i}
              >
                {row.map((_, j) => (
                  <div
                    className="flex w-22 h-22 p-1 border border-black/15"
                    key={j}
                  >
                    <div className="flex-1 self-stretch bg-red-100" />
                  </div>
                ))}
              </div>
            ))}
          </div> */}

          {/* <div className="text-gray-9c text-center text-12 py-4">
            当前没有持有任何 NFT
          </div> */}

          <div className="border-t self-stretch mx-5" />
          <div className="flex self-stretch">
            <Button
              className="px-5 py-4 flex-1"
              variant="text"
              color="link"
              size="large"
            >
              关联钱包
            </Button>
          </div>
        </div>
      </Popover>
    </ThemeLight>
  </>);
});
