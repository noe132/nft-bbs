import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { nodeService } from '~/service';

export const RedirectToPostList = () => {
  const navigate = useNavigate();
  useEffect(() => {
    if (nodeService.state.groupId) {
      navigate(`/${nodeService.state.groupId}`, { replace: true });
    } else {
      window.location.href = '/';
    }
  }, []);

  return null;
};
