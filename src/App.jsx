import React, { useEffect, useMemo, useRef, useState } from 'react';

const STORAGE_KEYS = {
  tasks: 'focus-os-tasks',
  focusMinutes: 'focus-os-focus-minutes',
  todayStamp: 'focus-os-today-stamp',
};

const TODAY_LIMIT = 5;
const FOCUS_PRESETS = [5, 15, 25, 45];

const PRIORITY_ORDER = {
  '가장 중요': 0,
  중요: 1,
  '가벼운 일': 2,
};

const PRIORITY_BADGE = {
  '가장 중요': 'bg-rose-50 text-rose-700 border border-rose-100',
  중요: 'bg-violet-50 text-violet-700 border border-violet-100',
  '가벼운 일': 'bg-sky-50 text-sky-700 border border-sky-100',
};

const STATUS_BADGE = {
  대기: 'bg-zinc-100 text-zinc-700 border border-zinc-200',
  '진행 중': 'bg-emerald-50 text-emerald-700 border border-emerald-100',
  완료: 'bg-blue-50 text-blue-700 border border-blue-100',
};

const DEFAULT_TASKS = [
  {
    id: 101,
    createdAt: 1,
    list: 'today',
    priority: '가장 중요',
    title: '기획안 첫 문단 쓰기',
    note: '완벽하게 쓰기보다 첫 문장부터 시작하기',
    steps: [
      { text: '핵심 문장 한 줄 적기', done: false },
      { text: '첫 문단 3줄 채우기', done: false },
      { text: '초안 저장하기', done: false },
    ],
    status: '대기',
    start: '',
    end: '',
  },
  {
    id: 102,
    createdAt: 2,
    list: 'today',
    priority: '중요',
    title: '세금계산서 확인',
    note: '확인만 먼저 하고 수정은 따로 분리하기',
    steps: [
      { text: '메일 열기', done: false },
      { text: '첨부파일 확인', done: false },
      { text: '이상 유무 체크', done: false },
    ],
    status: '대기',
    start: '',
    end: '',
  },
  {
    id: 103,
    createdAt: 3,
    list: 'later',
    priority: '가벼운 일',
    title: '메일 답장 1개 보내기',
    note: '짧게 답할 수 있는 것부터 처리하기',
    steps: [
      { text: '받는 사람 확인', done: false },
      { text: '핵심 두 줄 쓰기', done: false },
    ],
    status: '대기',
    start: '',
    end: '',
  },
];

function formatNow(date = new Date()) {
  return date.toLocaleTimeString('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

function formatDate(date = new Date()) {
  return date.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  });
}

function formatTimer(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function playBeep() {
  try {
    if (typeof window === 'undefined') return;
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;

    const ctx = new AudioCtx();
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();

    oscillator.type = 'sine';
    oscillator.frequency.value = 880;
    oscillator.connect(gain);
    gain.connect(ctx.destination);

    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.00001, ctx.currentTime + 0.45);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.45);
  } catch {}
}

function getStorage() {
  if (typeof window === 'undefined') return null;
  return window.localStorage;
}

function getTodayLabel() {
  const date = new Date();
  return `${date.getMonth() + 1}/${date.getDate()}`;
}


function getDayStamp(date = new Date()) {
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
}

function resetTasksForNewDay(taskList) {
  return taskList.map((task) => {
    if (task.status === '완료') return task;
    if (task.list !== 'today') return task;
    return {
      ...task,
      list: 'later',
      status: '대기',
      start: '',
      end: '',
      steps: (task.steps || []).map((step) => ({ ...step, done: false })),
    };
  });
}

function getRewardMessage(score) {
  if (score >= 90) return '오늘 흐름 정말 좋음';
  if (score >= 70) return '집중 유지 잘하고 있어요';
  if (score >= 40) return '좋아요, 계속 작은 완료를 쌓아요';
  return '한 단계만 해도 충분해요';
}

function suggestPriority(title = '', note = '') {
  const text = `${title} ${note}`.toLowerCase();

  if (text.includes('기획') || text.includes('마감') || text.includes('제안') || text.includes('발표')) {
    return '가장 중요';
  }
  if (text.includes('답장') || text.includes('정리') || text.includes('확인') || text.includes('업로드')) {
    return '가벼운 일';
  }
  return '중요';
}

function suggestSteps(title = '', note = '') {
  const text = `${title} ${note}`.toLowerCase();

  if (text.includes('기획') || text.includes('제안') || text.includes('보고서')) {
    return [
      { text: '핵심 목적 한 줄 정리', done: false },
      { text: '목차 3개 먼저 정하기', done: false },
      { text: '첫 문단 초안 작성', done: false },
    ];
  }
  if (text.includes('디자인') || text.includes('ui') || text.includes('포스터') || text.includes('브랜딩')) {
    return [
      { text: '브레인스토밍 키워드 5개 적기', done: false },
      { text: '레퍼런스 3개 찾기', done: false },
      { text: '10분 러프 스케치 또는 레이아웃 잡기', done: false },
    ];
  }
  if (text.includes('글') || text.includes('원고') || text.includes('블로그')) {
    return [
      { text: '주제 한 문장 정리', done: false },
      { text: '소제목 3개 만들기', done: false },
      { text: '첫 문단 초안 작성', done: false },
    ];
  }
  if (text.includes('메일') || text.includes('답장') || text.includes('연락')) {
    return [
      { text: '받는 사람 확인', done: false },
      { text: '핵심 메시지 2줄 작성', done: false },
      { text: '전송 전 한번 읽기', done: false },
    ];
  }
  if (text.includes('정리') || text.includes('확인') || text.includes('업로드') || text.includes('정산')) {
    return [
      { text: '관련 파일 열기', done: false },
      { text: '필요 항목 체크', done: false },
      { text: '수정 또는 메모 남기기', done: false },
    ];
  }
  if (text.includes('개발') || text.includes('코딩') || text.includes('사이트')) {
    return [
      { text: '해야 할 기능 3개 적기', done: false },
      { text: '가장 작은 기능부터 구현', done: false },
      { text: '동작 테스트하기', done: false },
    ];
  }
  return [
    { text: '첫 단계 하나 적기', done: false },
    { text: '5분 안에 시작할 단위로 나누기', done: false },
    { text: '작게라도 완료 체크하기', done: false },
  ];
}

