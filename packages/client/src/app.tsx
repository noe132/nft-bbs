import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { observer } from 'mobx-react-lite';
import { ThemeRoot } from './utils/theme';
import { ServiceViews } from './service';
import { ViewRoot } from './views';
import { ModalViews } from './modals/helper/ModalViews';

const App = observer(() => (
  <ThemeRoot>
    <BrowserRouter>
      <ViewRoot />
      <ServiceViews />
      <ModalViews />
    </BrowserRouter>
  </ThemeRoot>
));

export default App;
