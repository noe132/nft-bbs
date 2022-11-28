import { Button } from '@mui/material';
import classNames from 'classnames';
import { action } from 'mobx';
import { observer, useLocalObservable } from 'mobx-react-lite';
import { GroupStatus } from 'nft-bbs-server';
import { utils } from 'quorum-light-node-sdk';
import { GroupAvatar } from '~/components';
import { loginStateService, nodeService } from '~/service';
import { ThemeLight } from '~/utils';

interface Props {
  className?: string
}

export const PortList = observer((props: Props) => {
  const state = useLocalObservable(() => ({
    expand: false,
  }));

  const handleOpenGroup = action((v: GroupStatus, jumpToLogin = false) => {
    if (jumpToLogin) {
      loginStateService.state.autoOpenGroupId = v.id;
      loginStateService.state.autoLoginGroupId = null;
      window.open('/');
    } else {
      window.open(`/${v.shortName || v.id}`);
    }
  });

  const loginedPorts = nodeService.state.groups
  // .filter((v) => v.id !== nodeService.state.groupId)
    .filter((v) => loginStateService.state.groups[v.id]?.lastLogin)
    .map((v) => ({
      group: v,
      loginState: loginStateService.state.groups[v.id]!,
    }));
  const notLoginedPorts = nodeService.state.groups
  // .filter((v) => v.id !== nodeService.state.groupId)
    .filter((v) => !loginStateService.state.groups[v.id]?.lastLogin);

  return (
    <ThemeLight>
      <div
        className={classNames(
          'bg-white shadow-4 text-black rounded py-2',
          props.className,
        )}
      >
        <div className="text-center text-dark-blue my-2">
          我可以去的论坛
        </div>
        <div className="flex-col">
          {loginedPorts.map((v) => (
            <Button
              className="flex justify-start items-center gap-4 px-7 py-1 normal-case font-normal hover:bg-black/5 rounded-none font-default"
              variant="text"
              key={v.group.id}
              onClick={() => handleOpenGroup(v.group)}
            >
              <GroupAvatar
                className="shadow-1 flex-none"
                groupName={utils.restoreSeedFromUrl(v.group.mainSeedUrl).group_name}
                size={40}
              />
              <div className="flex-col items-start overflow-hidden">
                <div className="text-link text-14 w-full truncate text-start">
                  {utils.restoreSeedFromUrl(v.group.mainSeedUrl).group_name}
                </div>
                <div className="text-gray-9c text-14 truncate">
                  {v.loginState.lastLogin === 'keystore' && `Keystore: ${v.loginState.keystore?.address.slice(0, 10)}`}
                  {v.loginState.lastLogin === 'mixin' && `Mixin: ${v.loginState.mixin?.userName}`}
                </div>
              </div>
            </Button>
          ))}
        </div>
        <div className="flex-col">
          {!!notLoginedPorts.length && (
            <div className="border-t mx-6 my-2" />
          )}

          {(state.expand || !loginedPorts.length) && notLoginedPorts.map((v) => (
            <Button
              className="flex justify-start items-center gap-4 px-8 py-1 normal-case font-normal hover:bg-black/5 rounded-none font-default"
              variant="text"
              key={v.id}
              onClick={() => handleOpenGroup(v, true)}
            >
              <GroupAvatar
                className="shadow-1"
                groupName={utils.restoreSeedFromUrl(v.mainSeedUrl).group_name}
                size={40}
              />
              <div className="flex-col items-start">
                <div className="text-link text-18">
                  {utils.restoreSeedFromUrl(v.mainSeedUrl).group_name}
                </div>
                <div className="text-gray-9c text-14">
                  登录/注册 {'>'}
                </div>
              </div>
            </Button>
          ))}
          {!!notLoginedPorts.length && (
            <Button
              className="text-16 py-3 hover:bg-black/5 rounded-none font-default"
              color="rum"
              variant="text"
              onClick={action(() => { state.expand = !state.expand; })}
            >
              {!state.expand && '查看全部'}
              {state.expand && '收起未登录论坛'}
            </Button>
          )}
        </div>
      </div>
    </ThemeLight>
  );
});
