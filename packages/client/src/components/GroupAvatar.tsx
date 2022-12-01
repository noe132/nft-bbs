import React from 'react';
import classNames from 'classnames';
import { APPCONFIG_KEY_NAME, nodeService } from '~/service';

interface AvatarProps {
  className?: string
  groupId?: number
  size?: number
  fontSize?: number
  children?: React.ReactNode
  avatar?: string
  groupName?: string
  square?: boolean
  onClick?: (e: React.MouseEvent) => unknown
}

export const GroupAvatar = (props: AvatarProps) => {
  const avatar = props.avatar
    || (props.groupId ? nodeService.state.appConfigMap[props.groupId]?.[APPCONFIG_KEY_NAME.ICON]?.Value : undefined)
    || nodeService.state.groupIcon;
  const size = props.size ?? 100;
  const fontSize = props.fontSize ?? Math.floor((size / 10) * 4);
  const firstLetter = (props.groupName || nodeService.state.groupName).at(0) ?? '';

  return (
    <div
      className={classNames(
        'w-7 h-7 bg-white bg-cover',
        !props.square && 'rounded-full',
        props.square && 'rounded-lg',
        props.className,
        !props.className?.includes('absolute') && 'relative',
      )}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        backgroundImage: `url("${avatar}")`,
      }}
      onClick={props.onClick}
    >
      {!avatar && (
        <div
          className="absolute inset-0 flex flex-center text-gray-88 select-none"
          style={{
            fontSize: `${fontSize}px`,
            fontFamily: "Varela Round, Nunito Sans, PingFang SC, Hiragino Sans GB, Heiti SC, '幼圆', '圆体-简', sans-serif",
          }}
        >
          {firstLetter}
        </div>
      )}
      {props.children}
    </div>
  );
};
