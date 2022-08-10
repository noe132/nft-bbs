import { ICommentTrxContent } from './comment';
import { ICounterTrxContent } from './counter';
import { IDiscounterTrxContent } from './dislike';
import { IGroupInfoTrxContent } from './groupInfo';
import { IImageTrxContent } from './image';
import { IPostTrxContent } from './post';
import { IProfileTrxContent } from './profile';

export * from './comment';
export * from './counter';
export * from './dislike';
export * from './groupInfo';
export * from './groupStatus';
export * from './image';
export * from './notification';
export * from './post';
export * from './profile';
export * from './uniqueCounter';

export type ContentTrxType = ICommentTrxContent
| ICounterTrxContent
| IDiscounterTrxContent
| IImageTrxContent
| IPostTrxContent
| IProfileTrxContent
| IGroupInfoTrxContent;
