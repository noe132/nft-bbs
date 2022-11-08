import { matchPath } from 'react-router-dom';

export const routeUrlPatterns = {
  postlist: '/:groupId',
  postdetail: '/:groupId/post/:trxId',
  newpost: '/:groupId/newpost',
  userprofile: '/:groupId/userprofile/:userAddress',
  notification: '/:groupId/notification',
};

export const matchRoutePatterns = (pathname: string) => {
  const urlMatchMap = {
    postlist: matchPath(routeUrlPatterns.postlist, pathname),
    postdetail: matchPath(routeUrlPatterns.postdetail, pathname),
    newpost: matchPath(routeUrlPatterns.newpost, pathname),
    userprofile: matchPath(routeUrlPatterns.userprofile, pathname),
    notification: matchPath(routeUrlPatterns.notification, pathname),
  };
  const urlMatches = Object.values(urlMatchMap);
  const nonMatch = urlMatches.every((v) => !v);
  if (nonMatch) {
    return null;
  }
  const groupId = urlMatches.find((v) => v?.params?.groupId)?.params.groupId;
  return groupId || null;
};
