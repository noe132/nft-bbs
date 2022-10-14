import { useRef } from 'react';
import classNames from 'classnames';
import { action } from 'mobx';
import { observer, useLocalObservable } from 'mobx-react-lite';
import { IconButton, Popover, Tooltip } from '@mui/material';

import ExpandIcon from 'boxicons/svg/regular/bx-expand-alt.svg?fill-icon';
import CollapseIcon from 'boxicons/svg/regular/bx-collapse-alt.svg?fill-icon';

import { MVMApi } from '~/apis';
import { ThemeLight } from '~/utils';
import { configService, keyService, nftService } from '~/service';
import { NFTIcon } from './NFTIcon';

interface Props {
  className?: string
}

export const NFTSideBox = observer((props: Props) => {
  const state = useLocalObservable(() => ({
    ntfPopup: {
      open: false,
      nft: null as null | MVMApi.NFTsResponse['data'][0],
    },

    get hasNFT() {
      return nftService.state.hasNFT;
    },
    get nfts() {
      const address = keyService.state.address;
      return nftService.state.nftMap.get(address) ?? [];
    },

    nftSelected: false,
  }));
  const nftBox = useRef<HTMLDivElement>(null);

  if (!configService.state.checkNFT) {
    return null;
  }

  return (<>
    <div
      className={classNames(
        'flex-col flex-center relative',
        props.className,
      )}
      ref={nftBox}
    >
      <div className="flex flex-wrap gap-5 w-full mx-3 max-w-[140px] justify-center justify-items-center">
        {!state.nfts.length && (
          <Tooltip title={<ExpandIcon className="text-20 -mx-1" />}>
            <span>
              <NFTIcon color="dark" size={60} lock />
            </span>
          </Tooltip>
        )}
        {state.nfts.map((v) => (
          <Tooltip title={<ExpandIcon className="text-20 -mx-1" />} key={v.tokenId}>
            <span>
              <NFTIcon
                color="dark"
                size={60}
                onClick={action(() => { state.ntfPopup = { open: true, nft: v }; })}
                tokenId={v.tokenId}
              />
            </span>
          </Tooltip>
        ))}
      </div>
    </div>

    <ThemeLight>
      <Popover
        className="mt-6"
        open={state.ntfPopup.open}
        anchorEl={nftBox.current}
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

          <div className="flex-col gap-y-4 mt-8">
            {!state.nfts.length && (
              <NFTIcon color="light" size={96} lock />
            )}
            {state.nfts.map((v) => (
              <NFTIcon
                highlight={v === state.ntfPopup.nft}
                key={v.tokenId}
                color="light"
                size={96}
                tokenId={v.tokenId}
                onClick={action(() => { state.ntfPopup.nft = v; })}
              />
            ))}
          </div>

          {!state.nftSelected && !state.hasNFT && (
            <div className="text-gray-9c text-center text-12 mt-4">
              当前没有持有任何 NFT
            </div>
          )}

          {!!state.ntfPopup.nft && (
            <div className="text-gray-9c text-center text-12 mt-4 w-52 leading-relaxed">
              <div className="flex justify-between">
                <div>Contract Address</div>
                <Tooltip title={state.ntfPopup.nft.asset} disableInteractive>
                  <a
                    href={`https://explorer.rumsystem.net/token/${state.ntfPopup.nft.asset}/`}
                    target="_blank"
                    rel="noopenner"
                  >
                    {state.ntfPopup.nft.asset.slice(0, 6)}...{state.ntfPopup.nft.asset.slice(-4)}
                  </a>
                </Tooltip>
              </div>
              <div className="flex justify-between">
                <div>Token ID</div>
                <a
                  href={state.ntfPopup.nft.uri}
                  target="_blank"
                  rel="noopenner"
                >
                  {state.ntfPopup.nft.tokenId}
                </a>
              </div>
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

          <div className="border-t self-stretch mx-5 mt-6" />
          {/* <div className="flex self-stretch">
            <Button
              className="px-5 py-4 flex-1"
              variant="text"
              color="link"
              size="large"
            >
              关联钱包
            </Button>
          </div> */}
        </div>
      </Popover>
    </ThemeLight>
  </>);
});
