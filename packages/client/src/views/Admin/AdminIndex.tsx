import { CircularProgress, Tab, Tabs } from '@mui/material';
import { action } from 'mobx';
import { observer, useLocalObservable } from 'mobx-react-lite';
import { useEffect } from 'react';
import { Scrollable } from '~/components';
import { keyService, nodeService } from '~/service';
import { NFTRequestPage } from './NFTRequestPage';


export const AdminIndex = observer(() => {
  const state = useLocalObservable(() => ({
    tab: 0,
    inited: false,
  }));

  const init = async () => {
    await nodeService.config.load();
    await keyService.parseSavedLoginState();
    keyService.loginBySavedState();
  };

  useEffect(() => {
    init().then(action(() => {
      state.inited = true;
    }));
  }, []);

  return (
    <div className="flex-col items-center w-full h-[100vh] text-white">
      <Tabs
        className="w-full max-w-[1200px] bg-black/80 border-b border-white/30"
        value={state.tab}
        onChange={action((_, v) => { state.tab = v; })}
      >
        <Tab label="NFT申请" />
        <Tab label="种子网络" />
      </Tabs>
      {!state.inited && (
        <div className="flex flex-center max-w-[1200px] w-full h-full bg-black/60">
          <CircularProgress />
        </div>
      )}
      {state.inited && (
        <Scrollable className="w-full max-w-[1200px] flex-1 bg-black/60">
          {state.tab === 0 && <NFTRequestPage />}
        </Scrollable>
      )}
    </div>
  );
});
