import classNames from 'classnames';

import LockIcon from 'boxicons/svg/regular/bx-lock-alt.svg?fill-icon';
import NFTImage from '~/assets/images/NFT_for_port500.png';

interface Props {
  className?: string
  color: 'light' | 'dark'
  lock?: boolean
  onClick?: (e: React.MouseEvent) => unknown
  size?: number
  highlight?: boolean
  tokenId?: number
  tokenIdClassName?: string
}

export const NFTIcon = (props: Props) => {
  const light = props.color === 'light';
  const dark = props.color === 'dark';
  const size = props.size ?? 60;
  const lockSize = Math.ceil(size * 0.375);
  const tokenIdSize = Math.ceil(size * 0.1666);
  const tokenIdOffset = 4 + Math.max(Math.ceil((size - 24) / 18), 0);
  return (
    <div
      className={classNames(
        'flex items-stretch flex-none relative p-[3px] border',
        light && !props.lock && 'border-black/25',
        light && props.lock && 'border-black/15',
        dark && !props.lock && 'border-white/40',
        dark && props.lock && 'border-white/20',
        props.highlight && 'outline outline-2 outline-offset-[-1px] outline-rum-orange',
        props.className,
      )}
      style={{
        height: `${size}px`,
        width: `${size}px`,
      }}
      onClick={props.onClick}
    >
      <div
        className={classNames(
          'flex flex-center flex-1 bg-white/60 bg-contain',
          props.lock && 'opacity-40',
        )}
        style={{ backgroundImage: `url("${NFTImage}")` }}
      />
      {props.lock && (
        <LockIcon
          className={classNames(
            'absolute-center',
            light && 'text-gray-4a/60',
            dark && 'text-white/80',
          )}
          style={{ fontSize: `${lockSize}px` }}
        />
      )}
      {props.tokenId !== undefined && (
        <div
          className={classNames(
            'absolute text-white leading-[1] select-none',
            props.tokenIdClassName,
          )}
          style={{
            bottom: `${tokenIdOffset}px`,
            right: `${tokenIdOffset}px`,
            fontSize: `${tokenIdSize}px`,
          }}
        >
          {props.tokenId}
        </div>
      )}
    </div>
  );
};
