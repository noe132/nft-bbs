import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { nodeService } from '~/service';

export const RedirectToPostList = () => {
  const navigate = useNavigate();
  useEffect(() => {
    navigate(`/${nodeService.state.groupId}`, { replace: true });
  }, []);

  return null;
};
