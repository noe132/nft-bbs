import { useEffect } from 'react';
import { nodeService, routerService } from '~/service';

export const RedirectToPostList = () => {
  useEffect(() => {
    if (nodeService.state.group) {
      routerService.navigate({ page: 'postlist' }, { replace: true });
    } else {
      window.location.href = '/';
    }
  }, []);

  return null;
};
