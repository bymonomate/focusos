import React, { useEffect, useRef } from 'react';
import { InlineIcon } from './icons';

function IconButton({ title, icon, onClick, tone = 'default', disabled = false, t = (value) => value }) {
  const toneClass =
    tone === 'primary'
      ? 'text-zinc-950 hover:text-zinc-700'
      : tone === 'violet'
        ? 'text-violet-700 hover:text-violet-500'
        : tone === 'emerald'
          ? 'text-emerald-700 hover:text-emerald-500'
          : tone === 'amber'
            ? 'text-amber-700 hover:text-amber-500'
            : tone === 'rose'
              ? 'text-rose-700 hover:text-rose-500'
              : 'text-zinc-500 hover:text-zinc-900';

  const label =
    title === '집중 시작'
      ? t('집중')
      : title === '우선순위 추천'
        ? t('추천')
        : title === 'AI 작업분해'
          ? t('분해')
          : title === 'Later로 이동'
            ? t('나중')
            : title === 'Today로 이동'
              ? t('오늘')
              : t(title);

  return (
    <button
      onClick={onClick}
      title={title}
      aria-label={title}
      disabled={disabled}
      className={`inline-flex min-w-[44px] flex-col items-center justify-center gap-1 text-center transition ${toneClass} ${disabled ? 'cursor-not-allowed opacity-30' : ''}`}
    >
      <InlineIcon name={icon} className="h-5 w-5" />
      <span className="text-[11px] leading-none">{label}</span>
    </button>
  );
}

