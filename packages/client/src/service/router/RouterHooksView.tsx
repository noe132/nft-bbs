import { useNavigate } from 'react-router-dom';
import { routerService } from '.';

export const RouterHooksView = () => {
  const navigate = useNavigate();
  routerService.state.navigate = navigate;
  return null;
};
