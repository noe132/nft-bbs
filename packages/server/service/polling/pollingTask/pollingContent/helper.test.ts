import { describe, expect, test } from '@jest/globals';
import { getMergedTaskGroup } from './helper';

describe('utils', () => {
  test('merge', () => {
    expect(getMergedTaskGroup({
      id: 1,
      loaded: true,
      shortName: '',
      mainSeedUrl: '1',
      commentSeedUrl: '1',
      counterSeedUrl: '1',
      profileSeedUrl: '1',
      mainStartTrx: '',
      commentStartTrx: '',
      counterStartTrx: '',
      profileStartTrx: '',
    })).toEqual([
      { seedUrl: '1', roles: ['main', 'comment', 'counter', 'profile'] },
    ]);

    expect(getMergedTaskGroup({
      id: 1,
      loaded: true,
      shortName: '',
      mainSeedUrl: '1',
      commentSeedUrl: '2',
      counterSeedUrl: '1',
      profileSeedUrl: '1',
      mainStartTrx: '',
      commentStartTrx: '',
      counterStartTrx: '',
      profileStartTrx: '',
    })).toEqual([
      { seedUrl: '1', roles: ['main', 'counter', 'profile'] },
      { seedUrl: '2', roles: ['comment'] },
    ]);

    expect(getMergedTaskGroup({
      id: 1,
      loaded: true,
      shortName: '',
      mainSeedUrl: '1',
      commentSeedUrl: '2',
      counterSeedUrl: '2',
      profileSeedUrl: '1',
      mainStartTrx: '',
      commentStartTrx: '',
      counterStartTrx: '',
      profileStartTrx: '',
    })).toEqual([
      { seedUrl: '1', roles: ['main', 'profile'] },
      { seedUrl: '2', roles: ['comment', 'counter'] },
    ]);

    expect(getMergedTaskGroup({
      id: 1,
      loaded: true,
      shortName: '',
      mainSeedUrl: '1',
      commentSeedUrl: '2',
      counterSeedUrl: '2',
      profileSeedUrl: '3',
      mainStartTrx: '',
      commentStartTrx: '',
      counterStartTrx: '',
      profileStartTrx: '',
    })).toEqual([
      { seedUrl: '1', roles: ['main'] },
      { seedUrl: '2', roles: ['comment', 'counter'] },
      { seedUrl: '3', roles: ['profile'] },
    ]);

    expect(getMergedTaskGroup({
      id: 1,
      loaded: true,
      shortName: '',
      mainSeedUrl: '1',
      commentSeedUrl: '2',
      counterSeedUrl: '3',
      profileSeedUrl: '3',
      mainStartTrx: '',
      commentStartTrx: '',
      counterStartTrx: '',
      profileStartTrx: '',
    })).toEqual([
      { seedUrl: '1', roles: ['main'] },
      { seedUrl: '2', roles: ['comment'] },
      { seedUrl: '3', roles: ['counter', 'profile'] },
    ]);

    expect(getMergedTaskGroup({
      id: 1,
      loaded: true,
      shortName: '',
      mainSeedUrl: '1',
      commentSeedUrl: '2',
      counterSeedUrl: '3',
      profileSeedUrl: '4',
      mainStartTrx: '',
      commentStartTrx: '',
      counterStartTrx: '',
      profileStartTrx: '',
    })).toEqual([
      { seedUrl: '1', roles: ['main'] },
      { seedUrl: '2', roles: ['comment'] },
      { seedUrl: '3', roles: ['counter'] },
      { seedUrl: '4', roles: ['profile'] },
    ]);
  });
});
