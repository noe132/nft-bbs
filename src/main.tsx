import './utils/bootstrap';
import { createRoot } from 'react-dom/client';
import App from './app';
import './style/tailwind-base.sass';
import './style/tailwind.sass';
import './style/global.sass';

const root = createRoot(document.getElementById('root')!);
root.render(
  <App />,
);
