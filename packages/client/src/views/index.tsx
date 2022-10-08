import { observer } from 'mobx-react-lite';
import { nodeService } from '~/service/node';
import { lang } from '~/utils/lang';
import { Join } from './Join';
import { LoadingScreen } from './LoadingScreen';
import { Main } from './Main';

export const ViewRoot = observer(() => {
  lang.useLang();

  if (!lang.ready) { return null; }

  return (<>
    {nodeService.state.showJoin && <Join />}
    {nodeService.state.showMain && <Main />}
    {!nodeService.state.showMain && !nodeService.state.showJoin && (
      <LoadingScreen />
    )}
  </>);
});
