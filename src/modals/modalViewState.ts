import { observable } from 'mobx';
import React from 'react';

export const modalViewState = observable({
  id: 0,
  list: [] as Array<{ children: React.ReactNode }>,
});