export default function TaskCard({
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
  lang = 'ko',
  t = (value) => value,
  priorityBadge = {},
  statusBadge = {},
}) {
  const doneCount = (task.steps || []).filter((step) => step.done).length;
  const stepProgress = (task.steps || []).length ? Math.round((doneCount / task.steps.length) * 100) : 0;
  const stepRefs = useRef({});
  const pendingFocusStepRef = useRef(null);
  const prevStepCountRef = useRef((task.steps || []).length);

  useEffect(() => {
    const currentLength = (task.steps || []).length;
    if (
      pendingFocusStepRef.current !== null &&
      currentLength > prevStepCountRef.current
    ) {
      const nextIndex = pendingFocusStepRef.current;
      window.requestAnimationFrame(() => {
        const nextField = stepRefs.current[nextIndex];
        if (nextField) {
          nextField.focus();
          if (typeof nextField.setSelectionRange === 'function') {
            const length = nextField.value?.length || 0;
            nextField.setSelectionRange(length, length);
          }
        }
      });
      pendingFocusStepRef.current = null;
    }
    prevStepCountRef.current = currentLength;
  }, [task.steps]);

  return (
    <article
      ref={innerRef}
      draggable
      onDragStart={() => onDragStart(task.id)}
      onDragOver={(e) => e.preventDefault()}
      onDrop={() => onDropCard(task.id)}
      className={`relative rounded-[30px] border p-5 transition ${task.status === '진행 중' ? 'border-emerald-300 bg-emerald-50/50 shadow-sm' : isNew ? 'border-violet-400 bg-violet-50/60 shadow-sm' : 'border-zinc-100 bg-white'}`}
    >
      <button
        onClick={() => deleteTask(task.id)}
        title={t("삭제")}
        aria-label={t("삭제")}
        className="absolute right-4 top-4 inline-flex h-9 w-9 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-500 shadow-sm transition hover:bg-zinc-50 hover:text-zinc-900"
      >
        <InlineIcon name="delete" className="h-4 w-4" />
      </button>
      <div className="mb-3 hidden items-center gap-2 text-xs text-zinc-400 md:flex">
        <span className="rounded-full bg-zinc-100 px-2 py-1">{t("드래그 정렬")}</span>
        <span>{t("카드를 길게 잡고 위치를 바꿀 수 있어요")}</span>
      </div>

      <div className="min-w-0">
        <div className="flex flex-wrap gap-2">
          <span className={`rounded-full px-3 py-1 text-xs ${priorityBadge[task.priority]}`}>{t(task.priority)}</span>
          <span className={`rounded-full px-3 py-1 text-xs ${statusBadge[task.status]}`}>{t(task.status)}</span>
        </div>
        <textarea
          rows={2}
          value={t(task.title)}
          onChange={(e) => {
            e.target.style.height = 'auto';
            e.target.style.height = `${e.target.scrollHeight}px`;
            updateTask(task.id, { title: e.target.value });
          }}
          className="mt-3 min-h-[56px] w-full resize-none break-words bg-transparent text-lg font-semibold leading-8 outline-none placeholder:text-zinc-400"
        />
        <textarea value={t(task.note)} onChange={(e) => updateTask(task.id, { note: e.target.value })} rows={2} className="mt-1 w-full resize-none break-words bg-transparent text-sm text-zinc-600 outline-none placeholder:text-zinc-400" />
      </div>

      <div className="mt-5 md:flex md:items-start md:justify-between md:gap-5">
        <div className="hidden flex-wrap items-start gap-5 md:flex">
          <IconButton t={t} title="시작" icon="start" tone="primary" onClick={() => recordStart(task.id)} />
          <IconButton t={t} title="집중 시작" icon="focus" tone="violet" onClick={() => startFocusMode(task.id)} />
          {task.start && !task.end && <IconButton t={t} title="종료" icon="done" tone="emerald" onClick={() => recordEnd(task.id)} />}
          {task.status === '진행 중' && <IconButton t={t} title="멈춤" icon="pause" tone="amber" onClick={() => pauseTask(task.id)} />}
          <IconButton t={t} title="초기화" icon="reset" tone="rose" onClick={() => resetTask(task.id)} />
          <IconButton t={t} title={task.list === 'today' ? 'Later로 이동' : 'Today로 이동'} icon="later" onClick={() => moveList(task.id, task.list === 'today' ? 'later' : 'today')} />
          <IconButton t={t} title="우선순위 추천" icon="priority" onClick={() => recommendPriority(task.id)} />
        </div>

        <div className="hidden md:ml-auto md:inline-flex md:items-center md:gap-2 rounded-xl border border-zinc-200 bg-white px-3 py-2">
          <InlineIcon name="priority" className="h-4 w-4 text-zinc-400" />
          <select value={task.priority} onChange={(e) => updateTask(task.id, { priority: e.target.value })} className="bg-transparent text-sm outline-none">
            <option>{t("가장 중요")}</option>
            <option>{t("중요")}</option>
            <option>{t("가벼운 일")}</option>
          </select>
        </div>

        <div className="md:hidden">
          <div className="-mx-1 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <div className="flex min-w-max items-center gap-2">
              <div className="inline-flex items-center gap-2 rounded-2xl border border-zinc-200 bg-white px-3 py-2.5">
                <InlineIcon name="priority" className="h-4 w-4 text-zinc-400" />
                <select value={task.priority} onChange={(e) => updateTask(task.id, { priority: e.target.value })} className="bg-transparent text-sm outline-none">
                  <option>{t("가장 중요")}</option>
                  <option>{t("중요")}</option>
                  <option>{t("가벼운 일")}</option>
                </select>
              </div>

              <button onClick={() => recommendPriority(task.id)} className="shrink-0 rounded-2xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-medium text-zinc-700">{t("추천")}</button>

              {task.start && !task.end ? (
                <>
                  <button onClick={() => pauseTask(task.id)} className="shrink-0 rounded-2xl bg-zinc-950 px-4 py-2.5 text-sm font-medium text-white">{t("멈춤")}</button>
                  <button onClick={() => recordEnd(task.id)} className="shrink-0 rounded-2xl bg-emerald-500 px-4 py-2.5 text-sm font-medium text-white">{t("종료")}</button>
                </>
              ) : (
                <>
                  <button onClick={() => recordStart(task.id)} className="shrink-0 rounded-2xl bg-zinc-950 px-4 py-2.5 text-sm font-medium text-white">{t("시작")}</button>
                  <button onClick={() => startFocusMode(task.id)} className="shrink-0 rounded-2xl border border-violet-200 bg-white px-4 py-2.5 text-sm font-medium text-violet-700">{t("집중")}</button>
                </>
              )}

              <button onClick={() => moveList(task.id, task.list === 'today' ? 'later' : 'today')} className="shrink-0 rounded-2xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-medium text-zinc-700">{t(task.list === 'today' ? '나중' : '오늘')}</button>
              <button onClick={() => resetTask(task.id)} className="shrink-0 rounded-2xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-medium text-zinc-700">{t("초기화")}</button>
            </div>
          </div>
        </div>
      </div>

      {(task.start || task.end) && (
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {task.start && <InfoBox label={t("시작 시간")} value={task.start} />}
          {task.end && <InfoBox label={t("종료 시간")} value={task.end} />}
        </div>
      )}

      <div className="mt-4 rounded-[26px] bg-zinc-50 p-4">
        <div className="mb-3 rounded-2xl bg-white px-3 py-2 text-xs text-zinc-500 ring-1 ring-zinc-100">{t("AI 작업분해는 할 일 제목과 메모를 보고 바로 시작 가능한 3단계 정도로 자동 추천해줘요.")}</div>

        <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-zinc-700">{t("작업 단계")}</p>
            <p className="text-xs text-zinc-500">{t("완료")} {doneCount}/{(task.steps || []).length}</p>
          </div>
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
            <button onClick={() => splitTask(task.id)} title={t("분해")} aria-label={t("분해")} className="inline-flex w-full items-center justify-center gap-2 rounded-xl border px-3 py-2 text-sm transition hover:bg-white sm:w-auto"><InlineIcon name="split" className="h-4 w-4" />{t("분해")}</button>
            <button onClick={() => addStep(task.id)} title={t("단계 추가")} aria-label={t("단계 추가")} className="inline-flex w-full items-center justify-center gap-2 rounded-xl border px-3 py-2 text-sm transition hover:bg-white sm:w-auto"><InlineIcon name="add-step" className="h-4 w-4" />{t("단계 추가")}</button>
          </div>
        </div>

        <div className="mb-4 h-2 overflow-hidden rounded-full bg-white">
          <div className="h-full rounded-full bg-violet-500 transition-all" style={{ width: `${stepProgress}%` }} />
        </div>

        <div className="space-y-2">
          {(task.steps || []).map((step, idx) => (
            <div key={`${task.id}-step-${idx}`} className="flex items-start gap-2 rounded-[20px] bg-white px-3 py-3 ring-1 ring-zinc-100">
              <button onClick={() => toggleStep(task.id, idx)} title={step.done ? t('단계 완료 취소') : t('단계 완료')} aria-label={step.done ? t('단계 완료 취소') : t('단계 완료')} className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md border ${step.done ? 'border-violet-500 bg-violet-500 text-white' : 'border-zinc-300 text-zinc-300'}`}><InlineIcon name="check" className="h-3.5 w-3.5" /></button>
              <textarea
                ref={(el) => {
                  stepRefs.current[idx] = el;
                }}
                rows={1}
                value={t(step.text)}
                onChange={(e) => {
                  e.target.style.height = 'auto';
                  e.target.style.height = `${e.target.scrollHeight}px`;
                  updateStep(task.id, idx, e.target.value);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    pendingFocusStepRef.current = idx + 1;
                    addStep(task.id);
                  }
                }}
                className={`min-h-[28px] w-full resize-none bg-transparent text-sm leading-6 outline-none ${step.done ? 'text-zinc-400 line-through' : 'text-zinc-700'}`}
              />
              <button onClick={() => deleteStep(task.id, idx)} title={t("단계 삭제")} aria-label={t("단계 삭제")} className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center text-zinc-400 transition hover:text-rose-500">
                <InlineIcon name="delete" className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </article>
  );
}
