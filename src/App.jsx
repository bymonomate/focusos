import { useEffect, useMemo, useState } from "react";
import { supabase } from "./supabase";

const TODAY_LIMIT = 5;
const FOCUS_PRESETS = [5, 15, 25, 45];

function nowTime() {
  return new Date().toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", hour12: false });
}
function formatTimer(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
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
        <div style={styles.eyebrow}>Focus OS</div>
        <h1 style={styles.loginTitle}>Start small. Finish one thing.</h1>
        <p style={styles.loginSub}>로그인하면 할 일이 저장돼.</p>
        <input style={styles.field} type="email" placeholder="이메일" value={email} onChange={(e) => setEmail(e.target.value)} />
        <input style={styles.field} type="password" placeholder="비밀번호" value={password} onChange={(e) => setPassword(e.target.value)} />
        <div style={styles.buttonRow}>
          <button style={styles.primary} onClick={submit}>{mode === "signup" ? "회원가입" : "로그인"}</button>
          <button style={styles.secondary} onClick={() => setMode((m) => (m === "signup" ? "login" : "signup"))}>
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

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session ?? null);
      setLoading(false);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => setSession(nextSession));
    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const id = setInterval(() => setClock(nowTime()), 30000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(""), 1800);
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
    setLoading(true);
    const { data, error } = await supabase.from("tasks").select("*").eq("user_id", session.user.id).order("created_at", { ascending: true });
    if (error) {
      setToast("할 일 불러오기에 실패했어.");
      setLoading(false);
      return;
    }
    setTasks((data || []).map((row) => ({
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
    })));
    setLoading(false);
  }

  const todayTasks = useMemo(() => tasks.filter((t) => t.list === "today" && t.status !== "완료"), [tasks]);
  const laterTasks = useMemo(() => tasks.filter((t) => t.list === "later" && t.status !== "완료"), [tasks]);
  const doneTasks = useMemo(() => tasks.filter((t) => t.status === "완료"), [tasks]);
  const focusTask = todayTasks.find((t) => t.status === "진행 중") || todayTasks[0] || null;
  const progress = tasks.length ? Math.round((doneTasks.length / tasks.length) * 100) : 0;

  async function createTask(list) {
    if (list === "today" && todayTasks.length >= TODAY_LIMIT) {
      setToast("오늘 할 일은 5개까지만 유지하는 게 좋아요.");
      return;
    }
    const { error } = await supabase.from("tasks").insert([{
      user_id: session.user.id, list, priority: "중요", title: list === "today" ? "새 할 일" : "나중에 할 일",
      note: "", status: "대기", start_time: "", end_time: "", steps: [{ text: "첫 단계 적기", done: false }]
    }]);
    if (error) setToast("새 할 일 생성 실패");
    else loadTasks();
  }

  async function patchTask(taskId, patch) {
    const dbPatch = {};
    if ("list" in patch) dbPatch.list = patch.list;
    if ("priority" in patch) dbPatch.priority = patch.priority;
    if ("title" in patch) dbPatch.title = patch.title;
    if ("note" in patch) dbPatch.note = patch.note;
    if ("status" in patch) dbPatch.status = patch.status;
    if ("start" in patch) dbPatch.start_time = patch.start;
    if ("end" in patch) dbPatch.end_time = patch.end;
    if ("steps" in patch) dbPatch.steps = patch.steps;
    const { error } = await supabase.from("tasks").update(dbPatch).eq("id", taskId).eq("user_id", session.user.id);
    if (error) setToast("저장 실패");
    else loadTasks();
  }

  async function startTask(id) {
    const time = nowTime();
    for (const task of tasks) {
      if (task.status === "진행 중" && task.id !== id) await patchTask(task.id, { status: "대기" });
    }
    await patchTask(id, { status: "진행 중", start: time });
    setTimerSeconds(focusMinutes * 60);
    setTimerRunning(true);
    setToast("집중 시작");
  }

  async function finishTask(id) {
    const time = nowTime();
    await patchTask(id, { status: "완료", end: time, start: nowTime() });
    setTimerRunning(false);
    setTimerSeconds(focusMinutes * 60);
    setToast("완료 목록으로 이동했어요.");
  }

  async function resetTask(id, currentTask) {
    await patchTask(id, {
      status: "대기", start: "", end: "",
      steps: (currentTask.steps || []).map((s) => ({ ...s, done: false }))
    });
    setTimerRunning(false);
    setTimerSeconds(focusMinutes * 60);
  }

  async function restoreTask(id) {
    if (todayTasks.length >= TODAY_LIMIT) {
      setToast("오늘 할 일은 5개까지만 유지하는 게 좋아요.");
      return;
    }
    await patchTask(id, { status: "대기", list: "today", end: "" });
  }

  async function toggleStep(task, stepIndex) {
    const next = [...task.steps];
    next[stepIndex] = { ...next[stepIndex], done: !next[stepIndex].done };
    await patchTask(task.id, { steps: next });
  }

  async function moveTask(taskId, nextList) {
    if (nextList === "today" && todayTasks.length >= TODAY_LIMIT) {
      setToast("오늘 할 일은 5개까지만 유지하는 게 좋아요.");
      return;
    }
    await patchTask(taskId, { list: nextList, status: "대기" });
  }

  async function signOut() { await supabase.auth.signOut(); }

  if (loading && !session) return <div style={styles.page}><div style={styles.loginCard}>불러오는 중...</div></div>;
  if (!session) return <LoginScreen />;

  return (
    <div style={styles.page}>
      <div style={styles.shell}>
        <section style={styles.hero}>
          <div>
            <div style={styles.eyebrow}>Focus OS</div>
            <h1 style={styles.title}>{clock}</h1>
            <p style={styles.sub}>작게 시작하고, 한 번에 하나씩 끝내기</p>
            <div style={styles.buttonRow}>
              <button style={styles.primary} onClick={() => focusTask && startTask(focusTask.id)}>지금 시작하기</button>
              <button style={styles.secondary} onClick={() => { setFocusMinutes(5); setTimerSeconds(5 * 60); if (focusTask) startTask(focusTask.id); }}>5분만 시작</button>
              <button style={styles.secondary} onClick={signOut}>로그아웃</button>
            </div>
          </div>
          <div style={styles.heroStats}>
            <Card label="진행률" value={`${progress}%`} />
            <Card label="완료" value={String(doneTasks.length)} />
            <Card label="오늘 할 일" value={`${todayTasks.length}/${TODAY_LIMIT}`} />
            <Card label="타이머" value={formatTimer(timerSeconds)} />
          </div>
        </section>

        <section style={styles.panel}>
          <div style={styles.timerTop}>
            <div>
              <div style={styles.smallLabel}>현재 작업</div>
              <div style={styles.focusTitle}>{focusTask ? focusTask.title : "선택된 작업 없음"}</div>
              <div style={styles.focusNote}>{focusTask ? focusTask.note || "작게 시작해도 충분해요." : "오늘 할 일을 추가해보세요."}</div>
            </div>
            <div style={styles.timerBox}>{formatTimer(timerSeconds)}</div>
          </div>
          <div style={styles.buttonRow}>
            {FOCUS_PRESETS.map((m) => (
              <button key={m} style={focusMinutes === m ? styles.presetActive : styles.preset} onClick={() => { setFocusMinutes(m); setTimerSeconds(m * 60); }}>{m}분</button>
            ))}
            <button style={styles.secondary} onClick={() => setTimerRunning((v) => !v)}>{timerRunning ? "일시정지" : "타이머 시작"}</button>
          </div>
        </section>

        <Section title={`오늘 할 일 (${todayTasks.length}/${TODAY_LIMIT})`} action={<button style={styles.addButton} onClick={() => createTask("today")}>+ 오늘 할 일 추가</button>}>
          {todayTasks.length === 0 ? <Empty text="오늘 할 일이 비어 있어요." /> : todayTasks.map((task) => (
            <TaskCard key={task.id} task={task} onChange={patchTask} onStart={startTask} onFinish={finishTask} onReset={resetTask} onMove={moveTask} onToggleStep={toggleStep} />
          ))}
        </Section>

        <Section title="나중에 할 일" action={<button style={styles.addButton} onClick={() => createTask("later")}>+ 나중에 할 일 추가</button>}>
          {laterTasks.length === 0 ? <Empty text="지금 당장 안 해도 되는 일은 여기에 보관해요." /> : laterTasks.map((task) => (
            <TaskCard key={task.id} task={task} onChange={patchTask} onStart={startTask} onFinish={finishTask} onReset={resetTask} onMove={moveTask} onToggleStep={toggleStep} />
          ))}
        </Section>

        {doneTasks.length > 0 && (
          <Section title="완료 목록">
            {doneTasks.map((task) => (
              <div key={task.id} style={styles.doneItem}>
                <div><div style={styles.doneTitle}>{task.title}</div><div style={styles.doneMeta}>{task.start} → {task.end}</div></div>
                <button style={styles.secondary} onClick={() => restoreTask(task.id)}>복원</button>
              </div>
            ))}
          </Section>
        )}

        {toast ? <div style={styles.toast}>{toast}</div> : null}
      </div>
    </div>
  );
}

