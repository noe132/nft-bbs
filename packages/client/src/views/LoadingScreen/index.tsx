
import { observer } from 'mobx-react-lite';
import { CircularProgress } from '@mui/material';

import bgImg1x from '~/assets/images/rum_barrel_bg.jpg';
import bgImg2x from '~/assets/images/rum_barrel_bg@2x.jpg';
import bgImg3x from '~/assets/images/rum_barrel_bg@3x.jpg';
import logoImg from '~/assets/icons/rumsystem.svg';

import { chooseImgByPixelRatio } from '~/utils';

export const LoadingScreen = observer(() => (
  <div className="min-h-[100vh] flex-col">
    <div
      className="flex-col flex-1 bg-cover bg-center"
      style={{
        backgroundImage: `url('${chooseImgByPixelRatio({ x1: bgImg1x, x2: bgImg2x, x3: bgImg3x })}')`,
      }}
    >
      <div className="flex flex-center flex-1">
        <div className="flex-col flex-center">
          <CircularProgress className="text-white/70" />
        </div>
      </div>
    </div>
    <div className="flex items-center px-10 h-12 bg-white">
      <img src={logoImg} alt="" />
      <span className="px-2">·</span>
      <div className="flex flex-center gap-x-12 text-14">
        {[
          ['https://rumsystem.net/', '关于'],
          ['https://rumsystem.net/developers', '文档'],
          ['https://rumsystem.net/faq/howtocreateseednet', '怎样创建 RumPot 种子网络？'],
        ].map((v, i) => (
          <a
            className="text-black"
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
  </div>
));
