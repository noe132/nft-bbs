import QuorumLightNodeSDK, { IListContentsOptions, IContent } from 'quorum-light-node-sdk';
import store from 'store2';
import { groupBy } from 'lodash-es';

import { TrxType } from '~/database';
import { bus } from '~/utils';

import { handleComments } from './handleComments';
import { handleCounters } from './handleCounters';
import { handlePosts } from './handlePosts';
import { handleProfiles } from './handleProfiles';

const LIMIT = 500;
const GROUP_STATUS_MAP = 'groupStatusMap';

type IGroupStatusMap = Record<string, { startTrx: string }>;

export const pollingContentsTask = async () => {
  const groupStatusMap = (store(GROUP_STATUS_MAP) || {}) as IGroupStatusMap;
  const group = QuorumLightNodeSDK.cache.Group.list()[0];
  const groupStatus = groupStatusMap[group.groupId];
  const listOptions: IListContentsOptions = {
    groupId: group.groupId,
    count: LIMIT,
  };
  if (groupStatus) {
    listOptions.startTrx = groupStatus.startTrx;
  }
  const contents = await QuorumLightNodeSDK.chain.Content.list(listOptions);
  if (contents.length > 0) {
    await handleContents(group.groupId, contents);
  }
  if (contents.length < LIMIT) {
    bus.emit('loadedData');
  }
};

const handleContents = async (groupId: string, contents: IContent[]) => {
  try {
    // eslint-disable-next-line no-console
    console.log(contents);

    const contentsGroupedByType = groupBy(contents, (content) => {
      try {
        return JSON.parse(content.Data.content).type || '';
      } catch (_) {}
      return '';
    });

    await handlePosts(contentsGroupedByType[TrxType.post]);
    await handleComments(contentsGroupedByType[TrxType.comment]);
    await handleCounters(contentsGroupedByType[TrxType.counter]);
    await handleProfiles(contentsGroupedByType[TrxType.profile]);

    for (const content of contents) {
      bus.emit('content', content);
    }

    const groupStatusMap = (store(GROUP_STATUS_MAP) || {}) as IGroupStatusMap;
    groupStatusMap[groupId] = {
      startTrx: contents[contents.length - 1].TrxId,
    };
    store(GROUP_STATUS_MAP, groupStatusMap);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
  }
};
