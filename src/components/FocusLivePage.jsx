import React, { useEffect, useRef, useState } from 'react';

export default function FocusLivePage({
  sessions = [],
  lang = 'ko',
  isJoined = false,
  joinedSession = null,
  comments = [],
  currentNickname = '',
  currentUser = null,
  onJoin = () => {},
  onLeave = () => {},
  onSendComment = () => {},
  onBack = () => {},
  onGoPlanner = () => {},
  onOpenAuth = () => {},
  onOpenProfile = () => {},
  onOpenSettings = () => {},
  onSignOut = () => {},
  onSetLang = () => {},
  t = (value) => value,
  getRemainingSeconds = (session) => 0,
  formatRemainingLabel = (seconds) => `${seconds}`,
}) {
  const [draft, setDraft] = useState('');
  const commentsBoxRef = useRef(null);
  const shouldStickToBottomRef = useRef(true);
  const forceScrollRef = useRef(false);
  const previousCommentsCountRef = useRef(comments.length);
  const hasMountedRef = useRef(false);
  const joinedActive = joinedSession && getRemainingSeconds(joinedSession) > 0;
  const mergedSessions = (() => {
    const filtered = sessions.filter((session) => getRemainingSeconds(session) > 0);
    if (joinedActive && !filtered.some((session) => session.id === joinedSession.id || session.user_id === joinedSession.user_id || session.anonymous_name === joinedSession.anonymous_name)) {
      return [joinedSession, ...filtered];
    }
    return filtered;
  })();


  useEffect(() => {
    const box = commentsBoxRef.current;
    if (!box) return;

    const countIncreased = comments.length > previousCommentsCountRef.current;

    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      previousCommentsCountRef.current = comments.length;
      return;
    }

    if (countIncreased && (forceScrollRef.current || shouldStickToBottomRef.current)) {
      box.scrollTo({ top: box.scrollHeight, behavior: 'smooth' });
    }

    forceScrollRef.current = false;
    previousCommentsCountRef.current = comments.length;
  }, [comments]);

  const submitComment = async () => {
    const value = draft.trim();
    if (!value) return;
    forceScrollRef.current = true;
    await onSendComment(value);
    setDraft('');
  };

  const handleCommentsScroll = () => {
    const box = commentsBoxRef.current;
    if (!box) return;
    const distanceFromBottom = box.scrollHeight - box.scrollTop - box.clientHeight;
    shouldStickToBottomRef.current = distanceFromBottom < 56;
  };

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#f4f0ff_0%,#fffdf8_48%,#ffffff_100%)] px-4 py-6 text-zinc-900 md:py-8">
      <div className="mx-auto max-w-6xl">
        <section className="sticky top-4 z-20 mb-6 overflow-hidden rounded-[30px] border border-white/70 bg-white/85 shadow-[0_18px_50px_rgba(24,24,27,0.08)] backdrop-blur-xl">
          <div className="flex flex-col gap-4 px-4 py-4 md:flex-row md:items-center md:justify-between md:px-5">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-violet-600 md:text-[11px] md:uppercase md:tracking-[0.24em]">FocusOS</p>
                <span className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-2.5 py-1 text-[11px] font-semibold text-violet-700 ring-1 ring-violet-100">
                  <span className="inline-block h-2 w-2 rounded-full bg-violet-600"></span>
                  LIVE HOME
                </span>
              </div>
              <p className="mt-1 text-sm text-zinc-500">{currentUser ? (currentUser.email || currentNickname || 'FocusOS member') : t('로그인하면 할 일과 집중 기록이 저장돼요.')}</p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="mr-1 flex items-center gap-1 rounded-full border border-zinc-200 bg-white p-1 shadow-sm">
                <button onClick={() => onSetLang('ko')} className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition ${lang === 'ko' ? 'bg-zinc-950 text-white' : 'text-zinc-500'}`}>KO</button>
                <button onClick={() => onSetLang('en')} className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition ${lang === 'en' ? 'bg-zinc-950 text-white' : 'text-zinc-500'}`}>EN</button>
              </div>
              <button onClick={onGoPlanner} className="rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 shadow-sm transition hover:bg-zinc-50">{lang === 'en' ? 'Planner' : '우선순위 정리'}</button>
              <button onClick={onBack} className="rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 shadow-sm transition hover:bg-zinc-50">{lang === 'en' ? 'Dashboard' : '대시보드'}</button>
              {currentUser ? (
                <>
                  <button onClick={onOpenProfile} className="rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 shadow-sm transition hover:bg-zinc-50">{lang === 'en' ? 'Profile' : '프로필'}</button>
                  <button onClick={onOpenSettings} className="rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 shadow-sm transition hover:bg-zinc-50">{t('설정')}</button>
                  <button onClick={onSignOut} className="rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 shadow-sm transition hover:bg-zinc-50">{t('로그아웃')}</button>
                </>
              ) : (
                <button onClick={onOpenAuth} className="rounded-full bg-zinc-950 px-3.5 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-zinc-800">{t('로그인')}</button>
              )}
            </div>
          </div>
        </section>

        <section className="overflow-hidden rounded-[36px] border border-zinc-900/5 bg-zinc-950 p-6 text-white shadow-[0_24px_80px_rgba(24,24,27,0.18)] md:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-violet-300">{t('라이브 집중방')}</p>
              <h1 className="mt-3 text-4xl font-bold tracking-tight md:text-5xl">{t('FocusOS LIVE')}</h1>
              <p className="mt-4 text-lg text-zinc-300">{t('지금 함께 집중 중인 사람들')}</p>
              <div className="mt-4 inline-flex items-center rounded-full bg-white/10 px-4 py-2 text-sm font-medium text-white ring-1 ring-white/10">
                🟢 {mergedSessions.length} {lang === 'en' ? 'focusing now' : '명 집중 중'}
              </div>
              <p className="mt-5 text-base leading-7 text-zinc-300">{t('혼자보다 같이 시작하는 게 더 쉬울 때가 있어요.')}</p>
              <p className="mt-2 text-sm text-zinc-400">Start small, finish one thing.</p>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              {!joinedActive ? (
                <button
                  onClick={onJoin}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-violet-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-violet-500"
                >
                  <span className="inline-block h-2.5 w-2.5 rounded-full bg-white/90"></span>
                  {t('나도 집중 시작하기')}
                </button>
              ) : (
                <button
                  onClick={onLeave}
                  className="rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-zinc-900 transition hover:scale-[1.01]"
                >
                  {t('라이브 나가기')}
                </button>
              )}
            </div>
          </div>
        </section>

        <section className="mt-6">
          <button
            onClick={onGoPlanner}
            className="w-full rounded-[32px] border border-zinc-200 bg-white px-6 py-6 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md md:px-8 md:py-7"
          >
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-700">Planner</p>
                <h3 className="mt-3 text-2xl font-semibold tracking-tight text-zinc-950">{lang === 'en' ? 'Not sure what to do first?' : '무엇부터 해야 할지 막막한가요?'}</h3>
                <p className="mt-3 text-sm leading-6 text-zinc-600">{lang === 'en' ? 'Sort your top priorities first, then come back to live focus.' : '우선순위를 먼저 정리한 뒤 라이브 집중으로 돌아오세요.'}</p>
              </div>
              <div className="shrink-0 rounded-full bg-violet-50 px-6 py-3 text-sm font-semibold text-violet-700 ring-1 ring-violet-100">
                {lang === 'en' ? 'Open planner' : '우선순위 정리하기'}
              </div>
            </div>
          </button>
        </section>

        <section className="mt-8 grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <div>
            {joinedActive && (
              <div className="mb-4 rounded-[28px] border border-violet-200 bg-violet-50/80 p-5 shadow-sm">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-violet-700">{t('내가 참여 중입니다')}</p>
                    <h2 className="mt-2 text-xl font-semibold text-zinc-900">{joinedSession.anonymous_name}</h2>
                    <p className="mt-1 text-sm text-zinc-600">{joinedSession.task_title}</p>
                  </div>
                  <div className="inline-flex rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-violet-700 ring-1 ring-violet-100">
                    ⏱ {formatRemainingLabel(getRemainingSeconds(joinedSession), lang)}
                  </div>
                </div>
              </div>
            )}

            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-violet-700">{t('실시간 집중 보드')}</p>
                <h2 className="mt-1 text-2xl font-semibold tracking-tight text-zinc-900">{t('지금 참여 중인 사람들')}</h2>
              </div>
              <div className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-zinc-600 ring-1 ring-zinc-200">
                {joinedActive ? t('참여 중') : t('구경 중')}
              </div>
            </div>

            {mergedSessions.length > 0 ? (
              <div className="overflow-hidden rounded-[28px] border border-zinc-100 bg-white shadow-sm">
                <div className={`divide-y divide-zinc-100 ${mergedSessions.length > 10 ? 'max-h-[520px] overflow-y-auto' : ''}`}>
                  {mergedSessions.map((session) => {
                    const isMine =
                      joinedActive &&
                      (session.id === joinedSession?.id || session.anonymous_name === joinedSession?.anonymous_name);

                    return (
                      <div
                        key={session.id || `${session.anonymous_name}-${session.started_at}`}
                        className={`flex items-center justify-between gap-3 px-4 py-3 ${isMine ? 'bg-violet-50/70' : 'bg-white'}`}
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className={`inline-block h-2.5 w-2.5 rounded-full ${isMine ? 'bg-violet-600' : 'bg-emerald-500'}`}></span>
                            <p className="truncate text-sm font-semibold text-zinc-900">
                              {session.anonymous_name || 'Focuser'}
                            </p>
                          </div>
                          <p className="mt-1 truncate text-xs text-zinc-500">
                            {session.task_title || t('집중 세션')}
                          </p>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className={`text-sm font-semibold ${isMine ? 'text-violet-700' : 'text-zinc-700'}`}>
                            {formatRemainingLabel(getRemainingSeconds(session), lang)}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="rounded-[28px] border border-dashed border-zinc-200 bg-white/80 px-6 py-14 text-center text-zinc-500 shadow-sm">
                <p className="text-lg font-medium text-zinc-700">{t('아직 집중 중인 사람이 없어요. 먼저 시작해볼까요?')}</p>
                <button
                  onClick={onJoin}
                  className="mt-5 rounded-2xl border border-zinc-200 bg-white px-5 py-3 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
                >
                  {t('나도 집중 시작하기')}
                </button>
              </div>
            )}
          </div>

          <div className="overflow-hidden rounded-[32px] border border-zinc-100 bg-white shadow-sm">
            <div className="border-b border-zinc-100 px-5 py-4">
              <p className="text-sm font-medium text-violet-700">{t('응원 한마디')}</p>
              <h2 className="mt-1 text-2xl font-semibold tracking-tight text-zinc-900">{t('댓글 남기기')}</h2>
            </div>

            <div className="flex h-[520px] flex-col">
              <div ref={commentsBoxRef} onScroll={handleCommentsScroll} className="flex-1 overflow-y-auto px-5 py-4">
                <div className="space-y-3">
                  {comments.length > 0 ? comments.map((comment) => {
                    const name = comment.anonymous_name || 'Focuser';
                    const isSystem = comment.type === 'system' || name === 'SYSTEM';
                    const isMine = !isSystem && currentNickname && name === currentNickname;

                    if (isSystem) {
                      return (
                        <div key={comment.id || `${comment.anonymous_name}-${comment.created_at}`} className="py-1 text-center">
                          <span className="inline-flex rounded-full bg-zinc-100 px-3 py-1.5 text-xs font-medium text-zinc-600">
                            {comment.message}
                          </span>
                        </div>
                      );
                    }

                    return (
                      <div key={comment.id || `${comment.anonymous_name}-${comment.created_at}`} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[92%] rounded-2xl px-4 py-3 ${isMine ? 'bg-violet-600 text-white' : 'bg-zinc-50'}`}>
                          <p className={`text-sm font-semibold ${isMine ? 'text-white' : 'text-zinc-900'}`}>{name}</p>
                          <p className={`mt-1 text-sm leading-6 ${isMine ? 'text-white/90' : 'text-zinc-600'}`}>{comment.message}</p>
                        </div>
                      </div>
                    );
                  }) : (
                    <div className="rounded-2xl border border-dashed border-zinc-200 px-4 py-8 text-center text-sm text-zinc-500">
                      {t('댓글이 아직 없어요. 먼저 남겨보세요.')}
                    </div>
                  )}                </div>
              </div>

              <div className="border-t border-zinc-100 px-5 py-4">
                <div className="mb-3 flex flex-wrap gap-2">
                  {['화이팅', '같이 집중해요', '끝까지 가요'].map((quick) => (
                    <button
                      key={quick}
                      onClick={() => setDraft(quick)}
                      className="rounded-full bg-violet-50 px-3 py-1.5 text-xs font-medium text-violet-700 ring-1 ring-violet-100"
                    >
                      {t(quick)}
                    </button>
                  ))}
                </div>

                <div className="flex gap-2">
                  <input
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        submitComment();
                      }
                    }}
                    placeholder={t('메시지 입력')}
                    className="min-w-0 flex-1 rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm outline-none transition focus:border-violet-300 focus:bg-white"
                  />
                  <button
                    onClick={submitComment}
                    className="shrink-0 rounded-2xl bg-zinc-950 px-4 py-3 text-sm font-medium text-white transition hover:scale-[1.01]"
                  >
                    {t('보내기')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