function Section({ title, action, children }) {
  return <section style={styles.section}><div style={styles.sectionHead}><h2 style={styles.sectionTitle}>{title}</h2>{action}</div>{children}</section>;
}
function Card({ label, value }) {
  return <div style={styles.statCard}><div style={styles.smallLabel}>{label}</div><div style={styles.statValue}>{value}</div></div>;
}
function Empty({ text }) { return <div style={styles.empty}>{text}</div>; }

function TaskCard({ task, onChange, onStart, onFinish, onReset, onMove, onToggleStep }) {
  return (
    <article style={styles.taskCard}>
      <div style={styles.badgeRow}><span style={styles.badge}>{task.priority}</span><span style={styles.badgeLight}>{task.status}</span></div>
      <input style={styles.input} value={task.title} onChange={(e) => onChange(task.id, { title: e.target.value })} />
      <textarea style={styles.textarea} rows={2} value={task.note} onChange={(e) => onChange(task.id, { note: e.target.value })} />
      <div style={styles.buttonRow}>
        {!task.start ? <button style={styles.primary} onClick={() => onStart(task.id)}>시작</button> : !task.end ? <button style={styles.primary} onClick={() => onFinish(task.id)}>종료</button> : null}
        <button style={styles.secondary} onClick={() => onReset(task.id, task)}>초기화</button>
        <button style={styles.secondary} onClick={() => onMove(task.id, task.list === "today" ? "later" : "today")}>{task.list === "today" ? "Later로" : "Today로"}</button>
      </div>
      <div style={styles.stepBox}>
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
  page: { background: "linear-gradient(180deg, #f4f0ff 0%, #fffdf8 48%, #ffffff 100%)", minHeight: "100vh", padding: 24, fontFamily: "Inter, system-ui, sans-serif", color: "#18181b" },
  shell: { maxWidth: 1080, margin: "0 auto" },
  hero: { background: "#09090b", color: "#fff", borderRadius: 28, padding: 28, display: "grid", gridTemplateColumns: "1.1fr 0.9fr", gap: 20, marginBottom: 24 },
  eyebrow: { fontSize: 12, letterSpacing: 2, textTransform: "uppercase", color: "#a1a1aa" },
  title: { fontSize: 48, margin: "10px 0 8px" },
  sub: { color: "#a1a1aa", marginBottom: 16 },
  heroStats: { display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12 },
  statCard: { background: "rgba(255,255,255,0.08)", borderRadius: 20, padding: 16 },
  smallLabel: { fontSize: 12, color: "#a1a1aa" },
  statValue: { fontSize: 28, fontWeight: 700, marginTop: 6 },
  panel: { background: "#fff", border: "1px solid #e4e4e7", borderRadius: 28, padding: 20, marginBottom: 24, boxShadow: "0 6px 20px rgba(24,24,27,0.04)" },
  timerTop: { display: "flex", justifyContent: "space-between", gap: 16, alignItems: "center", marginBottom: 16 },
  timerBox: { background: "#09090b", color: "#fff", borderRadius: 20, padding: "18px 20px", fontSize: 28, fontWeight: 700, minWidth: 160, textAlign: "center" },
  focusTitle: { fontSize: 20, fontWeight: 700, marginTop: 6 },
  focusNote: { color: "#71717a", marginTop: 6 },
  section: { background: "#fff", border: "1px solid #e4e4e7", borderRadius: 28, padding: 20, marginBottom: 24, boxShadow: "0 6px 20px rgba(24,24,27,0.04)" },
  sectionHead: { display: "flex", justifyContent: "space-between", gap: 16, alignItems: "center", marginBottom: 16 },
  sectionTitle: { margin: 0, fontSize: 28 },
  addButton: { border: "2px dashed #d4d4d8", background: "#fff", borderRadius: 16, padding: "10px 14px", cursor: "pointer" },
  taskCard: { border: "1px solid #e4e4e7", borderRadius: 24, padding: 18, marginBottom: 14 },
  badgeRow: { display: "flex", gap: 8, marginBottom: 10 },
  badge: { padding: "6px 10px", borderRadius: 999, background: "#ede9fe", color: "#6d28d9", fontSize: 12 },
  badgeLight: { padding: "6px 10px", borderRadius: 999, background: "#f4f4f5", color: "#52525b", fontSize: 12 },
  input: { width: "100%", border: "none", outline: "none", fontSize: 20, fontWeight: 700, marginBottom: 8 },
  textarea: { width: "100%", border: "none", outline: "none", resize: "vertical", color: "#52525b", marginBottom: 12, fontFamily: "inherit" },
  buttonRow: { display: "flex", flexWrap: "wrap", gap: 10 },
  primary: { background: "#09090b", color: "#fff", border: "none", borderRadius: 14, padding: "10px 14px", cursor: "pointer" },
  secondary: { background: "#fff", color: "#18181b", border: "1px solid #d4d4d8", borderRadius: 14, padding: "10px 14px", cursor: "pointer" },
  preset: { background: "#f4f4f5", color: "#18181b", border: "none", borderRadius: 14, padding: "10px 14px", cursor: "pointer" },
  presetActive: { background: "#7c3aed", color: "#fff", border: "none", borderRadius: 14, padding: "10px 14px", cursor: "pointer" },
  stepBox: { marginTop: 14, background: "#fafafa", borderRadius: 18, padding: 12 },
  stepRow: { display: "flex", gap: 10, alignItems: "center", marginBottom: 8 },
  stepText: { color: "#27272a" },
  stepDone: { color: "#a1a1aa", textDecoration: "line-through" },
  empty: { border: "1px dashed #d4d4d8", background: "#fafafa", borderRadius: 20, padding: 24, textAlign: "center", color: "#71717a" },
  doneItem: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, border: "1px solid #e4e4e7", borderRadius: 20, padding: 16, marginBottom: 12 },
  doneTitle: { fontWeight: 700 },
  doneMeta: { color: "#71717a", fontSize: 14, marginTop: 4 },
  toast: { position: "fixed", left: "50%", bottom: 20, transform: "translateX(-50%)", background: "#09090b", color: "#fff", padding: "12px 16px", borderRadius: 16, boxShadow: "0 12px 30px rgba(0,0,0,0.2)" },
  loginCard: { maxWidth: 480, margin: "80px auto", background: "#fff", border: "1px solid #e4e4e7", borderRadius: 28, padding: 24, boxShadow: "0 6px 20px rgba(24,24,27,0.04)" },
  loginTitle: { fontSize: 32, margin: "10px 0 8px" },
  loginSub: { color: "#71717a", marginBottom: 16 },
  field: { width: "100%", padding: "14px 16px", borderRadius: 14, border: "1px solid #d4d4d8", marginBottom: 10, fontSize: 16, boxSizing: "border-box" },
  toastInline: { marginTop: 12, color: "#6d28d9", fontSize: 14 }
};
