import QuorumLightNodeSDK, { IContent } from 'quorum-light-node-sdk-nodejs';
import { sleep, store, LOADED_DATA_KEY } from '~/utils';

import { handlePost } from './pollingContent/handlePost';
import { handleComment } from './pollingContent/handleComment';
import { handleCounter } from './pollingContent/handleCounter';
import { handleProfile } from './pollingContent/handleProfile';
import { handleGroupInfo } from './pollingContent/handleGroupInfo';
import { handleImage } from './pollingContent/handleImage';

const LIMIT = 500;
const GROUP_STATUS_MAP = 'groupStatusMap';

// const seedUrl = 'rum://seed?v=1&e=0&n=0&b=4q6xzwoZSN2N_8wNgt4qfQ&c=b5XdM7mnLlFx43jASvVQ2GvtFx0mCr09UYlH6273SGA&g=9_zl1xKSRwOcKnKe74Fb7Q&k=Ag_AMFZFuhsAkUGaEJ9om2nDGVmcRDci74j4DqcWXnuW&s=hE-Q-a6nB1CcpW6mnOIDhN7G5yFZ450vpFMMAZKUEtx086PiSqzoLsusT79pm1d9k7khxwK8fDk1DOyGKMFZ6gE&t=FwrY-W_8ye0&a=NFT%E8%AE%BA%E5%9D%9B%E4%BA%A7%E5%93%81%E5%86%85%E6%B5%8B%E4%B8%93%E7%94%A82&y=group_timeline&u=https%3A%2F%2F103.61.39.95%3Fjwt%3DeyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhbGxvd0dyb3VwcyI6WyJmN2ZjZTVkNy0xMjkyLTQ3MDMtOWMyYS03MjllZWY4MTViZWQiXSwiZXhwIjoxODE4MDU3OTgzLCJuYW1lIjoiYWxsb3ctZjdmY2U1ZDctMTI5Mi00NzAzLTljMmEtNzI5ZWVmODE1YmVkIiwicm9sZSI6Im5vZGUifQ.Hq0pS_h6gOSizdErZuYyTzYkyFj1458jSiZ3wJn_tNY';
// const seedUrl = 'rum://seed?v=1&e=0&n=0&b=Jd-Xt1_ySoWPmCh3tmijVA&c=szMuGxtbOnaz7a-uCdduQtHNKAhMGry_sCWKoKY0Log&g=ITKp_yM8TUq1M22VF2S8TQ&k=Aq9Bdxy03_5-Ngk5xhznF0McJwjw6H1_sgPXzDVC32pb&s=ahsY9PS8zC-bUMm5_FTzq7_TQBHlT4PflbfJRjz1x7lecv79Ydmu_csmOQLtXEqahqJlJD5MjPtSZQcpLwo-dAE&t=Fw_M2UqNnGQ&a=nft-bbs-test&y=group_timeline&u=http%3A%2F%2F127.0.0.1%3A64458%3Fjwt%3DeyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhbGxvd0dyb3VwcyI6WyIyMTMyYTlmZi0yMzNjLTRkNGEtYjUzMy02ZDk1MTc2NGJjNGQiXSwiZXhwIjoxODE5NDUyMDIxLCJuYW1lIjoiYWxsb3ctMjEzMmE5ZmYtMjMzYy00ZDRhLWI1MzMtNmQ5NTE3NjRiYzRkIiwicm9sZSI6Im5vZGUifQ.k3xfpyoGshC6YHkzlRGyxTcnyjdoMHgTiKDa5WZZR-8';
const seedUrl = 'rum://seed?v=1&e=0&n=0&b=QaPjfi7LQ4yp2S60ngyJdw&c=fja8EJAAK_ZxLPcyLq-6L7HSKuli68wnhl4ImdwHh_A&g=uZvFqN6-SYGGu9SESABN0w&k=AjlWMMvVpXi9DLpoxmgJgD9ug2fDAaUNQCOhOq5PNfIc&s=bOh-m-h2vCbsS3Z3KBUNoYfB3D3ZyJx3Vf0W2dKibNgNp1Uj_f6U-YSo4MPLZM2QE3ipN7KklOCdoYHS9WT2zgE&t=FxBnshqivLo&a=nft-bbs-test-noe132.com&y=group_timeline&u=https%3A%2F%2Fnoe132.com%3A64459%3Fjwt%3DeyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhbGxvd0dyb3VwcyI6WyJiOTliYzVhOC1kZWJlLTQ5ODEtODZiYi1kNDg0NDgwMDRkZDMiXSwiZXhwIjoxNjkzNDc4ODU1LCJuYW1lIjoibm9kZWp3dCIsInJvbGUiOiJub2RlIn0.BRl1QD0B-Dpngccs8dtsMzm5j-m_BCvet4XgRJx07cA';

QuorumLightNodeSDK.cache.Group.clear();
QuorumLightNodeSDK.cache.Group.add(seedUrl);

const handleContents = async (groupId: string, contents: Array<IContent>) => {
  try {
    for (const content of contents) {
      try {
        const { type } = JSON.parse(content.Data.content);
        switch (type) {
          case 'post': await handlePost(content); break;
          case 'comment': await handleComment(content); break;
          case 'counter': await handleCounter(content); break;
          case 'profile': await handleProfile(content); break;
          case 'groupInfo': await handleGroupInfo(content, groupId); break;
          case 'image': await handleImage(content); break;
          default: break;
        }
        pollingLog.info(`${content.TrxId} ${type} ✅`);
      } catch (err: any) {
        pollingLog.error(content);
        pollingLog.error(err);
        pollingLog.error(`${content.TrxId} ❌ ${err.message}`);
      }
      const groupStatusMap = store(GROUP_STATUS_MAP) || {};
      store(GROUP_STATUS_MAP, {
        ...groupStatusMap,
        [groupId]: {
          startTrx: content.TrxId,
        },
      });
    }
  } catch (err) {
    log.error(err);
  }
};

let stop = false;

export const pollingContent = (duration: number) => {
  (async () => {
    while (!stop) {
      try {
        const groupStatusMap = store(GROUP_STATUS_MAP) || {};
        const group = QuorumLightNodeSDK.cache.Group.list()[0];
        const groupStatus = groupStatusMap[group.groupId];
        const listOptions = {
          groupId: group.groupId,
          count: LIMIT,
          ...groupStatus?.startTrx ? {
            startTrx: groupStatus?.startTrx ?? undefined,
          } : {},
        };
        const contents = await QuorumLightNodeSDK.chain.Content.list(listOptions);
        if (contents.length > 0) {
          await handleContents(group.groupId, contents);
        }
        if (contents.length === 0 || contents.length < LIMIT) {
          store(LOADED_DATA_KEY, true);
        }
      } catch (err) {
        log.error(err);
      }
      await sleep(duration);
    }
  })();
};

export const stopPolling = () => {
  stop = true;
};
