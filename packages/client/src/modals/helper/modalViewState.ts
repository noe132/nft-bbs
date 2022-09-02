import { observable } from 'mobx';

export const modalViewState = observable({
  id: 0,
  // list: [] as Array<{ children: React.ReactNode }>,
  list: [] as Array<{
    component: any
    resolve: (v?: any) => unknown
    props?: any
    id: number
  }>,

  getId() {
    this.id += 1;
    return this.id;
  },
  push(params: {
    component: any
    resolve: (v?: any) => unknown
    props?: any
  }) {
    this.list.push({
      ...params,
      id: this.getId(),
    });
  },
});
