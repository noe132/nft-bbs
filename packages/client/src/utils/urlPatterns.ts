import { stringify } from 'query-string';
import { matchPath } from 'react-router-dom';

export const routeUrlPatterns = {
  postlist: '/:groupId',
  postdetail: '/:groupId/post/:trxId',
  newpost: '/:groupId/newpost',
  userprofile: '/:groupId/userprofile/:userAddress',
  notification: '/:groupId/notification',
};

export type ConstructRouteParmas = {
  page: 'postlist'
} | {
  page: 'postdetail'
  trxId: string
  locateComment?: boolean
  commentTrx?: string
} | {
  page: 'newpost'
} | {
  page: 'userprofile'
  userAddress: string
} | {
  page: 'notification'
};

export const constructRoutePath = (params: ConstructRouteParmas & { groupId: string | number }) => {
  switch (params.page) {
    case 'postlist':
      return `/${params.groupId}`;
    case 'postdetail': {
      const query = stringify({
        locateComment: params.locateComment || null,
        commentTrx: params.commentTrx || null,
      }, { skipNull: true });
      return `/${params.groupId}/post/${params.trxId}${query ? `?${query}` : ''}`;
    }
    case 'newpost':
      return `/${params.groupId}/newpost`;
    case 'userprofile':
      return `/${params.groupId}/userprofile/${params.userAddress}`;
    case 'notification':
      return `/${params.groupId}/notification`;
    default:
      throw new Error('invalid type');
  }
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
