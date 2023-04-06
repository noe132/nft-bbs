import React from 'react';
import classNames from 'classnames';
import type { Profile } from 'rum-port-server';
import DefaultAvatar from '~/assets/images/default_avatar.png';

interface AvatarProps {
  className?: string
  profile?: Profile | null
  avatar?: string
  size?: number
  children?: React.ReactNode
  onClick?: (e: React.MouseEvent) => unknown
}

export const UserAvatar = (props: AvatarProps) => (
  <div
    className={classNames(
      'w-7 h-7 bg-white bg-cover rounded-full',
      props.className,
    )}
    style={{
      width: `${props.size ?? 28}px`,
      height: `${props.size ?? 28}px`,
      backgroundImage: `url("${props.profile?.avatar || props.avatar || DefaultAvatar}")`,
    }}
    onClick={props.onClick}
  >
    {props.children}
  </div>
);
