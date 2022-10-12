import { useRef } from 'react';
import classNames from 'classnames';
import { action } from 'mobx';
import { observer, useLocalObservable } from 'mobx-react-lite';
import { Button, IconButton, Popover, Tooltip } from '@mui/material';

import LockIcon from 'boxicons/svg/regular/bx-lock-alt.svg?fill-icon';
import ExpandIcon from 'boxicons/svg/regular/bx-expand-alt.svg?fill-icon';
import CollapseIcon from 'boxicons/svg/regular/bx-collapse-alt.svg?fill-icon';
import NFTIcon from '~/assets/images/NFT_for_port500.png';

import { ThemeLight } from '~/utils';
import { nftService } from '~/service';

interface Props {
  className?: string
}

export const NFTSideBox = observer((props: Props) => {
  const state = useLocalObservable(() => ({
    ntfPopup: false,

    get hasNFT() {
      return nftService.state.hasNFT;
    },

    nftSelected: false,
  }));
  const nftBox = useRef<HTMLDivElement>(null);

  return (<>
    <div
      className={classNames(
        'flex-col flex-center relative',
        props.className,
      )}
      ref={nftBox}
    >
      <div className="flex flex-wrap gap-5 w-full mx-3 max-w-[92px] justify-center justify-items-center">
        <Tooltip title={<ExpandIcon className="text-20 -mx-1" />}>
          <button
            className={classNames(
              'flex items-stretch flex-none relative w-9 h-9 p-[3px] border',
              state.hasNFT && 'border-white/80',
              !state.hasNFT && 'border-white/35',
            )}
            onClick={action(() => { state.ntfPopup = true; state.nftSelected = false; })}
          >
            <div
              className={classNames(
                'flex flex-center flex-1 bg-white/60 bg-contain',
                !state.hasNFT && 'opacity-40',
              )}
              style={{ backgroundImage: `url("${NFTIcon}")` }}
            />
            {!state.hasNFT && (
              <LockIcon className="absolute-center text-white/80 text-18" />
            )}
          </button>
        </Tooltip>
      </div>
    </div>

    <ThemeLight>
      <Popover
        className="mt-6"
        open={state.ntfPopup}
        anchorEl={nftBox.current}
        onClose={action(() => { state.ntfPopup = false; })}
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
            onClick={action(() => { state.ntfPopup = false; })}
          >
            <CollapseIcon className="text-link text-20" />
          </IconButton>

          <div className="flex-col gap-y-4 mt-8">
            <button
              className={classNames(
                'flex items-stretch flex-none relative w-24 h-24 p-[3px] border border-black/15',
                state.nftSelected && 'outline outline-2 outline-rum-orange outline-offset-[-1px]',
              )}
              onClick={action(() => { state.nftSelected = state.hasNFT ? !state.nftSelected : false; })}
            >
              <div
                className={classNames(
                  'flex flex-center flex-1 bg-white/60 bg-contain',
                  !state.hasNFT && 'opacity-40',
                )}
                style={{ backgroundImage: `url("${NFTIcon}")` }}
              />
              {!state.hasNFT && (
                <LockIcon className="absolute-center text-gray-4a/60 text-36" />
              )}
            </button>
          </div>

          {!state.nftSelected && !state.hasNFT && (
            <div className="text-gray-9c text-center text-12 mt-4">
              当前没有持有任何 NFT
            </div>
          )}

          {state.nftSelected && (
            <div className="text-gray-9c text-center text-12 mt-4 w-52 leading-relaxed">
              <div className="flex justify-between">
                <div>Contract Address</div>
                <Tooltip title="0x20ABe07F7bbEC816e309e906a823844e7aE37b8d">
                  <a
                    href="https://explorer.rumsystem.net/token/0x20ABe07F7bbEC816e309e906a823844e7aE37b8d/"
                    target="_blank"
                    rel="noopenner"
                  >
                    0x20AB...7b8d
                  </a>
                </Tooltip>
              </div>
              {/* <div className="flex justify-between">
                <div>Token ID</div>
                <div>8407</div>
              </div> */}
              <div className="flex justify-between">
                <div>Token Standard</div>
                <div>ERC-721</div>
              </div>
              <div className="flex justify-between">
                <div>Blockchain</div>
                <div>rum-eth</div>
              </div>
              {/* <div className="flex justify-between">
                <div>Creator Fees</div>
                <div>5%</div>
              </div> */}
            </div>
          )}

          <div className="border-t self-stretch mx-5 mt-4" />
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
