// App.jsx (요청사항 전체 반영)

import { useEffect, useState } from 'react';
import AuthScreen from './components/AuthScreen';
import FocusLivePage from './components/FocusLivePage';

export default function App() {
  const [isFocused, setIsFocused] = useState(false);
  const [showLogin, setShowLogin] = useState(false);

  // 4. 화면 꺼짐 방지
  useEffect(() => {
    let wakeLock = null;

    const enableWakeLock = async () => {
      try {
        if ('wakeLock' in navigator) {
          wakeLock = await navigator.wakeLock.request('screen');
        }
      } catch (e) {}
    };

    if (isFocused) enableWakeLock();

    return () => {
      if (wakeLock) wakeLock.release();
    };
  }, [isFocused]);

  // 알림 함수
  const notify = (msg) => {
    alert(msg);
    navigator.vibrate?.(200);
  };

  // 집중 시작
  const handleStart = () => {
    setIsFocused(true);
    notify('집중 시작 🔥');
  };

  // 집중 종료
  const handleEnd = () => {
    setIsFocused(false);
    notify('집중 종료 ✅');

    // 2. 로그인 유도
    setTimeout(() => {
      setShowLogin(true);
    }, 300);
  };

  // 포인트 획득
  const handlePoint = () => {
    notify('포인트 획득 +10 🎯');
  };

  if (showLogin) return <AuthScreen />;

  // 1. 홈 = 라이브 화면
  return (
    <FocusLivePage
      onStart={handleStart}
      onEnd={handleEnd}
      onPoint={handlePoint}
    />
  );
}
