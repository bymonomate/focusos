import { useEffect, useMemo, useState } from "react";
import { supabase } from "./supabase";

const TODAY_LIMIT = 5;
const FOCUS_PRESETS = [5, 15, 25, 45];

const PRIORITY_BADGE = {
  "가장 중요": { bg: "#ffe4e6", color: "#be123c" },
  "중요": { bg: "#ede9fe", color: "#6d28d9" },
  "가벼운 일": { bg: "#e0f2fe", color: "#0369a1" },
};

const STATUS_BADGE = {
  "대기": { bg: "#f4f4f5", color: "#52525b" },
  "진행 중": { bg: "#dcfce7", color: "#15803d" },
  "완료": { bg: "#dbeafe", color: "#1d4ed8" },
};

function nowTime() {
  return new Date().toLocaleTimeString("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function todayLabel() {
  return new Date().toLocaleDateString("ko-KR", {
    month: "long",
    day: "numeric",
    weekday: "long",
  });
}

function formatTimer(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

function rewardMessage(score) {
  if (score >= 90) return "오늘 흐름 정말 좋음";
  if (score >= 70) return "집중 유지 잘하고 있어요";
  if (score >= 40) return "좋아요, 계속 작은 완료를 쌓아요";
  return "한 단계만 해도 충분해요";
}

function suggestPriority(title = "", note = "") {
  const text = `${title} ${note}`.toLowerCase();
  if (text.includes("마감") || text.includes("기획") || text.includes("제안") || text.includes("발표")) return "가장 중요";
  if (text.includes("정리") || text.includes("답장") || text.includes("확인") || text.includes("업로드")) return "가벼운 일";
  return "중요";
}

function suggestSteps(title = "", note = "") {
  const text = `${title} ${note}`.toLowerCase();

  if (text.includes("디자인") || text.includes("ui") || text.includes("브랜딩") || text.includes("포스터")) {
    return [
      { text: "브레인스토밍 키워드 5개 적기", done: false },
      { text: "레퍼런스 3개 찾기", done: false },
      { text: "10분 러프 레이아웃 잡기", done: false },
    ];
  }

  if (text.includes("기획") || text.includes("제안") || text.includes("보고서")) {
    return [
      { text: "핵심 목적 한 줄 정리", done: false },
      { text: "목차 3개 먼저 정하기", done: false },
      { text: "첫 문단 초안 작성", done: false },
    ];
  }

  if (text.includes("글") || text.includes("원고") || text.includes("블로그")) {
    return [
      { text: "주제 한 문장 정리", done: false },
      { text: "소제목 3개 만들기", done: false },
      { text: "첫 문단 초안 작성", done: false },
    ];
  }

  if (text.includes("메일") || text.includes("답장") || text.includes("연락")) {
    return [
      { text: "받는 사람 확인", done: false },
      { text: "핵심 메시지 2줄 작성", done: false },
      { text: "전송 전 한번 읽기", done: false },
    ];
  }

  if (text.includes("개발") || text.includes("코딩") || text.includes("사이트")) {
    return [
      { text: "해야 할 기능 3개 적기", done: false },
      { text: "가장 작은 기능부터 구현", done: false },
      { text: "동작 테스트하기", done: false },
    ];
  }

  return [
    { text: "첫 단계 하나 적기", done: false },
    { text: "5분 안에 시작할 단위로 나누기", done: false },
    { text: "작게라도 완료 체크하기", done: false },
  ];
}

function LoginScreen() {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");

  const submit = async () => {
    setMessage("");
    if (!email || !password) {
      setMessage("이메일과 비밀번호를 입력해줘.");
      return;
    }

    if (mode === "signup") {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) setMessage(error.message);
      else setMessage("회원가입 완료. 바로 로그인해봐.");
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setMessage(error.message);
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.loginCard}>
        <div style={styles.eyebrow}>FOCUS OS</div>
        <h1 style={styles.loginTitle}>Start small. Finish one thing.</h1>
        <p style={styles.loginSub}>원래 기획 기준으로 복원된 Focus OS 프로 버전.</p>

        <input
          style={styles.field}
          type="email"
          placeholder="이메일"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          style={styles.field}
          type="password"
          placeholder="비밀번호"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <div style={styles.buttonRow}>
          <button style={styles.primary} onClick={submit}>
            {mode === "signup" ? "회원가입" : "로그인"}
          </button>
          <button
            style={styles.secondary}
            onClick={() => setMode((m) => (m === "signup" ? "login" : "signup"))}
          >
            {mode === "signup" ? "로그인으로" : "회원가입으로"}
          </button>
        </div>

        {message ? <div style={styles.toastInline}>{message}</div> : null}
      </div>
    </div>
  );
}

export default function App() {
  const [session, setSession] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [focusMinutes, setFocusMinutes] = useState(25);
  const [timerSeconds, setTimerSeconds] = useState(25 * 60);
  const [timerRunning, setTimerRunning] = useState(false);
  const [clock, setClock] = useState(nowTime());
  const [toast, setToast] = useState("");
  const [loading, setLoading] = useState(true);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [reportFilter, setReportFilter] = useState("all");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session ?? null);
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const id = setInterval(() => setClock(nowTime()), 30000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const onScroll = () => setShowScrollTop(window.scrollY > 220);
    onScroll();
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(""), 2000);
    return () => clearTimeout(id);
  }, [toast]);

  useEffect(() => {
    if (!timerRunning) return;
    const id = setInterval(() => {
      setTimerSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(id);
          setTimerRunning(false);
          setToast("집중 시간이 끝났어요.");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [timerRunning]);

  useEffect(() => {
    if (session?.user?.id) loadTasks();
  }, [session?.user?.id]);

  async function loadTasks() {
    if (!session?.user?.id) return;
    setLoading(true);

    const { data, error } = await supabase
      .from("tasks")
      .select("*")
      .eq("user_id", session.user.id)
      .order("created_at", { ascending: true });

    if (error) {
      setToast("할 일 불러오기에 실패했어.");
      setLoading(false);
      return;
    }

    const mapped = (data || []).map((row) => ({
      id: row.id,
      list: row.list || "today",
      priority: row.priority || "중요",
      title: row.title || "",
      note: row.note || "",
      status: row.status || "대기",
      start: row.start_time || "",
      end: row.end_time || "",
      steps: Array.isArray(row.steps) ? row.steps : [],
      createdAt: new Date(row.created_at).getTime(),
    }));

    setTasks(mapped);
    setLoading(false);
  }

  const todayTasks = useMemo(
    () => tasks.filter((t) => t.list === "today" && t.status !== "완료"),
    [tasks]
  );
  const laterTasks = useMemo(
    () => tasks.filter((t) => t.list === "later" && t.status !== "완료"),
    [tasks]
  );
  const completedTasks = useMemo(() => tasks.filter((t) => t.status === "완료"), [tasks]);
  const startedTasks = useMemo(() => tasks.filter((t) => !!t.start), [tasks]);
  const focusTask = todayTasks.find((t) => t.status === "진행 중") || todayTasks[0] || null;
  const progress = tasks.length ? Math.round((completedTasks.length / tasks.length) * 100) : 0;
  const focusScore = Math.min(100, completedTasks.length * 18 + startedTasks.length * 7 + (focusTask ? 10 : 0));

  function patchTaskLocal(taskId, patch) {
    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, ...patch } : t)));
  }

  async function saveTaskPatch(taskId, patch) {
    const dbPatch = {};
    if ("list" in patch) dbPatch.list = patch.list;
    if ("priority" in patch) dbPatch.priority = patch.priority;
    if ("title" in patch) dbPatch.title = patch.title;
    if ("note" in patch) dbPatch.note = patch.note;
    if ("status" in patch) dbPatch.status = patch.status;
    if ("start" in patch) dbPatch.start_time = patch.start;
    if ("end" in patch) dbPatch.end_time = patch.end;
    if ("steps" in patch) dbPatch.steps = patch.steps;

    const { error } = await supabase
      .from("tasks")
      .update(dbPatch)
      .eq("id", taskId)
      .eq("user_id", session.user.id);

    if (error) {
      setToast("저장 실패");
      loadTasks();
    }
  }

  async function createTask(list) {
    if (list === "today" && todayTasks.length >= TODAY_LIMIT) {
      setToast("오늘 할 일은 5개까지만 유지하는 게 좋아요.");
      return;
    }

    const { error } = await supabase.from("tasks").insert([
      {
        user_id: session.user.id,
        list,
        priority: "중요",
        title: list === "today" ? "새 할 일" : "나중에 할 일",
        note: "",
        status: "대기",
        start_time: "",
        end_time: "",
        steps: [{ text: "첫 단계 적기", done: false }],
      },
    ]);

    if (error) setToast("새 할 일 생성 실패");
    else loadTasks();
  }

  async function startTask(id) {
    const time = nowTime();

    setTasks((prev) =>
      prev.map((t) => {
        if (t.id === id) return { ...t, status: "진행 중", start: t.start || time };
        if (t.status === "진행 중") return { ...t, status: "대기" };
        return t;
      })
    );

    for (const task of tasks) {
      if (task.status === "진행 중" && task.id !== id) {
        await saveTaskPatch(task.id, { status: "대기" });
      }
    }
    await saveTaskPatch(id, { status: "진행 중", start: time });

    setTimerSeconds(focusMinutes * 60);
    setTimerRunning(true);
    setToast("집중 시작");
  }

  async function pauseTask(id) {
    patchTaskLocal(id, { status: "대기" });
    await saveTaskPatch(id, { status: "대기" });
    setTimerRunning(false);
    setToast("작업을 잠깐 멈췄어요.");
  }

  async function finishTask(id, task) {
    const time = nowTime();
    const startValue = task?.start || time;

    patchTaskLocal(id, { status: "완료", end: time, start: startValue });
    await saveTaskPatch(id, { status: "완료", end: time, start: startValue });

    setTimerRunning(false);
    setTimerSeconds(focusMinutes * 60);
    setToast("완료 목록으로 이동했어요.");
  }

  async function resetTask(id, currentTask) {
    const patch = {
      status: "대기",
      start: "",
      end: "",
      steps: (currentTask.steps || []).map((s) => ({ ...s, done: false })),
    };
    patchTaskLocal(id, patch);
    await saveTaskPatch(id, patch);
    setTimerRunning(false);
    setTimerSeconds(focusMinutes * 60);
  }

  async function restoreTask(id) {
    if (todayTasks.length >= TODAY_LIMIT) {
      setToast("오늘 할 일은 5개까지만 유지하는 게 좋아요.");
      return;
    }
    const patch = { status: "대기", list: "today", end: "" };
    patchTaskLocal(id, patch);
    await saveTaskPatch(id, patch);
  }

  async function toggleStep(task, stepIndex) {
    const next = [...task.steps];
    next[stepIndex] = { ...next[stepIndex], done: !next[stepIndex].done };
    patchTaskLocal(task.id, { steps: next });
    await saveTaskPatch(task.id, { steps: next });
  }

  async function moveTask(taskId, nextList) {
    if (nextList === "today" && todayTasks.length >= TODAY_LIMIT) {
      setToast("오늘 할 일은 5개까지만 유지하는 게 좋아요.");
      return;
    }
    const patch = { list: nextList, status: "대기" };
    patchTaskLocal(taskId, patch);
    await saveTaskPatch(taskId, patch);
  }

  async function recommendPriority(task) {
    const next = suggestPriority(task.title, task.note);
    patchTaskLocal(task.id, { priority: next });
    await saveTaskPatch(task.id, { priority: next });
    setToast("추천 우선순위를 적용했어요.");
  }

  async function splitTask(task) {
    const nextSteps = suggestSteps(task.title, task.note);
    patchTaskLocal(task.id, { steps: nextSteps });
    await saveTaskPatch(task.id, { steps: nextSteps });
    setToast("작업을 더 작은 단계로 나눴어요.");
  }

  async function signOut() {
    await supabase.auth.signOut();
  }

  const reportList =
    reportFilter === "all"
      ? tasks
      : reportFilter === "started"
      ? startedTasks
      : completedTasks;

  if (loading && !session) {
    return (
      <div style={styles.page}>
        <div style={styles.loginCard}>불러오는 중...</div>
      </div>
    );
  }

  if (!session) return <LoginScreen />;

  return (
    <div style={styles.page}>
      <div style={styles.shell}>
        <section style={styles.hero}>
          <div>
            <div style={styles.eyebrow}>FOCUS OS</div>
            <h1 style={styles.title}>{clock}</h1>
            <p style={styles.sub}>{todayLabel()} · 작게 시작하고, 한 번에 하나씩 끝내기</p>
            <div style={styles.buttonRow}>
              <button style={styles.primary} onClick={() => focusTask && startTask(focusTask.id)}>
                지금 시작하기
              </button>
              <button
                style={styles.secondary}
                onClick={() => {
                  setFocusMinutes(5);
                  setTimerSeconds(5 * 60);
                  if (focusTask) startTask(focusTask.id);
                }}
              >
                5분만 시작
              </button>
              <button style={styles.secondary} onClick={signOut}>
                로그아웃
              </button>
            </div>
          </div>

          <div style={styles.heroStats}>
            <Card label="진행률" value={`${progress}%`} sub="전체 흐름" />
            <Card label="완료" value={String(completedTasks.length)} sub="오늘 끝낸 일" />
            <Card label="시작" value={String(startedTasks.length)} sub="시도한 일" />
            <Card label="집중 점수" value={String(focusScore)} sub={rewardMessage(focusScore)} />
          </div>
        </section>

        <section style={styles.panel}>
          <div style={styles.timerTop}>
            <div>
              <div style={styles.smallLabel}>현재 작업</div>
              <div style={styles.focusTitle}>{focusTask ? focusTask.title : "선택된 작업 없음"}</div>
              <div style={styles.focusNote}>
                {focusTask ? focusTask.note || "작게 시작해도 충분해요." : "오늘 할 일을 추가해보세요."}
              </div>
            </div>
            <div style={styles.timerBox}>{formatTimer(timerSeconds)}</div>
          </div>

          <div style={styles.buttonRow}>
            {FOCUS_PRESETS.map((m) => (
              <button
                key={m}
                style={focusMinutes === m ? styles.presetActive : styles.preset}
                onClick={() => {
                  setFocusMinutes(m);
                  setTimerSeconds(m * 60);
                }}
              >
                {m}분
              </button>
            ))}
            <button style={styles.secondary} onClick={() => setTimerRunning((v) => !v)}>
              {timerRunning ? "일시정지" : "타이머 시작"}
            </button>
          </div>
        </section>

        <section style={styles.section}>
          <div style={styles.sectionHead}>
            <div>
              <h2 style={styles.sectionTitle}>전체 진행 리포트</h2>
              <div style={styles.smallMuted}>완료 / 시작 / 전체 목록을 바로 볼 수 있어.</div>
            </div>

            <div style={styles.buttonRow}>
              <button
                style={reportFilter === "all" ? styles.presetActive : styles.preset}
                onClick={() => setReportFilter("all")}
              >
                전체
              </button>
              <button
                style={reportFilter === "started" ? styles.presetActive : styles.preset}
                onClick={() => setReportFilter("started")}
              >
                시작
              </button>
              <button
                style={reportFilter === "completed" ? styles.presetActive : styles.preset}
                onClick={() => setReportFilter("completed")}
              >
                완료
              </button>
            </div>
          </div>

          <div style={styles.reportGrid}>
            {reportList.length === 0 ? (
              <Empty text="표시할 목록이 아직 없어요." />
            ) : (
              reportList.map((task) => (
                <div key={task.id} style={styles.reportCard}>
                  <div style={styles.badgeRow}>
                    <Badge text={task.priority} map={PRIORITY_BADGE} />
                    <Badge text={task.status} map={STATUS_BADGE} />
                  </div>
                  <div style={styles.reportTitle}>{task.title || "제목 없음"}</div>
                  <div style={styles.reportMeta}>
                    {task.start ? `시작 ${task.start}` : "시작 전"} {task.end ? `· 종료 ${task.end}` : ""}
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        <Section
          title={`오늘 할 일 (${todayTasks.length}/${TODAY_LIMIT})`}
          action={
            <button style={styles.addButton} onClick={() => createTask("today")}>
              + 오늘 할 일 추가
            </button>
          }
        >
          {todayTasks.length === 0 ? (
            <Empty text="오늘 할 일이 비어 있어요." />
          ) : (
            todayTasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                onSavePatch={saveTaskPatch}
                onLocalPatch={patchTaskLocal}
                onStart={startTask}
                onPause={pauseTask}
                onFinish={finishTask}
                onReset={resetTask}
                onMove={moveTask}
                onToggleStep={toggleStep}
                onRecommendPriority={recommendPriority}
                onSplitTask={splitTask}
              />
            ))
          )}
        </Section>

        <Section
          title="나중에 할 일"
          action={
            <button style={styles.addButton} onClick={() => createTask("later")}>
              + 나중에 할 일 추가
            </button>
          }
        >
          {laterTasks.length === 0 ? (
            <Empty text="지금 당장 안 해도 되는 일은 여기에 보관해요." />
          ) : (
            laterTasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                onSavePatch={saveTaskPatch}
                onLocalPatch={patchTaskLocal}
                onStart={startTask}
                onPause={pauseTask}
                onFinish={finishTask}
                onReset={resetTask}
                onMove={moveTask}
                onToggleStep={toggleStep}
                onRecommendPriority={recommendPriority}
                onSplitTask={splitTask}
              />
            ))
          )}
        </Section>

        {completedTasks.length > 0 && (
          <Section title="완료 목록">
            {completedTasks.map((task) => (
              <div key={task.id} style={styles.doneItem}>
                <div>
                  <div style={styles.badgeRow}>
                    <Badge text={task.priority} map={PRIORITY_BADGE} />
                    <Badge text={task.status} map={STATUS_BADGE} />
                  </div>
                  <div style={styles.doneTitle}>{task.title}</div>
                  <div style={styles.doneMeta}>
                    {task.start ? `시작 ${task.start}` : ""} {task.end ? `· 종료 ${task.end}` : ""}
                  </div>
                </div>
                <button style={styles.secondary} onClick={() => restoreTask(task.id)}>
                  복원
                </button>
              </div>
            ))}
          </Section>
        )}

        <footer style={styles.footer}>
          <div style={styles.footerTitle}>FOCUS OS</div>
          <div style={styles.footerText}>원래 기획 기준으로 복원된 전체 버전.</div>
        </footer>

        {showScrollTop ? (
          <button style={styles.scrollTop} onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
            ↑ 위로
          </button>
        ) : null}

        {toast ? <div style={styles.toast}>{toast}</div> : null}
      </div>
    </div>
  );
}

