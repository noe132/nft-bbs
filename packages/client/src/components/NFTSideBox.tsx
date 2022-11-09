import classNames from 'classnames';
import { action, runInAction } from 'mobx';
import { observer, useLocalObservable } from 'mobx-react-lite';
import {
  Button, CircularProgress, ClickAwayListener, Dialog, DialogActions,
  DialogContent, DialogTitle, IconButton, TextField, Tooltip,
} from '@mui/material';

import ExpandIcon from 'boxicons/svg/regular/bx-expand-alt.svg?fill-icon';
import CollapseIcon from 'boxicons/svg/regular/bx-collapse-alt.svg?fill-icon';

import { ThemeLight, useWiderThan } from '~/utils';
import { keyService, nftService, nodeService, snackbarService } from '~/service';
import { NftRequestApi } from '~/apis';
import { NFTIcon } from './NFTIcon';

interface Props {
  className?: string
  mobile?: boolean
}

export const NFTSideBox = observer((props: Props) => {
  const state = useLocalObservable(() => ({
    selectedTokenId: null as null | number,
    expand: false,
    hover: false,
    requestDialog: {
      open: false,
      memo: '',
    },
    get contractAddress() {
      return nodeService.state.config.currentGroup.nft ?? '';
    },
    get loading() {
      return !!nftService.state.tokenIdMap.get(keyService.state.address)?.loading;
    },
    get semiOpaque() {
      return !state.expand && !state.hover && !props.mobile;
    },
  }));
  const isPC = useWiderThan(960);

  const handleClose = () => {
    setTimeout(action(() => {
      state.selectedTokenId = null;
      state.expand = false;
    }));
  };

  const handleApplyNFT = action(() => {
    state.requestDialog.open = true;
  });

  const handleSubmitNftRequest = async () => {
    await NftRequestApi.submitRequest({
      ...await keyService.getAdminSignParam(),
      groupId: nodeService.state.groupId,
      memo: state.requestDialog.memo,
    });
    // TODO: loading
    snackbarService.show('提交成功');
    runInAction(() => {
      state.requestDialog.open = false;
    });
  };

  if (!state.contractAddress) {
    return null;
  }

  return (
    <ThemeLight>
      <ClickAwayListener onClickAway={() => !props.mobile && handleClose()}>
        <Tooltip
          title={isPC ? <ExpandIcon className="text-20 -mx-1" /> : ''}
          open={state.hover && !state.expand}
          disableInteractive
        >
          <div
            className={classNames(
              'flex-col items-stretch relative rounded-b-lg overflow-hidden',
              props.className,
              state.hover && !state.expand && 'cursor-pointer',
              state.semiOpaque && 'bg-white/70',
              !state.semiOpaque && '!bg-white',
            )}
            onMouseEnter={action(() => { state.hover = true; })}
            onMouseLeave={action(() => { state.hover = false; })}
          >
            {state.expand && (
              <IconButton
                className="absolute top-1 right-1 z-10"
                size="small"
                onClick={handleClose}
              >
                <CollapseIcon className="text-link text-20" />
              </IconButton>
            )}

            <div
              className="flex-col flex-center relative rounded-b-lg overflow-hidden py-4 gap-y-4"
              onClick={action(() => { if (!state.expand) { state.expand = true; } })}
            >
              <div
                className={classNames(
                  'flex flex-wrap gap-5 w-full mx-3 justify-center justify-items-center',
                  !state.expand && 'max-w-[150px]',
                  state.expand && 'max-w-[220px]',
                )}
              >
                {state.loading && (
                  <div className="flex flex-center h-15">
                    <CircularProgress className="text-black/50" />
                  </div>
                )}
                {!state.loading && !nftService.state.tokenIds.length && (
                  <NFTIcon
                    className="cursor-pointer"
                    color={state.semiOpaque ? 'semilight' : 'light'}
                    size={state.expand ? 96 : 60}
                    lock
                  />
                )}
                {!state.loading && nftService.state.tokenIds.map((v) => (
                  <NFTIcon
                    className="cursor-pointer"
                    color={state.semiOpaque ? 'semilight' : 'light'}
                    size={state.expand ? 96 : 60}
                    onClick={action(() => { state.expand = true; state.selectedTokenId = v; })}
                    tokenId={v}
                    highlight={state.selectedTokenId === v}
                    key={v}
                  />
                ))}
              </div>

              {state.expand && !nftService.state.hasNFT && (
                <div className="text-gray-9c text-center text-12">
                  当前没有持有任何 NFT
                </div>
              )}

              {!!state.selectedTokenId && (
                <div className="text-gray-9c text-center text-12 mb-4 w-52 leading-relaxed">
                  <div className="flex justify-between">
                    <div>Contract Address</div>
                    <Tooltip title={state.contractAddress} disableInteractive>
                      <a
                        href={`https://explorer.rumsystem.net/token/${state.contractAddress}/`}
                        target="_blank"
                        rel="noopenner"
                      >
                        {state.contractAddress.slice(0, 6)}...{state.contractAddress.slice(-4)}
                      </a>
                    </Tooltip>
                  </div>
                  <div className="flex justify-between">
                    <div>Token ID</div>
                    <a
                      href={`https://explorer.rumsystem.net/token/${state.contractAddress}/instance/${state.selectedTokenId}`}
                      target="_blank"
                      rel="noopenner"
                    >
                      {state.selectedTokenId}
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
                </div>
              )}
            </div>

            {!state.loading && !nftService.state.tokenIds.length && (
              <div className="self-stretch flex flex-col items-stretch">
                <div className="px-4">
                  <div className={classNames(
                    'border-t w-full',
                    state.semiOpaque && 'border-black/10',
                    !state.semiOpaque && 'border-black/15',
                  )}
                  />
                </div>
                <Button
                  className="flex-1 bg-transparent rounded-none py-3"
                  color="link"
                  variant="text"
                  onClick={handleApplyNFT}
                >
                  申请该论坛 NFT
                </Button>
              </div>
            )}
          </div>
        </Tooltip>
      </ClickAwayListener>

      <Dialog
        classes={{
          paper: classNames(
            !isPC && 'mx-2',
            'w-full max-w-[400px]',
          ),
        }}
        open={state.requestDialog.open}
        onClose={action(() => { state.requestDialog.open = false; })}
      >
        <DialogTitle>申请该论坛 NFT</DialogTitle>
        <DialogContent className="overflow-visible">
          <TextField
            className="w-full"
            minRows={4}
            maxRows={6}
            label="申请理由"
            multiline
            value={state.requestDialog.memo}
            onChange={action((e) => { state.requestDialog.memo = e.target.value; })}
          />
        </DialogContent>
        <DialogActions className="p-4">
          <Button
            className="text-gray-88"
            color="inherit"
            variant="outlined"
            onClick={action(() => { state.requestDialog.open = false; })}
          >
            取消
          </Button>
          <Button
            color="link"
            variant="outlined"
            onClick={handleSubmitNftRequest}
          >
            提交
          </Button>
        </DialogActions>

      </Dialog>
    </ThemeLight>
  );
});
