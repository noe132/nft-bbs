import { useRef } from 'react';
import classNames from 'classnames';
import { action } from 'mobx';
import { observer, useLocalObservable } from 'mobx-react-lite';
import { Logout, MoreVert } from '@mui/icons-material';
import { IconButton, Menu, MenuItem } from '@mui/material';

import { ThemeLight } from '~/utils';
import { SiteLogo } from '~/components';
import { keyService, loginStateService } from '~/service';

export const AdminHeader = observer((props: { className?: string }) => {
  const state = useLocalObservable(() => ({
    menu: false,
  }));

  const menuButton = useRef<HTMLButtonElement>(null);

  const handleBackToLogin = action(() => {
    state.menu = false;
    keyService.logout();
    if (loginStateService.state.groups.admin) {
      loginStateService.state.groups.admin.lastLogin = null;
    }
  });

  return (<>
    <div className="h-[60px]" />
    <div
      className={classNames(
        'fixed top-0 left-0 right-0 z-50 flex flex-center px-5 h-[60px] bg-[#0d1d37] bg-white',
        props.className,
      )}
    >
      <a className="s1360:hidden block absolute left-5" href="/" target="_blank" rel="noopener">
        <button className="flex-none h-auto">
          <SiteLogo />
        </button>
      </a>
      <div className="flex w-[1100px] justify-between self-stretch gap-x-4">
        <div className="flex items-center flex-1">
          <a className="s1360:block hidden" href="/" target="_blank" rel="noopener">
            <button className="flex-none h-auto mr-4">
              <SiteLogo />
            </button>
          </a>
          <div className="text-white">
            当前用户 address: {keyService.state.address}
          </div>
        </div>

        <div className="flex items-center gap-x-4">
          <IconButton
            className="text-white"
            onClick={action(() => { state.menu = true; })}
            ref={menuButton}
          >
            <MoreVert />
          </IconButton>
        </div>
      </div>
    </div>

    <ThemeLight>
      <Menu
        className="mt-1"
        open={state.menu}
        anchorEl={menuButton.current}
        onClose={action(() => { state.menu = false; })}
        anchorOrigin={{ horizontal: 'center', vertical: 'bottom' }}
        transformOrigin={{ horizontal: 'center', vertical: 'top' }}
        disableScrollLock
      >
        {([
          {
            text: '退出',
            onClick: handleBackToLogin,
            icon: <Logout className="text-22 text-amber-500/90" />,
          },
        ] as const).filter(<T extends unknown>(v: T | false): v is T => !!v).map((v, i) => (
          <MenuItem onClick={v.onClick} key={i}>
            <div className="flex gap-x-2 mr-2">
              <div className="flex flex-center w-5">
                {v.icon}
              </div>
              {v.text}
            </div>
          </MenuItem>
        ))}
      </Menu>
    </ThemeLight>
  </>);
});
