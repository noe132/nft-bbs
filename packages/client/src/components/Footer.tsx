import classNames from 'classnames';
import RumsystemLogo from '~/assets/icons/rumsystem.svg?fill-icon';

interface Props {
  className?: string
}

export const Footer = (props: Props) => (
  <div
    className={classNames(
      'flex items-center px-10 h-12 bg-gray-0c text-white',
      'mb:flex-col mb:h-auto mb:py-4 mb:gap-y-4',
      props.className,
    )}
  >
    <RumsystemLogo className="text-white/90 text-16" />
    <span className="px-2 mb:hidden">·</span>
    <div className="flex flex-center gap-x-12 text-14">
      {[
        ['https://rumsystem.net/', '关于'],
        ['https://guide.rumsystem.net/zen-yang-chuang-jian-port-lun-tan', '怎样创建 Port 论坛？'],
      ].map((v, i) => (
        <a
          className="text-white"
          target="_blank"
          rel="noopener"
          href={v[0]}
          key={i}
        >
          {v[1]}
        </a>
      ))}
    </div>
  </div>
);
