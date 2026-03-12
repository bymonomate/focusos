import { useEffect, useMemo, useRef, useState } from 'react';

const STORAGE_KEYS = {
  tasks: 'focus-os-tasks',
  focusMinutes: 'focus-os-focus-minutes',
};

const TODAY_LIMIT = 5;
const FOCUS_PRESETS = [5, 15, 25, 45];

const SUPABASE_URL = 'https://txsitevklbliwqmvtkvh.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR4c2l0ZXZrbGJsaXdxbXZ0a3ZoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMyOTMzOTIsImV4cCI6MjA4ODg2OTM5Mn0.nLnI2rfMkGj_End1Yqs-AQiz_xQH5JwOfDVXGJ19lik';

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

function createTaskId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return `task-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function ensureTaskId(task) {
  const current = task?.id;
  if (typeof current === 'string' && current.length > 10) return current;
  return createTaskId();
}

function mapTaskFromDb(row) {
  return {
    id: row.id,
    createdAt: row.created_at ? new Date(row.created_at).getTime() : Date.now(),
    list: row.list || 'today',
    priority: row.priority || '중요',
    title: row.title || '',
    note: row.note || '',
    steps: Array.isArray(row.steps) ? row.steps : [],
    status: row.status || '대기',
    start: row.start_time || '',
    end: row.end_time || '',
  };
}

function mapTaskToDb(task, userId) {
  return {
    id: ensureTaskId(task),
    user_id: userId,
    title: task.title || '',
    note: task.note || '',
    priority: task.priority || '중요',
    status: task.status || '대기',
    list: task.list || 'today',
    start_time: task.start || null,
    end_time: task.end || null,
    steps: Array.isArray(task.steps) ? task.steps : [],
    created_at: task.createdAt ? new Date(task.createdAt).toISOString() : new Date().toISOString(),
  };
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
    id: ensureTaskId(task),
    createdAt: task.createdAt || Date.now(),
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
  const hydratingFromDbRef = useRef(false);

  const [supabaseClient, setSupabaseClient] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [session, setSession] = useState(null);
  const [dbReady, setDbReady] = useState(false);
  const [tasks, setTasks] = useState(DEFAULT_TASKS.map(normalizeTask));
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
  const [focusedTaskId, setFocusedTaskId] = useState(null);

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
    if (typeof window === 'undefined') return;

    const initClient = () => {
      if (!window.supabase?.createClient) {
        setAuthReady(true);
        return;
      }

      const client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      setSupabaseClient(client);

      client.auth.getSession().then(({ data }) => {
        setSession(data.session ?? null);
        setAuthReady(true);
      });

      const {
        data: { subscription },
      } = client.auth.onAuthStateChange((_event, nextSession) => {
        setSession(nextSession ?? null);
      });

      return () => subscription.unsubscribe();
    };

    if (window.supabase?.createClient) {
      return initClient();
    }

    const existing = document.querySelector('script[data-focus-supabase="1"]');
    if (existing) {
      existing.addEventListener('load', initClient, { once: true });
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js';
    script.setAttribute('data-focus-supabase', '1');
    script.onload = initClient;
    script.onerror = () => setAuthReady(true);
    document.head.appendChild(script);
  }, []);



  useEffect(() => {
    const storage = getStorage();
    if (!storage) return;

    const savedFocusMinutes = storage.getItem(STORAGE_KEYS.focusMinutes);
    if (savedFocusMinutes) {
      const minutes = Number(savedFocusMinutes);
      if (FOCUS_PRESETS.includes(minutes)) {
        setFocusMinutes(minutes);
        setTimerSeconds(minutes * 60);
      }
    }
  }, []);

  useEffect(() => {
    const storage = getStorage();
    if (!storage) return;
    storage.setItem(STORAGE_KEYS.focusMinutes, String(focusMinutes));
  }, [focusMinutes]);

  useEffect(() => {
    if (!session?.user?.id) return;

    const loadTasks = async () => {
      if (!supabaseClient) return;
      hydratingFromDbRef.current = true;
      setDbReady(false);

      const { data, error } = await supabaseClient
        .from('tasks')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('tasks load error', error);
        setTasks(DEFAULT_TASKS.map(normalizeTask));
        setDbReady(true);
        hydratingFromDbRef.current = false;
        return;
      }

      if (Array.isArray(data) && data.length > 0) {
        setTasks(data.map(mapTaskFromDb).map(normalizeTask));
      } else {
        const seeded = DEFAULT_TASKS.map((task) => normalizeTask({ ...task, id: createTaskId() }));
        setTasks(seeded);

        const rows = seeded.map((task) => mapTaskToDb(task, session.user.id));
        const { error: seedError } = await supabaseClient.from('tasks').upsert(rows, { onConflict: 'id' });
        if (seedError) {
          console.error('tasks seed error', seedError);
        }
      }

      setDbReady(true);
      window.setTimeout(() => {
        hydratingFromDbRef.current = false;
      }, 0);
    };

    loadTasks();
  }, [supabaseClient, session?.user?.id]);

  useEffect(() => {
    if (!supabaseClient || !session?.user?.id || !dbReady) return;
    if (hydratingFromDbRef.current) return;

    const syncTasks = async () => {
      const rows = tasks.map((task) => mapTaskToDb(task, session.user.id));
      const { data: existing, error: existingError } = await supabaseClient
        .from('tasks')
        .select('id')
        .eq('user_id', session.user.id);

      if (existingError) {
        console.error('tasks existing fetch error', existingError);
        return;
      }

      const { error: upsertError } = await supabaseClient
        .from('tasks')
        .upsert(rows, { onConflict: 'id' });

      if (upsertError) {
        console.error('tasks upsert error', upsertError);
        return;
      }

      const existingIds = new Set((existing || []).map((item) => item.id));
      const currentIds = new Set(rows.map((item) => item.id));
      const toDelete = [...existingIds].filter((id) => !currentIds.has(id));

      if (toDelete.length > 0) {
        const { error: deleteError } = await supabaseClient
          .from('tasks')
          .delete()
          .in('id', toDelete)
          .eq('user_id', session.user.id);

        if (deleteError) {
          console.error('tasks delete error', deleteError);
        }
      }
    };

    const timeoutId = window.setTimeout(syncTasks, 250);
    return () => window.clearTimeout(timeoutId);
  }, [supabaseClient, session?.user?.id, dbReady, tasks]);

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
  const activeTask = sortedTasks.find((task) => task.status === '진행 중') || null;
  const focusTask = focusMode
    ? sortedTasks.find((task) => task.id === focusedTaskId) || null
    : activeTask;

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

    const id = createTaskId();
    const nextTask = {
      id,
      createdAt: Date.now(),
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
    if (focusedTaskId === taskId) {
      setFocusMode(false);
      setFocusedTaskId(null);
    }
    setTimerRunning(false);
    setTimerSeconds(focusMinutes * 60);
    setShowCelebrate(true);
    showToastMessage('완료 목록으로 이동했어요.');
  };

  const pauseTask = (taskId) => {
    patchTask(taskId, (task) => (task.id === taskId ? { ...task, status: '대기' } : task));
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
    setTasks((prev) => {
      const reprioritized = prev.map((task) => ({
        ...task,
        priority: suggestPriority(task.title, task.note),
      }));
      return sortTasks(reprioritized).map((task, index) => ({
        ...task,
        createdAt: index + 1,
      }));
    });
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
    playBeep();
    setFocusMinutes(5);
    setTimerSeconds(5 * 60);
    setTimerRunning(true);

    if (focusMode && focusTask) {
      recordStart(focusTask.id);
    } else {
      showToastMessage('5분 타이머를 시작했어요.');
    }
  };

  const openFocusMode = (taskId) => {
    setFocusedTaskId(taskId);
    setFocusMode(true);
    const target = tasks.find((task) => task.id === taskId);
    if (target && target.status !== '진행 중') {
      recordStart(taskId);
    } else if (target) {
      if (timerSeconds === 0) setTimerSeconds(focusMinutes * 60);
      setTimerRunning(true);
    }
  };

  const closeFocusMode = () => {
    setFocusMode(false);
    setFocusedTaskId(null);
  };

  const toggleTimer = () => {
    if (!focusMode || !focusTask) {
      if (!timerRunning) {
        playBeep();
        if (timerSeconds === 0) setTimerSeconds(focusMinutes * 60);
        setTimerRunning(true);
      } else {
        setTimerRunning(false);
      }
      return;
    }

    if (!timerRunning) {
      if (focusTask.status !== '진행 중') {
        recordStart(focusTask.id);
      } else {
        playBeep();
        if (timerSeconds === 0) setTimerSeconds(focusMinutes * 60);
        setTimerRunning(true);
      }
      return;
    }

    pauseTask(focusTask.id);
  };

  const resetTimer = () => {
    setTimerRunning(false);
    setTimerSeconds(focusMinutes * 60);
  };

  const signOut = async () => {
    if (!supabaseClient) return;
    await supabaseClient.auth.signOut();
    setSession(null);
    setDbReady(false);
  };

  const dailySummary = {
    completed: completedTasks.length,
    started: startedCount,
    remaining: todayTasks.length,
    rewardMessage,
  };

  if (!tailwindReady || !authReady) {
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
        불러오는 중...
      </div>
    );
  }

  if (!session) {
    return <AuthScreen supabaseClient={supabaseClient} />;
  }

  return (
    <main className={`min-h-screen text-zinc-900 transition-colors ${
      focusMode
        ? 'bg-[radial-gradient(circle_at_top,#ede9fe_0%,#f8f7ff_40%,#ffffff_100%)]'
        : 'bg-[radial-gradient(circle_at_top,#f4f0ff_0%,#fffdf8_48%,#ffffff_100%)]'
    }`}>
      <div className="sticky top-0 z-30 border-b border-white/70 bg-white/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 md:px-6">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-violet-600">Focus OS</p>
            <p className="text-sm text-zinc-500">작게 시작하고, 한 번에 하나씩 끝내기</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={signOut} className="rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 shadow-sm transition hover:bg-zinc-50">로그아웃</button>
          </div>
        </div>
      </div>

      {focusMode && focusTask && (
        <section className="mx-auto max-w-6xl px-4 pt-6 md:px-6">
          <div className="rounded-[32px] border border-violet-200 bg-violet-50/70 p-5 shadow-sm">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-violet-700">Focus Mode</p>
                <h2 className="mt-2 text-3xl font-semibold tracking-tight text-zinc-950">
                  {focusTask ? focusTask.title : '지금 한 가지에만 집중하기'}
                </h2>
                <p className="mt-3 text-base text-zinc-600">
                  {focusTask ? (focusTask.note || '지금은 이 카드 하나만 보고 끝내면 돼요.') : '오늘 할 일 카드에서 시작 또는 집중 시작을 눌러 작업을 선택해 주세요. 필요하면 Focus Mode 종료로 원래 화면으로 돌아갈 수 있어요.'}
                </p>
                {focusTask?.start ? (
                  <div className="mt-4 inline-flex rounded-2xl bg-white px-4 py-3 text-sm text-zinc-700 ring-1 ring-violet-100">
                    시작 시간 {focusTask.start}
                  </div>
                ) : null}
              </div>

              <div className="shrink-0 rounded-[28px] bg-zinc-950 px-6 py-5 text-white shadow-sm">
                <p className="text-sm text-zinc-400">포커스 타이머</p>
                <p className="mt-2 text-4xl font-bold tracking-tight">{formatTimer(timerSeconds)}</p>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap gap-2.5">
              <button onClick={toggleTimer} className="rounded-2xl bg-black px-4 py-3 text-sm font-medium text-white transition hover:scale-[1.01]">
                {timerRunning ? '일시정지' : '타이머 시작'}
              </button>
              <button onClick={quickStartFive} className="rounded-2xl border border-violet-200 bg-white px-4 py-3 text-sm font-medium text-violet-700 transition hover:bg-violet-100">
                5분만 시작
              </button>
              <button onClick={closeFocusMode} className="rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50">
                Focus Mode 종료
              </button>
            </div>
          </div>
        </section>
      )}

      <section className="mx-auto max-w-6xl px-4 py-6 md:px-6 md:py-8">
        <header className={`mb-8 overflow-hidden rounded-[36px] border border-zinc-900/5 bg-zinc-950 p-6 text-white shadow-[0_24px_80px_rgba(24,24,27,0.18)] transition md:p-8 ${focusMode ? "hidden" : ""}`}>
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

        <section className={`mb-8 grid gap-6 lg:grid-cols-[1.05fr_0.95fr] transition ${focusMode ? "hidden" : ""}`}>
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

            <div className="mt-5 flex flex-wrap gap-2.5">
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

        <div className={focusMode ? "ring-2 ring-violet-200 rounded-[36px]" : ""}><SectionCard
          eyebrow="Today"
          title={`오늘 할 일 (${todayTasks.length}/${TODAY_LIMIT})`}
          action={
            focusMode ? null : (
              <div className="flex flex-wrap gap-2">
                <button onClick={autoPrioritize} className="rounded-2xl border border-zinc-200 px-4 py-3 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50">우선순위 자동정리</button>
                <button onClick={() => addTask('today')} className="rounded-2xl border-2 border-dashed border-zinc-300 px-4 py-3 text-sm font-medium text-zinc-600 transition hover:bg-zinc-50">+ 오늘 할 일 추가</button>
              </div>
            )
          }
        >
          <div className="space-y-4">
            {(focusMode ? (focusTask ? [focusTask] : []) : todayTasks).length > 0 ? (focusMode ? (focusTask ? [focusTask] : []) : todayTasks).map((task) => (
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
                startFocusMode={openFocusMode}
                onDragStart={setDraggedTaskId}
                onDropCard={handleDrop}
              />
            )) : <EmptyBox text={focusMode ? '현재 진행 중인 작업이 없어요. 오늘 할 일에서 시작 버튼을 누르거나 5분만 시작으로 첫 작업을 시작해 보세요.' : '오늘 할 일이 비어 있어요. 가장 먼저 시작할 한 가지만 넣어보세요.'} />}
          </div>
        </SectionCard></div>

        <section className={focusMode ? "hidden" : ""}><SectionCard
          eyebrow="Later"
          title="나중에 할 일"
          action={<button onClick={() => addTask('later')} className="rounded-2xl border-2 border-dashed border-zinc-300 px-4 py-3 text-sm font-medium text-zinc-600 transition hover:bg-zinc-50">+ 나중에 할 일 추가</button>}
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
                startFocusMode={openFocusMode}
                onDragStart={setDraggedTaskId}
                onDropCard={handleDrop}
              />
            )) : <EmptyBox text="지금 당장 안 해도 되는 일을 여기에 보관해두면 Today가 훨씬 가벼워져요." />}
          </div>
        </SectionCard></section>

        {completedTasks.length > 0 && (
          <section className={focusMode ? "hidden" : ""}><SectionCard
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
          </SectionCard></section>
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


function AuthScreen({ supabaseClient }) {
  const [mode, setMode] = useState('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!supabaseClient) {
      setMessage('인증 시스템을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.');
      return;
    }
    if (!email || !password) {
      setMessage('이메일과 비밀번호를 입력해 주세요.');
      return;
    }

    setLoading(true);
    setMessage('');

    if (mode === 'signup') {
      const { error } = await supabaseClient.auth.signUp({ email, password });
      if (error) {
        setMessage(error.message);
      } else {
        setMessage('회원가입이 완료됐어요. 이메일 인증 후 로그인해 주세요.');
      }
    } else {
      const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
      if (error) {
        setMessage(error.message);
      }
    }

    setLoading(false);
  };

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#f4f0ff_0%,#fffdf8_48%,#ffffff_100%)] px-4 py-8 text-zinc-900">
      <div className="mx-auto max-w-4xl">
        <div className="rounded-[32px] border border-zinc-100 bg-white p-6 shadow-sm sm:p-8 md:p-12">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-violet-600">Focus OS</p>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight sm:text-5xl">지금 바로 시작하기</h1>
          <p className="mt-4 text-base leading-8 text-zinc-500 sm:text-lg">
            로그인하면 할 일, 집중 기록, 오늘의 흐름이 이 계정에 저장돼요.
          </p>

          <div className="mt-8 grid grid-cols-2 gap-2 rounded-[28px] bg-zinc-100 p-2">
            <button
              onClick={() => setMode('signin')}
              className={`rounded-[24px] px-4 py-4 text-base font-semibold transition ${mode === 'signin' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500'}`}
            >
              로그인
            </button>
            <button
              onClick={() => setMode('signup')}
              className={`rounded-[24px] px-4 py-4 text-base font-semibold transition ${mode === 'signup' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500'}`}
            >
              회원가입
            </button>
          </div>

          <div className="mt-8 space-y-4">
            <input
              type="email"
              placeholder="이메일"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-[24px] border border-zinc-200 px-5 py-4 text-lg outline-none transition focus:border-violet-300"
            />
            <input
              type="password"
              placeholder="비밀번호"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-[24px] border border-zinc-200 px-5 py-4 text-lg outline-none transition focus:border-violet-300"
            />
          </div>

          <button
            onClick={submit}
            disabled={loading}
            className="mt-8 w-full rounded-[28px] bg-zinc-950 px-5 py-5 text-xl font-semibold text-white transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? '처리 중...' : mode === 'signup' ? '회원가입하기' : '로그인하기'}
          </button>

          {message ? (
            <div className="mt-5 rounded-[24px] bg-zinc-50 px-5 py-4 text-base text-zinc-600">
              {message}
            </div>
          ) : null}

          <div className="mt-8 rounded-[28px] bg-violet-50 p-5">
            <p className="text-lg font-semibold text-violet-700">7일 무료 체험</p>
            <p className="mt-3 text-lg leading-9 text-zinc-600">
              가입 후 바로 앱을 사용할 수 있고, Focus OS 흐름이 나에게 맞는지 먼저 확인할 수 있어요.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}

