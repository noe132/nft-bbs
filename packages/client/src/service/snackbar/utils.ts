import { SnackbarItemData, SnackbarItemParam } from './types';

export const formatParams = (
  type: SnackbarItemData['type'],
  p1: SnackbarItemParam | string,
  p2?: number,
) => {
  const item: SnackbarItemData = typeof p1 === 'string'
    ? {
      content: p1,
      duration: p2 === undefined ? 3000 : p2,
      type,
    }
    : {
      ...p1,
      duration: p1.duration === undefined ? 3000 : p1.duration,
      type,
    };

  return item;
};
