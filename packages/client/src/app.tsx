import React from 'react';
import { observer } from 'mobx-react-lite';
import { ThemeRoot } from './utils/theme';
import { initService, ServiceViews } from './service';
import { ViewRoot } from './views';
import { ModalViews } from './modals/helper/ModalViews';

const App = observer(() => {
  React.useEffect(() => initService(), []);

  return (
    <ThemeRoot>
      <ViewRoot />
      <ServiceViews />
      <ModalViews />
    </ThemeRoot>
  );
});

export default App;