function Panel({ children }) {
  return <div className="rounded-[32px] border border-zinc-100 bg-white p-6 shadow-sm">{children}</div>;
}

function SectionCard({ eyebrow, title, action, children }) {
  return (
    <section className="mb-8 rounded-[32px] border border-zinc-100 bg-white p-6 shadow-sm">
      <div className="mb-6 flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-violet-700">{eyebrow}</p>
          <h2 className="text-2xl font-semibold tracking-tight">{title}</h2>
        </div>
        {action}
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

function TaskCard({
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
  startFocusMode,
  onDragStart,
  onDropCard,
}) {
  const doneCount = (task.steps || []).filter((step) => step.done).length;
  const stepProgress = (task.steps || []).length ? Math.round((doneCount / task.steps.length) * 100) : 0;

  return (
    <article
      ref={innerRef}
      draggable
      onDragStart={() => onDragStart(task.id)}
      onDragOver={(e) => e.preventDefault()}
      onDrop={() => onDropCard(task.id)}
      className={`rounded-[30px] border p-5 transition ${task.status === '진행 중' ? 'border-emerald-300 bg-emerald-50/50 shadow-sm' : isNew ? 'border-violet-400 bg-violet-50/60 shadow-sm' : 'border-zinc-100 bg-white'}`}
    >
      <div className="mb-3 flex items-center gap-2 text-xs text-zinc-400">
        <span className="rounded-full bg-zinc-100 px-2 py-1">드래그 정렬</span>
        <span>카드를 길게 잡고 위치를 바꿀 수 있어요</span>
      </div>

      <div className="min-w-0">
        <div className="flex flex-wrap gap-2">
          <span className={`rounded-full px-3 py-1 text-xs ${PRIORITY_BADGE[task.priority]}`}>{task.priority}</span>
          <span className={`rounded-full px-3 py-1 text-xs ${STATUS_BADGE[task.status]}`}>{task.status}</span>
        </div>
        <input value={task.title} onChange={(e) => updateTask(task.id, { title: e.target.value })} className="mt-3 w-full bg-transparent text-lg font-semibold outline-none placeholder:text-zinc-400" />
        <textarea value={task.note} onChange={(e) => updateTask(task.id, { note: e.target.value })} rows={2} className="mt-1 w-full resize-none bg-transparent text-sm text-zinc-600 outline-none placeholder:text-zinc-400" />
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button onClick={() => recordStart(task.id)} className="rounded-xl bg-black px-4 py-2.5 text-sm text-white transition hover:scale-[1.01]">시작</button>
        <button onClick={() => startFocusMode(task.id)} className="rounded-xl border border-violet-200 bg-violet-50 px-4 py-2.5 text-sm font-medium text-violet-700 transition hover:bg-violet-100">집중 시작</button>
        {task.start && !task.end && <button onClick={() => recordEnd(task.id)} className="rounded-xl border px-4 py-2.5 text-sm transition hover:bg-zinc-50">종료</button>}
        {task.status === '진행 중' && <button onClick={() => pauseTask(task.id)} className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-700 transition hover:bg-amber-100">멈춤</button>}
        <button onClick={() => resetTask(task.id)} className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm text-rose-700 transition hover:bg-rose-100">초기화</button>
        <select value={task.priority} onChange={(e) => updateTask(task.id, { priority: e.target.value })} className="rounded-xl border px-3 py-2.5 text-sm">
          <option>가장 중요</option>
          <option>중요</option>
          <option>가벼운 일</option>
        </select>
        <button onClick={() => recommendPriority(task.id)} className="rounded-xl border border-violet-200 bg-violet-50 px-4 py-2.5 text-sm font-medium text-violet-700 transition hover:bg-violet-100">우선순위 추천</button>
        <button onClick={() => splitTask(task.id)} className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-medium text-emerald-700 transition hover:bg-emerald-100">AI 작업분해</button>
        <button onClick={() => moveList(task.id, task.list === 'today' ? 'later' : 'today')} className="rounded-xl border px-4 py-2.5 text-sm transition hover:bg-zinc-50">{task.list === 'today' ? 'Later로' : 'Today로'}</button>
        <button onClick={() => deleteTask(task.id)} className="rounded-xl border px-4 py-2.5 text-sm transition hover:bg-zinc-50">삭제</button>
      </div>

      {(task.start || task.end) && (
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {task.start && <InfoBox label="시작 시간" value={task.start} />}
          {task.end && <InfoBox label="종료 시간" value={task.end} />}
        </div>
      )}

      <div className="mt-4 rounded-[26px] bg-zinc-50 p-4">
        <div className="mb-3 rounded-2xl bg-white px-3 py-2 text-xs text-zinc-500 ring-1 ring-zinc-100">AI 작업분해는 할 일 제목과 메모를 보고 바로 시작 가능한 3단계 정도로 자동 추천해줘요.</div>

        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-zinc-700">작업 단계</p>
            <p className="text-xs text-zinc-500">완료 {doneCount}/{(task.steps || []).length}</p>
          </div>
          <button onClick={() => addStep(task.id)} className="rounded-xl border px-3 py-2 text-sm transition hover:bg-white">단계 추가</button>
        </div>

        <div className="mb-4 h-2 overflow-hidden rounded-full bg-white">
          <div className="h-full rounded-full bg-violet-500 transition-all" style={{ width: `${stepProgress}%` }} />
        </div>

        <div className="space-y-2">
          {(task.steps || []).map((step, idx) => (
            <div key={`${task.id}-step-${idx}`} className="flex items-center gap-2 rounded-[20px] bg-white px-3 py-2.5 ring-1 ring-zinc-100">
              <button onClick={() => toggleStep(task.id, idx)} className={`flex h-5 w-5 items-center justify-center rounded-md border text-[10px] ${step.done ? 'border-violet-500 bg-violet-500 text-white' : 'border-zinc-300 text-transparent'}`}>✓</button>
              <input value={step.text} onChange={(e) => updateStep(task.id, idx, e.target.value)} className={`w-full bg-transparent text-sm outline-none ${step.done ? 'text-zinc-400 line-through' : 'text-zinc-700'}`} />
              <button onClick={() => deleteStep(task.id, idx)} className="rounded-lg border px-2 py-1 text-xs text-zinc-500 transition hover:bg-zinc-50">삭제</button>
            </div>
          ))}
        </div>
      </div>
    </article>
  );
}