function normalizeTask(task) {
  return {
    ...task,
    steps: Array.isArray(task.steps) ? task.steps : [],
  };
}

function sortTasks(tasks) {
  return [...tasks].sort((a, b) => {
    const priorityDiff = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
    if (priorityDiff !== 0) return priorityDiff;
    return a.createdAt - b.createdAt;
  });
}

export default function FocusOS() {
  const newestTaskRef = useRef(null);

  const [tasks, setTasks] = useState(DEFAULT_TASKS);
  const [newTaskId, setNewTaskId] = useState(null);
  const [draggedTaskId, setDraggedTaskId] = useState(null);
  const [currentTime, setCurrentTime] = useState(formatNow());
  const [currentDate, setCurrentDate] = useState(formatDate());
  const [focusMinutes, setFocusMinutes] = useState(25);
  const [timerSeconds, setTimerSeconds] = useState(25 * 60);
  const [timerRunning, setTimerRunning] = useState(false);
  const [toast, setToast] = useState('');
  const [expandedReport, setExpandedReport] = useState(false);
  const [dailySummaryOpen, setDailySummaryOpen] = useState(false);
  const [showCelebrate, setShowCelebrate] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [focusMode, setFocusMode] = useState(false);
  const [dayStamp, setDayStamp] = useState(getDayStamp());

  const [tailwindReady, setTailwindReady] = useState(
    typeof window !== 'undefined' && !!window.tailwind
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (window.tailwind) {
      setTailwindReady(true);
      return;
    }

    const existing = document.querySelector('script[data-focus-tailwind="1"]');
    if (existing) {
      existing.addEventListener('load', () => setTailwindReady(true), { once: true });
      return;
    }

    const configScript = document.createElement('script');
    configScript.setAttribute('data-focus-tailwind-config', '1');
    configScript.text = `
      tailwind.config = {
        theme: {
          extend: {
            fontFamily: {
              sans: ['Inter', 'system-ui', 'sans-serif']
            }
          }
        }
      }
    `;
    document.head.appendChild(configScript);

    const script = document.createElement('script');
    script.src = 'https://cdn.tailwindcss.com';
    script.setAttribute('data-focus-tailwind', '1');
    script.onload = () => setTailwindReady(true);
    document.head.appendChild(script);
  }, []);


  useEffect(() => {
    const storage = getStorage();
    if (!storage) return;

    const savedTasks = storage.getItem(STORAGE_KEYS.tasks);
    const savedFocusMinutes = storage.getItem(STORAGE_KEYS.focusMinutes);
    const savedDayStamp = storage.getItem(STORAGE_KEYS.todayStamp);
    const currentStamp = getDayStamp();

    if (savedTasks) {
      try {
        const parsed = JSON.parse(savedTasks);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const normalized = parsed.map(normalizeTask);
          const nextTasks = savedDayStamp && savedDayStamp !== currentStamp
            ? resetTasksForNewDay(normalized)
            : normalized;
          setTasks(nextTasks);
        }
      } catch {}
    }

    if (savedFocusMinutes) {
      const minutes = Number(savedFocusMinutes);
      if (FOCUS_PRESETS.includes(minutes)) {
        setFocusMinutes(minutes);
        setTimerSeconds(minutes * 60);
      }
    }

    storage.setItem(STORAGE_KEYS.todayStamp, currentStamp);
    setDayStamp(currentStamp);
  }, []);

  useEffect(() => {
    const storage = getStorage();
    if (!storage) return;
    storage.setItem(STORAGE_KEYS.tasks, JSON.stringify(tasks));
    storage.setItem(STORAGE_KEYS.focusMinutes, String(focusMinutes));
    storage.setItem(STORAGE_KEYS.todayStamp, dayStamp);
  }, [tasks, focusMinutes, dayStamp]);

  useEffect(() => {
    const id = window.setInterval(() => {
      const now = new Date();
      setCurrentTime(formatNow(now));
      setCurrentDate(formatDate(now));
    }, 30000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (!newTaskId) return;
    const id = window.setTimeout(() => {
      newestTaskRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      setNewTaskId(null);
    }, 120);
    return () => window.clearTimeout(id);
  }, [newTaskId]);

  useEffect(() => {
    if (!timerRunning) return;
    const id = window.setInterval(() => {
      setTimerSeconds((prev) => {
        if (prev <= 1) {
          window.clearInterval(id);
          setTimerRunning(false);
          playBeep();
          setToast('집중 시간이 끝났어요. 체크하고 잠깐 쉬어요.');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [timerRunning]);

  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(''), 2200);
    return () => window.clearTimeout(id);
  }, [toast]);

  useEffect(() => {
    const onScroll = () => setShowScrollTop(window.scrollY > 200);
    window.addEventListener('scroll', onScroll);
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (!showCelebrate) return;
    const id = window.setTimeout(() => setShowCelebrate(false), 1400);
    return () => window.clearTimeout(id);
  }, [showCelebrate]);

  const sortedTasks = useMemo(() => sortTasks(tasks), [tasks]);
  const todayTasks = sortedTasks.filter((task) => task.list === 'today' && task.status !== '완료');
  const laterTasks = sortedTasks.filter((task) => task.list === 'later' && task.status !== '완료');
  const completedTasks = sortedTasks.filter((task) => task.status === '완료');
  const focusTask = sortedTasks.find((task) => task.status === '진행 중') || todayTasks[0] || null;
  const visibleTodayTasks = focusMode ? (focusTask ? [focusTask] : []) : todayTasks;

  const progress = sortedTasks.length ? Math.round((completedTasks.length / sortedTasks.length) * 100) : 0;
  const startedCount = sortedTasks.filter((task) => Boolean(task.start)).length;
  const focusScore = Math.min(100, completedTasks.length * 18 + startedCount * 7 + (focusTask ? 10 : 0));
  const rewardMessage = getRewardMessage(focusScore);

  const showToastMessage = (message) => setToast(message);

  const patchTask = (taskId, updater) => {
    setTasks((prev) => prev.map((task) => (task.id === taskId ? updater(task) : task)));
  };

  const addTask = (list) => {
    if (list === 'today' && todayTasks.length >= TODAY_LIMIT) {
      showToastMessage('오늘 할 일은 5개까지만 유지하는 게 좋아요.');
      return;
    }

    const id = Date.now();
    const nextTask = {
      id,
      createdAt: id,
      list,
      priority: '중요',
      title: list === 'today' ? '새 할 일' : '나중에 할 일',
      note: '',
      steps: [{ text: '첫 단계 적기', done: false }],
      status: '대기',
      start: '',
      end: '',
    };

    setTasks((prev) => [...prev, nextTask]);
    setNewTaskId(id);
    showToastMessage('새 카드가 아래에 생성됐어요.');
  };

  const updateTask = (taskId, patch) => {
    patchTask(taskId, (task) => ({ ...task, ...patch }));
  };

  const recordStart = (taskId) => {
    const now = formatNow();
    playBeep();
    setTasks((prev) =>
      prev.map((task) => {
        if (task.id === taskId) return { ...task, start: task.start || now, status: '진행 중' };
        if (task.status === '진행 중') return { ...task, status: '대기' };
        return task;
      })
    );
    setTimerSeconds(focusMinutes * 60);
    setTimerRunning(true);
    showToastMessage('집중 시작. 한 가지 일만 보면 돼요.');
  };

  const recordEnd = (taskId) => {
    const now = formatNow();
    playBeep();
    patchTask(taskId, (task) => ({ ...task, start: task.start || now, end: now, status: '완료' }));
    setTimerRunning(false);
    setTimerSeconds(focusMinutes * 60);
    setShowCelebrate(true);
    showToastMessage('완료 목록으로 이동했어요.');
  };

  const pauseTask = (taskId) => {
    patchTask(taskId, (task) => (task.status === '진행 중' ? { ...task, status: '대기' } : task));
    setTimerRunning(false);
    showToastMessage('작업을 잠깐 멈췄어요. 다시 이어서 할 수 있어요.');
  };

  const resetTask = (taskId) => {
    patchTask(taskId, (task) => ({
      ...task,
      status: '대기',
      start: '',
      end: '',
      steps: (task.steps || []).map((step) => ({ ...step, done: false })),
    }));
    setTimerRunning(false);
    setTimerSeconds(focusMinutes * 60);
    showToastMessage('작업을 초기화했어요. 처음부터 다시 시작할 수 있어요.');
  };

  const restoreTask = (taskId) => {
    patchTask(taskId, (task) => ({ ...task, end: '', status: '대기', list: 'today' }));
    showToastMessage('오늘 할 일로 복원했어요.');
  };

  const deleteTask = (taskId) => {
    setTasks((prev) => prev.filter((task) => task.id !== taskId));
  };

  const moveList = (taskId, nextList) => {
    if (nextList === 'today' && todayTasks.length >= TODAY_LIMIT) {
      showToastMessage('오늘 할 일은 5개까지만 두는 걸 추천해요.');
      return;
    }
    patchTask(taskId, (task) => ({
      ...task,
      list: nextList,
      status: task.status === '진행 중' && nextList === 'later' ? '대기' : task.status,
    }));
  };

  const recommendPriority = (taskId) => {
    const target = tasks.find((task) => task.id === taskId);
    if (!target) return;
    updateTask(taskId, { priority: suggestPriority(target.title, target.note) });
    showToastMessage('추천 우선순위를 적용했어요.');
  };

  const autoPrioritize = () => {
    setTasks((prev) => prev.map((task) => ({ ...task, priority: suggestPriority(task.title, task.note) })));
    showToastMessage('전체 할 일 우선순위를 다시 추천했어요.');
  };

  const handleDrop = (targetId) => {
    if (!draggedTaskId || draggedTaskId === targetId) return;

    const sourceTask = tasks.find((task) => task.id === draggedTaskId);
    const targetTask = tasks.find((task) => task.id === targetId);
    if (!sourceTask || !targetTask || sourceTask.list !== targetTask.list) return;

    const sameListTasks = tasks.filter((task) => task.list === sourceTask.list && task.status !== '완료');
    const otherTasks = tasks.filter((task) => !(task.list === sourceTask.list && task.status !== '완료'));

    const sourceIndex = sameListTasks.findIndex((task) => task.id === draggedTaskId);
    const targetIndex = sameListTasks.findIndex((task) => task.id === targetId);
    if (sourceIndex === -1 || targetIndex === -1) return;

    const reordered = [...sameListTasks];
    const [moved] = reordered.splice(sourceIndex, 1);
    reordered.splice(targetIndex, 0, moved);

    const resequenced = reordered.map((task, index) => ({ ...task, createdAt: index + 1 }));
    setTasks([...otherTasks, ...resequenced]);
    setDraggedTaskId(null);
    showToastMessage('카드 순서를 바꿨어요.');
  };

  const splitTask = (taskId) => {
    const target = tasks.find((task) => task.id === taskId);
    if (!target) return;
    updateTask(taskId, { steps: suggestSteps(target.title, target.note) });
    showToastMessage('작업을 더 작은 단계로 나눴어요.');
  };

  const addStep = (taskId) => {
    const target = tasks.find((task) => task.id === taskId);
    if (!target) return;
    updateTask(taskId, { steps: [...(target.steps || []), { text: '새 단계', done: false }] });
  };

  const updateStep = (taskId, stepIndex, value) => {
    const target = tasks.find((task) => task.id === taskId);
    if (!target) return;
    const nextSteps = [...(target.steps || [])];
    nextSteps[stepIndex] = { ...nextSteps[stepIndex], text: value };
    updateTask(taskId, { steps: nextSteps });
  };

  const toggleStep = (taskId, stepIndex) => {
    const target = tasks.find((task) => task.id === taskId);
    if (!target) return;
    const nextSteps = [...(target.steps || [])];
    nextSteps[stepIndex] = { ...nextSteps[stepIndex], done: !nextSteps[stepIndex].done };
    updateTask(taskId, { steps: nextSteps });
  };

  const deleteStep = (taskId, stepIndex) => {
    const target = tasks.find((task) => task.id === taskId);
    if (!target) return;
    updateTask(taskId, { steps: (target.steps || []).filter((_, index) => index !== stepIndex) });
  };

  const startNow = () => {
    const target = todayTasks[0];
    if (!target) {
      showToastMessage('먼저 오늘 할 일을 추가해 주세요.');
      return;
    }
    recordStart(target.id);
  };

  const quickStartFive = () => {
    setFocusMinutes(5);
    setTimerSeconds(5 * 60);
    const target = todayTasks[0];
    if (target) {
      recordStart(target.id);
    } else {
      showToastMessage('먼저 오늘 할 일을 하나 추가해 주세요.');
    }
  };

  const toggleTimer = () => {
    if (!timerRunning) {
      playBeep();
      if (timerSeconds === 0) setTimerSeconds(focusMinutes * 60);
      setTimerRunning(true);
      return;
    }
    setTimerRunning(false);
  };

  const resetTimer = () => {
    setTimerRunning(false);
    setTimerSeconds(focusMinutes * 60);
  };


  const toggleFocusMode = () => {
    if (!focusMode && !focusTask) {
      showToastMessage('집중할 작업이 아직 없어요. 먼저 Today에 작업을 추가해 주세요.');
      return;
    }
    setFocusMode((prev) => !prev);
  };

  const dailySummary = {
    completed: completedTasks.length,
    started: startedCount,
    remaining: todayTasks.length,
    rewardMessage,
  };

  if (!tailwindReady) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'grid',
          placeItems: 'center',
          background: 'linear-gradient(180deg, #f4f0ff 0%, #fffdf8 48%, #ffffff 100%)',
          color: '#18181b',
          fontFamily: 'Inter, system-ui, sans-serif',
        }}
      >
        스타일 적용 중...
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#f4f0ff_0%,#fffdf8_48%,#ffffff_100%)] text-zinc-900">
      <div className="sticky top-0 z-30 border-b border-white/70 bg-white/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 md:px-6">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-violet-600">Focus OS</p>
            <p className="truncate text-sm text-zinc-500">작게 시작하고, 한 번에 하나씩 끝내기</p>
          </div>
          <button onClick={toggleFocusMode} className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium shadow-sm transition ${focusMode ? 'bg-violet-600 text-white' : 'bg-zinc-900 text-white hover:bg-zinc-800'}`}>{focusMode ? '● Focus Mode ON' : 'Focus Mode'}</button>
        </div>
      </div>

      <section className="mx-auto max-w-6xl px-4 py-6 md:px-6 md:py-8">
        <header className="mb-8 overflow-hidden rounded-[36px] border border-zinc-900/5 bg-zinc-950 p-6 text-white shadow-[0_24px_80px_rgba(24,24,27,0.18)] md:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-xl">
              <p className="text-sm text-zinc-400">오늘의 리포트</p>
              <h1 className="mt-2 text-4xl font-bold tracking-tight md:text-5xl">{currentTime}</h1>
              <p className="mt-2 text-zinc-400">{currentDate}</p>
              <div className="mt-5 flex flex-wrap gap-2.5">
                <button onClick={startNow} className="rounded-2xl bg-white px-4 py-2.5 text-sm font-medium text-zinc-900 transition hover:scale-[1.01]">지금 시작하기</button>
                <button onClick={quickStartFive} className="rounded-2xl bg-violet-500 px-4 py-2.5 text-sm font-medium text-white transition hover:scale-[1.01]">5분만 시작</button>
                <button onClick={() => setExpandedReport((prev) => !prev)} className="rounded-2xl bg-white/10 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-white/15">하루 리포트 {expandedReport ? '닫기' : '보기'}</button>
                <button onClick={() => setDailySummaryOpen(true)} className="rounded-2xl bg-white/10 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-white/15">하루 종료 리포트</button>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <ReportCard label="완료" value={`${completedTasks.length}`} sub="오늘 끝낸 일" />
              <ReportCard label="시작" value={`${startedCount}`} sub="시도한 일" />
              <ReportCard label="진행률" value={`${progress}%`} sub="전체 흐름" />
              <ReportCard label="집중 점수" value={`${focusScore}`} sub={rewardMessage} />
            </div>
          </div>

          <div className="mt-6 h-3 overflow-hidden rounded-full bg-white/10">
            <div className="h-full rounded-full bg-emerald-400 transition-all duration-500" style={{ width: `${progress}%` }} />
          </div>

          {expandedReport && (
            <div className="mt-6 grid gap-4 md:grid-cols-3">
              <GlassCard title="오늘 남은 일" value={`${todayTasks.length}`} caption="과하게 늘리지 않고 5개 이내 유지" />
              <GlassCard title="현재 집중" value={focusTask ? focusTask.title : '없음'} caption="한 번에 하나씩" compact />
              <GlassCard title="타이머" value={formatTimer(timerSeconds)} caption="지금 집중 흐름" />
            </div>
          )}
        </header>

        <section className="mb-8 grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <Panel>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="max-w-md">
                <p className="text-sm font-medium text-violet-700">Focus</p>
                <h2 className="mt-1 text-2xl font-semibold tracking-tight">지금 한 가지에만 집중하기</h2>
                <p className="mt-2 text-sm leading-6 text-zinc-500">타이머 시작과 종료에 알림음이 들어가고, 진행 중 작업은 하나만 유지돼.</p>
              </div>
              <div className="rounded-[28px] bg-zinc-950 px-5 py-4 text-center text-white shadow-sm">
                <p className="text-sm text-zinc-400">포커스 타이머</p>
                <p className="mt-1 text-4xl font-semibold tracking-tight">{formatTimer(timerSeconds)}</p>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              {FOCUS_PRESETS.map((minutes) => (
                <button key={minutes} onClick={() => setFocusMinutes(minutes)} className={`rounded-full px-3.5 py-2.5 text-sm transition ${focusMinutes === minutes ? 'bg-violet-600 text-white shadow-sm' : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'}`}>{minutes}분</button>
              ))}
            </div>

            <div className="mt-5 rounded-[28px] border border-zinc-100 bg-zinc-50 p-4">
              <p className="text-sm text-zinc-500">현재 작업</p>
              <p className="mt-2 text-lg font-semibold text-zinc-900">{focusTask ? focusTask.title : '선택된 작업 없음'}</p>
              <p className="mt-1 text-sm text-zinc-500">{focusTask ? focusTask.note || '작게 시작해도 충분해요.' : '오늘 할 일에서 시작 버튼을 눌러보세요.'}</p>
            </div>

            <div className="mt-4 flex flex-wrap gap-2.5">
              <button onClick={toggleTimer} className="rounded-xl bg-black px-4 py-3 text-sm text-white transition hover:scale-[1.01]">{timerRunning ? '일시정지' : '타이머 시작'}</button>
              <button onClick={resetTimer} className="rounded-xl border border-zinc-200 px-4 py-3 text-sm transition hover:bg-zinc-50">리셋</button>
              <button onClick={quickStartFive} className="rounded-xl border border-violet-200 bg-violet-50 px-4 py-3 text-sm text-violet-700 transition hover:bg-violet-100">5분만 시작</button>
            </div>
          </Panel>

          <Panel>
            <p className="text-sm font-medium text-violet-700">운영 원칙</p>
            <h2 className="mt-1 text-2xl font-semibold tracking-tight">Focus OS</h2>
            <div className="mt-5 grid gap-3">
              <RuleCard title="Today는 5개 제한" desc="오늘 보이는 일이 많아지면 시작 장벽이 커져서 수를 제한해요." />
              <RuleCard title="Later는 보관함" desc="지금 안 해도 되는 일은 빼두고, 필요할 때만 Today로 옮겨요." />
              <RuleCard title="작업 분해" desc="큰 일을 5분 안에 시작 가능한 단계로 잘게 나눠요." />
            </div>
          </Panel>

        </section>

        {focusMode && focusTask && (
          <section className="mb-6 rounded-[28px] border border-violet-200 bg-violet-50/60 p-5 shadow-sm sm:mb-8 sm:rounded-[32px] sm:p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-violet-700">Focus Mode</p>
                <h2 className="mt-1 text-[clamp(1.6rem,4.5vw,2.25rem)] font-semibold tracking-tight text-zinc-900">{focusTask.title}</h2>
                <p className="mt-2 text-sm leading-6 text-zinc-600">지금은 이 카드 하나만 보고 끝내면 돼요.</p>
              </div>
              <div className="flex w-full flex-col gap-2 sm:w-auto">
                <button onClick={() => recordStart(focusTask.id)} className="rounded-2xl bg-zinc-950 px-5 py-3 text-sm font-semibold text-white transition hover:scale-[1.01]">
                  지금 시작하기
                </button>
                <button onClick={quickStartFive} className="rounded-2xl border border-violet-200 bg-white px-5 py-3 text-sm font-medium text-violet-700 transition hover:bg-violet-100">
                  5분만 시작
                </button>
              </div>
            </div>
          </section>
        )}

        <SectionCard
          eyebrow="Today"
          title={`오늘 할 일 (${todayTasks.length}/${TODAY_LIMIT})${focusMode ? " · 집중 보기" : ""}`}
          action={!focusMode ? (
            <div className="grid w-full grid-cols-1 gap-2 sm:flex sm:w-auto sm:flex-wrap">
              <button onClick={() => addTask('today')} className="order-1 rounded-2xl border-2 border-dashed border-zinc-300 px-4 py-3 text-sm font-medium text-zinc-600 transition hover:bg-zinc-50">+ 오늘 할 일 추가</button>
              <button onClick={autoPrioritize} className="order-2 rounded-2xl border border-zinc-200 px-4 py-3 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50">우선순위 자동정리</button>
            </div>
          ) : null}
        >
          <div className="space-y-4">
            {visibleTodayTasks.length > 0 ? visibleTodayTasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                isNew={task.id === newTaskId}
                innerRef={task.id === newTaskId ? newestTaskRef : null}
                recordStart={recordStart}
                recordEnd={recordEnd}
                pauseTask={pauseTask}
                resetTask={resetTask}
                moveList={moveList}
                deleteTask={deleteTask}
                updateTask={updateTask}
                recommendPriority={recommendPriority}
                splitTask={splitTask}
                addStep={addStep}
                updateStep={updateStep}
                toggleStep={toggleStep}
                deleteStep={deleteStep}
                onDragStart={setDraggedTaskId}
                onDropCard={handleDrop}
              />
            )) : <EmptyBox text={focusMode ? '집중 모드에서 보여줄 작업이 없어요. 먼저 시작할 작업을 정해보세요.' : '오늘 할 일이 비어 있어요. 가장 먼저 시작할 한 가지만 넣어보세요.'} />}
          </div>
        </SectionCard>

        {!focusMode && <SectionCard
          eyebrow="Later"
          title="나중에 할 일"
          action={<button onClick={() => addTask('later')} className="w-full rounded-2xl border-2 border-dashed border-zinc-300 px-4 py-3 text-sm font-medium text-zinc-600 transition hover:bg-zinc-50 sm:w-auto">+ 나중에 할 일 추가</button>}
        >
          <div className="space-y-4">
            {laterTasks.length > 0 ? laterTasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                recordStart={recordStart}
                recordEnd={recordEnd}
                pauseTask={pauseTask}
                resetTask={resetTask}
                moveList={moveList}
                deleteTask={deleteTask}
                updateTask={updateTask}
                recommendPriority={recommendPriority}
                splitTask={splitTask}
                addStep={addStep}
                updateStep={updateStep}
                toggleStep={toggleStep}
                deleteStep={deleteStep}
                onDragStart={setDraggedTaskId}
                onDropCard={handleDrop}
              />
            )) : <EmptyBox text="지금 당장 안 해도 되는 일을 여기에 보관해두면 Today가 훨씬 가벼워져요." />}
          </div>
        </SectionCard>}

        {!focusMode && completedTasks.length > 0 && (
          <SectionCard
            eyebrow="Completed"
            title="완료 목록"
            action={<span className="rounded-full bg-zinc-100 px-3 py-1 text-sm text-zinc-600">{completedTasks.length}개</span>}
          >
            <div className="space-y-3">
              {completedTasks.map((task) => (
                <div key={task.id} className="rounded-[28px] border border-zinc-100 bg-zinc-50/80 p-5 transition hover:scale-[1.005]">
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div>
                      <div className="flex flex-wrap gap-2">
                        <span className={`rounded-full px-3 py-1 text-xs ${PRIORITY_BADGE[task.priority]}`}>{task.priority}</span>
                        <span className={`rounded-full px-3 py-1 text-xs ${STATUS_BADGE[task.status]}`}>{task.status}</span>
                      </div>
                      <h3 className="mt-3 text-lg font-semibold text-zinc-900">{task.title}</h3>
                      {task.note && <p className="mt-1 text-sm text-zinc-600">{task.note}</p>}
                      <div className="mt-3 flex flex-wrap gap-3 text-sm text-zinc-500">
                        {task.start && <span>시작 {task.start}</span>}
                        {task.end && <span>종료 {task.end}</span>}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button onClick={() => restoreTask(task.id)} className="rounded-xl border border-violet-200 bg-white px-4 py-2 text-sm font-medium text-violet-700 transition hover:bg-violet-50">복원</button>
                      <button onClick={() => deleteTask(task.id)} className="rounded-xl border px-4 py-2 text-sm transition hover:bg-zinc-50">삭제</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>
        )}

        <footer className="mt-10 border-t border-zinc-200 pb-10 pt-6 text-center text-sm text-zinc-500">
          <p className="font-medium text-zinc-700">Focus OS</p>
          <p className="mt-1">작은 완료 하나가 흐름을 만듭니다.</p>
          <p className="mt-1 text-xs text-zinc-400">Focus • Start Small • Finish One Thing</p>
        </footer>

        {showScrollTop && (
          <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="fixed bottom-6 right-6 z-40 rounded-full bg-zinc-900 px-4 py-3 text-sm font-medium text-white shadow-lg transition hover:scale-105">↑ 위로</button>
        )}

        {dailySummaryOpen && (
          <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/35 px-4">
            <div className="w-full max-w-lg rounded-[28px] bg-white p-6 shadow-2xl">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-violet-700">하루 종료 리포트</p>
                  <h3 className="mt-1 text-2xl font-semibold text-zinc-900">오늘의 정리</h3>
                </div>
                <button onClick={() => setDailySummaryOpen(false)} className="rounded-xl border px-3 py-2 text-sm">닫기</button>
              </div>
              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                <SummaryTile label="완료" value={String(dailySummary.completed)} />
                <SummaryTile label="시작" value={String(dailySummary.started)} />
                <SummaryTile label="남은 일" value={String(dailySummary.remaining)} />
              </div>
              <div className="mt-5 rounded-[24px] bg-zinc-50 p-4">
                <p className="text-sm text-zinc-500">오늘 한마디</p>
                <p className="mt-2 text-lg font-semibold text-zinc-900">{dailySummary.rewardMessage}</p>
              </div>
            </div>
          </div>
        )}

        {showCelebrate && (
          <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden">
            <div className="absolute left-1/2 top-24 -translate-x-1/2 rounded-full bg-violet-500 px-5 py-3 text-sm font-semibold text-white shadow-xl animate-[celebrate_1.2s_ease-out]">완료! 잘했어요 ✨</div>
          </div>
        )}

        {toast && (
          <div className="fixed bottom-5 left-1/2 z-50 -translate-x-1/2 rounded-2xl bg-zinc-900 px-4 py-3 text-sm font-medium text-white shadow-xl">{toast}</div>
        )}

        <style>{`
          @keyframes celebrate {
            0% { opacity: 0; transform: translate(-50%, 12px) scale(0.95); }
            20% { opacity: 1; transform: translate(-50%, 0) scale(1); }
            80% { opacity: 1; transform: translate(-50%, -6px) scale(1); }
            100% { opacity: 0; transform: translate(-50%, -16px) scale(1.02); }
          }
        `}</style>
      </section>
    </main>
  );
}

function Panel({ children }) {
  return <div className="rounded-[32px] border border-zinc-100 bg-white p-6 shadow-sm">{children}</div>;
}

function SectionCard({ eyebrow, title, action, children }) {
  return (
    <section className="mb-6 rounded-[28px] border border-zinc-100 bg-white p-4 shadow-sm sm:mb-8 sm:rounded-[32px] sm:p-6">
      <div className="mb-5 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-medium text-violet-700">{eyebrow}</p>
          <h2 className="text-[clamp(1.75rem,5vw,2.25rem)] font-semibold tracking-tight sm:text-2xl">{title}</h2>
        </div>
        {action ? <div className="w-full sm:w-auto">{action}</div> : null}
      </div>
      {children}
    </section>
  );
}

function ReportCard({ label, value, sub }) {
  return (
    <div className="rounded-[24px] bg-white/10 px-4 py-3 text-left text-white ring-1 ring-white/10">
      <p className="text-sm text-zinc-400">{label}</p>
      <p className="text-2xl font-semibold">{value}</p>
      <p className="mt-1 text-xs text-zinc-400">{sub}</p>
    </div>
  );
}

function GlassCard({ title, value, caption, compact = false }) {
  return (
    <div className="rounded-[24px] bg-white/10 p-4 ring-1 ring-white/10">
      <p className="text-sm text-zinc-400">{title}</p>
      <p className={`mt-2 font-semibold text-white ${compact ? 'text-lg' : 'text-2xl'}`}>{value}</p>
      <p className="mt-1 text-sm text-zinc-400">{caption}</p>
    </div>
  );
}

function RuleCard({ title, desc }) {
  return (
    <div className="rounded-[24px] bg-zinc-50 p-4 ring-1 ring-zinc-100">
      <p className="font-medium text-zinc-900">{title}</p>
      <p className="mt-1 text-sm leading-6 text-zinc-600">{desc}</p>
    </div>
  );
}

function EmptyBox({ text }) {
  return <div className="rounded-[24px] border border-dashed border-zinc-200 bg-zinc-50 px-4 py-8 text-center text-sm text-zinc-500">{text}</div>;
}

function SummaryTile({ label, value }) {
  return (
    <div className="rounded-[22px] bg-zinc-50 p-4 text-center">
      <p className="text-sm text-zinc-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-zinc-900">{value}</p>
    </div>
  );
}

function InfoBox({ label, value }) {
  return (
    <div className="rounded-[22px] border border-zinc-200 bg-zinc-50 px-4 py-3">
      <p className="text-xs font-medium text-zinc-500">{label}</p>
      <p className="mt-2 text-base font-semibold text-zinc-900">{value}</p>
    </div>
  );
}



const TaskCard = React.memo(function TaskCard({
  task,
  isNew,
  innerRef,
  recordStart,
  recordEnd,
  pauseTask,
  resetTask,
  moveList,
  deleteTask,
  updateTask,
  recommendPriority,
  splitTask,
  addStep,
  updateStep,
  toggleStep,
  deleteStep,
  onDragStart,
  onDropCard,
}) {
  const [draftTitle, setDraftTitle] = useState(task.title);
  const [draftNote, setDraftNote] = useState(task.note);
  const [collapsed, setCollapsed] = useState(task.status !== '진행 중');
  const [menuOpen, setMenuOpen] = useState(false);
  const [dragReady, setDragReady] = useState(false);

  useEffect(() => {
    setDraftTitle(task.title);
  }, [task.title]);

  useEffect(() => {
    setDraftNote(task.note);
  }, [task.note]);

  useEffect(() => {
    if (task.status === '진행 중') setCollapsed(false);
  }, [task.status]);

  useEffect(() => {
    const close = () => setMenuOpen(false);
    if (!menuOpen) return;
    window.addEventListener('click', close);
    return () => window.removeEventListener('click', close);
  }, [menuOpen]);

  const commitTitle = () => {
    if (draftTitle === task.title) return;
    updateTask(task.id, { title: draftTitle });
  };

  const commitNote = () => {
    if (draftNote === task.note) return;
    updateTask(task.id, { note: draftNote });
  };

  const doneCount = (task.steps || []).filter((step) => step.done).length;
  const totalSteps = (task.steps || []).length;
  const stepProgress = totalSteps ? Math.round((doneCount / totalSteps) * 100) : 0;

  const enableDrag = () => setDragReady(true);
  const disableDrag = () => setDragReady(false);

  const primaryAction = !task.start ? 'start' : !task.end ? 'finish' : 'done';

  return (
    <article
      ref={innerRef}
      draggable={dragReady}
      onDragStart={() => dragReady && onDragStart(task.id)}
      onDragEnd={disableDrag}
      onDragOver={(e) => e.preventDefault()}
      onDrop={() => onDropCard(task.id)}
      className={`rounded-[24px] border p-3 transition sm:rounded-[30px] sm:p-4 ${
        task.status === '진행 중'
          ? 'border-emerald-300 bg-emerald-50/50 shadow-sm'
          : isNew
          ? 'border-violet-400 bg-violet-50/60 shadow-sm'
          : 'border-zinc-100 bg-white'
      }`}
    >
      <div className="flex items-start gap-3">
        <button
          type="button"
          onMouseDown={enableDrag}
          onMouseUp={disableDrag}
          onMouseLeave={disableDrag}
          onTouchStart={enableDrag}
          onTouchEnd={disableDrag}
          className="mt-1 shrink-0 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-500 active:scale-95 cursor-grab active:cursor-grabbing"
          title="드래그해서 순서 정렬"
        >
          ☰
        </button>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <input
                value={draftTitle}
                onChange={(e) => setDraftTitle(e.target.value)}
                onBlur={commitTitle}
                className="w-full bg-transparent text-[22px] font-semibold leading-tight outline-none placeholder:text-zinc-400 sm:text-lg"
              />

              <div className="mt-2 flex flex-wrap gap-2">
                <span className={`rounded-full px-3 py-1 text-xs ${PRIORITY_BADGE[task.priority]}`}>{task.priority}</span>
                <span className={`rounded-full px-3 py-1 text-xs ${STATUS_BADGE[task.status]}`}>{task.status}</span>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                onClick={() => setCollapsed((prev) => !prev)}
                className="rounded-xl border border-zinc-200 px-3 py-2 text-xs text-zinc-600 transition hover:bg-zinc-50"
              >
                {collapsed ? '펼치기' : '접기'}
              </button>

              <div className="relative">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setMenuOpen((prev) => !prev);
                  }}
                  className="rounded-xl border border-zinc-200 px-3 py-2 text-sm text-zinc-600 transition hover:bg-zinc-50"
                >
                  ⋯
                </button>

                {menuOpen && (
                  <div
                    className="absolute right-0 top-12 z-20 min-w-[170px] overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-lg"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        recommendPriority(task.id);
                        setMenuOpen(false);
                      }}
                      className="block w-full border-b border-zinc-100 px-4 py-3 text-left text-sm text-zinc-700 hover:bg-zinc-50"
                    >
                      우선순위 추천
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        splitTask(task.id);
                        setMenuOpen(false);
                      }}
                      className="block w-full border-b border-zinc-100 px-4 py-3 text-left text-sm text-zinc-700 hover:bg-zinc-50"
                    >
                      AI 작업분해
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        moveList(task.id, task.list === 'today' ? 'later' : 'today');
                        setMenuOpen(false);
                      }}
                      className="block w-full border-b border-zinc-100 px-4 py-3 text-left text-sm text-zinc-700 hover:bg-zinc-50"
                    >
                      {task.list === 'today' ? 'Later로 이동' : 'Today로 이동'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        resetTask(task.id);
                        setMenuOpen(false);
                      }}
                      className="block w-full border-b border-zinc-100 px-4 py-3 text-left text-sm text-zinc-700 hover:bg-zinc-50 sm:hidden"
                    >
                      초기화
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        deleteTask(task.id);
                        setMenuOpen(false);
                      }}
                      className="block w-full px-4 py-3 text-left text-sm text-rose-600 hover:bg-rose-50"
                    >
                      삭제
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="mt-3 h-2 overflow-hidden rounded-full bg-zinc-100">
            <div
              className="h-full rounded-full bg-violet-500 transition-all"
              style={{ width: `${stepProgress}%` }}
            />
          </div>

          {collapsed ? (
            <div className="mt-3">
              <p
                className="text-sm text-zinc-500"
                style={{ display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}
              >
                {draftNote || '메모 없음'}
              </p>
              <p className="mt-2 text-xs text-zinc-400">
                단계 {doneCount}/{totalSteps}
                {task.start ? ` · 시작 ${task.start}` : ''}
                {task.end ? ` · 종료 ${task.end}` : ''}
              </p>

              <div className="mt-3 flex flex-wrap gap-2">
                {primaryAction === 'start' && (
                  <button onClick={() => recordStart(task.id)} className="min-h-10 rounded-xl bg-black px-4 py-2.5 text-sm text-white transition hover:scale-[1.01]">
                    시작
                  </button>
                )}
                {primaryAction === 'finish' && (
                  <button onClick={() => recordEnd(task.id)} className="min-h-10 rounded-xl border px-4 py-2.5 text-sm transition hover:bg-zinc-50">
                    종료
                  </button>
                )}
                {task.status === '진행 중' && (
                  <button onClick={() => pauseTask(task.id)} className="min-h-10 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-700 transition hover:bg-amber-100">
                    멈춤
                  </button>
                )}
                <button onClick={() => resetTask(task.id)} className="hidden min-h-10 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm text-rose-700 transition hover:bg-rose-100 sm:inline-flex">
                  초기화
                </button>
              </div>
            </div>
          ) : (
            <>
              <textarea
                value={draftNote}
                onChange={(e) => setDraftNote(e.target.value)}
                onBlur={commitNote}
                rows={2}
                className="mt-2 w-full resize-none bg-transparent text-sm text-zinc-600 outline-none placeholder:text-zinc-400"
              />

              <div className="mt-4 flex flex-wrap gap-2">
                {!task.start && (
                  <button onClick={() => recordStart(task.id)} className="min-h-10 rounded-xl bg-black px-4 py-2.5 text-sm text-white transition hover:scale-[1.01]">
                    시작
                  </button>
                )}
                {task.start && !task.end && (
                  <button onClick={() => recordEnd(task.id)} className="min-h-10 rounded-xl border px-4 py-2.5 text-sm transition hover:bg-zinc-50">
                    종료
                  </button>
                )}
                {task.status === '진행 중' && (
                  <button onClick={() => pauseTask(task.id)} className="min-h-10 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-700 transition hover:bg-amber-100">
                    멈춤
                  </button>
                )}
                <button onClick={() => resetTask(task.id)} className="min-h-10 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm text-rose-700 transition hover:bg-rose-100">
                  초기화
                </button>
                <select
                  value={task.priority}
                  onChange={(e) => updateTask(task.id, { priority: e.target.value })}
                  className="min-h-10 rounded-xl border px-3 py-2.5 text-sm"
                >
                  <option>가장 중요</option>
                  <option>중요</option>
                  <option>가벼운 일</option>
                </select>
              </div>

              {(task.start || task.end) && (
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {task.start && <InfoBox label="시작 시간" value={task.start} />}
                  {task.end && <InfoBox label="종료 시간" value={task.end} />}
                </div>
              )}

              <div className="mt-4 rounded-[22px] bg-zinc-50 p-3 sm:rounded-[26px] sm:p-4">
                <div className="mb-3 rounded-2xl bg-white px-3 py-2 text-xs text-zinc-500 ring-1 ring-zinc-100">
                  AI 작업분해는 할 일 제목과 메모를 보고 바로 시작 가능한 3단계 정도로 자동 추천해줘요.
                </div>

                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-zinc-700">작업 단계</p>
                    <p className="text-xs text-zinc-500">완료 {doneCount}/{totalSteps}</p>
                  </div>
                  <button onClick={() => addStep(task.id)} className="rounded-xl border px-3 py-2 text-sm transition hover:bg-white">
                    단계 추가
                  </button>
                </div>

                <div className="mb-4 h-2 overflow-hidden rounded-full bg-white">
                  <div className="h-full rounded-full bg-violet-500 transition-all" style={{ width: `${stepProgress}%` }} />
                </div>

                <div className="space-y-2">
                  {(task.steps || []).map((step, idx) => (
                    <div key={`${task.id}-step-${idx}`} className="flex items-center gap-2 rounded-[18px] bg-white px-3 py-2.5 ring-1 ring-zinc-100 sm:rounded-[20px]">
                      <button onClick={() => toggleStep(task.id, idx)} className={`flex h-5 w-5 items-center justify-center rounded-md border text-[10px] ${step.done ? 'border-violet-500 bg-violet-500 text-white' : 'border-zinc-300 text-transparent'}`}>
                        ✓
                      </button>
                      <input value={step.text} onChange={(e) => updateStep(task.id, idx, e.target.value)} className={`w-full bg-transparent text-sm outline-none ${step.done ? 'text-zinc-400 line-through' : 'text-zinc-700'}`} />
                      <button onClick={() => deleteStep(task.id, idx)} className="rounded-lg border px-2 py-1 text-xs text-zinc-500 transition hover:bg-zinc-50">
                        삭제
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </article>
  );
});


