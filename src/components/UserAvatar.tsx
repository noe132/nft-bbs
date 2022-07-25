import React from 'react';
import classNames from 'classnames';
import { IProfile } from '~/database';
import DefaultAvatar from '~/assets/images/default_avatar.png';

interface AvatarProps {
  className?: string
  profile?: IProfile | null
  size?: number
  children?: React.ReactNode
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
      backgroundImage: `url("${props.profile?.avatar || DefaultAvatar}")`,
    }}
  >
    {props.children}
  </div>
);
