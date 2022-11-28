import { useEffect } from 'react';
import classNames from 'classnames';
import { action } from 'mobx';
import { observer, useLocalObservable } from 'mobx-react-lite';
import { Button, CircularProgress } from '@mui/material';

import { keyService, nodeService } from '~/service';
import { AdminHeader } from './AdminHeader';
import { AdminLogin } from './AdminLogin';
import { GroupConfigPage } from './GroupConfigPage';
import { GroupPage } from './GroupPage';
import { NFTRequestPage } from './NFTRequestPage';

export const AdminIndex = observer(() => {
  const state = useLocalObservable(() => ({
    tab: 0,
    page: 'nft',
    inited: false,
  }));

  const init = async () => {
    await nodeService.config.load();
  };

  useEffect(() => {
    init().then(action(() => {
      state.inited = true;
    }));
  }, []);

  if (!keyService.state.address) {
    return <AdminLogin />;
  }

  return (<>
    <AdminHeader />
    <div className="flex flex-1 max-w-[1200px] mx-auto w-full text-white bg-black/60 divide-x divide-white/20">
      <div className="flex-col p-6 gap-5 flex-none">
        {[
          { value: 'nft', text: 'NFT申请' },
          { value: 'seed', text: '种子网络' },
          { value: 'groupconfig', text: '论坛配置' },
        ].map((v, i) => (
          <Button
            className={classNames(
              'px-6',
              state.page === v.value && 'bg-white/10',
            )}
            color="inherit"
            variant="text"
            key={i}
            onClick={action(() => { state.page = v.value; })}
          >
            {v.text}
          </Button>
        ))}

      </div>
      {!state.inited && (
        <div className="flex flex-center flex-1 h-full">
          <CircularProgress />
        </div>
      )}
      {state.inited && (
        <div className="flex-col flex-1 overflow-hidden">
          {state.page === 'nft' && <NFTRequestPage />}
          {state.page === 'seed' && <GroupPage />}
          {state.page === 'groupconfig' && <GroupConfigPage />}
        </div>
      )}
    </div>
  </>
  );
});
