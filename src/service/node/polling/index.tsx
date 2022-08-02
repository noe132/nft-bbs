import QuorumLightNodeSDK, { IListContentsOptions, IContent } from 'quorum-light-node-sdk';
import { groupBy } from 'lodash-es';

import { GroupStatusModel, TrxType } from '~/database';
import { bus } from '~/utils';

import { handleComments } from './handleComments';
import { handleCounters } from './handleCounters';
import { handlePosts } from './handlePosts';
import { handleProfiles } from './handleProfiles';

const LIMIT = 500;

export const pollingContentsTask = async () => {
  const group = QuorumLightNodeSDK.cache.Group.list()[0];
  const groupStatus = await GroupStatusModel.get(group.groupId);
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

    const groupStatus = await GroupStatusModel.get(groupId) ?? {
      groupId,
      startTrx: contents[contents.length - 1].TrxId,
    };
    groupStatus.startTrx = contents[contents.length - 1].TrxId;
    GroupStatusModel.put(groupStatus);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
  }
};