function Section({ title, action, children }) {
  return (
    <section style={styles.section}>
      <div style={styles.sectionHead}>
        <h2 style={styles.sectionTitle}>{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function Card({ label, value, sub }) {
  return (
    <div style={styles.statCard}>
      <div style={styles.smallLabel}>{label}</div>
      <div style={styles.statValue}>{value}</div>
      <div style={styles.smallMuted}>{sub}</div>
    </div>
  );
}

function Empty({ text }) {
  return <div style={styles.empty}>{text}</div>;
}

function Badge({ text, map }) {
  const style = map[text] || { bg: "#f4f4f5", color: "#52525b" };
  return (
    <span
      style={{
        padding: "6px 10px",
        borderRadius: 999,
        background: style.bg,
        color: style.color,
        fontSize: 12,
      }}
    >
      {text}
    </span>
  );
}

function TaskCard({
  task,
  onSavePatch,
  onLocalPatch,
  onStart,
  onPause,
  onFinish,
  onReset,
  onMove,
  onToggleStep,
  onRecommendPriority,
  onSplitTask,
}) {
  const [draftTitle, setDraftTitle] = useState(task.title);
  const [draftNote, setDraftNote] = useState(task.note);

  useEffect(() => setDraftTitle(task.title), [task.title]);
  useEffect(() => setDraftNote(task.note), [task.note]);

  const commitTitle = async () => {
    if (draftTitle === task.title) return;
    onLocalPatch(task.id, { title: draftTitle });
    await onSavePatch(task.id, { title: draftTitle });
  };

  const commitNote = async () => {
    if (draftNote === task.note) return;
    onLocalPatch(task.id, { note: draftNote });
    await onSavePatch(task.id, { note: draftNote });
  };

  const stepProgress = task.steps?.length
    ? Math.round((task.steps.filter((s) => s.done).length / task.steps.length) * 100)
    : 0;

  return (
    <article style={styles.taskCard}>
      <div style={styles.badgeRow}>
        <Badge text={task.priority} map={PRIORITY_BADGE} />
        <Badge text={task.status} map={STATUS_BADGE} />
      </div>

      <input
        style={styles.input}
        value={draftTitle}
        onChange={(e) => setDraftTitle(e.target.value)}
        onBlur={commitTitle}
      />

      <textarea
        style={styles.textarea}
        rows={2}
        value={draftNote}
        onChange={(e) => setDraftNote(e.target.value)}
        onBlur={commitNote}
      />

      <div style={styles.buttonRow}>
        {!task.start ? (
          <button style={styles.primary} onClick={() => onStart(task.id)}>
            시작
          </button>
        ) : !task.end ? (
          <button style={styles.primary} onClick={() => onFinish(task.id, task)}>
            종료
          </button>
        ) : null}

        {task.status === "진행 중" ? (
          <button style={styles.secondary} onClick={() => onPause(task.id)}>
            멈춤
          </button>
        ) : null}

        <button style={styles.secondary} onClick={() => onReset(task.id, task)}>
          초기화
        </button>

        <button
          style={styles.secondary}
          onClick={() => onMove(task.id, task.list === "today" ? "later" : "today")}
        >
          {task.list === "today" ? "Later로" : "Today로"}
        </button>

        <button style={styles.secondary} onClick={() => onRecommendPriority(task)}>
          우선순위 추천
        </button>

        <button style={styles.secondary} onClick={() => onSplitTask(task)}>
          작업분해
        </button>
      </div>

      {(task.start || task.end) && (
        <div style={styles.timeInfo}>
          {task.start ? `시작 ${task.start}` : ""} {task.end ? `· 종료 ${task.end}` : ""}
        </div>
      )}

      <div style={styles.stepBox}>
        <div style={styles.stepTop}>
          <div style={styles.smallLabel}>작업 단계</div>
          <div style={styles.smallMuted}>완료 {stepProgress}%</div>
        </div>
        <div style={styles.stepProgressBar}>
          <div style={{ ...styles.stepProgressFill, width: `${stepProgress}%` }} />
        </div>

        {(task.steps || []).map((step, idx) => (
          <label key={idx} style={styles.stepRow}>
            <input type="checkbox" checked={step.done} onChange={() => onToggleStep(task, idx)} />
            <span style={step.done ? styles.stepDone : styles.stepText}>{step.text}</span>
          </label>
        ))}
      </div>
    </article>
  );
}

const styles = {
  page: {
    background: "linear-gradient(180deg, #f4f0ff 0%, #fffdf8 48%, #ffffff 100%)",
    minHeight: "100vh",
    padding: 24,
    fontFamily: "Inter, system-ui, sans-serif",
    color: "#18181b",
  },
  shell: { maxWidth: 1120, margin: "0 auto" },
  hero: {
    background: "#09090b",
    color: "#fff",
    borderRadius: 32,
    padding: 28,
    display: "grid",
    gridTemplateColumns: "1.1fr 0.9fr",
    gap: 20,
    marginBottom: 24,
    boxShadow: "0 24px 80px rgba(24,24,27,0.18)",
  },
  eyebrow: { fontSize: 12, letterSpacing: 2, textTransform: "uppercase", color: "#a1a1aa" },
  title: { fontSize: 48, margin: "10px 0 8px" },
  sub: { color: "#a1a1aa", marginBottom: 16 },
  heroStats: { display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12 },
  statCard: { background: "rgba(255,255,255,0.08)", borderRadius: 20, padding: 16 },
  smallLabel: { fontSize: 12, color: "#a1a1aa" },
  smallMuted: { fontSize: 12, color: "#71717a" },
  statValue: { fontSize: 28, fontWeight: 700, marginTop: 6 },
  panel: {
    background: "#fff",
    border: "1px solid #e4e4e7",
    borderRadius: 28,
    padding: 20,
    marginBottom: 24,
    boxShadow: "0 6px 20px rgba(24,24,27,0.04)",
  },
  timerTop: {
    display: "flex",
    justifyContent: "space-between",
    gap: 16,
    alignItems: "center",
    marginBottom: 16,
  },
  timerBox: {
    background: "#09090b",
    color: "#fff",
    borderRadius: 20,
    padding: "18px 20px",
    fontSize: 28,
    fontWeight: 700,
    minWidth: 160,
    textAlign: "center",
  },
  focusTitle: { fontSize: 20, fontWeight: 700, marginTop: 6 },
  focusNote: { color: "#71717a", marginTop: 6 },
  section: {
    background: "#fff",
    border: "1px solid #e4e4e7",
    borderRadius: 28,
    padding: 20,
    marginBottom: 24,
    boxShadow: "0 6px 20px rgba(24,24,27,0.04)",
  },
  sectionHead: {
    display: "flex",
    justifyContent: "space-between",
    gap: 16,
    alignItems: "center",
    marginBottom: 16,
  },
  sectionTitle: { margin: 0, fontSize: 28 },
  addButton: {
    border: "2px dashed #d4d4d8",
    background: "#fff",
    borderRadius: 16,
    padding: "10px 14px",
    cursor: "pointer",
  },
  reportGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: 12,
  },
  reportCard: {
    border: "1px solid #e4e4e7",
    borderRadius: 20,
    padding: 14,
    background: "#fafafa",
  },
  reportTitle: { fontWeight: 700, marginTop: 10 },
  reportMeta: { color: "#71717a", fontSize: 13, marginTop: 6 },
  taskCard: {
    border: "1px solid #e4e4e7",
    borderRadius: 24,
    padding: 18,
    marginBottom: 14,
  },
  badgeRow: { display: "flex", gap: 8, marginBottom: 10, flexWrap: "wrap" },
  input: {
    width: "100%",
    border: "none",
    outline: "none",
    fontSize: 20,
    fontWeight: 700,
    marginBottom: 8,
    background: "transparent",
  },
  textarea: {
    width: "100%",
    border: "none",
    outline: "none",
    resize: "vertical",
    color: "#52525b",
    marginBottom: 12,
    fontFamily: "inherit",
    background: "transparent",
  },
  buttonRow: { display: "flex", flexWrap: "wrap", gap: 10 },
  primary: {
    background: "#09090b",
    color: "#fff",
    border: "none",
    borderRadius: 14,
    padding: "10px 14px",
    cursor: "pointer",
  },
  secondary: {
    background: "#fff",
    color: "#18181b",
    border: "1px solid #d4d4d8",
    borderRadius: 14,
    padding: "10px 14px",
    cursor: "pointer",
  },
  preset: {
    background: "#f4f4f5",
    color: "#18181b",
    border: "none",
    borderRadius: 14,
    padding: "10px 14px",
    cursor: "pointer",
  },
  presetActive: {
    background: "#7c3aed",
    color: "#fff",
    border: "none",
    borderRadius: 14,
    padding: "10px 14px",
    cursor: "pointer",
  },
  timeInfo: { color: "#71717a", fontSize: 13, marginTop: 12 },
  stepBox: {
    marginTop: 14,
    background: "#fafafa",
    borderRadius: 18,
    padding: 12,
  },
  stepTop: { display: "flex", justifyContent: "space-between", marginBottom: 10 },
  stepProgressBar: {
    width: "100%",
    height: 8,
    borderRadius: 999,
    background: "#e5e7eb",
    overflow: "hidden",
    marginBottom: 12,
  },
  stepProgressFill: {
    height: 8,
    borderRadius: 999,
    background: "#7c3aed",
  },
  stepRow: { display: "flex", gap: 10, alignItems: "center", marginBottom: 8 },
  stepText: { color: "#27272a" },
  stepDone: { color: "#a1a1aa", textDecoration: "line-through" },
  empty: {
    border: "1px dashed #d4d4d8",
    background: "#fafafa",
    borderRadius: 20,
    padding: 24,
    textAlign: "center",
    color: "#71717a",
  },
  doneItem: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 16,
    border: "1px solid #e4e4e7",
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
  },
  doneTitle: { fontWeight: 700, marginTop: 8 },
  doneMeta: { color: "#71717a", fontSize: 14, marginTop: 4 },
  footer: {
    borderTop: "1px solid #e4e4e7",
    padding: "24px 8px 40px",
    textAlign: "center",
    color: "#71717a",
  },
  footerTitle: { color: "#18181b", fontWeight: 700, marginBottom: 6 },
  scrollTop: {
    position: "fixed",
    right: 24,
    bottom: 24,
    border: "none",
    borderRadius: 999,
    padding: "12px 16px",
    background: "#09090b",
    color: "#fff",
    cursor: "pointer",
    boxShadow: "0 12px 30px rgba(0,0,0,0.2)",
  },
  toast: {
    position: "fixed",
    left: "50%",
    bottom: 20,
    transform: "translateX(-50%)",
    background: "#09090b",
    color: "#fff",
    padding: "12px 16px",
    borderRadius: 16,
    boxShadow: "0 12px 30px rgba(0,0,0,0.2)",
  },
  loginCard: {
    maxWidth: 480,
    margin: "80px auto",
    background: "#fff",
    border: "1px solid #e4e4e7",
    borderRadius: 28,
    padding: 24,
    boxShadow: "0 6px 20px rgba(24,24,27,0.04)",
  },
  loginTitle: { fontSize: 32, margin: "10px 0 8px" },
  loginSub: { color: "#71717a", marginBottom: 16 },
  field: {
    width: "100%",
    padding: "14px 16px",
    borderRadius: 14,
    border: "1px solid #d4d4d8",
    marginBottom: 10,
    fontSize: 16,
    boxSizing: "border-box",
  },
  toastInline: {
    marginTop: 12,
    color: "#6d28d9",
    fontSize: 14,
  },
};
