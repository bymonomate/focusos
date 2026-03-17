import { useEffect, useState } from 'react';
import AuthScreen from './components/AuthScreen';
import FocusLivePage from './components/FocusLivePage';

export default function App() {
  const [isFocused, setIsFocused] = useState(false);
  const [showLogin, setShowLogin] = useState(false);

  // 화면 안꺼짐
  useEffect(() => {
    let wakeLock = null;

    const enable = async () => {
      try {
        if ('wakeLock' in navigator) {
          wakeLock = await navigator.wakeLock.request('screen');
        }
      } catch {}
    };

    if (isFocused) enable();

    return () => {
      if (wakeLock) wakeLock.release();
    };
  }, [isFocused]);

  const notify = (msg) => {
    alert(msg);
    navigator.vibrate?.(200);
  };

  const handleStart = () => {
    setIsFocused(true);
    notify('집중 시작 🔥');
  };

  const handleEnd = () => {
    setIsFocused(false);
    notify('집중 종료 ✅');

    // 로그인 유도
    setTimeout(() => {
      setShowLogin(true);
    }, 300);
  };

  const handlePoint = () => {
    notify('포인트 획득 +10 🎯');
  };

  if (showLogin) return <AuthScreen />;

  return (
    <FocusLivePage
      isFocused={isFocused}
      onStart={handleStart}
      onEnd={handleEnd}
      onPoint={handlePoint}
      showPriorityButton={true} // 우선순위 버튼 라이브에 표시
      hideLogFooter={true} // 로그 하단 문구 제거 플래그
    />
  );
}
