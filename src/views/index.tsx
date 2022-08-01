import { observer } from 'mobx-react-lite';
import { useEffect } from 'react';
import { nodeService } from '~/service/node';
import { lang } from '~/utils/lang';
import { Join } from './Join';
import { Main } from './Main';

export const ViewRoot = observer(() => {
  lang.useLang();

  useEffect(() => {
    nodeService.init();

    return () => {
      nodeService.destroy();
    };
  }, []);

  if (!lang.ready) { return null; }
  if (!nodeService.state.inited) { return null; }

  return (<>
    {!nodeService.state.group && <Join />}
    {!!nodeService.state.group && <Main />}
  </>);
});
