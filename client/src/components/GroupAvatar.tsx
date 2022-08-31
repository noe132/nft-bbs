import React from 'react';
import classNames from 'classnames';
import { useLocalObservable } from 'mobx-react-lite';
import { nodeService } from '~/service';

interface AvatarProps {
  className?: string
  size?: number
  children?: React.ReactNode
  avatar?: string
  groupName?: string
  onClick?: (e: React.MouseEvent) => unknown
}

export const GroupAvatar = (props: AvatarProps) => {
  const state = useLocalObservable(() => ({
    get firstLetter() {
      return (props.groupName || nodeService.state.groupName).at(0) ?? '';
    },
  }));

  const avatar = props.avatar || nodeService.state.groupInfo.avatar;

  return (
    <div
      className={classNames(
        'w-7 h-7 bg-white bg-cover rounded-full',
        props.className,
        !props.className?.includes('absolute') && 'relative',
      )}
      style={{
        width: `${props.size ?? 100}px`,
        height: `${props.size ?? 100}px`,
        backgroundImage: `url("${avatar}")`,
      }}
      onClick={props.onClick}
    >
      {!avatar && (
        <div
          className="absolute inset-0 flex flex-center text-gray-88 text-40 select-none"
          style={{
            fontFamily: "Varela Round, Nunito Sans, PingFang SC, Hiragino Sans GB, Heiti SC, '幼圆', '圆体-简', sans-serif",
          }}
        >
          {state.firstLetter}
        </div>
      )}
      {props.children}
    </div>
  );
};
