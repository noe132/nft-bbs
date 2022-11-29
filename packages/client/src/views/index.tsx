import { useEffect } from 'react';
import { observer } from 'mobx-react-lite';
import { useLocation } from 'react-router-dom';

import { nodeService } from '~/service/node';
import { lang } from '~/utils/lang';
import { initService, initServiceAdmin } from '~/service';

import { Join } from './Join';
import { Init } from './Init';
import { Main } from './Main';
import { Admin } from './Admin';

export const UserViewRoot = observer(() => {
  lang.useLang();
  useEffect(() => initService(), []);
  if (!lang.ready) { return null; }

  return (<>
    {nodeService.state.init.page === 'init' && <Init />}
    {nodeService.state.init.page === 'join' && <Join />}
    {nodeService.state.init.page === 'main' && <Main />}
  </>);
});

export const ViewRoot = () => {
  const routeLocation = useLocation();

  useEffect(() => initServiceAdmin(), []);

  if (routeLocation.pathname.startsWith('/admin')) {
    return <Admin />;
  }
  return <UserViewRoot />;
};
