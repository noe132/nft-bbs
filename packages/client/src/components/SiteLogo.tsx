import classNames from 'classnames';

import LogoImg from '~/assets/icons/logo-img.svg';
import LogoText from '~/assets/icons/logo-text.svg';

interface Props {
  className?: string
}

export const SiteLogo = (props: Props) => (
  <div
    className={classNames(
      'flex items-center gap-3',
      props.className,
    )}
  >
    <img className="flex-none w-[34px]" src={LogoImg} alt="" />
    <img className="flex-none w-[45px]" src={LogoText} alt="" />
  </div>
);
