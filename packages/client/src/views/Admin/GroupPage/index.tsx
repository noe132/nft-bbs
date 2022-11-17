import { useEffect } from 'react';
import { action, runInAction } from 'mobx';
import { observer, useLocalObservable } from 'mobx-react-lite';
import { either, function as fp, taskEither } from 'fp-ts';
import { Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, TextField, Tooltip } from '@mui/material';
import type { GroupStatus } from 'nft-bbs-server/orm';

import { GroupApi } from '~/apis';
import { runLoading, ThemeLight } from '~/utils';
import { dialogService, keyService, snackbarService } from '~/service';
import { utils } from 'quorum-light-node-sdk';
import { LoadingButton } from '@mui/lab';

export const GroupPage = observer(() => {
  const state = useLocalObservable(() => ({
    groups: [] as Array<GroupStatus>,
    loading: false,

    addGroupDialog: {
      open: false,
      loading: false,

      id: 0,
      shortName: '',
      mainSeedUrl: '',
      commentSeedUrl: '',
      counterSeedUrl: '',
      profileSeedUrl: '',
    },
  }));

  const loadGroups = () => {
    runLoading(
      (l) => { state.loading = l; },
      async () => {
        await fp.pipe(
          () => GroupApi.list(),
          taskEither.map(action((v) => {
            state.groups = v;
          })),
        )();
      },
    );
  };

  const handleOpenAddGroup = action(() => {
    state.addGroupDialog = {
      open: true,
      loading: false,
      id: 0,
      shortName: '',
      mainSeedUrl: '',
      commentSeedUrl: '',
      counterSeedUrl: '',
      profileSeedUrl: '',
    };
  });

  const handleCancel = action(() => {
    state.addGroupDialog.open = false;
  });

  const handleEdit = action((group: GroupStatus) => {
    state.addGroupDialog = {
      open: true,
      loading: false,
      id: group.id,
      shortName: group.shortName,
      mainSeedUrl: group.mainSeedUrl,
      commentSeedUrl: group.commentSeedUrl,
      counterSeedUrl: group.counterSeedUrl,
      profileSeedUrl: group.profileSeedUrl,
    };
  });

  const validateSeed = (seedUrl: string) => fp.pipe(
    either.tryCatch(
      () => utils.seedUrlToGroup(seedUrl),
      () => new Error(`invalid seedurl ${seedUrl}`),
    ),
    either.chainW((v) => {
      if (!v.chainAPIs.length) {
        return either.left(new Error(`no chianAPI in seedurl ${seedUrl}`));
      }
      return either.right(v);
    }),
  );

  const handleSubmit = async () => {
    runInAction(() => {
      ([
        'shortName',
        'mainSeedUrl',
        'commentSeedUrl',
        'counterSeedUrl',
        'profileSeedUrl',
      ] as const).forEach((v) => {
        state.addGroupDialog[v] = state.addGroupDialog[v].trim();
      });
    });

    const seeds = [
      [state.addGroupDialog.mainSeedUrl, '主种子网络'],
      [state.addGroupDialog.commentSeedUrl, '评论种子网络'],
      [state.addGroupDialog.counterSeedUrl, '点赞种子网络'],
      [state.addGroupDialog.profileSeedUrl, '个人资料种子网络'],
    ] as const;

    for (const seed of seeds) {
      const result = validateSeed(seed[0]);
      if (either.isLeft(result)) {
        dialogService.open({
          title: '检验错误',
          content: `${seed[1]} 种子解析错误 ${result.left.message}`,
        });
        return;
      }
    }

    if (!state.addGroupDialog.shortName) {
      const mainSeed = utils.seedUrlToGroup(state.addGroupDialog.mainSeedUrl);
      state.addGroupDialog.shortName = mainSeed.groupId;
    }

    if (state.addGroupDialog.id) {
      const result = await dialogService.open({
        content: '确定要编辑这个论坛吗？（需要重新索引一遍数据）',
      });
      if (result === 'cancel') { return; }
      await runLoading(
        (l) => { state.addGroupDialog.loading = l; },
        async () => {
          const result = await GroupApi.update({
            ...await keyService.getAdminSignParam(),
            id: state.addGroupDialog.id,
            shortName: state.addGroupDialog.shortName,
            mainSeedUrl: state.addGroupDialog.mainSeedUrl,
            commentSeedUrl: state.addGroupDialog.commentSeedUrl,
            counterSeedUrl: state.addGroupDialog.counterSeedUrl,
            profileSeedUrl: state.addGroupDialog.profileSeedUrl,
          });
          if (result) {
            snackbarService.show('编辑成功');
            runInAction(() => {
              state.addGroupDialog.open = false;
            });
            loadGroups();
          }
        },
      );
      return;
    }

    await runLoading(
      (l) => { state.addGroupDialog.loading = l; },
      async () => {
        await GroupApi.add({
          ...await keyService.getAdminSignParam(),
          shortName: state.addGroupDialog.shortName,
          mainSeedUrl: state.addGroupDialog.mainSeedUrl,
          commentSeedUrl: state.addGroupDialog.commentSeedUrl,
          counterSeedUrl: state.addGroupDialog.counterSeedUrl,
          profileSeedUrl: state.addGroupDialog.profileSeedUrl,
        });
        snackbarService.show('添加成功');
        runInAction(() => {
          state.addGroupDialog.open = false;
        });
        loadGroups();
      },
    );
  };

  const handleDelete = async (group: GroupStatus) => {
    const seed = utils.restoreSeedFromUrl(group.mainSeedUrl);
    const result = await dialogService.open({
      title: '删除论坛',
      content: `确定要删除这个论坛吗？(${group.shortName || seed.group_name})`,
    });
    if (result === 'cancel') { return; }
    // GroupApi.del(group.id);
    snackbarService.show('删除成功');
    runInAction(() => {
      const index = state.groups.findIndex((v) => v.id === group.id);
      if (index !== -1) {
        state.groups.splice(index, 1);
      }
    });
  };

  useEffect(() => {
    loadGroups();
  }, []);

  return (<>
    <div className="flex-col gap-4 p-4">
      <div className="flex">
        <Button
          onClick={handleOpenAddGroup}
        >
          添加
        </Button>
      </div>
      <div className="flex-col divide-y divide-white/30">
        {!state.groups.length && !state.loading && (
          <div className="text-center text-white/60 text-14">
            暂无数据
          </div>
        )}
        {state.groups.map((v, i) => (
          <div className="py-4" key={i}>
            <div>
              #{v.id}
            </div>
            <div>
              {v.shortName}
            </div>
            <div className="truncate">
              {v.mainSeedUrl}
            </div>
            <div className="truncate">
              {v.commentSeedUrl}
            </div>
            <div className="truncate">
              {v.counterSeedUrl}
            </div>
            <div className="truncate">
              {v.profileSeedUrl}
            </div>
            <div className="flex gap-4 mt-4">
              <a
                className="!no-underline"
                href={`/${v.shortName || v.id}`}
                target="_blank"
                rel="noopener"
              >
                <Button variant="outlined">
                  打开论坛
                </Button>
              </a>
              <Button
                variant="outlined"
                onClick={() => handleEdit(v)}
              >
                修改
              </Button>
              <Button
                variant="outlined"
                onClick={() => handleDelete(v)}
              >
                删除
              </Button>
            </div>
          </div>
        ))}
      </div>

      {state.loading && (
        <CircularProgress className="text-white/70" />
      )}
    </div>
    <ThemeLight>
      <Dialog
        open={state.addGroupDialog.open}
        onClose={action(() => { state.addGroupDialog.open = false; })}
      >
        <DialogTitle>
          {!!state.addGroupDialog.id && '编辑'}
          {!state.addGroupDialog.id && '添加'}
          论坛
          {!!state.addGroupDialog.id && ` #${state.addGroupDialog.id}`}
        </DialogTitle>
        <DialogContent className="overflow-visible">
          <div className="flex-col gap-4 w-[400px]">
            <Tooltip title="地址栏种子网络别名，用于 (port.base.one/<myport>/post/:postId) 中 <myport> 这一部分。留空则默认是主种子网络 groupId" disableInteractive>
              <TextField
                label="别名（可选）"
                value={state.addGroupDialog.shortName}
                onChange={action((e) => { state.addGroupDialog.shortName = e.target.value; })}
                size="small"
              />
            </Tooltip>
            <TextField
              label="主种子网络"
              value={state.addGroupDialog.mainSeedUrl}
              onChange={action((e) => { state.addGroupDialog.mainSeedUrl = e.target.value; })}
              size="small"
            />
            <TextField
              label="评论种子网络"
              value={state.addGroupDialog.commentSeedUrl}
              onChange={action((e) => { state.addGroupDialog.commentSeedUrl = e.target.value; })}
              size="small"
            />
            <TextField
              label="点赞种子网络"
              value={state.addGroupDialog.counterSeedUrl}
              onChange={action((e) => { state.addGroupDialog.counterSeedUrl = e.target.value; })}
              size="small"
            />
            <TextField
              label="个人资料种子网络"
              value={state.addGroupDialog.profileSeedUrl}
              onChange={action((e) => { state.addGroupDialog.profileSeedUrl = e.target.value; })}
              size="small"
            />
          </div>
        </DialogContent>
        <DialogActions>
          <Button
            variant="text"
            onClick={handleCancel}
          >
            取消
          </Button>
          <LoadingButton
            color="link"
            onClick={handleSubmit}
            loading={state.addGroupDialog.loading}
          >
            确认
          </LoadingButton>
        </DialogActions>
      </Dialog>
    </ThemeLight>
  </>);
});
