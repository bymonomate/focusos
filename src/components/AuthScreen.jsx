import React, { useState } from 'react';

export default function AuthScreen({ supabaseClient, lang = 'ko', setLang = () => {}, t = (value) => value }) {
  const [mode, setMode] = useState('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!supabaseClient) {
      setMessage(t('인증 시스템을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.'));
      return;
    }
    if (!email || !password) {
      setMessage(t('이메일과 비밀번호를 입력해 주세요.'));
      return;
    }

    setLoading(true);
    setMessage('');

    if (mode === 'signup') {
      const { error } = await supabaseClient.auth.signUp({ email, password });
      if (error) {
        setMessage(error.message);
      } else {
        setMessage(t('회원가입이 완료됐어요. 이메일 인증 후 로그인해 주세요.'));
      }
    } else {
      const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
      if (error) {
        setMessage(error.message);
      }
    }

    setLoading(false);
  };

  const submitOAuth = async () => {
    if (!supabaseClient) {
      setMessage(t('인증 시스템을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.'));
      return;
    }

    setLoading(true);
    setMessage('');

    const { error } = await supabaseClient.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: typeof window !== 'undefined' ? window.location.origin : undefined,
      },
    });

    if (error) {
      setMessage(error.message);
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#f4f0ff_0%,#fffdf8_48%,#ffffff_100%)] px-4 py-8 text-zinc-900">
      <div className="mx-auto max-w-4xl">
        <div className="rounded-[32px] border border-zinc-100 bg-white p-6 shadow-sm sm:p-8 md:p-12">
          <div className="mb-6 flex justify-end gap-2">
            <button onClick={() => setLang('ko')} className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${lang === 'ko' ? 'bg-zinc-950 text-white' : 'bg-zinc-100 text-zinc-600'}`}>KO</button>
            <button onClick={() => setLang('en')} className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${lang === 'en' ? 'bg-zinc-950 text-white' : 'bg-zinc-100 text-zinc-600'}`}>EN</button>
          </div>
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-violet-600">FocusOS</p>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight sm:text-5xl">{t('지금 바로 시작하기')}</h1>

          <div className="mt-8 grid grid-cols-2 gap-2 rounded-[28px] bg-zinc-100 p-2">
            <button
              onClick={() => setMode('signin')}
              className={`rounded-[24px] px-4 py-4 text-base font-semibold transition ${mode === 'signin' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500'}`}
            >
              {t('로그인')}
            </button>
            <button
              onClick={() => setMode('signup')}
              className={`rounded-[24px] px-4 py-4 text-base font-semibold transition ${mode === 'signup' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500'}`}
            >
              {t('회원가입')}
            </button>
          </div>

          <div className="mt-8 space-y-4">
            <input
              type="email"
              placeholder={t("이메일")}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-[24px] border border-zinc-200 px-5 py-4 text-lg outline-none transition focus:border-violet-300"
            />
            <input
              type="password"
              placeholder={t("비밀번호")}
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
            {loading ? t('처리 중...') : mode === 'signup' ? t('회원가입하기') : t('로그인하기')}
          </button>

          <div className="mt-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-zinc-200" />
            <span className="text-sm text-zinc-400">{t('간편 로그인')}</span>
            <div className="h-px flex-1 bg-zinc-200" />
          </div>

          <div className="mt-6">
            <button
              onClick={submitOAuth}
              disabled={loading}
              className="w-full rounded-[22px] border border-zinc-200 bg-white px-4 py-4 text-base font-semibold text-zinc-800 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {t('구글로 계속하기')}
            </button>
          </div>

          {message ? (
            <div className="mt-5 rounded-[24px] bg-zinc-50 px-5 py-4 text-base text-zinc-600">
              {message}
            </div>
          ) : null}

          <div className="mt-8 rounded-[28px] bg-violet-50 p-5">
            <p className="text-lg font-semibold text-violet-700">{t('')}</p>
            <p className="mt-3 text-lg leading-9 text-zinc-600">
              {t('가입 후 바로 앱을 사용할 수 있고, Focus OS 흐름이 나에게 맞는지 먼저 확인할 수 있어요.')}
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}

