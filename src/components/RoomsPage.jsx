import React, { useEffect, useMemo, useState } from 'react';

const ROOMS_KEY = 'focus-os-focus-rooms';
const ACTIVE_ROOM_KEY = 'focus-os-focus-room-active';
const RECORDS_PREFIX = 'focus-os-focus-room-records-';
const ROOM_EVENT = 'focusos-rooms-updated';
const MESSAGE_TTL = 24 * 60 * 60 * 1000;
const PARTICIPANT_TTL = 12 * 60 * 60 * 1000;

function makeId(prefix = 'id') {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return `${prefix}-${crypto.randomUUID()}`;
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function readStorage(key, fallback) {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function emitRoomsUpdated() {
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent(ROOM_EVENT));
}

function sanitizeRooms(input = []) {
  const now = Date.now();
  return (Array.isArray(input) ? input : []).map((room) => {
    const messages = Array.isArray(room.messages)
      ? room.messages.filter((msg) => now - new Date(msg.createdAt).getTime() < MESSAGE_TTL)
      : [];
    const participants = Array.isArray(room.participants)
      ? room.participants.filter((item) => now - new Date(item.joinedAt || item.updatedAt || 0).getTime() < PARTICIPANT_TTL)
      : [];
    return {
      ...room,
      isPrivate: Boolean(room.password),
      messages,
      participants,
    };
  });
}

function writeRooms(rooms) {
  if (typeof window === 'undefined') return;
  const clean = sanitizeRooms(rooms);
  window.localStorage.setItem(ROOMS_KEY, JSON.stringify(clean));
  emitRoomsUpdated();
}

function formatStamp(value) {
  try {
    return new Date(value).toLocaleString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

export function getStoredFocusRooms() {
  return sanitizeRooms(readStorage(ROOMS_KEY, []));
}

export default function RoomsPage({
  session = null,
  nickname = '',
  setNickname = () => {},
  onOpenAuth = () => {},
  onBackHome = () => {},
  detailOnly = false,
  initialRoomId = '',
}) {
  const [rooms, setRooms] = useState(() => getStoredFocusRooms());
  const [activeRoomId, setActiveRoomId] = useState(() => initialRoomId || readStorage(ACTIVE_ROOM_KEY, ''));
  const [newRoomTitle, setNewRoomTitle] = useState('');
  const [newRoomAgenda, setNewRoomAgenda] = useState('');
  const [newRoomDesc, setNewRoomDesc] = useState('');
  const [newRoomPassword, setNewRoomPassword] = useState('');
  const [draftMessage, setDraftMessage] = useState('');
  const [savedRecords, setSavedRecords] = useState([]);
  const [joinPassword, setJoinPassword] = useState('');
  const [joinError, setJoinError] = useState('');
  const [joinState, setJoinState] = useState({});

  useEffect(() => {
    const clean = sanitizeRooms(rooms);
    writeRooms(clean);
    if (clean !== rooms) setRooms(clean);
  }, [rooms]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(ACTIVE_ROOM_KEY, JSON.stringify(activeRoomId));
  }, [activeRoomId]);

  useEffect(() => {
    if (initialRoomId) setActiveRoomId(initialRoomId);
  }, [initialRoomId]);

  useEffect(() => {
    const sync = () => setRooms(getStoredFocusRooms());
    if (typeof window === 'undefined') return;
    window.addEventListener(ROOM_EVENT, sync);
    return () => window.removeEventListener(ROOM_EVENT, sync);
  }, []);

  useEffect(() => {
    if (!session?.user?.id) {
      setSavedRecords([]);
      return;
    }
    setSavedRecords(readStorage(`${RECORDS_PREFIX}${session.user.id}`, []));
  }, [session?.user?.id]);

  const activeRoom = useMemo(
    () => rooms.find((room) => room.id === activeRoomId) || null,
    [rooms, activeRoomId]
  );

  const visibleRooms = useMemo(() => getStoredFocusRooms().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)), [rooms]);
  const participantName = nickname.trim() || '게스트';
  const currentUserKey = session?.user?.id || participantName;
  const joinedRoom = activeRoom && (joinState[activeRoom.id] || (activeRoom.participants || []).some((item) => item.userKey === currentUserKey || item.nickname === participantName));
  const isRoomOwner = Boolean(activeRoom && activeRoom.createdBy === currentUserKey);
  const uniqueParticipants = activeRoom ? [...new Map((activeRoom.participants || []).map((item) => [item.nickname, item])).values()] : [];

  useEffect(() => {
    if (!session?.user?.id || !activeRoom || !joinedRoom) return;
    const recordKey = `${RECORDS_PREFIX}${session.user.id}`;
    const nextRecord = {
      id: `record-${activeRoom.id}`,
      roomId: activeRoom.id,
      roomTitle: activeRoom.title,
      agenda: activeRoom.agenda,
      summary: activeRoom.messages.slice(-10).map((message) => `${message.nickname}: ${message.text}`).join('\n'),
      updatedAt: new Date().toISOString(),
    };
    const current = readStorage(recordKey, []);
    const merged = [nextRecord, ...current.filter((item) => item.id !== nextRecord.id)].slice(0, 20);
    window.localStorage.setItem(recordKey, JSON.stringify(merged));
    setSavedRecords(merged);
  }, [activeRoom?.id, activeRoom?.agenda, activeRoom?.messages, session?.user?.id, joinedRoom]);

  const updateRoom = (roomId, updater) => {
    setRooms((prev) => prev.map((room) => (room.id === roomId ? updater(room) : room)));
  };

  const touchParticipant = (roomId) => {
    if (!participantName) return;
    updateRoom(roomId, (room) => {
      const nextParticipants = (room.participants || []).filter((item) => item.userKey !== currentUserKey);
      nextParticipants.push({ userKey: currentUserKey, nickname: participantName, joinedAt: new Date().toISOString() });
      return { ...room, participants: nextParticipants };
    });
  };

  const createRoom = () => {
    const title = newRoomTitle.trim();
    const agenda = newRoomAgenda.trim();
    if (!title) return;
    const room = {
      id: makeId('room'),
      title,
      agenda,
      description: newRoomDesc.trim(),
      password: newRoomPassword.trim(),
      createdAt: new Date().toISOString(),
      createdBy: session?.user?.id || participantName || 'guest',
      messages: [],
      participants: participantName ? [{ userKey: currentUserKey, nickname: participantName, joinedAt: new Date().toISOString() }] : [],
    };
    const next = [room, ...rooms];
    setRooms(next);
    setJoinState((prev) => ({ ...prev, [room.id]: true }));
    setActiveRoomId(room.id);
    setNewRoomTitle('');
    setNewRoomAgenda('');
    setNewRoomDesc('');
    setNewRoomPassword('');
  };

  const tryJoinRoom = (room) => {
    if (!participantName) {
      setJoinError('닉네임을 먼저 입력해 주세요.');
      return;
    }
    if (room.password && joinPassword !== room.password) {
      setJoinError('비밀번호가 맞지 않아요.');
      return;
    }
    setJoinError('');
    setJoinPassword('');
    setJoinState((prev) => ({ ...prev, [room.id]: true }));
    setActiveRoomId(room.id);
    touchParticipant(room.id);
  };

  const sendMessage = () => {
    const text = draftMessage.trim();
    if (!text || !activeRoom || !participantName || !joinedRoom) return;
    const message = {
      id: makeId('msg'),
      nickname: participantName,
      text,
      createdAt: new Date().toISOString(),
      userId: session?.user?.id || null,
    };
    updateRoom(activeRoom.id, (room) => ({ ...room, messages: [...(room.messages || []), message] }));
    touchParticipant(activeRoom.id);
    setDraftMessage('');
  };

  const saveManualRecord = () => {
    if (!session?.user?.id || !activeRoom) return;
    const recordKey = `${RECORDS_PREFIX}${session.user.id}`;
    const current = readStorage(recordKey, []);
    const manual = {
      id: makeId('saved'),
      roomId: activeRoom.id,
      roomTitle: activeRoom.title,
      agenda: activeRoom.agenda,
      summary: activeRoom.messages.slice(-20).map((message) => `${message.nickname}: ${message.text}`).join('\n'),
      updatedAt: new Date().toISOString(),
    };
    const merged = [manual, ...current].slice(0, 30);
    window.localStorage.setItem(recordKey, JSON.stringify(merged));
    setSavedRecords(merged);
  };


  const goHomeAndClearActive = () => {
    setActiveRoomId('');
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(ACTIVE_ROOM_KEY, JSON.stringify(''));
    }
    onBackHome();
  };

  const leaveActiveRoom = () => {
    if (!activeRoom) return;
    const shouldLeave = typeof window === 'undefined' ? true : window.confirm('이 집중방에서 나갈까요?');
    if (!shouldLeave) return;

    const roomId = activeRoom.id;
    const nextRooms = rooms.map((room) => {
      if (room.id !== roomId) return room;
      return {
        ...room,
        participants: (room.participants || []).filter((item) => item.userKey !== currentUserKey && item.nickname !== participantName),
        messages: [
          ...(room.messages || []),
          {
            id: makeId('system'),
            nickname: '안내',
            text: `${participantName}님이 방을 나갔습니다.`,
            createdAt: new Date().toISOString(),
            userId: null,
            isSystem: true,
          },
        ],
      };
    });

    setRooms(nextRooms);
    writeRooms(nextRooms);
    setJoinState((prev) => ({ ...prev, [roomId]: false }));
    if (typeof window !== 'undefined') {
      window.alert('집중방에서 나갔습니다.');
    }
    goHomeAndClearActive();
  };

  const closeActiveRoom = () => {
    if (!activeRoom) return;
    const shouldClose = typeof window === 'undefined' ? true : window.confirm('이 집중방을 종료할까요? 종료하면 홈 리스트에서도 사라집니다.');
    if (!shouldClose) return;

    const roomId = activeRoom.id;
    const nextRooms = rooms.filter((room) => room.id !== roomId);

    setRooms(nextRooms);
    writeRooms(nextRooms);
    setJoinState((prev) => {
      const next = { ...prev };
      delete next[roomId];
      return next;
    });

    if (typeof window !== 'undefined') {
      window.localStorage.setItem(ACTIVE_ROOM_KEY, JSON.stringify(''));
      window.alert('집중방이 종료되었습니다.');
    }

    setActiveRoomId('');
    onBackHome();
  };


  const renderRoomDetail = () => {
    if (!activeRoom) {
      return (
        <div className="rounded-[28px] border border-zinc-100 bg-white p-5 shadow-sm md:p-6">
          <div className="rounded-[24px] border border-dashed border-zinc-200 bg-zinc-50 px-4 py-12 text-center text-sm text-zinc-500">
            선택한 집중방을 찾을 수 없어요. 홈으로 돌아가 다시 입장해 주세요.
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-5">
        <section className="overflow-hidden rounded-[32px] border border-zinc-900/5 bg-zinc-950 p-6 text-white shadow-[0_24px_80px_rgba(24,24,27,0.18)] md:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-2xl">
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-violet-300">Focus Room</p>
              <h1 className="mt-3 text-4xl font-semibold tracking-tight md:text-5xl">{activeRoom.title}</h1>
              <p className="mt-3 text-base leading-7 text-white/70">{activeRoom.description || '같이 들어와서 각자 집중하고, 필요할 때만 대화하는 집중방입니다.'}</p>
              <div className="mt-5 flex flex-wrap gap-3">
                <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-medium text-white ring-1 ring-white/10">
                  {activeRoom.password ? '🔒 비밀번호 방' : '🌐 공개방'}
                </span>
                <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-medium text-white ring-1 ring-white/10">
                  {(activeRoom.participants || []).length}명 참여 중
                </span>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 lg:justify-end">
              <button onClick={goHomeAndClearActive} className="rounded-full border border-white/15 bg-white px-5 py-2.5 text-sm font-semibold text-zinc-900 shadow-sm">LIVE 홈으로</button>
              {joinedRoom && (
                <button onClick={leaveActiveRoom} className="rounded-full border border-white/15 bg-white/10 px-5 py-2.5 text-sm font-semibold text-white shadow-sm">방 나가기</button>
              )}
              {joinedRoom && isRoomOwner && (
                <button onClick={closeActiveRoom} className="rounded-full border border-rose-300/40 bg-rose-500 px-5 py-2.5 text-sm font-semibold text-white shadow-sm">집중방 종료하기</button>
              )}
              {!session?.user ? (
                <button onClick={onOpenAuth} className="rounded-full bg-violet-500 px-5 py-2.5 text-sm font-semibold text-white shadow-sm">로그인</button>
              ) : (
                <button onClick={saveManualRecord} className="rounded-full bg-violet-500 px-5 py-2.5 text-sm font-semibold text-white shadow-sm">기록 저장</button>
              )}
            </div>
          </div>
        </section>

        {!joinedRoom ? (
          <section className="rounded-[28px] border border-zinc-100 bg-white p-5 shadow-sm md:p-6">
            <p className="text-base font-semibold text-zinc-900">이 집중방에 참여하기</p>
            <p className="mt-2 text-sm leading-6 text-zinc-500">같이 들어와서 각자 집중하고, 필요할 때만 대화하세요.</p>
            {activeRoom.password && (
              <input
                value={joinPassword}
                onChange={(e) => setJoinPassword(e.target.value)}
                placeholder="비밀번호 입력"
                className="mt-4 w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm outline-none"
              />
            )}
            {joinError && <p className="mt-3 text-sm text-rose-600">{joinError}</p>}
            <button
              onClick={() => {
                if (activeRoom.password) {
                  tryJoinRoom(activeRoom);
                } else {
                  setJoinState((prev) => ({ ...prev, [activeRoom.id]: true }));
                  touchParticipant(activeRoom.id);
                }
              }}
              className="mt-4 rounded-2xl bg-zinc-950 px-5 py-3 text-sm font-semibold text-white"
            >
              {activeRoom.password ? '비밀번호로 입장' : '바로 입장'}
            </button>
          </section>
        ) : (
          <>
            <section className="grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
              <div className="rounded-[28px] border border-violet-100 bg-[linear-gradient(180deg,#faf7ff_0%,#ffffff_100%)] p-5 shadow-sm md:p-6">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-violet-500">Agenda</p>
                    <h2 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-950">오늘의 집중 아젠다</h2>
                  </div>
                  <span className="rounded-full bg-violet-100 px-3 py-1 text-xs font-semibold text-violet-700">핵심만 정리</span>
                </div>
                <textarea
                  value={activeRoom.agenda || ''}
                  onChange={(e) => updateRoom(activeRoom.id, (room) => ({ ...room, agenda: e.target.value }))}
                  rows={8}
                  className="mt-4 w-full rounded-[24px] border border-violet-100 bg-white px-5 py-4 text-base leading-7 text-zinc-800 outline-none ring-0"
                />
              </div>

              <div className="rounded-[28px] border border-zinc-100 bg-white p-5 shadow-sm md:p-6">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-zinc-500">Members</p>
                    <h2 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-950">참여 중인 사람</h2>
                  </div>
                  <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-semibold text-zinc-700">실시간 표시</span>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {uniqueParticipants.length === 0 ? (
                    <p className="text-sm text-zinc-500">아직 참여자가 없어요.</p>
                  ) : uniqueParticipants.map((item) => (
                    <span key={item.userKey || item.nickname} className="rounded-full bg-zinc-50 px-4 py-2 text-sm font-medium text-zinc-700 ring-1 ring-zinc-200">{item.nickname}</span>
                  ))}
                </div>
              </div>
            </section>

            <section className="rounded-[24px] border border-amber-200 bg-[linear-gradient(90deg,#fff7e8_0%,#fffdf6_100%)] px-5 py-4 text-sm leading-6 text-amber-900 shadow-sm">
              이 집중방의 채팅은 24시간 후 자동으로 삭제됩니다. 필요한 내용은 개인적으로 저장해 주세요.
            </section>

            <section className="overflow-hidden rounded-[28px] border border-zinc-100 bg-white shadow-sm">
              <div className="border-b border-zinc-100 bg-zinc-950 px-5 py-4 text-white md:px-6">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/50">Chat</p>
                    <h2 className="mt-1 text-lg font-semibold tracking-tight">채팅</h2>
                  </div>
                  <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white/80 ring-1 ring-white/10">24시간 후 자동 삭제</span>
                </div>
              </div>

              <div className="p-5 md:p-6">
                <div className="max-h-[360px] space-y-3 overflow-auto pr-1">
                  {(activeRoom.messages || []).length === 0 ? (
                    <div className="rounded-[24px] border border-dashed border-zinc-200 bg-zinc-50 px-4 py-8 text-sm text-zinc-500">아직 대화가 없어요. 필요한 말만 짧게 남겨보세요.</div>
                  ) : activeRoom.messages.map((message) => (
                    <div key={message.id} className={`rounded-[24px] px-4 py-4 ring-1 ${message.isSystem ? 'bg-amber-50 ring-amber-100' : 'bg-zinc-50 ring-zinc-100'}`}>
                      <div className="flex items-center justify-between gap-3">
                        <p className={`text-sm font-semibold ${message.isSystem ? 'text-amber-900' : 'text-zinc-950'}`}>{message.nickname}</p>
                        <span className={`text-[11px] font-medium ${message.isSystem ? 'text-amber-500' : 'text-zinc-400'}`}>{formatStamp(message.createdAt)}</span>
                      </div>
                      <p className={`mt-2 text-sm leading-6 ${message.isSystem ? 'text-amber-800' : 'text-zinc-600'}`}>{message.text}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-5 flex flex-col gap-3 md:flex-row">
                  <input
                    value={draftMessage}
                    onChange={(e) => setDraftMessage(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        sendMessage();
                      }
                    }}
                    placeholder="필요한 말만 짧게 남겨보세요"
                    className="min-w-0 flex-1 rounded-[22px] border border-zinc-200 bg-zinc-50 px-4 py-3.5 text-sm outline-none"
                  />
                  <button onClick={sendMessage} className="rounded-[22px] bg-violet-600 px-6 py-3.5 text-sm font-semibold text-white shadow-sm">보내기</button>
                </div>
                <p className="mt-3 text-xs text-zinc-400">Enter로 바로 보내고, Shift+Enter로 줄바꿈할 수 있어요.</p>
              </div>
            </section>
          </>
        )}
      </div>
    );
  };

  if (detailOnly) {
    return (
      <main className="min-h-screen bg-[radial-gradient(circle_at_top,#f4f0ff_0%,#fffdf8_48%,#ffffff_100%)] px-4 py-6 text-zinc-900 md:py-8">
        <div className="mx-auto max-w-5xl">
          {renderRoomDetail()}
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#f4f0ff_0%,#fffdf8_48%,#ffffff_100%)] px-4 py-6 text-zinc-900 md:py-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <section className="rounded-[30px] border border-white/70 bg-white/85 p-5 shadow-[0_18px_50px_rgba(24,24,27,0.08)] backdrop-blur-xl md:p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-violet-600">FocusOS Focus Room</p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight">같이 집중하는 집중방</h1>
              <p className="mt-2 text-sm leading-6 text-zinc-500">홈에서 만든 집중방을 여기서 관리할 수 있어요. 필요할 때만 채팅하고, 각자 집중 흐름은 가볍게 이어가세요.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button onClick={onBackHome} className="rounded-full border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-700 shadow-sm">홈으로</button>
              {!session?.user ? (
                <button onClick={onOpenAuth} className="rounded-full bg-zinc-950 px-4 py-2 text-sm font-semibold text-white shadow-sm">로그인</button>
              ) : (
                <button onClick={saveManualRecord} className="rounded-full bg-violet-600 px-4 py-2 text-sm font-semibold text-white shadow-sm">기록 저장</button>
              )}
            </div>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
          <div className="space-y-6">
            <div className="rounded-[28px] border border-zinc-100 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-semibold">집중방 만들기</h2>
              <div className="mt-4 space-y-3">
                <input value={newRoomTitle} onChange={(e) => setNewRoomTitle(e.target.value)} placeholder="방 이름" className="w-full rounded-2xl border border-zinc-200 px-4 py-3 outline-none" />
                <input value={newRoomAgenda} onChange={(e) => setNewRoomAgenda(e.target.value)} placeholder="아젠다" className="w-full rounded-2xl border border-zinc-200 px-4 py-3 outline-none" />
                <textarea value={newRoomDesc} onChange={(e) => setNewRoomDesc(e.target.value)} placeholder="간단한 설명" rows={3} className="w-full rounded-2xl border border-zinc-200 px-4 py-3 outline-none" />
                <input value={newRoomPassword} onChange={(e) => setNewRoomPassword(e.target.value)} placeholder="비밀번호 (선택)" className="w-full rounded-2xl border border-zinc-200 px-4 py-3 outline-none" />
                <button onClick={createRoom} className="w-full rounded-2xl bg-zinc-950 px-4 py-3 text-sm font-semibold text-white">집중방 생성하기</button>
              </div>
              <p className="mt-3 text-xs leading-5 text-zinc-500">비밀번호는 선택사항이에요. 비밀방으로 쓰고 싶을 때만 설정해 주세요.</p>
            </div>

            <div className="rounded-[28px] border border-zinc-100 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-semibold">내 닉네임</h2>
              <input value={nickname} onChange={(e) => setNickname(e.target.value)} placeholder="닉네임 입력" className="mt-4 w-full rounded-2xl border border-zinc-200 px-4 py-3 outline-none" />
              <p className="mt-2 text-xs leading-5 text-zinc-500">전화번호 없이 이 이름으로만 보입니다.</p>
            </div>

            {session?.user && (
              <div className="rounded-[28px] border border-zinc-100 bg-white p-5 shadow-sm">
                <h2 className="text-lg font-semibold">내 저장 기록</h2>
                <div className="mt-4 space-y-3">
                  {savedRecords.length === 0 ? (
                    <p className="rounded-2xl border border-dashed border-zinc-200 bg-zinc-50 px-4 py-4 text-sm text-zinc-500">아직 저장된 기록이 없어요.</p>
                  ) : savedRecords.slice(0, 3).map((record) => (
                    <div key={record.id} className="rounded-2xl border border-zinc-100 bg-zinc-50 px-4 py-4">
                      <p className="text-sm font-semibold text-zinc-900">{record.roomTitle}</p>
                      <p className="mt-1 text-xs text-zinc-500">{formatStamp(record.updatedAt)}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="space-y-6">
            <div className="rounded-[28px] border border-zinc-100 bg-white p-5 shadow-sm md:p-6">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-lg font-semibold">집중방 리스트</h2>
                <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs text-zinc-600">{visibleRooms.length}개</span>
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {visibleRooms.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-zinc-200 bg-zinc-50 px-4 py-6 text-sm text-zinc-500">아직 열린 집중방이 없어요.</div>
                ) : visibleRooms.map((room) => {
                  const participantCount = new Set((room.participants || []).map((item) => item.nickname)).size;
                  const isJoined = Boolean(joinState[room.id]);
                  return (
                    <div key={room.id} className={`rounded-2xl border px-4 py-4 ${activeRoom?.id === room.id ? 'border-violet-300 bg-violet-50' : 'border-zinc-200 bg-white'}`}>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-semibold text-zinc-900">{room.title}</p>
                            <span className={`rounded-full px-2 py-0.5 text-[11px] ${room.password ? 'bg-zinc-900 text-white' : 'bg-emerald-50 text-emerald-700'}`}>{room.password ? '비밀번호' : '공개'}</span>
                          </div>
                          <p className="mt-2 text-xs leading-5 text-zinc-500">{room.agenda || '아젠다 없음'}</p>
                          <p className="mt-2 text-[11px] text-zinc-400">{participantCount}명 참여 · {formatStamp(room.createdAt)}</p>
                        </div>
                      </div>

                      {room.password && !isJoined && (
                        <input
                          value={activeRoomId === room.id ? joinPassword : ''}
                          onChange={(e) => {
                            setActiveRoomId(room.id);
                            setJoinPassword(e.target.value);
                          }}
                          placeholder="비밀번호 입력"
                          className="mt-3 w-full rounded-2xl border border-zinc-200 px-4 py-3 text-sm outline-none"
                        />
                      )}

                      <button
                        onClick={() => {
                          setActiveRoomId(room.id);
                          if (room.password && !isJoined) {
                            tryJoinRoom(room);
                          } else {
                            setJoinState((prev) => ({ ...prev, [room.id]: true }));
                            touchParticipant(room.id);
                          }
                        }}
                        className="mt-3 w-full rounded-2xl bg-zinc-950 px-4 py-3 text-sm font-semibold text-white"
                      >
                        {isJoined ? '다시 들어가기' : room.password ? '비밀번호로 입장' : '바로 입장'}
                      </button>
                    </div>
                  );
                })}
              </div>
              {joinError && <p className="mt-3 text-sm text-rose-600">{joinError}</p>}
            </div>

            <div className="rounded-[28px] border border-zinc-100 bg-white p-5 shadow-sm md:p-6">
              {activeRoom && joinedRoom ? (
                <>
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <p className="text-sm font-medium text-violet-700">현재 집중방</p>
                      <h2 className="mt-1 text-2xl font-semibold tracking-tight">{activeRoom.title}</h2>
                      <p className="mt-2 text-sm leading-6 text-zinc-500">{activeRoom.description || '설명 없음'}</p>
                    </div>
                    <div className="rounded-2xl bg-violet-50 px-4 py-3 text-sm text-violet-700 ring-1 ring-violet-100">
                      같이 들어와서 각자 집중하고, 필요할 때만 대화하세요.
                    </div>
                  </div>

                  <div className="mt-5 grid gap-4 md:grid-cols-[1.1fr_0.9fr]">
                    <div className="rounded-[24px] border border-zinc-100 bg-zinc-50 p-4">
                      <p className="text-sm font-semibold text-zinc-900">아젠다</p>
                      <textarea
                        value={activeRoom.agenda || ''}
                        onChange={(e) => updateRoom(activeRoom.id, (room) => ({ ...room, agenda: e.target.value }))}
                        rows={4}
                        className="mt-3 w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm outline-none"
                      />
                    </div>
                    <div className="rounded-[24px] border border-zinc-100 bg-zinc-50 p-4">
                      <p className="text-sm font-semibold text-zinc-900">참여 중</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {(activeRoom.participants || []).length === 0 ? (
                          <p className="text-sm text-zinc-500">아직 참여자가 없어요.</p>
                        ) : [...new Map((activeRoom.participants || []).map((item) => [item.nickname, item])).values()].map((item) => (
                          <span key={item.userKey} className="rounded-full bg-white px-3 py-2 text-xs font-medium text-zinc-700 ring-1 ring-zinc-200">{item.nickname}</span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 rounded-[24px] border border-amber-100 bg-amber-50 px-4 py-4 text-sm leading-6 text-amber-800">
                    이 집중방의 채팅은 24시간 후 자동으로 삭제됩니다. 필요한 내용은 개인적으로 저장해 주세요.
                  </div>

                  <div className="mt-5 rounded-[24px] border border-zinc-100 bg-zinc-50 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-zinc-900">채팅</p>
                      <span className="text-xs text-zinc-400">24시간 내 대화만 표시</span>
                    </div>
                    <div className="mt-3 max-h-[320px] space-y-3 overflow-auto pr-1">
                      {(activeRoom.messages || []).length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-zinc-200 bg-white px-4 py-6 text-sm text-zinc-500">아직 대화가 없어요. 필요한 말만 짧게 남겨보세요.</div>
                      ) : activeRoom.messages.map((message) => (
                        <div key={message.id} className="rounded-2xl bg-white px-4 py-3 ring-1 ring-zinc-100">
                          <div className="flex items-center justify-between gap-3">
                            <p className="text-sm font-semibold text-zinc-900">{message.nickname}</p>
                            <span className="text-[11px] text-zinc-400">{formatStamp(message.createdAt)}</span>
                          </div>
                          <p className="mt-2 text-sm leading-6 text-zinc-600">{message.text}</p>
                        </div>
                      ))}
                    </div>
                    <div className="mt-4 flex flex-col gap-3 md:flex-row">
                      <input value={draftMessage} onChange={(e) => setDraftMessage(e.target.value)} placeholder="필요한 말만 짧게 남겨보세요" className="min-w-0 flex-1 rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm outline-none" />
                      <button onClick={sendMessage} className="rounded-2xl bg-zinc-950 px-5 py-3 text-sm font-semibold text-white">보내기</button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="rounded-[24px] border border-dashed border-zinc-200 bg-zinc-50 px-4 py-12 text-center text-sm text-zinc-500">
                  집중방을 만들거나 리스트에서 골라 입장해 주세요.
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
