import { useCallback, useRef, useEffect } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { runInAction } from 'mobx';
import { observer } from 'mobx-react-lite';

import bgImg1x from '~/assets/images/pierre-bouillot-QlCNwrdd_iA-unsplash.jpg';
import bgImg2x from '~/assets/images/pierre-bouillot-QlCNwrdd_iA-unsplash@2x.jpg';
import bgImg3x from '~/assets/images/pierre-bouillot-QlCNwrdd_iA-unsplash@3x.jpg';
import { Scrollable } from '~/components';
import { chooseImgByPixelRatio, usePageState } from '~/utils';
import { AdminIndex } from './AdminIndex';

export const Admin = observer(() => {
  const routeLocation = useLocation();
  const state = usePageState('main', routeLocation.key, () => ({
    scrollTop: 0,
  }));
  const scrollBox = useRef<HTMLDivElement>(null);
  const handleScroll = useCallback(() => {
    runInAction(() => {
      state.scrollTop = scrollBox.current?.scrollTop ?? 0;
    });
  }, [routeLocation.key]);

  useEffect(() => {
    if (scrollBox.current) {
      scrollBox.current.scrollTop = state.scrollTop;
    }
  }, [routeLocation.pathname]);

  return (
    <div className="h-[100vh] flex-col">
      <div
        className="fixed z-[-1] inset-[-8px] bg-cover bg-center"
        style={{
          backgroundImage: `url('${chooseImgByPixelRatio({ x1: bgImg1x, x2: bgImg2x, x3: bgImg3x })}')`,
        }}
      />

      <Scrollable
        className="flex-col flex-1 h-0"
        light
        wrapperClassName="flex-col"
        size="large"
        scrollBoxClassName="outline-none"
        scrollBoxRef={scrollBox}
        scrollBoxProps={{
          tabIndex: 0,
        }}
        onScroll={handleScroll}
      >
        <Routes>
          <Route path="/admin" element={<AdminIndex key={routeLocation.key} />} />
        </Routes>
      </Scrollable>
    </div>
  );
});
