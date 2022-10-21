import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { observer } from 'mobx-react-lite';
import { ThemeRoot } from './utils/theme';
import { initService, ServiceViews } from './service';
import { ViewRoot } from './views';
import { ModalViews } from './modals/helper/ModalViews';

const App = observer(() => {
  React.useEffect(() => initService(), []);

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
