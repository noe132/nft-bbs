import { useRef } from 'react';
import classNames from 'classnames';
import { action } from 'mobx';
import { observer, useLocalObservable } from 'mobx-react-lite';
import { ClickAwayListener, IconButton, Tooltip } from '@mui/material';

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
    selectedNFT: null as null | MVMApi.NFTsResponse['data'][0],

    get hasNFT() {
      return nftService.state.hasNFT;
    },
    get nfts() {
      const address = keyService.state.address;
      return nftService.state.nftMap.get(address) ?? [];
    },
  }));
  const nftBox = useRef<HTMLDivElement>(null);

  if (!configService.state.checkNFT) {
    return null;
  }

  return (
    <div
      className={classNames(
        'relative',
        props.className,
      )}
      ref={nftBox}
    >
      {!state.selectedNFT && (
        <div className="flex-col flex-center relative bg-white/60 py-2">
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
                    onClick={action(() => { state.selectedNFT = v; })}
                    tokenId={v.tokenId}
                  />
                </span>
              </Tooltip>
            ))}
          </div>
        </div>
      )}
      {!!state.selectedNFT && (
        <ThemeLight>
          <ClickAwayListener
            onClickAway={action(() => { state.selectedNFT = null; })}
          >
            <div className="flex-col items-center relative bg-white w-[280px]">
              <IconButton
                className="absolute top-1 right-1"
                size="small"
                onClick={action(() => { state.selectedNFT = null; })}
              >
                <CollapseIcon className="text-link text-20" />
              </IconButton>

              <div className="flex flex-wrap flex-center gap-4 mt-8">
                {!state.nfts.length && (
                  <NFTIcon color="light" size={96} lock />
                )}
                {state.nfts.map((v) => (
                  <NFTIcon
                    highlight={v === state.selectedNFT}
                    key={v.tokenId}
                    color="light"
                    size={96}
                    tokenId={v.tokenId}
                    onClick={action(() => { state.selectedNFT = v; })}
                  />
                ))}
              </div>

              {!state.selectedNFT && !state.hasNFT && (
                <div className="text-gray-9c text-center text-12 mt-4">
                  当前没有持有任何 NFT
                </div>
              )}

              {!!state.selectedNFT && (
                <div className="text-gray-9c text-center text-12 mt-4 w-52 leading-relaxed">
                  <div className="flex justify-between">
                    <div>Contract Address</div>
                    <Tooltip title={state.selectedNFT.asset} disableInteractive>
                      <a
                        href={`https://explorer.rumsystem.net/token/${state.selectedNFT.asset}/`}
                        target="_blank"
                        rel="noopenner"
                      >
                        {state.selectedNFT.asset.slice(0, 6)}...{state.selectedNFT.asset.slice(-4)}
                      </a>
                    </Tooltip>
                  </div>
                  <div className="flex justify-between">
                    <div>Token ID</div>
                    <a
                      href={state.selectedNFT.uri}
                      target="_blank"
                      rel="noopenner"
                    >
                      {state.selectedNFT.tokenId}
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
          </ClickAwayListener>
        </ThemeLight>
      )}
    </div>
  );
});
