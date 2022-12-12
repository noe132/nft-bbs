import { BrowserRouter } from 'react-router-dom';
import { observer } from 'mobx-react-lite';
import { ThemeRoot, lang } from './utils';
import { ServiceViews } from './service';
import { ViewRoot } from './views';
import { ModalViews } from './modals/helper/ModalViews';

const App = observer(() => {
  lang.useLang();
  if (!lang.ready) { return null; }
  return (
    <ThemeRoot>
      <BrowserRouter>
        <ViewRoot />
        <ServiceViews />
        <ModalViews />
      </BrowserRouter>
    </ThemeRoot>
  );
});

export default App;
