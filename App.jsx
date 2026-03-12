
// Focus OS - Main App (backup copy)
// This is the current consolidated version of the app.
// Place this inside src/App.jsx in a React project to run.

import { useEffect, useMemo, useRef, useState } from "react";

const STORAGE_KEYS = {
  tasks: "focus-os-tasks",
  focusMinutes: "focus-os-focus-minutes",
};

const TODAY_LIMIT = 5;
const FOCUS_PRESETS = [5, 15, 25, 45];

const DEFAULT_TASKS = [
  {
    id: 1,
    createdAt: 1,
    list: "today",
    priority: "가장 중요",
    title: "기획안 첫 문단 쓰기",
    note: "완벽하게 쓰기보다 첫 문장부터 시작하기",
    steps: [
      { text: "핵심 문장 한 줄 적기", done: false },
      { text: "첫 문단 3줄 채우기", done: false },
      { text: "초안 저장하기", done: false },
    ],
    status: "대기",
    start: "",
    end: "",
  },
];

function formatNow(date = new Date()) {
  return date.toLocaleTimeString("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function formatTimer(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export default function FocusOS() {
  const newestTaskRef = useRef(null);

  const [tasks, setTasks] = useState(DEFAULT_TASKS);
  const [currentTime, setCurrentTime] = useState(formatNow());
  const [focusMinutes, setFocusMinutes] = useState(25);
  const [timerSeconds, setTimerSeconds] = useState(25 * 60);
  const [timerRunning, setTimerRunning] = useState(false);

  useEffect(() => {
    const id = setInterval(() => setCurrentTime(formatNow()), 30000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!timerRunning) return;
    const id = setInterval(() => {
      setTimerSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(id);
          setTimerRunning(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [timerRunning]);

  const addTask = () => {
    if (tasks.length >= TODAY_LIMIT) return;
    const id = Date.now();
    const newTask = {
      id,
      createdAt: id,
      list: "today",
      priority: "중요",
      title: "새 할 일",
      note: "",
      steps: [{ text: "첫 단계 적기", done: false }],
      status: "대기",
      start: "",
      end: "",
    };
    setTasks((t) => [...t, newTask]);
  };

  const startTask = (id) => {
    const now = formatNow();
    setTasks((prev) =>
      prev.map((t) =>
        t.id === id ? { ...t, start: now, status: "진행 중" } : t
      )
    );
    setTimerSeconds(focusMinutes * 60);
    setTimerRunning(true);
  };

  const finishTask = (id) => {
    const now = formatNow();
    setTasks((prev) =>
      prev.map((t) =>
        t.id === id ? { ...t, end: now, status: "완료" } : t
      )
    );
    setTimerRunning(false);
  };

  const todayTasks = tasks.filter((t) => t.status !== "완료");
  const doneTasks = tasks.filter((t) => t.status === "완료");

  return (
    <div style={{ padding: 40, fontFamily: "sans-serif" }}>
      <h1>Focus OS</h1>
      <p>{currentTime}</p>

      <h2>Timer {formatTimer(timerSeconds)}</h2>

      <div style={{ marginBottom: 20 }}>
        {FOCUS_PRESETS.map((m) => (
          <button key={m} onClick={() => setFocusMinutes(m)}>
            {m} min
          </button>
        ))}
        <button onClick={() => setTimerRunning((r) => !r)}>
          {timerRunning ? "Pause" : "Start Timer"}
        </button>
      </div>

      <h2>Today</h2>

      {todayTasks.map((t) => (
        <div key={t.id} style={{ border: "1px solid #ddd", padding: 10, marginBottom: 10 }}>
          <input
            value={t.title}
            onChange={(e) =>
              setTasks((prev) =>
                prev.map((p) =>
                  p.id === t.id ? { ...p, title: e.target.value } : p
                )
              )
            }
          />
          <div>
            {!t.start && <button onClick={() => startTask(t.id)}>Start</button>}
            {t.start && !t.end && (
              <button onClick={() => finishTask(t.id)}>Finish</button>
            )}
          </div>
        </div>
      ))}

      <button onClick={addTask}>+ 새 할 일</button>

      <h2 style={{ marginTop: 40 }}>Completed</h2>

      {doneTasks.map((t) => (
        <div key={t.id}>
          {t.title} ({t.start} - {t.end})
        </div>
      ))}
    </div>
  );
}
