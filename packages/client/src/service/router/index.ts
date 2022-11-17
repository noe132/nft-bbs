import { NavigateFunction, NavigateOptions } from 'react-router-dom';
import { ConstructRouteParmas, constructRoutePath } from '~/utils';
import { nodeService } from '../node';

export const state = {
  navigate: null as null | NavigateFunction,
};

const navigate = (params: ConstructRouteParmas, options?: NavigateOptions) => {
  if (!state.navigate) {
    return;
  }
  const path = getPath(params);
  state.navigate(path, options);
};

const getPath = (params: ConstructRouteParmas) => {
  const groupId = nodeService.state.routeGroupId;
  const path = constructRoutePath({
    ...params,
    groupId,
  });
  return path;
};

export const routerService = {
  state,
  navigate,
  getPath,
};
