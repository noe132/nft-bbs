
import { useEffect } from 'react';
import { observer } from 'mobx-react-lite';
import { CircularProgress } from '@mui/material';

import bgImg1x from '~/assets/images/pierre-bouillot-QlCNwrdd_iA-unsplash.jpg';
import bgImg2x from '~/assets/images/pierre-bouillot-QlCNwrdd_iA-unsplash@2x.jpg';
import bgImg3x from '~/assets/images/pierre-bouillot-QlCNwrdd_iA-unsplash@3x.jpg';

import { chooseImgByPixelRatio } from '~/utils';
import { Footer } from '~/components';

export const Init = observer(() => {
  useEffect(() => {

  }, []);

  return (
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
      <Footer />
    </div>
  );
});
