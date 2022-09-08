import { useCallback, useRef, useEffect } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { runInAction } from 'mobx';
import { observer } from 'mobx-react-lite';
import { CircularProgress } from '@mui/material';

import bgImg1x from '~/assets/images/pierre-bouillot-QlCNwrdd_iA-unsplash.jpg';
import bgImg2x from '~/assets/images/pierre-bouillot-QlCNwrdd_iA-unsplash@2x.jpg';
import bgImg3x from '~/assets/images/pierre-bouillot-QlCNwrdd_iA-unsplash@3x.jpg';
import { Scrollable } from '~/components';

import { Header } from './Header';
import { PostList } from './PostList';
import { PostDetail } from './PostDetail';
import { NewPost } from './NewPost';
import { UserProfile } from './UserProfile';
import { NotificationPage } from './NotificationPage';
import { chooseImgByPixelRatio, usePageState } from '~/utils';

export const Main = observer(() => {
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
      {false && (
        <div className="flex-col flex-1 flex-center">
          <CircularProgress />
          <div className="text-white mt-6">
            数据加载中 ...
          </div>
        </div>
      )}
      <Header />

      <Scrollable
        className="flex-col flex-1 h-0"
        light
        wrapperClassName="flex-col"
        size="large"
        scrollBoxRef={scrollBox}
        onScroll={handleScroll}
      >
        <Routes>
          <Route path="/" element={<PostList />} />
          <Route path="/post/:groupId/:trxId" element={<PostDetail />} />
          <Route path="/newpost" element={<NewPost />} />
          <Route path="/userprofile/:groupId/:userAddress" element={<UserProfile />} />
          <Route path="/notification" element={<NotificationPage />} />
        </Routes>
      </Scrollable>
    </div>
  );
});
