import { useEffect, useMemo, useRef, useState } from 'react';
import AuthScreen from './components/AuthScreen';
import FocusLivePage from './components/FocusLivePage';
import TaskCard from './components/TaskCard';
import { InlineIcon } from './components/icons';

const STORAGE_KEYS = {
  tasks: 'focus-os-tasks',
  focusMinutes: 'focus-os-focus-minutes',
  lang: 'focus-os-lang',
  anonymousName: 'focus-os-anonymous-name',
  nickname: 'focus-os-nickname',
  profile: 'focus-os-profile',
  liveComments: 'focus-os-live-comments',
  liveJoinedSession: 'focus-os-live-joined-session',
  seededTasksPrefix: 'focus-os-seeded-tasks-',
  taskRolloverPrefix: 'focus-os-task-rollover-',
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

const EN_TEXT = {
  '지금 바로 시작하기': 'Start Now',
  '로그인': 'Log In',
  '회원가입': 'Sign Up',
  '이메일': 'Email',
  '비밀번호': 'Password',
  '로그인하기': 'Log In',
  '회원가입하기': 'Sign Up',
  '간편 로그인': 'Quick sign-in',
  '구글로 계속하기': 'Continue with Google',
  '처리 중...': 'Processing...',
  '인증 시스템을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.': 'Authentication is unavailable right now. Please try again shortly.',
  '이메일과 비밀번호를 입력해 주세요.': 'Please enter your email and password.',
  '회원가입이 완료됐어요. 이메일 인증 후 로그인해 주세요.': 'Your account was created. Please verify your email and sign in.',
  '작게 시작하고, 한 번에 하나씩 끝내기': 'Start small and finish one thing at a time',
  '설정': 'Settings',
  '로그아웃': 'Log out',
  '계정 및 앱 설정': 'Account & App Settings',
  '로그아웃, 데이터 초기화, 계정 삭제를 여기서 관리할 수 있어요.': 'Manage sign out, data reset, and account deletion here.',
  '닫기': 'Close',
  '현재 기기에서 로그인 상태만 해제해요.': 'Sign out only on this device.',
  '앱 데이터 초기화': 'Reset App Data',
  '오늘 할 일, 나중에 할 일, 진행 기록을 모두 비워요.': 'Clear your tasks and progress history.',
  '데이터 초기화': 'Reset Data',
  '계정 삭제': 'Delete Account',
  '관리자 확인 후 삭제돼요.': 'Deleted after review.',
  '삭제 요청': 'Request Deletion',
  '삭제 요청이 접수됐어요.': 'Your deletion request was received.',
  '삭제 요청 처리 중 문제가 생겼어요.': 'Something went wrong while sending your deletion request.',
  '로그인이 필요해요.': 'Please sign in first.',
  '데이터 초기화 중 문제가 생겼어요. 잠시 후 다시 시도해 주세요.': 'Something went wrong while resetting your data. Please try again later.',
  '앱 데이터가 초기화됐어요.': 'Your app data was reset.',
  '지금까지 저장된 할 일과 진행 기록을 모두 비울까요? 이 작업은 되돌릴 수 없어요.': 'Clear all saved tasks and progress? This cannot be undone.',
  '오늘의 리포트': "Today's Report",
  '지금 시작하기': 'Start Now',
  '5분만 시작': 'Start with 5 min',
  '하루 리포트': 'Daily Report',
  '보기': 'View',
  '하루 종료 리포트': 'End-of-Day Report',
  '오늘 남은 일': 'Remaining Today',
  '현재 집중': 'Current Focus',
  '없음': 'None',
  '한 번에 하나씩': 'One thing at a time',
  '타이머': 'Timer',
  '지금 집중 흐름': 'Current timer',
  'Focus Mode': 'Focus Mode',
  '포커스 타이머': 'Focus Timer',
  '일시정지': 'Pause',
  '타이머 시작': 'Start Timer',
  'Focus Mode 종료': 'Exit Focus Mode',
  '오늘 할 일': 'Today',
  '나중에 할 일': 'Later',
  '완료 목록': 'Completed',
  '복원': 'Restore',
  '우선순위 자동정리': 'Auto-prioritize',
  '오늘 할 일 추가': 'Add Today Task',
  '나중에 할 일 추가': 'Add Later Task',
  '오늘 할 일이 비어 있어요. 가장 먼저 시작할 한 가지만 넣어보세요.': 'Your Today list is empty. Add just one thing to begin.',
  '지금 당장 안 해도 되는 일을 여기에 보관해두면 Today가 훨씬 가벼워져요.': 'Keep non-urgent work here so your Today list stays light.',
  '오늘 끝낸 일': 'Completed today',
  '시도한 일': 'Started tasks',
  '진행률': 'Progress',
  '전체 흐름': 'Daily Flow',
  '집중 점수': 'Focus Score',
  '과하게 늘리지 않고 5개 이내 유지': 'Keep today within five tasks',
  '지금 한 가지에만 집중하기': 'Focus on one task',
  '지금은 이 카드 하나만 보고 끝내면 돼요.': 'Just focus on this one card for now.',
  '선택된 작업이 없어요. 오늘 할 일 카드에서 시작 또는 집중 시작을 눌러 작업을 고르거나, Focus Mode 종료로 원래 화면으로 돌아가세요.': 'No task selected. Start a task from Today or leave Focus Mode to go back.',
  '시작 시간': 'Started at',
  '종료 시간': 'Finished at',
  '타이머 시작과 종료에 알림음이 들어가고, 진행 중 작업은 하나만 유지돼.': 'Notifications at start and end. Only one active task at a time.',
  '리셋': 'Reset',
  '운영 원칙': 'Operating Principles',
  '오늘 보이는 일이 많아지면 시작 장벽이 커져서 수를 제한해요.': 'Limiting visible tasks lowers the barrier to start.',
  '지금 안 해도 되는 일은 빼두고, 필요할 때만 Today로 옮겨요.': 'Move non-urgent work here and bring it back when needed.',
  '작업 분해': 'Task Breakdown',
  '큰 일을 5분 안에 시작 가능한 단계로 잘게 나눠요.': 'Break big work into steps you can start within 5 minutes.',
  '현재 진행 중인 작업이 없어요. 오늘 할 일에서 시작 버튼을 누르거나 5분만 시작으로 첫 작업을 시작해 보세요.': 'No active task yet. Start one from Today or use Start with 5 min.',
  '오늘의 정리': "Today's Summary",
  '남은 일': 'Remaining',
  '오늘 한마디': "Today's note",
  '작은 완료 하나가 흐름을 만듭니다.': 'One small completion creates momentum.',
  '완료! 잘했어요 ✨': 'Done! Nice work ✨',
  '↑ 위로': '↑ Top',
  '드래그 정렬': 'Drag to sort',
  '카드를 길게 잡고 위치를 바꿀 수 있어요': 'Drag cards to reorder them',
  '가장 중요': 'Top Priority',
  '중요': 'Important',
  '가벼운 일': 'Light',
  '대기': 'Idle',
  '진행 중': 'In Progress',
  '완료': 'Done',
  '시작': 'Start',
  '종료': 'Finish',
  '멈춤': 'Pause',
  '초기화': 'Reset',
  '나중': 'Later',
  '오늘': 'Today',
  '집중': 'Focus',
  '추천': 'Suggest',
  '분해': 'Break down',
  '삭제': 'Delete',
  '새 할 일': 'New task',
  '첫 단계 적기': 'Write the first step',
  '기획안 첫 문단 쓰기': 'Write the first paragraph of the proposal',
  '완벽하게 쓰기보다 첫 문장부터 시작하기': 'Start with the first sentence instead of making it perfect',
  '핵심 문장 한 줄 적기': 'Write one key sentence',
  '첫 문단 3줄 채우기': 'Fill three lines of the first paragraph',
  '초안 저장하기': 'Save the draft',
  '세금계산서 확인': 'Check the tax invoice',
  '확인만 먼저 하고 수정은 따로 분리하기': 'Review first and handle edits separately',
  '메일 열기': 'Open the email',
  '첨부파일 확인': 'Check the attachment',
  '이상 유무 체크': 'Check for issues',
  '메일 답장 1개 보내기': 'Send one email reply',
  '짧게 답할 수 있는 것부터 처리하기': 'Start with the easiest reply',
  '받는 사람 확인': 'Check the recipient',
  '핵심 두 줄 쓰기': 'Write the core message in two lines',
  'AI 작업분해는 할 일 제목과 메모를 보고 바로 시작 가능한 3단계 정도로 자동 추천해줘요.': 'AI suggests three actionable starter steps from your task title and note.',
  '작업 단계': 'Steps',
  '단계 추가': 'Add Step',
  '단계 완료': 'Complete step',
  '단계 완료 취소': 'Undo step completion',
  '단계 삭제': 'Delete step',
  '새 단계': 'New step',
  '오늘 할 일은 5개까지만 유지하는 게 좋아요.': 'It works best to keep Today under 5 tasks.',
  '새 카드가 아래에 생성됐어요.': 'A new card was added below.',
  '집중 시작. 한 가지 일만 보면 돼요.': 'Focus started. One thing at a time.',
  '완료 목록으로 이동했어요.': 'Moved to Completed.',
  '작업을 잠깐 멈췄어요. 다시 이어서 할 수 있어요.': 'Task paused. You can continue anytime.',
  '작업을 초기화했어요. 처음부터 다시 시작할 수 있어요.': 'Task reset. You can start again from scratch.',
  '오늘 할 일로 복원했어요.': 'Restored to Today.',
  '추천 우선순위를 적용했어요.': 'Suggested priority applied.',
  '현재 카드 기준으로 우선순위를 다시 정리했어요.': 'Priorities were re-ranked based on your current cards.',
  '카드 순서를 바꿨어요.': 'Card order updated.',
  '작업을 더 작은 단계로 나눴어요.': 'The task was broken into smaller steps.',
  '먼저 오늘 할 일을 추가해 주세요.': 'Add a task to Today first.',
  '5분 타이머를 시작했어요.': 'Started the 5-minute timer.',
  '집중 시간이 끝났어요. 체크하고 잠깐 쉬어요.': 'Focus time is up. Mark it and take a short break.',
  '오늘 흐름 정말 좋음': 'Your flow is really good today.',
  '집중 유지 잘하고 있어요': 'You are maintaining focus well.',
  '좋아요, 계속 작은 완료를 쌓아요': 'Good progress. Keep stacking small wins.',
  '한 단계만 해도 충분해요': 'One small step is enough.',
  'FocusOS LIVE': 'FocusOS LIVE',
  '지금 함께 집중 중인 사람들': 'People focusing together right now',
  '혼자보다 같이 시작하는 게 더 쉬울 때가 있어요.': 'Sometimes it is easier to start together.',
  '아직 집중 중인 사람이 없어요. 먼저 시작해볼까요?': 'No one is focusing yet. Want to start first?',
  '나도 집중 시작하기': 'Start Focus',
  '명 집중 중': 'focusing now',
  '남음': 'left',
  '실시간 집중 보드': 'Live focus board',
  '라이브 참여하기': 'Join Live',
  '지금 함께 집중 중입니다': 'People are focusing together right now',
  '앱으로 돌아가기': 'Back to app',
  '내가 참여 중입니다': 'You are currently in LIVE',
  '라이브 나가기': 'Leave LIVE',
  '응원 한마디': 'Send a quick message',
  '댓글 남기기': 'Leave a comment',
  '메시지를 입력해 주세요.': 'Please enter a message.',
  '라이브 참여가 시작됐어요.': 'You joined LIVE.',
  '라이브에서 나갔어요.': 'You left LIVE.',
  '응원 메시지가 등록됐어요.': 'Your message was posted.',
  '댓글이 아직 없어요. 먼저 남겨보세요.': 'No messages yet. Be the first to post.',
  '같이 집중해요': "Let's focus together",
  '집중 세션': 'Focus session',
  '지금 참여 중인 사람들': 'People currently in LIVE',
  '라이브 집중방': 'LIVE Focus Room',
  '메시지 입력': 'Write a message',
  '보내기': 'Send',
  '참여 중': 'In LIVE',
  '구경 중': 'Viewing',
};

function tr(lang, value) {
  return lang === 'en' && EN_TEXT[value] ? EN_TEXT[value] : value;
}

const SVG_ICONS = {
  'start': { viewBox: "0 0 72.42 87.95", inner: "<g id=\"Layer_1-2\" data-name=\"Layer 1\">\n    <path d=\"M68.99,50.92L14.71,86.09c-2.47,1.6-5.75,2.27-8.16,1.6-2.17-.61-6.44-3.61-6.45-6.46L0,8.26C0,5.16,2.51,1.96,4.52.95,7.58-.59,11.64-.2,14.54,1.68l54.02,35.09c1.97,1.28,3.65,4.34,3.84,6.12.21,2.02-.9,6.41-3.4,8.03ZM64.04,47.8c1.46-.94,2.66-2.1,2.81-2.98s-.73-3.37-1.58-3.92L11.65,6.01c-.94-.61-3.72-.72-4.67-.41s-1.97,2.36-1.97,3.78v69.4c0,1.53,1.87,3.92,2.89,3.97.85.04,2.68-.36,3.55-.92l52.58-34.04Z\"/>\n  </g>" },
  'focus': { viewBox: "0 0 91.1 88.92", inner: "<g id=\"Layer_1-2\" data-name=\"Layer 1\">\n    <g>\n      <path d=\"M87.53,44.36c-10.77,15.96-29.11,25.11-48.27,22.57-14.59-1.94-26.78-10.08-35.65-22.09,10.78-15.68,28.56-24.85,47.55-22.94,14.58,2.29,26.71,10.06,36.37,22.46ZM43.16,28.83c-9.39,1.4-14.91,10.1-13.57,18.46s9.6,14.15,17.89,13.15c9.02-1.08,14.79-8.95,13.79-17.9-.92-8.29-8.62-15.12-18.11-13.71ZM30.43,59.76c-7.98-9.55-8.11-21.08-.25-29.72-8.28,2.87-14.48,8.2-20.29,14.78,6.12,6.85,12.61,11.13,20.54,14.94ZM80.99,44.45c-6.13-6.75-11.9-11.22-19.54-14.01,6.61,9.03,6.79,19.23.11,28.18,8.04-2.4,14.31-7.81,19.44-14.17Z\"/>\n      <path d=\"M86.33,88.92l-15.05-.1c-1.1,0-3.03-1.44-3.14-2.38s1.99-2.74,3.06-2.73l14.89.07-.16-14.85c-.01-1.11,1.58-3.15,2.55-3.07s2.51,1.97,2.51,3.07l.02,15.28c0,2.29-2.41,4.72-4.68,4.7Z\"/>\n      <path d=\"M19.97,83.85c.88,0,2.7,1.11,3.17,1.73.59.77-1.21,3.24-2.23,3.24H4.4c-1.79,0-4.26-2.84-4.27-4.5l-.08-15.2c0-.94,1.07-2.59,1.68-3.15s3.41.87,3.42,1.7l.11,16.05,14.71.13Z\"/>\n      <path d=\"M5.64,5.75l-.81,16.52c-.06,1.23-4.63.97-4.65-.56L0,6.22C-.05,1.47,3.49.29,7.24.38l12.94.28c.75.02,2.38,1.26,2.76,1.9.47.8-1.49,3.09-2.59,3.1l-14.73.09Z\"/>\n      <path d=\"M91.03,20.79c0,.98-1.53,2.86-2.36,2.87s-2.48-1.56-2.51-2.67l-.49-15.14-14.59-.28c-1.05-.02-2.99-1.93-2.83-2.86s1.89-2.25,2.84-2.24l14.06.19c3.88.05,5.97,2.74,5.95,6.35l-.07,13.79Z\"/>\n      <path d=\"M48.12,11.76c.02.84-.88,2.95-1.21,3.58-.41.78-3.48.16-3.53-.71l-.57-11.38c-.04-.81,1.28-2.67,1.86-3.15.72-.6,3.15,1.37,3.18,2.31l.27,9.34Z\"/>\n      <path d=\"M48.04,85.94c.01,1-1.51,3.04-2.39,2.96s-2.68-1.92-2.67-2.87l.04-9.78c0-.86,1.78-2.65,2.57-2.52s2.29,1.62,2.3,2.49l.14,9.73Z\"/>\n      <path d=\"M38.7,41.11c4.47,2.9,1.04,6.85,6.01,7.86,2.56.52,4.72-1.24,5.17-3.61s-1.28-4.61-3.55-5.35c-1.39-.45-2.13-.67-2.61-.99-.63-.43-.61-2.48-.12-3.07s2.44-.79,3.3-.7c6.07.69,9.26,5.87,8.14,11.05s-6.13,8.63-11.33,7.83-8.83-7.32-7.51-11.35c.25-.75,2.02-1.98,2.49-1.68Z\"/>\n    </g>\n  </g>" },
  'pause': { viewBox: "0 0 69.87 88.12", inner: "<g id=\"Layer_1-2\" data-name=\"Layer 1\">\n    <g>\n      <path d=\"M63.81,88.12l-13.3-.16c-4.53-.05-8.36-3.72-8.37-8.65l-.07-69.93c0-5,3.33-9.1,8.48-9.16l10.1-.12c5.31-.06,9.22,3.96,9.22,9.29l-.04,68.97c0,4.29-2.13,7.81-6.02,9.74ZM61.38,82.99c1.22,0,3.37-2.26,3.37-3.58l-.2-73.4c-5.57-.61-8.84-.78-14.27-.83-1.87-.02-3.02,3.39-3.01,5.35l.09,68.88c0,2,2.44,3.6,4,3.59l10.04-.02Z\"/>\n      <path d=\"M19.31,88.06l-10.36.06c-4.82.03-8.31-3.27-8.94-8.16V8.85C0,3.4,4.47.07,9.5.04L17.65,0c5.67-.03,10.2,3.35,10.19,9.46l-.04,69.75c0,5.04-3.96,8.82-8.49,8.85ZM19.1,83.01c1.32,0,3.44-2.46,3.44-3.72l-.06-73.12c-6.45-1.47-11.01-1.41-17.25.35l-.23,71.87c0,1.81,1.95,4.61,3.38,4.61h10.72Z\"/>\n    </g>\n  </g>" },
  'done': { viewBox: "0 0 91.04 91.08", inner: "<g id=\"Layer_1-2\" data-name=\"Layer 1\">\n    <g>\n      <path d=\"M40.43.31c25.77-2.94,47.49,15.69,50.32,40.08,2.85,24.62-15.28,47.36-39.3,50.34C26.26,93.84,3.96,76.28.48,52.03S14.16,3.3,40.43.31ZM6.47,55.49c6.88,24.81,33.4,36.77,55.71,26.57,22.42-10.25,30.71-38.22,16.72-59.04C65.43,2.95,36.71-1.16,18.38,15.86,7.54,25.92,2.32,40.51,6.47,55.49Z\"/>\n      <path d=\"M36.22,62.79l-15.08-15.48c-.59-.61-.86-2.94-.38-3.51.6-.71,3.16-.79,3.85-.11l13.78,13.67,27.28-28.36c.7-.73,3.2-1.28,3.86-.62.84.84.8,3.13-.21,4.2l-28.35,30.01c-.75.8-3.79,1.2-4.76.21Z\"/>\n    </g>\n  </g>" },
  'reset': { viewBox: "0 0 91.2 90.95", inner: "<g id=\"Layer_1-2\" data-name=\"Layer 1\">\n    <g>\n      <path d=\"M12.71,22.31c7.14,1.63,16.22-2.6,17.48,2.28.27,1.06-2.17,3.04-3.32,3.04l-22.93.09-.29-23.01c-.01-.97,1.19-2.86,1.92-3.31s3.07.97,3.1,1.84l.5,15.3C22.33-.29,48.46-5.37,68.23,6.04s28.51,36.2,19.19,57.37-33.22,32.84-55.92,25.16C2.73,78.84-3.43,46.68,1.57,42.91c.75-.56,3.31,1.23,3.36,2.28.82,19.14,14.25,36.31,33.74,39.76,13.98,2.48,27.81-2.4,36.96-12.93s12.86-24.68,8.37-38.24c-4.91-14.84-16.96-25.63-32.17-28.06s-29.68,3.79-39.11,16.59Z\"/>\n      <path d=\"M44.05,37.09c5.31-1.2,9.1,2.5,9.96,6.57.93,4.4-2.38,8.61-6.03,9.68-4.66,1.37-8.9-2.02-9.97-5.42-1.54-4.89.85-9.66,6.04-10.83ZM44.46,42.3c-1.25.77-2.29,3.39-1.5,4.3,1.01,1.16,3.25,2.03,4.27,1.4,1.19-.74,1.92-3.32,1.41-4.41-.44-.94-3.26-1.85-4.18-1.29Z\"/>\n    </g>\n  </g>" },
  'split': { viewBox: "0 0 94.56 90.23", inner: "<g id=\"Layer_1-2\" data-name=\"Layer 1\">\n    <path d=\"M74.44,31.29l10.96-13.45c-17-.29-34.71,9.39-34.82,27.93l-.25,41.03c0,1.07-1.27,2.86-1.9,3.32-.79.58-3.24-1.4-3.25-2.62l-.28-42.4c-.12-17.89-18.54-28.09-34.85-27.09l10.81,12.51c.76.88.94,3.1.72,3.92C19.77,40.99,2.73,16.74,0,13.85,7.91,8.72,14.89,4.95,22.66.69c1.07-.58,3.23-.53,4.06.11s.06,3.65-.95,4.21l-13.81,7.6c15.87,1.47,28.54,5.66,35.78,20.88,7.82-14.88,18.57-18.82,35.8-20.96l-13.65-7.36c-.87-.47-1.8-2.42-1.74-3.29s2.86-2.23,3.65-1.8l21.07,11.6c.47.26,1.61,1.79,1.68,2.29.09.67-.36,2.14-1.03,2.91l-15.53,17.96c-.52.6-3.15.75-3.5.19-.47-.76-.62-3.03-.05-3.74Z\"/>\n  </g>" },
  'later': { viewBox: "0 0 91.22 91.01", inner: "<g id=\"Layer_1-2\" data-name=\"Layer 1\">\n    <g>\n      <path d=\"M63.77,22.48l14.76-.1C66.4,5.51,43.83.35,26.15,10.24,7.8,20.51.24,42.91,9.04,62.11s30.17,28.55,50.19,21.14c15.77-5.84,25.74-20.45,26.6-37.34.06-1.21,2.13-2.97,3.18-2.8,5.53.94.8,25.41-15.25,37.96-11.81,9.24-26.36,12.19-40.39,8.21C14.21,83.85,1.17,66.85.08,48.17-1.11,27.83,11.16,9.66,29.46,2.91c19.3-7.12,39.44-.81,52.78,15.15l.16-13.26c.01-1.24,1.6-3.4,2.67-3.38s2.6,2.11,2.58,3.19l-.44,23.22-22.68-.32c-.89-.01-2.79-1.35-3.26-2.08s1.6-2.94,2.5-2.95Z\"/>\n      <path d=\"M62.36,58.03c.67.67,1.06,3.09.71,3.93s-3.28.89-4.08.1l-16.08-15.65-.08-28.73c0-1.18,1.3-3.29,2.36-3.33s2.92,2.26,2.92,3.33l-.04,25.93,14.3,14.42Z\"/>\n    </g>\n  </g>" },
  'delete': { viewBox: "0 0 85.43 84.88", inner: "<g id=\"Layer_1-2\" data-name=\"Layer 1\">\n    <path d=\"M84.31,79.64c.98.99,1.44,3.47.9,4.28-.65.97-3.65,1.12-4.6.17l-37.7-37.59L5.25,83.9c-.76.76-3.14.97-3.93.98-.96.02-1.91-3.12-.86-4.18l38.16-38.31L.92,4.6C.26,3.94,0,1.9.18,1.02s3.58-1.47,4.86-.21c10.27,10.13,25.15,24.79,37.79,37.24L80.97.48c.8-.79,3.98-.55,4.29.33s.08,3.22-.7,4.01l-37.54,37.5,37.29,37.32Z\"/>\n  </g>" },
  'priority': { viewBox: "0 0 64.09 97.02", inner: "<g id=\"Layer_1-2\" data-name=\"Layer 1\">\n    <g>\n      <path d=\"M48.82,54.38c.01,1.54-2.13,3.53-3.72,3.51l-29.63-.27-.64-18.53-11.88.12c-.77,0-2.66-.85-2.88-1.56-.28-.89.41-3.01,1.09-3.76L32,0l30.86,33.93c.79.87,1.52,3.01,1.12,3.73s-2.23,1.49-3.1,1.5l-12.18.07.13,15.15ZM43.59,52.55l.21-17.97,11.87-.67L31.93,7.43l-23.52,26.35,11.61,1.02.32,17.81,23.26-.06Z\"/>\n      <path d=\"M43.51,96.92l-23.5.1c-1.26,0-4.12-.98-4.29-2l-.79-4.8c-.36-2.2.27-7.37,2.32-8.38l29.2-.07c1.92,1.79,2.68,6.01,2.34,8.46l-.68,4.83c-.14,1.02-3.13,1.86-4.59,1.86ZM43.07,91.9l.31-5.2-23,.08c-.49,1.31-.26,4.41.75,5.04l21.93.07Z\"/>\n      <path d=\"M46.8,77.05l-25.98.45c-1.38.02-4.25-.74-4.9-1.79-1.26-2.04-1.91-11.33,1.28-13.49l29.61-.03c3,3.78,2.75,10.53,0,14.85ZM43.74,72.1c.17-2.07-.12-5.07-1.12-5.18l-22,.09-.42,5.13,23.55-.04Z\"/>\n    </g>\n  </g>" },
  'add': { viewBox: "0 0 91.29 91.89", inner: "<g id=\"Layer_1-2\" data-name=\"Layer 1\">\n    <path d=\"M48.37,88.59c0,.88-1.29,2.79-2.02,3.21-.91.53-3.27-1.69-3.27-2.78l.12-40.47-40.3-.16c-1.06,0-2.76-1.61-2.91-2.5s1.8-2.74,2.74-2.74l40.43.08-.08-39.81c0-1.06.73-2.67,1.38-3.24.81-.72,3.92.85,3.92,2.03v40.87s40.38.2,40.38.2c.85,0,2.64,2.05,2.5,2.86-.18,1.01-2.04,2.23-3.31,2.23l-39.52.09-.08,40.14Z\"/>\n  </g>" },
  'add-step': { viewBox: "0 0 41 93.26", inner: "<g id=\"Layer_1-2\" data-name=\"Layer 1\">\n    <g>\n      <path d=\"M40.92,84.92c-.19,2.3-.47,8.28-3.48,8.29l-32.67.05c-5.73,0-5.39-11.13-3.06-14.6.84-1.26,3.99-1.92,5.72-1.93l10.48-.09-.06-12.37-14.16-.65c-3.9-.18-4.79-9.33-2.27-14.09.61-1.15,3.66-2.02,5.07-2.01l28.32.09c1.38,0,4.16.94,4.88,1.99,2.5,3.63,1.2,13.84-2.08,13.99l-14.49.64.04,12.41,11.53.29c4.4.11,6.68,2.71,6.24,7.99ZM35.47,58.83c.75-1.67.43-5.37-1.05-6.24l-29.05.04.02,6.25,30.08-.06ZM35.35,88.47c.72-2.03.62-5.7-.72-6.48H5.56s-.33,6.3-.33,6.3l30.11.17Z\"/>\n      <path d=\"M23.15,33.95c0,.96-2.1,3.2-2.89,2.79s-2.26-2.08-2.28-3.03l-.2-12.52-12.98-.18c-.99-.01-2.76-1.67-2.83-2.56-.09-1.11,2.19-2.64,3.53-2.64l12.31-.03.23-13.22c.01-.84,1.57-2.36,2.33-2.55.95-.23,2.7,1.93,2.71,3.06l.13,12.52,13.03.44c.78.03,2.31,1.09,2.82,1.48.69.53-1.18,3.37-2.14,3.4l-13.81.4.02,12.64Z\"/>\n    </g>\n  </g>" },
  'logout': { viewBox: "0 0 91.49 90.89", inner: "<g id=\"Layer_1-2\" data-name=\"Layer 1\">\n    <g>\n      <path d=\"M44.97,75.08l15.07-.19.46-22.27c.02-.86,1.62-2.45,2.41-2.48.99-.04,2.45,2.09,2.44,3.1l-.16,20.33c-.03,3.13-2.97,6.5-6.26,6.53l-13.91.12-.12,6.1c-.02.94-.59,2.66-1.08,3.34-.62.85-3.54,1.47-4.62,1.14L3.78,80.15c-2.3-.69-3.76-3.43-3.76-5.66L0,5.37C0,2.74,2.29,0,5.14,0l53.11.02c3.48,0,6.98,2.58,6.99,6.48v23.87c.02.85-1.7,2.63-2.52,2.58s-2.36-1.6-2.36-2.57l.02-22.02c0-1.82-2.36-3.54-4.07-3.51l-36.39.55,17.88,5.12c4.53,1.3,7.2,2.77,7.2,8.05l-.02,56.52ZM39.76,85.33l-.16-68.82L4.94,6.03l-.17,68.98,34.99,10.32Z\"/>\n      <path d=\"M81.24,44.25l-29.02-.23c-1.1,0-2.65-2.22-2.27-3.02s2.1-1.95,3.04-1.96l28.24-.17-7.53-8.08c-.72-.77-1.23-3.06-.81-4,2.14-4.83,15.59,11.74,18.6,14.7-2.11,2.44-17.92,20.94-18.88,14.74-.11-.73.06-2.34.58-2.93l8.04-9.05Z\"/>\n    </g>\n  </g>" },
  'focus-exit': { viewBox: "0 0 92.04 94.17", inner: "<g id=\"Layer_1-2\" data-name=\"Layer 1\">\n    <g>\n      <path d=\"M62.91,76.67l.38-23.29c.02-1.03,1.76-2.63,2.45-2.81s2.47,1.72,2.46,2.68l-.16,22.82c-.03,3.95-4.53,5.61-7.62,5.64l-13.52.13-.23,8.53c-.02.89-1.07,2.98-1.69,3.41-.77.54-2.63.48-3.82.1l-36.39-11.75C2.18,81.28,0,78.56,0,75.51V6.48C0,3.64,2.27.19,5.26.18L60.33,0c1.71,0,4.89.97,5.88,2.01,1.13,1.18,2.04,4.34,2.03,6.47l-.14,22.91c0,.89-1.35,2.23-2.1,2.29s-2.73-1.69-2.74-2.56l-.23-25.66-39.94-.3c-.7,0-2.01-.48-2.42-.62s-.27,1.14-.45,1.54,1.71.09,2.14.22l24.33,7.6.21,62.79h16.02ZM41.65,88.42l-.03-70.76L5.15,5.9l.04,70.93,36.46,11.58Z\"/>\n      <path d=\"M73.83,54.7l8.88-9.86-27.66-.2c-1.16,0-3.48-1.5-3.3-2.53s2.37-2.65,3.48-2.65l27.63-.1-8.03-8.4c-.69-.72-.51-3.4.31-3.86s3.04-.12,3.81.64l12.71,12.46c1.2,1.18-.72,4.64-1.93,5.82l-10.86,10.69c-.47.46-2.59.96-3.19,1.07s-1.5-1.99-1.86-3.09Z\"/>\n      <path d=\"M13.28,54.14c.33,1.93,3.24-.72,6.57,2.12.64.54-.98,3.18-1.85,3.18-2.06.01-6.49-.29-9.17-.65-.33-3.29-.34-7.91-.12-10.58.33-.42,2.53-.78,2.82-.25.38.7,1.12,2.51,1.26,3.31l.48,2.86Z\"/>\n      <path d=\"M17.09,33.49l-4.01.18c-.73.03.16,2.2,0,2.92l-.74,3.24c-.17.74-3.32.64-3.44-.1-.36-2.25-.45-7.04-.15-9.76,3.83-2.14,13.55-.35,11.26,1.85-.49.47-2.26,1.64-2.92,1.67Z\"/>\n      <path d=\"M37.24,58.37c-1.42,2.03-7.76,1.39-9.89.12-.48-.29-1.11-2.19-.59-2.38.71-.26,2.65-.89,3.4-.97l3.07-.33c.76-.08.37-2.3.58-3.17l.74-3.17c.16-.68,1.19-.44,3.01-.35.6,2.72,1.6,7.48-.33,10.25Z\"/>\n      <path d=\"M38.22,39.08c.04.69-2.11,2.3-2.65,1.87-.72-.57-1.87-2.34-1.88-3.26v-3.5c-.02-.81-2.24-.5-3.31-.74l-2.83-.63c-.63-.14-.5-3.1.12-3.28,2.25-.67,7.36-.59,10.03.48l.52,9.07Z\"/>\n    </g>\n  </g>" },
  'quick-start': { viewBox: "0 0 111.33 91.98", inner: "<g id=\"Layer_1-2\" data-name=\"Layer 1\">\n    <g>\n      <path d=\"M17.44,89.61c-1.18,1.55-2.57,2.39-3.48,2.38s-2.21-2.8-1.97-3.69l8.81-32.28-17.18-.15c-.91,0-2.72-.76-3.35-1.31s-.07-2.94.6-3.82L38.24,1.47c.4-.52,1.96-1.24,2.47-1.44.68-.27,2.46,1.67,2.15,2.91l-8.2,33.43,18.17.24c.62,0,2.22.83,2.42,1.38s-.18,2.11-.78,2.9l-37.02,48.71ZM20.52,77.28l26.74-35.51-19.09-.58,5.98-25.87L7.65,50.47l19.74.74-6.86,26.06Z\"/>\n      <path d=\"M108.6,51.23l-36.3,23.43c-1.74,1.12-5.17,1.44-6.7.76-1.89-.84-4.06-3.93-4.06-6.23l.1-46.03c0-2.37,1.74-5.64,3.6-6.46,1.97-.87,5.34-.1,7.37,1.19l35.48,22.59c1.27.81,2.87,3.25,3.18,4.56.35,1.51-.87,5.01-2.67,6.17ZM106.86,46.16l-39.94-25.63.31,50.9,39.63-25.27Z\"/>\n    </g>\n  </g>" },
  'timer': { viewBox: "0 0 81.18 98.6", inner: "<g id=\"Layer_1-2\" data-name=\"Layer 1\">\n    <g>\n      <path d=\"M70.5,17.43l10.68,10.89c-.23,1.19-1.53,3.25-2.52,3.52s-2.66-1.28-4.22-2.7c-1.25-1.13-4.56,2.12-4.4,4.17,15.51,18.65,11.14,46-8.68,58.87-19.91,12.94-46.55,5.72-57.35-16.26-5.68-11.55-5.49-25.08,1.64-37.08,5.58-9.4,16.3-17.64,29.1-19.19,1.36-.16,2.62-1.2,2.76-2.37.51-4.36-9.05,1.24-11.48-7.51-.75-2.7.41-8.32,4.7-8.89,7.69-1.03,24.26-3.1,23.34,7.3-.81,9.14-11.31,6.11-11.22,7.35l.28,3.71c7.98.85,15.33,3.68,21.76,9.44l4.94-4.08-2.68-3.56c-.49-.65-.62-2.62-.43-3.42s3.11-.87,3.78-.19ZM45.84,10.26c1.06.02,3.68-2.16,3.11-2.89-.47-.62-2.26-2.05-3.15-2.03l-12.22.22c-.98.02-3.25,1.91-2.73,2.63.42.58,2.09,1.8,2.94,1.82l12.05.25ZM33.56,25.31C13.95,29.1,2.04,47.94,6.35,66.62c4.05,17.58,21.87,29.86,39.97,26.2s30.71-21.56,27.36-39.82c-3.37-18.34-20.71-31.43-40.12-27.68Z\"/>\n      <path d=\"M66.77,60.5c-5.16,5.48,0-23.79-26.64-25.05-1-.05-2.62-1.68-2.73-2.47-.89-6.63,29.74-1.35,31.04,24.28.05,1.03-1.18,2.72-1.67,3.24Z\"/>\n      <path d=\"M55.03,56.5c.69.02,2.16,1.22,2.27,1.71.16.73-1.11,3.08-1.99,3.08l-17.62.1-.44-18.28c-.02-.87,1.54-2.58,2.1-3,.7-.53,2.98,1.1,3,2.01l.36,14.11,12.3.27Z\"/>\n    </g>\n  </g>" },
  'report': { viewBox: "0 0 80.84 90.81", inner: "<g id=\"Layer_1-2\" data-name=\"Layer 1\">\n    <g>\n      <path d=\"M71.36,90.81l-61.05-.05c-5.07,0-9.31-2.68-10.31-7.87V8.98C0,3.62,4.18.02,9.3.01h61.05c5.33-.02,10.5,2.79,10.49,8.99l-.1,73.96c0,4.74-5.22,7.85-9.38,7.85ZM73.47,85.72c1.09-1.41,2.36-3.64,2.35-4.85l-.09-70.83c0-1.67-1.77-4.82-3.39-4.83l-63.09-.03c-2.06.3-3.53,1.68-4.09,3.79l-.07,73.01c.54,1.9,2.27,3.71,4.15,3.71l64.23.03Z\"/>\n      <path d=\"M67.73,76.69c-5.29,1.39-9.6,1.36-15.17.4l-.1-60.62c5.46-.49,9.28-.47,15.16-.13l.11,60.35ZM62.62,71.77l-.16-50.35c-1.26-.95-3.83-1-4.91-.14l.02,50.47c.17,1.17,4.46,1.16,5.05.02Z\"/>\n      <path d=\"M48.1,77.36c-5.57.22-9.65.15-15.4-.2l-.02-41.79c5.15-.87,9.99-.79,15.39-.15l.03,42.15ZM43.06,71.67l-.03-31.59c-1.34-.45-3.78-.21-5.15.43l.1,31.7c1.04.92,5.09.98,5.08-.53Z\"/>\n      <path d=\"M28.7,77.31c-7.27.02-15.74,3-15.6-4.29l.42-21.88,14.88-.25.3,26.43ZM23.6,71.76l-.04-14.92c-.28-1.21-5.05-1.31-5.05-.03v15.62c1.78.06,4.15-.11,5.09-.67Z\"/>\n    </g>\n  </g>" },
  'search': { viewBox: "0 0 92.25 92.86", inner: "<g id=\"Layer_1-2\" data-name=\"Layer 1\">\n    <path d=\"M90.04,77.98c3.61,3.67,2.24,8.98-.22,11.93-2.7,3.25-8.34,4.24-12.06.82-5.75-5.29-11.55-11.24-16.76-17.28-2.73-3.16,3.66-7.61-4.57-12.23-14.75,12.11-35.04,9.87-47.47-3.47S-2.7,22.96,10.09,10.16c13.07-13.07,33.7-13.52,47.37-1.45s15.44,33.14,3.55,47.89c.46,1.84,2.64,4.51,4.29,5.22,3.61-1.53,7.36-1.51,10.11,1.28l14.64,14.87ZM29.46,5.79C12.85,8.93,2.63,24.86,5.83,40.16s17.92,25.97,33.78,23.23c15.86-2.74,26.34-17.65,23.74-33.83C60.9,14.37,46.07,2.66,29.46,5.79ZM85.52,80.79l-12.88-13.07c-1.53-1.56-4.48-1.68-6.07.03-1.08,1.16-.47,3.97.74,5.2l13.09,13.33c1.58,1.6,4.39,1.76,5.77-.05.89-1.17.69-4.07-.65-5.43Z\"/>\n  </g>" },
  'settings': { viewBox: "0 0 92.07 91.81", inner: "<g id=\"Layer_1-2\" data-name=\"Layer 1\">\n    <g>\n      <path d=\"M53.75,90.77c-5.06,1.36-10.93,1.36-15.19.17-4.17-1.17-.75-9.59-6.19-12.31-1.77-.88-4.19-.01-6.22,1.24l-6.24,3.85-8.14-7.2c-1.11-.98-2.82-3.3-3.08-4.63-.86-4.32,5.68-7.16,4.54-11.29-1.78-6.42-11.63-3.17-12.52-7.47s-1.02-9.5.01-13.77c.78-3.24,6.19-3.38,9.39-4.01,2-.4,3.68-5.64,2.56-7.34-1.73-2.63-5.59-6-3.65-9.26,2.1-3.55,5.6-6.56,9.31-9.21,4.42-3.16,8.07,6.08,14.35,3.29C37.89,10.53,33.66-.35,41.79,0l10.32.45c5.21.23,2.56,10.75,7.71,12.6,2.38.86,4.96-.09,6.58-1.73,3.41-3.44,7.45-2.78,10.35.47,1.99,2.22,4.49,4.64,6.1,7.22,3.22,5.15-7.85,8.48-3.21,14.6,2.61,3.45,10.93,1.69,11.78,5.61.93,4.31.86,9.98-.14,14.62-2.64,1.33-7.16,2.58-10.08,3.45-1.85.55-3.2,5.43-2.03,6.9,1.92,2.42,5.84,5.72,3.48,9.06s-5.78,6.75-9.07,9.42c-3.67,2.97-8.49-6.08-13.4-4.24-6.56,2.46-2.39,11.23-6.41,12.31ZM50.39,86.28l2.33-9.9c2.98-1.52,7.56-3.31,10.86-4.27l7.57,5.24c2.61-1.31,7.02-4.07,6.12-7.34-.62-2.26-5.16-5.79-4.32-8.05,1.25-3.36,3.04-7.07,4.44-9.58l9.6-2.26c.06-2.37-.2-6.45-.63-8.48l-9.18-2.15c-2-3.44-3.8-7.84-4.33-11.29l5.01-7.07c-1.13-2.65-4.04-5.66-6.63-6.82l-8.16,5.32-10.74-4.56-1.94-9.27c-2.42-.28-6.73-.46-8.75-.3l-2.16,9.55-10.24,4.58-9.2-5.34-5.86,6.04,4.03,7.32c1.75,3.18-1.45,9.86-3.83,12.3l-9.01,1.53c-.14,2.73-.11,6.67.24,9.19,2.95.81,7.96.83,9.37,2.62,1.85,2.34,3.29,6.12,3.84,9.29.35,2.02-3.26,5.52-4.17,7.56-.4,2.48,4.17,6.96,6.92,6.18,6.62-1.86,1.79-7.25,17.46.13l2.65,9.82c1.98.12,6.54.11,8.68-.01Z\"/>\n      <path d=\"M43.87,27.96c10.61-1.29,18.62,6.59,19.99,15.41,1.62,10.43-5.81,19.3-15.51,20.47-9.92,1.19-18.67-5.42-20.27-14.89s5.05-19.68,15.79-20.99ZM57.94,41.07c-4.03-8.01-12.23-10.48-18.59-6.4-6.49,4.17-8.82,12.13-4.06,18.51,4.14,5.54,11.07,7.34,17.01,4.17,5.34-2.85,8.74-10.13,5.64-16.28Z\"/>\n    </g>\n  </g>" },
  'check': { viewBox: "0 0 82.57 60.92", inner: "<g id=\"Layer_1-2\" data-name=\"Layer 1\">\n    <path d=\"M.89,34.15c-1.14-1.15-1.19-3.74-.14-4.44.88-.58,2.96.13,3.93,1.11l22.69,22.76L77.15,1.62C77.98.75,79.91,0,80.89,0s2.28,3,1.37,3.94L27.51,60.92.89,34.15Z\"/>\n  </g>" },
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

function formatNow(date = new Date(), lang = 'ko') {
  return date.toLocaleTimeString(lang === 'en' ? 'en-US' : 'ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

function formatDate(date = new Date(), lang = 'ko') {
  return date.toLocaleDateString(lang === 'en' ? 'en-US' : 'ko-KR', {
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


function getPageMode() {
  if (typeof window === 'undefined') return 'home';
  const params = new URLSearchParams(window.location.search || '');
  return params.get('page') === 'home' ? 'home' : 'live';
}

function getAnonymousName() {
  const storage = getStorage();
  if (!storage) return `Focuser #${Math.floor(Math.random() * 900) + 100}`;
  const saved = storage.getItem(STORAGE_KEYS.anonymousName);
  if (saved) return saved;
  const created = `Focuser #${Math.floor(Math.random() * 900) + 100}`;
  storage.setItem(STORAGE_KEYS.anonymousName, created);
  return created;
}

function getNickname() {
  const storage = getStorage();
  const fallback = `Focuser #${Math.floor(Math.random() * 900) + 100}`;
  if (!storage) return fallback;
  const savedNickname = storage.getItem(STORAGE_KEYS.nickname);
  if (savedNickname) return savedNickname;
  const savedAnonymous = storage.getItem(STORAGE_KEYS.anonymousName);
  if (savedAnonymous) {
    storage.setItem(STORAGE_KEYS.nickname, savedAnonymous);
    return savedAnonymous;
  }
  storage.setItem(STORAGE_KEYS.nickname, fallback);
  return fallback;
}

function getTodayStamp() {
  const date = new Date();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

function getTaskRolloverKey(userId) {
  return `${STORAGE_KEYS.taskRolloverPrefix}${userId}`;
}

function rolloverTasksForNewDay(tasks) {
  return tasks.map((task) => {
    if (task.list !== 'today' || task.status === '완료') return task;
    return {
      ...task,
      list: 'later',
      status: task.status === '진행 중' ? '대기' : task.status,
    };
  });
}

function readProfile() {
  const storage = getStorage();
  const fallback = {
    points: 0,
    totalFocusSessions: 0,
    todayFocusSessions: 0,
    lastActiveDate: getTodayStamp(),
  };
  if (!storage) return fallback;
  try {
    const parsed = JSON.parse(storage.getItem(STORAGE_KEYS.profile) || 'null');
    if (!parsed || typeof parsed !== 'object') return fallback;
    const today = getTodayStamp();
    if (parsed.lastActiveDate !== today) {
      return {
        ...fallback,
        ...parsed,
        todayFocusSessions: 0,
        lastActiveDate: today,
      };
    }
    return {
      ...fallback,
      ...parsed,
      lastActiveDate: parsed.lastActiveDate || today,
    };
  } catch {
    return fallback;
  }
}

function writeProfile(profile) {
  const storage = getStorage();
  if (!storage) return;
  storage.setItem(STORAGE_KEYS.profile, JSON.stringify(profile));
}

function readLocalLiveComments() {
  const storage = getStorage();
  if (!storage) return [];
  try {
    const parsed = JSON.parse(storage.getItem(STORAGE_KEYS.liveComments) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeLocalLiveComments(comments) {
  const storage = getStorage();
  if (!storage) return;
  storage.setItem(STORAGE_KEYS.liveComments, JSON.stringify(comments.slice(0, 40)));
}

function readLocalJoinedSession() {
  const storage = getStorage();
  if (!storage) return null;
  try {
    const parsed = JSON.parse(storage.getItem(STORAGE_KEYS.liveJoinedSession) || 'null');
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

function writeLocalJoinedSession(session) {
  const storage = getStorage();
  if (!storage) return;
  if (!session) {
    storage.removeItem(STORAGE_KEYS.liveJoinedSession);
    return;
  }
  storage.setItem(STORAGE_KEYS.liveJoinedSession, JSON.stringify(session));
}

function getSeededTasksKey(userId) {
  return `${STORAGE_KEYS.seededTasksPrefix}${userId}`;
}


function getRemainingSeconds(session) {
  const duration = Number(session?.duration_seconds ?? session?.remaining_time ?? 0);
  const startedAt = session?.started_at ? new Date(session.started_at).getTime() : Date.now();
  const elapsed = Math.floor((Date.now() - startedAt) / 1000);
  return Math.max(0, duration - elapsed);
}

function formatRemainingLabel(seconds, lang = 'ko') {
  return `${formatTimer(seconds)} ${lang === 'en' ? 'left' : '남음'}`;
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

function getPriorityScore(title = '', note = '') {
  const text = `${title} ${note}`.toLowerCase();

  let score = 0;

  const urgentStrong = ['오늘', '지금', '급', '긴급', '마감', '제출', '오류', '수정'];
  const urgentMedium = ['확인', '검토', '정리', '답장', '업로드', '발송', '세금계산서', '계약'];
  const heavyWork = ['기획', '제안', '발표', '보고서', '브랜딩', '상세페이지', '디자인'];
  const lightHints = ['가볍게', '짧게', '나중에', '아이디어', '레퍼런스', '초안 보기'];

  urgentStrong.forEach((keyword) => {
    if (text.includes(keyword)) score += 4;
  });

  urgentMedium.forEach((keyword) => {
    if (text.includes(keyword)) score += 2;
  });

  heavyWork.forEach((keyword) => {
    if (text.includes(keyword)) score += 1;
  });

  lightHints.forEach((keyword) => {
    if (text.includes(keyword)) score -= 2;
  });

  if (text.includes('확인만')) score -= 1;
  if (text.includes('먼저')) score += 1;
  if (text.includes('바로')) score += 1;

  return score;
}

function suggestPriority(title = '', note = '') {
  const score = getPriorityScore(title, note);

  if (score >= 6) return '가장 중요';
  if (score <= 1) return '가벼운 일';
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
  const joinedLiveExpiredRef = useRef(false);
  const wakeLockRef = useRef(null);

  const [supabaseClient, setSupabaseClient] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [session, setSession] = useState(null);
  const [dbReady, setDbReady] = useState(false);
  const [tasks, setTasks] = useState(DEFAULT_TASKS.map(normalizeTask));
  const [newTaskId, setNewTaskId] = useState(null);
  const [draggedTaskId, setDraggedTaskId] = useState(null);
  const defaultLang =
    typeof window !== 'undefined' && window.localStorage.getItem(STORAGE_KEYS.lang)
      ? window.localStorage.getItem(STORAGE_KEYS.lang)
      : typeof navigator !== 'undefined' && navigator.language?.startsWith('ko')
        ? 'ko'
        : 'en';
  const [currentTime, setCurrentTime] = useState(formatNow(new Date(), defaultLang));
  const [currentDate, setCurrentDate] = useState(formatDate(new Date(), defaultLang));
  const [focusMinutes, setFocusMinutes] = useState(25);
  const [timerSeconds, setTimerSeconds] = useState(25 * 60);
  const [timerRunning, setTimerRunning] = useState(false);
  const [toast, setToast] = useState('');
  const [expandedReport, setExpandedReport] = useState(false);
  const [dailySummaryOpen, setDailySummaryOpen] = useState(false);
  const [showTimerDone, setShowTimerDone] = useState(false);

  const [showCelebrate, setShowCelebrate] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsMessage, setSettingsMessage] = useState('');
  const [authScreenOpen, setAuthScreenOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [lang, setLang] = useState(defaultLang);
  const [focusMode, setFocusMode] = useState(false);
  const [focusedTaskId, setFocusedTaskId] = useState(null);
  const [pageMode, setPageMode] = useState(getPageMode());
  const [nickname, setNickname] = useState('');
  const [profileOpen, setProfileOpen] = useState(false);
  const [anonymousName, setAnonymousName] = useState('');
  const [profile, setProfile] = useState(readProfile());
  const [liveSessions, setLiveSessions] = useState([]);
  const [liveComments, setLiveComments] = useState([]);
  const [joinedLiveSession, setJoinedLiveSession] = useState(readLocalJoinedSession());

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
    const savedNickname = getNickname();
    setNickname(savedNickname);
    setAnonymousName(savedNickname);
    setJoinedLiveSession(readLocalJoinedSession());
    setLiveComments(readLocalLiveComments());

    const syncPage = () => setPageMode(getPageMode());
    window.addEventListener('popstate', syncPage);
    return () => window.removeEventListener('popstate', syncPage);
  }, []);


  useEffect(() => {
    if (!nickname) return;
    const storage = getStorage();
    if (!storage) return;
    storage.setItem(STORAGE_KEYS.nickname, nickname);
    storage.setItem(STORAGE_KEYS.anonymousName, nickname);
    setAnonymousName(nickname);
  }, [nickname]);

  useEffect(() => {
    writeProfile(profile);
  }, [profile]);

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
    if (session) setAuthScreenOpen(false);
  }, [session]);

  const openAuth = () => {
    setMenuOpen(false);
    setProfileOpen(false);
    setSettingsOpen(false);
    setAuthScreenOpen(true);
  };

  const isLivePage = pageMode === 'live';

  useEffect(() => {
    if (!supabaseClient) return;

    let cancelled = false;

    const loadLive = async () => {
      try {
        const { data } = await supabaseClient
          .from('focus_live')
          .select('*')
          .eq('status', 'focusing')
          .order('started_at', { ascending: false })
          .limit(200);

        if (!cancelled) {
          setLiveSessions(Array.isArray(data) ? data : []);
        }
      } catch (error) {
        console.error(error);
        if (!cancelled) setLiveSessions([]);
      }
    };

    loadLive();

    const channel = supabaseClient
      .channel(`live-room-${Date.now()}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'focus_live' },
        () => loadLive()
      )
      .subscribe();

    const refreshOnResume = () => loadLive();
    const visibilityHandler = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        loadLive();
      }
    };
    const pollId = typeof window !== 'undefined' ? window.setInterval(loadLive, 5000) : null;

    if (typeof window !== 'undefined') {
      window.addEventListener('focus', refreshOnResume);
      window.addEventListener('online', refreshOnResume);
      document.addEventListener('visibilitychange', visibilityHandler);
    }

    return () => {
      cancelled = true;
      supabaseClient.removeChannel(channel);
      if (typeof window !== 'undefined') {
        window.removeEventListener('focus', refreshOnResume);
        window.removeEventListener('online', refreshOnResume);
        document.removeEventListener('visibilitychange', visibilityHandler);
        if (pollId) window.clearInterval(pollId);
      }
    };
  }, [supabaseClient]);


  useEffect(() => {
    if (!isLivePage) return;

    if (!supabaseClient) {
      setLiveComments(readLocalLiveComments());
      return;
    }

    let cancelled = false;

    const loadComments = async () => {
      try {
        const { data } = await supabaseClient
          .from('focus_live_comments')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(40);

        if (!cancelled) {
          if (Array.isArray(data)) {
            setLiveComments(data);
            writeLocalLiveComments(data);
          } else {
            setLiveComments(readLocalLiveComments());
          }
        }
      } catch (error) {
        console.error(error);
        if (!cancelled) setLiveComments(readLocalLiveComments());
      }
    };

    loadComments();
    const id = window.setInterval(loadComments, 10000);

    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [supabaseClient, isLivePage]);

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
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(STORAGE_KEYS.lang, lang);
  }, [lang]);

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

      const storage = getStorage();
      const seededKey = getSeededTasksKey(session.user.id);
      const rolloverKey = getTaskRolloverKey(session.user.id);
      const hasSeededBefore = storage ? storage.getItem(seededKey) === '1' : false;
      const today = getTodayStamp();

      let nextTasks = [];

      if (Array.isArray(data) && data.length > 0) {
        nextTasks = data.map(mapTaskFromDb).map(normalizeTask);
        storage?.setItem(seededKey, '1');
      } else if (!hasSeededBefore) {
        nextTasks = DEFAULT_TASKS.map((task) => normalizeTask({ ...task, id: createTaskId() }));

        const rows = nextTasks.map((task) => mapTaskToDb(task, session.user.id));
        const { error: seedError } = await supabaseClient.from('tasks').upsert(rows, { onConflict: 'id' });
        if (seedError) {
          console.error('tasks seed error', seedError);
        } else {
          storage?.setItem(seededKey, '1');
        }
      }

      const lastRolledDate = storage?.getItem(rolloverKey);
      if (lastRolledDate !== today) {
        nextTasks = rolloverTasksForNewDay(nextTasks);
        storage?.setItem(rolloverKey, today);
      }

      setTasks(nextTasks);
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
      setCurrentTime(formatNow(now, lang));
      setCurrentDate(formatDate(now, lang));
    }, 30000);
    return () => window.clearInterval(id);
  }, [lang]);

  useEffect(() => {
    const now = new Date();
    setCurrentTime(formatNow(now, lang));
    setCurrentDate(formatDate(now, lang));
  }, [lang]);

  useEffect(() => {
    if (!newTaskId) return;
    const id = window.setTimeout(() => {
      newestTaskRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      setNewTaskId(null);
    }, 120);
    return () => window.clearTimeout(id);
  }, [newTaskId]);

  useEffect(() => {
    if (!timerRunning) {
      releaseWakeLock();
      return;
    }

    requestWakeLock();
    const id = window.setInterval(() => {
      setTimerSeconds((prev) => {
        if (prev <= 1) {
          window.clearInterval(id);
          setTimerRunning(false);
          playBeep();
          notifyTimerDone();
          setShowTimerDone(true);
          syncLiveStop();
          setProfile((prevProfile) => {
            const today = getTodayStamp();
            const base = prevProfile.lastActiveDate === today
              ? prevProfile
              : { ...prevProfile, todayFocusSessions: 0, lastActiveDate: today };
            return {
              ...base,
              totalFocusSessions: (base.totalFocusSessions || 0) + 1,
              todayFocusSessions: (base.todayFocusSessions || 0) + 1,
              points: (base.points || 0) + 10,
              lastActiveDate: today,
            };
          });
          setToast(`${tr(lang, '집중 시간이 끝났어요. 체크하고 잠깐 쉬어요.')} +10P`);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [timerRunning, lang]);

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


  useEffect(() => {
    if (!joinedLiveSession) {
      joinedLiveExpiredRef.current = false;
      return;
    }

    const remaining = getRemainingSeconds(joinedLiveSession);
    if (remaining > 0) {
      joinedLiveExpiredRef.current = false;
      return;
    }

    if (joinedLiveExpiredRef.current) return;
    joinedLiveExpiredRef.current = true;

    setProfile((prevProfile) => {
      const today = getTodayStamp();
      const base = prevProfile.lastActiveDate === today
        ? prevProfile
        : { ...prevProfile, todayFocusSessions: 0, lastActiveDate: today };
      return {
        ...base,
        totalFocusSessions: (base.totalFocusSessions || 0) + 1,
        todayFocusSessions: (base.todayFocusSessions || 0) + 1,
        points: (base.points || 0) + 10,
        lastActiveDate: today,
      };
    });

    const completionComment = {
      id: `comment-complete-${Date.now()}`,
      anonymous_name: 'SYSTEM',
      message: `${nickname || anonymousName || 'Focuser'}님이 집중을 완료했습니다 (+10P)`,
      created_at: new Date().toISOString(),
      type: 'system',
    };

    setLiveComments((prev) => {
      const next = [completionComment, ...prev].slice(0, 40);
      writeLocalLiveComments(next);
      return next;
    });

    if (supabaseClient) {
      void (async () => {
        try {
          await supabaseClient.from('focus_live_comments').insert({
            anonymous_name: 'SYSTEM',
            message: completionComment.message,
            user_id: session?.user?.id || null,
            type: 'system',
          });
        } catch (error) {
          console.error(error);
        }
      })();
    }

    setToast('집중 완료 🎉 +10P');
  }, [joinedLiveSession, nickname, anonymousName, currentTime, supabaseClient, session?.user?.id]);

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

  const showToastMessage = (message) => setToast(tr(lang, message));

  const syncLiveStart = async () => {};

  const syncLiveStop = async () => {};

  const goToPlanner = () => {
    if (typeof window === 'undefined') return;
    const scrollToPlanner = () => {
      const target = document.querySelector('[data-planner-anchor]');
      if (!target) return;
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    if (pageMode === 'live') {
      const url = new URL(window.location.href);
      url.searchParams.set('page', 'home');
      window.history.pushState({}, '', url.toString());
      setPageMode('home');
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(scrollToPlanner);
      });
      return;
    }

    scrollToPlanner();
  };

  const requestWakeLock = async () => {
    try {
      if (typeof navigator === 'undefined' || !('wakeLock' in navigator)) return;
      if (wakeLockRef.current) return;
      wakeLockRef.current = await navigator.wakeLock.request('screen');
    } catch (error) {
      console.error(error);
    }
  };

  const releaseWakeLock = async () => {
    try {
      if (!wakeLockRef.current) return;
      await wakeLockRef.current.release();
      wakeLockRef.current = null;
    } catch (error) {
      console.error(error);
    }
  };

  const notifyTimerDone = () => {
    try {
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate([220, 120, 220]);
      }
      if (typeof window !== 'undefined' && 'Notification' in window) {
        if (Notification.permission === 'granted') {
          new Notification('FocusOS', {
            body: lang === 'en' ? 'Your focus session is complete.' : '집중 시간이 끝났어요.'
          });
        } else if (Notification.permission !== 'denied') {
          Notification.requestPermission().then((permission) => {
            if (permission === 'granted') {
              new Notification('FocusOS', {
                body: lang === 'en' ? 'Your focus session is complete.' : '집중 시간이 끝났어요.'
              });
            }
          }).catch(() => {});
        }
      }
    } catch (error) {
      console.error(error);
    }
  };

  const goToHome = () => {
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    url.searchParams.delete('page');
    window.history.pushState({}, '', url.toString());
    setPageMode('home');
  };

  const goToLive = () => {
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    url.searchParams.set('page', 'live');
    window.history.pushState({}, '', url.toString());
    setPageMode('live');
  };


  const joinLiveFocus = async () => {
    const selectedLiveTaskTitle =
      (focusTask && (lang === 'en' ? tr('en', focusTask.title) : focusTask.title)) ||
      (activeTask && (lang === 'en' ? tr('en', activeTask.title) : activeTask.title)) ||
      (lang === 'en' ? 'Live focus session' : '라이브 집중 세션');

    const nextSession = {
      id:
        typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : `live-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      user_id: session?.user?.id || null,
      anonymous_name: nickname || anonymousName || getNickname(),
      task_title: selectedLiveTaskTitle,
      duration_seconds: timerSeconds > 0 ? timerSeconds : 25 * 60,
      started_at: new Date().toISOString(),
      status: 'focusing',
    };

    setJoinedLiveSession(nextSession);
    writeLocalJoinedSession(nextSession);
    setLiveSessions((prev) => {
      const filtered = prev.filter(
        (item) =>
          item.id !== nextSession.id &&
          item.anonymous_name !== nextSession.anonymous_name
      );
      return [nextSession, ...filtered];
    });

    const joinedComment = {
      id: `comment-join-${Date.now()}`,
      anonymous_name: 'SYSTEM',
      message: `${nextSession.anonymous_name}님이 집중을 시작했습니다 🔥`,
      created_at: new Date().toISOString(),
      type: 'system',
    };

    setLiveComments((prev) => {
      const next = [joinedComment, ...prev].slice(0, 40);
      writeLocalLiveComments(next);
      return next;
    });

    if (supabaseClient) {
      try {
        const { data, error } = await supabaseClient
          .from('focus_live')
          .insert({
            id: nextSession.id,
            user_id: nextSession.user_id,
            anonymous_name: nextSession.anonymous_name,
            task_title: nextSession.task_title,
            duration_seconds: nextSession.duration_seconds,
            started_at: nextSession.started_at,
            status: nextSession.status,
          })
          .select('id')
          .single();

        if (error) {
          console.error(error);
        } else if (data?.id && data.id !== nextSession.id) {
          const synced = { ...nextSession, id: data.id };
          setJoinedLiveSession(synced);
          writeLocalJoinedSession(synced);
        }

        await supabaseClient.from('focus_live_comments').insert({
          anonymous_name: 'SYSTEM',
          message: joinedComment.message,
          user_id: nextSession.user_id,
          type: 'system',
        });
      } catch (error) {
        console.error(error);
      }
    }

    showToastMessage('라이브 참여가 시작됐어요.');
  };

  const leaveLiveFocus = async () => {
    const currentJoined = joinedLiveSession;
    setJoinedLiveSession(null);
    writeLocalJoinedSession(null);
    setLiveSessions((prev) =>
      prev.filter((item) => item.id !== currentJoined?.id && item.anonymous_name !== currentJoined?.anonymous_name)
    );

    if (supabaseClient && currentJoined?.id) {
      try {
        await supabaseClient.from('focus_live').delete().eq('id', currentJoined.id);
      } catch (error) {
        console.error(error);
      }
    }

    showToastMessage('라이브에서 나갔어요.');
  };

  const sendLiveComment = async (message) => {
    const value = String(message || '').trim();
    if (!value) {
      showToastMessage('메시지를 입력해 주세요.');
      return;
    }

    const nextComment = {
      id: `comment-${Date.now()}`,
      anonymous_name: nickname || anonymousName || getNickname(),
      message: value,
      created_at: new Date().toISOString(),
    };

    const localComments = [nextComment, ...liveComments].slice(0, 40);
    setLiveComments(localComments);
    writeLocalLiveComments(localComments);

    if (supabaseClient) {
      try {
        await supabaseClient.from('focus_live_comments').insert({
          anonymous_name: nextComment.anonymous_name,
          message: nextComment.message,
          user_id: session?.user?.id || null,
        });
      } catch (error) {
        console.error(error);
      }
    }

    showToastMessage('응원 메시지가 등록됐어요.');
  };


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

  const recordStart = (taskId, durationSeconds = focusMinutes * 60) => {
    const now = formatNow();
    playBeep();
    setTasks((prev) =>
      prev.map((task) => {
        if (task.id === taskId) return { ...task, start: task.start || now, status: '진행 중' };
        if (task.status === '진행 중') return { ...task, status: '대기' };
        return task;
      })
    );
    setTimerSeconds(durationSeconds);
    setTimerRunning(true);
    syncLiveStart(taskId, durationSeconds);
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
    syncLiveStop();
    setShowCelebrate(true);
    showToastMessage('완료 목록으로 이동했어요.');
  };

  const pauseTask = (taskId) => {
    patchTask(taskId, (task) => (task.id === taskId ? { ...task, status: '대기' } : task));
    setTimerRunning(false);
    syncLiveStop();
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
    syncLiveStop();
    showToastMessage('작업을 초기화했어요. 처음부터 다시 시작할 수 있어요.');
  };

  const restoreTask = (taskId) => {
    patchTask(taskId, (task) => ({ ...task, end: '', status: '대기', list: 'today' }));
    showToastMessage('오늘 할 일로 복원했어요.');
  };

  const deleteTask = (taskId) => {
    if (focusedTaskId === taskId) {
      setFocusMode(false);
      setFocusedTaskId(null);
      setTimerRunning(false);
    }
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
      const next = [...prev];

      ['today', 'later'].forEach((listName) => {
        const indexes = next
          .map((task, index) => ({ task, index }))
          .filter(({ task }) => task.list === listName && task.status !== '완료');

        if (indexes.length === 0) return;

        const ranked = [...indexes].sort((a, b) => {
          const scoreDiff = getPriorityScore(b.task.title, b.task.note) - getPriorityScore(a.task.title, a.task.note);
          if (scoreDiff !== 0) return scoreDiff;
          return a.task.createdAt - b.task.createdAt;
        });

        ranked.forEach(({ index }, rankIndex) => {
          let priority = '중요';
          if (rankIndex === 0) {
            priority = '가장 중요';
          } else if (rankIndex >= Math.max(2, ranked.length - 1)) {
            priority = '가벼운 일';
          }
          next[index] = { ...next[index], priority };
        });
      });

      return next;
    });

    showToastMessage('현재 카드 기준으로 우선순위를 다시 정리했어요.');
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
      recordStart(focusTask.id, 5 * 60);
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
    syncLiveStop();
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
        syncLiveStart(focusTask.id, timerSeconds || focusMinutes * 60);
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
    await syncLiveStop();
    await supabaseClient.auth.signOut();
    setSession(null);
    setDbReady(false);
  };

  const resetAllTasks = async () => {
    const confirmed =
      typeof window !== 'undefined'
        ? window.confirm('지금까지 저장된 할 일과 진행 기록을 모두 비울까요? 이 작업은 되돌릴 수 없어요.')
        : false;
    if (!confirmed) return;

    if (supabaseClient && session?.user?.id) {
      const { error } = await supabaseClient
        .from('tasks')
        .delete()
        .eq('user_id', session.user.id);

      if (error) {
        setSettingsMessage('데이터 초기화 중 문제가 생겼어요. 잠시 후 다시 시도해 주세요.');
        return;
      }
    }

    setTasks([]);
    setProfile({ points: 0, totalFocusSessions: 0, todayFocusSessions: 0, lastActiveDate: getTodayStamp() });
    setFocusMode(false);
    setFocusedTaskId(null);
    syncLiveStop();
    setTimerRunning(false);
    setTimerSeconds(focusMinutes * 60);
    setSettingsMessage('앱 데이터는 초기화됐어요. 계정 자체 삭제는 보안상 서버 함수 연결 후 활성화할 예정이에요.');
    showToastMessage('앱 데이터가 초기화됐어요.');
  };

  const requestAccountDelete = async () => {
    if (!session?.user || !supabaseClient) {
      setSettingsMessage('로그인이 필요해요.');
      return;
    }

    try {
      const { error } = await supabaseClient.from('delete_requests').insert({
        user_id: session.user.id,
        email: session.user.email || null,
      });

      if (error) throw error;

      setSettingsMessage('삭제 요청이 접수됐어요.');
      showToastMessage('삭제 요청이 접수됐어요.');
    } catch (error) {
      console.error(error);
      setSettingsMessage('삭제 요청 처리 중 문제가 생겼어요.');
    }
  };

  const dailySummary = {
    completed: completedTasks.length,
    started: startedCount,
    remaining: todayTasks.length,
    rewardMessage,
  };

  const activeLiveSessions = (() => {
    const filtered = liveSessions.filter((session) => getRemainingSeconds(session) > 0);
    const joinedActive = joinedLiveSession && getRemainingSeconds(joinedLiveSession) > 0;

    if (
      joinedActive &&
      !filtered.some(
        (session) =>
          session.id === joinedLiveSession.id ||
          session.user_id === joinedLiveSession.user_id ||
          session.anonymous_name === joinedLiveSession.anonymous_name
      )
    ) {
      return [joinedLiveSession, ...filtered];
    }

    return filtered;
  })();

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

  const t = (value) => tr(lang, value);

  if (authScreenOpen && !session) {
    return (
      <div className="min-h-screen bg-[radial-gradient(circle_at_top,#f4f0ff_0%,#fffdf8_48%,#ffffff_100%)]">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 md:px-6">
          <button
            onClick={() => setAuthScreenOpen(false)}
            className="rounded-full border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-700 shadow-sm transition hover:bg-zinc-50"
          >
            ← FocusOS
          </button>
        </div>
        <AuthScreen supabaseClient={supabaseClient} lang={lang} setLang={setLang} t={t} />
      </div>
    );
  }

  if (isLivePage) {
    return (
      <main className="min-h-screen bg-[radial-gradient(circle_at_top,#f4f0ff_0%,#fffdf8_48%,#ffffff_100%)] text-zinc-900 transition-colors">
        <div className="sticky top-0 z-30 border-b border-white/70 bg-white/80 backdrop-blur-xl">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 md:px-6">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-violet-600 md:text-[11px] md:uppercase md:tracking-[0.24em]">FocusOS</p>
              <p className="hidden text-sm text-zinc-500 md:block">{t('작게 시작하고, 한 번에 하나씩 끝내기')}</p>
            </div>

            <button
              onClick={() => setMenuOpen((prev) => !prev)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-700 shadow-sm transition hover:bg-zinc-50 md:hidden"
              aria-label="Open menu"
            >
              ☰
            </button>

            <div className="hidden items-center gap-2 md:flex">
              <div className="mr-1 flex items-center gap-1 rounded-full border border-zinc-200 bg-white p-1 shadow-sm">
                <button onClick={() => setLang('ko')} className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition ${lang === 'ko' ? 'bg-zinc-950 text-white' : 'text-zinc-500'}`}>KO</button>
                <button onClick={() => setLang('en')} className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition ${lang === 'en' ? 'bg-zinc-950 text-white' : 'text-zinc-500'}`}>EN</button>
              </div>
              <button onClick={goToLive} className="inline-flex items-center gap-2 rounded-full bg-violet-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:scale-[1.01] hover:bg-violet-500"><span className="inline-block h-2.5 w-2.5 rounded-full bg-white/90"></span>LIVE</button>
              <button onClick={goToPlanner} className="rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 shadow-sm transition hover:bg-zinc-50">{lang === 'en' ? 'Planner' : '우선순위 정리'}</button>
              {session ? (<>
                <button onClick={() => setProfileOpen(true)} className="rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 shadow-sm transition hover:bg-zinc-50">프로필</button>
                <button onClick={() => setSettingsOpen(true)} className="rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 shadow-sm transition hover:bg-zinc-50">{t('설정')}</button>
                <button onClick={signOut} className="rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 shadow-sm transition hover:bg-zinc-50">{t('로그아웃')}</button>
              </>) : (
                <button onClick={openAuth} className="rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 shadow-sm transition hover:bg-zinc-50">{t('로그인')}</button>
              )}
            </div>
          </div>

          {menuOpen && (
            <div className="border-t border-zinc-200 bg-white px-4 py-3 md:hidden">
              <div className="space-y-3">
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">Language</p>
                  <div className="flex items-center gap-2">
                    <button onClick={() => { setLang('ko'); setMenuOpen(false); }} className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${lang === 'ko' ? 'bg-zinc-950 text-white' : 'bg-zinc-100 text-zinc-600'}`}>KO</button>
                    <button onClick={() => { setLang('en'); setMenuOpen(false); }} className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${lang === 'en' ? 'bg-zinc-950 text-white' : 'bg-zinc-100 text-zinc-600'}`}>EN</button>
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <button onClick={() => { goToLive(); setMenuOpen(false); }} className="rounded-2xl bg-violet-600 px-4 py-3 text-left text-sm font-semibold text-white transition hover:bg-violet-500">● LIVE</button>
                  <button onClick={() => { goToPlanner(); setMenuOpen(false); }} className="rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-left text-sm font-medium text-zinc-700 transition hover:bg-zinc-50">{lang === 'en' ? 'Planner' : '우선순위 정리'}</button>
                  {session ? (<>
                    <button onClick={() => { setProfileOpen(true); setMenuOpen(false); }} className="rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-left text-sm font-medium text-zinc-700 transition hover:bg-zinc-50">프로필</button>
                    <button onClick={() => { setSettingsOpen(true); setMenuOpen(false); }} className="rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-left text-sm font-medium text-zinc-700 transition hover:bg-zinc-50">{t('설정')}</button>
                    <button onClick={signOut} className="rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-left text-sm font-medium text-zinc-700 transition hover:bg-zinc-50">{t('로그아웃')}</button>
                  </>) : (
                    <button onClick={openAuth} className="rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-left text-sm font-medium text-zinc-700 transition hover:bg-zinc-50">{t('로그인')}</button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {profileOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/30 px-4">
            <div className="w-full max-w-xl rounded-[32px] border border-zinc-200 bg-white p-6 shadow-[0_30px_100px_rgba(24,24,27,0.18)]">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-violet-700">My Profile</p>
                  <h2 className="mt-1 text-2xl font-semibold tracking-tight text-zinc-950">프로필</h2>
                  <p className="mt-2 text-sm leading-6 text-zinc-500">닉네임, 포인트, 집중 기록을 여기서 확인해요.</p>
                </div>
                <button onClick={() => setProfileOpen(false)} className="rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-600 transition hover:bg-zinc-50">{t('닫기')}</button>
              </div>

              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                <SummaryTile label="오늘 집중" value={String(profile.todayFocusSessions || 0)} />
                <SummaryTile label="총 집중" value={String(profile.totalFocusSessions || 0)} />
                <SummaryTile label="포인트" value={`${profile.points || 0}P`} />
              </div>

              <div className="mt-5 rounded-[24px] border border-zinc-200 bg-zinc-50 p-4">
                <label className="text-sm font-medium text-zinc-900">닉네임</label>
                <input
                  value={nickname}
                  maxLength={24}
                  onChange={(e) => setNickname(e.target.value.replace(/\s+/g, ' ').trimStart())}
                  placeholder="닉네임을 입력해 주세요"
                  className="mt-3 w-full rounded-[20px] border border-zinc-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-violet-300"
                />
                <p className="mt-2 text-xs text-zinc-500">라이브 참여, 채팅, 완료 메시지에 이 닉네임이 표시돼요.</p>
              </div>
            </div>
          </div>
        )}

        {settingsOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/30 px-4">
            <div className="w-full max-w-xl rounded-[32px] border border-zinc-200 bg-white p-6 shadow-[0_30px_100px_rgba(24,24,27,0.18)]">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-violet-700">Settings</p>
                  <h2 className="mt-1 text-2xl font-semibold tracking-tight text-zinc-950">{t('계정 및 앱 설정')}</h2>
                  <p className="mt-2 text-sm leading-6 text-zinc-500">{t('로그아웃, 데이터 초기화, 계정 삭제를 여기서 관리할 수 있어요.')}</p>
                </div>
                <button onClick={() => { setSettingsOpen(false); setSettingsMessage(''); }} className="rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-600 transition hover:bg-zinc-50">{t('닫기')}</button>
              </div>

              <div className="mt-6 space-y-4">
                <div className="rounded-[24px] border border-zinc-200 bg-zinc-50 p-4">
                  <p className="text-sm font-medium text-zinc-900">{t('로그아웃')}</p>
                  <p className="mt-1 text-sm text-zinc-500">{t('현재 기기에서 로그인 상태만 해제해요.')}</p>
                  <button onClick={signOut} className="mt-4 rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100">{t('로그아웃')}</button>
                </div>

                <div className="rounded-[24px] border border-zinc-200 bg-zinc-50 p-4">
                  <p className="text-sm font-medium text-zinc-900">{t('앱 데이터 초기화')}</p>
                  <p className="mt-1 text-sm text-zinc-500">{t('오늘 할 일, 나중에 할 일, 진행 기록을 모두 비워요.')}</p>
                  <button onClick={resetAllTasks} className="mt-4 rounded-2xl border border-rose-200 bg-white px-4 py-3 text-sm font-medium text-rose-700 transition hover:bg-rose-50">{t('데이터 초기화')}</button>
                </div>

                <div className="rounded-[24px] border border-zinc-200 bg-zinc-50 p-4">
                  <p className="text-sm font-medium text-zinc-900">{t('계정 삭제')}</p>
                  <p className="mt-1 text-sm text-zinc-500">{t('관리자 확인 후 삭제돼요.')}</p>
                  <button onClick={requestAccountDelete} className="mt-4 rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100">{t('삭제 요청')}</button>
                </div>
              </div>

              {settingsMessage && (
                <div className="mt-5 rounded-[22px] bg-violet-50 px-4 py-3 text-sm leading-6 text-violet-700 ring-1 ring-violet-100">
                  {settingsMessage}
                </div>
              )}
            </div>
          </div>
        )}

        <FocusLivePage sessions={liveSessions} lang={lang} isJoined={Boolean(joinedLiveSession && getRemainingSeconds(joinedLiveSession) > 0)} joinedSession={joinedLiveSession} comments={liveComments} currentNickname={nickname || anonymousName} onJoin={joinLiveFocus} onLeave={leaveLiveFocus} onSendComment={sendLiveComment} onBack={goToHome} t={t} getRemainingSeconds={getRemainingSeconds} formatRemainingLabel={formatRemainingLabel} />

        <section className="mx-auto max-w-6xl px-4 pb-8 md:px-6 md:pb-10">
          <div className="rounded-[32px] border border-zinc-200 bg-white px-6 py-6 shadow-sm">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-violet-700">Planner</p>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-950">{lang === 'en' ? 'Sort today before you start' : '우선순위 할 일 정하기'}</h2>
                <p className="mt-2 text-sm leading-6 text-zinc-600">{lang === 'en' ? 'Keep Today under five tasks so you can start and finish.' : 'FocusOS는 Today를 5개 이내로 유지해서 시작하고 끝내는 흐름을 만듭니다.'}</p>
              </div>
              <div className="shrink-0">
                <button onClick={goToPlanner} className="rounded-full bg-violet-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-violet-500">{lang === 'en' ? 'Open planner' : '우선순위 할 일 정하기'}</button>
              </div>
            </div>
          </div>
        </section>
      </main>
    );
  }


  return (
    <main className={`min-h-screen text-zinc-900 transition-colors ${
      focusMode
        ? 'bg-[radial-gradient(circle_at_top,#ede9fe_0%,#f8f7ff_40%,#ffffff_100%)]'
        : 'bg-[radial-gradient(circle_at_top,#f4f0ff_0%,#fffdf8_48%,#ffffff_100%)]'
    }`}>
      <div className="sticky top-0 z-30 border-b border-white/70 bg-white/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 md:px-6">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-violet-600 md:text-[11px] md:uppercase md:tracking-[0.24em]">FocusOS</p>
            <p className="hidden text-sm text-zinc-500 md:block">{t('작게 시작하고, 한 번에 하나씩 끝내기')}</p>
          </div>

          <button
            onClick={() => setMenuOpen((prev) => !prev)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-700 shadow-sm transition hover:bg-zinc-50 md:hidden"
            aria-label="Open menu"
          >
            ☰
          </button>

          <div className="hidden items-center gap-2 md:flex">
            <div className="mr-1 flex items-center gap-1 rounded-full border border-zinc-200 bg-white p-1 shadow-sm">
              <button onClick={() => setLang('ko')} className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition ${lang === 'ko' ? 'bg-zinc-950 text-white' : 'text-zinc-500'}`}>KO</button>
              <button onClick={() => setLang('en')} className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition ${lang === 'en' ? 'bg-zinc-950 text-white' : 'text-zinc-500'}`}>EN</button>
            </div>
            <button onClick={goToLive} className="inline-flex items-center gap-2 rounded-full bg-violet-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:scale-[1.01] hover:bg-violet-500"><span className="inline-block h-2.5 w-2.5 rounded-full bg-white/90"></span>LIVE</button>
            <button onClick={goToPlanner} className="rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 shadow-sm transition hover:bg-zinc-50">{lang === 'en' ? 'Planner' : '우선순위 정리'}</button>
            {session ? (<>
              <button onClick={() => setProfileOpen(true)} className="rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 shadow-sm transition hover:bg-zinc-50">프로필</button>
              <button onClick={() => setSettingsOpen(true)} className="rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 shadow-sm transition hover:bg-zinc-50">{t('설정')}</button>
              <button onClick={signOut} className="rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 shadow-sm transition hover:bg-zinc-50">{t('로그아웃')}</button>
            </>) : (
              <button onClick={openAuth} className="rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 shadow-sm transition hover:bg-zinc-50">{t('로그인')}</button>
            )}
          </div>
        </div>

        {menuOpen && (
          <div className="border-t border-zinc-200 bg-white px-4 py-3 md:hidden">
            <div className="space-y-3">
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">Language</p>
                <div className="flex items-center gap-2">
                  <button onClick={() => { setLang('ko'); setMenuOpen(false); }} className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${lang === 'ko' ? 'bg-zinc-950 text-white' : 'bg-zinc-100 text-zinc-600'}`}>KO</button>
                  <button onClick={() => { setLang('en'); setMenuOpen(false); }} className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${lang === 'en' ? 'bg-zinc-950 text-white' : 'bg-zinc-100 text-zinc-600'}`}>EN</button>
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <button onClick={() => { goToLive(); setMenuOpen(false); }} className="rounded-2xl bg-violet-600 px-4 py-3 text-left text-sm font-semibold text-white transition hover:bg-violet-500">● LIVE</button>
                <button onClick={() => { goToPlanner(); setMenuOpen(false); }} className="rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-left text-sm font-medium text-zinc-700 transition hover:bg-zinc-50">{lang === 'en' ? 'Planner' : '우선순위 정리'}</button>
                {session ? (<>
                  <button onClick={() => { setProfileOpen(true); setMenuOpen(false); }} className="rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-left text-sm font-medium text-zinc-700 transition hover:bg-zinc-50">프로필</button>
                  <button onClick={() => { setSettingsOpen(true); setMenuOpen(false); }} className="rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-left text-sm font-medium text-zinc-700 transition hover:bg-zinc-50">{t('설정')}</button>
                  <button onClick={signOut} className="rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-left text-sm font-medium text-zinc-700 transition hover:bg-zinc-50">{t('로그아웃')}</button>
                </>) : (
                  <button onClick={openAuth} className="rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-left text-sm font-medium text-zinc-700 transition hover:bg-zinc-50">{t('로그인')}</button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {profileOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/30 px-4">
          <div className="w-full max-w-xl rounded-[32px] border border-zinc-200 bg-white p-6 shadow-[0_30px_100px_rgba(24,24,27,0.18)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-violet-700">My Profile</p>
                <h2 className="mt-1 text-2xl font-semibold tracking-tight text-zinc-950">프로필</h2>
                <p className="mt-2 text-sm leading-6 text-zinc-500">닉네임, 포인트, 집중 기록을 여기서 확인해요.</p>
              </div>
              <button onClick={() => setProfileOpen(false)} className="rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-600 transition hover:bg-zinc-50">{t('닫기')}</button>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <SummaryTile label="오늘 집중" value={String(profile.todayFocusSessions || 0)} />
              <SummaryTile label="총 집중" value={String(profile.totalFocusSessions || 0)} />
              <SummaryTile label="포인트" value={`${profile.points || 0}P`} />
            </div>

            <div className="mt-5 rounded-[24px] border border-zinc-200 bg-zinc-50 p-4">
              <label className="text-sm font-medium text-zinc-900">닉네임</label>
              <input
                value={nickname}
                maxLength={24}
                onChange={(e) => setNickname(e.target.value.replace(/\s+/g, ' ').trimStart())}
                placeholder="닉네임을 입력해 주세요"
                className="mt-3 w-full rounded-[20px] border border-zinc-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-violet-300"
              />
              <p className="mt-2 text-xs text-zinc-500">라이브 참여, 채팅, 완료 메시지에 이 닉네임이 표시돼요.</p>
            </div>
          </div>
        </div>
      )}

      {settingsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/30 px-4">
          <div className="w-full max-w-xl rounded-[32px] border border-zinc-200 bg-white p-6 shadow-[0_30px_100px_rgba(24,24,27,0.18)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-violet-700">Settings</p>
                <h2 className="mt-1 text-2xl font-semibold tracking-tight text-zinc-950">{t('계정 및 앱 설정')}</h2>
                <p className="mt-2 text-sm leading-6 text-zinc-500">{t('로그아웃, 데이터 초기화, 계정 삭제를 여기서 관리할 수 있어요.')}</p>
              </div>
              <button onClick={() => { setSettingsOpen(false); setSettingsMessage(''); }} className="rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-600 transition hover:bg-zinc-50">{t('닫기')}</button>
            </div>

            <div className="mt-6 space-y-4">
              <div className="rounded-[24px] border border-zinc-200 bg-zinc-50 p-4">
                <p className="text-sm font-medium text-zinc-900">{t("로그아웃")}</p>
                <p className="mt-1 text-sm text-zinc-500">{t('현재 기기에서 로그인 상태만 해제해요.')}</p>
                <button onClick={signOut} className="mt-4 rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100">{t("로그아웃")}</button>
              </div>

              <div className="rounded-[24px] border border-zinc-200 bg-zinc-50 p-4">
                <p className="text-sm font-medium text-zinc-900">{t('앱 데이터 초기화')}</p>
                <p className="mt-1 text-sm text-zinc-500">{t('오늘 할 일, 나중에 할 일, 진행 기록을 모두 비워요.')}</p>
                <button onClick={resetAllTasks} className="mt-4 rounded-2xl border border-rose-200 bg-white px-4 py-3 text-sm font-medium text-rose-700 transition hover:bg-rose-50">{t('데이터 초기화')}</button>
              </div>

              <div className="rounded-[24px] border border-zinc-200 bg-zinc-50 p-4">
                <p className="text-sm font-medium text-zinc-900">{t('계정 삭제')}</p>
                <p className="mt-1 text-sm text-zinc-500">{t('관리자 확인 후 삭제돼요.')}</p>
                <button onClick={requestAccountDelete} className="mt-4 rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100">{t('삭제 요청')}</button>
              </div>
            </div>

            {settingsMessage && (
              <div className="mt-5 rounded-[22px] bg-violet-50 px-4 py-3 text-sm leading-6 text-violet-700 ring-1 ring-violet-100">
                {settingsMessage}
              </div>
            )}
          </div>
        </div>
      )}

      {focusMode && (
        <section className="mx-auto max-w-6xl px-4 pt-6 md:px-6">
          <div className="rounded-[32px] border border-violet-200 bg-violet-50/70 p-5 shadow-sm">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-violet-700">Focus Mode</p>
                <h2 className="mt-2 text-3xl font-semibold tracking-tight text-zinc-950">
                  {focusTask ? (lang === 'en' ? tr('en', focusTask.title) : focusTask.title) : t('지금 한 가지에만 집중하기')}
                </h2>
                <p className="mt-3 text-base text-zinc-600">
                  {focusTask ? ((lang === 'en' ? tr('en', focusTask.note) : focusTask.note) || t('지금은 이 카드 하나만 보고 끝내면 돼요.')) : t('선택된 작업이 없어요. 오늘 할 일 카드에서 시작 또는 집중 시작을 눌러 작업을 고르거나, Focus Mode 종료로 원래 화면으로 돌아가세요.')}
                </p>
                {focusTask?.start ? (
                  <div className="mt-4 inline-flex rounded-2xl bg-white px-4 py-3 text-sm text-zinc-700 ring-1 ring-violet-100">
                    {t("시작 시간")} {focusTask.start}
                  </div>
                ) : null}
              </div>

              <div className="shrink-0 rounded-[28px] bg-zinc-950 px-6 py-5 text-white shadow-sm">
                <p className="text-sm text-zinc-400">{t("포커스 타이머")}</p>
                <p className="mt-2 text-4xl font-bold tracking-tight">{formatTimer(timerSeconds)}</p>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap gap-2.5">
              <button onClick={toggleTimer} className="rounded-2xl bg-black px-4 py-3 text-sm font-medium text-white transition hover:scale-[1.01]">
                {timerRunning ? t("일시정지") : t("타이머 시작")}
              </button>
              <button onClick={quickStartFive} className="rounded-2xl border border-violet-200 bg-white px-4 py-3 text-sm font-medium text-violet-700 transition hover:bg-violet-100">
                {t("5분만 시작")}
              </button>
              <button onClick={goToLive} className="inline-flex items-center gap-2 rounded-2xl bg-violet-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-violet-500">
                <span className="inline-block h-2.5 w-2.5 rounded-full bg-white/90"></span>
                LIVE
              </button>
              <button onClick={closeFocusMode} className="rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50">
                {t("Focus Mode 종료")}
              </button>
            </div>
          </div>
        </section>
      )}

      <section className="mx-auto max-w-6xl px-4 pt-4 md:hidden">
        {!focusMode && !isLivePage && (
          <button
            onClick={goToLive}
            className="w-full rounded-[28px] border border-violet-300 bg-[linear-gradient(135deg,#f5f1ff_0%,#ede9fe_100%)] p-4 text-left shadow-sm transition hover:translate-y-[-1px] hover:shadow-md"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-violet-700 ring-1 ring-violet-100">
                  <span className="inline-block h-2.5 w-2.5 rounded-full bg-violet-600"></span>
                  LIVE
                </div>
                <p className="mt-3 text-base font-semibold text-zinc-900">{t('지금 함께 집중 중입니다')}</p>
                <p className="mt-1 text-sm text-zinc-600">🟢 {activeLiveSessions.length} {lang === 'en' ? 'focusing now' : '명 집중 중'}</p>
              </div>
              <div className="shrink-0 rounded-full bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm">
                {t('라이브 참여하기')}
              </div>
            </div>
          </button>
        )}
      </section>

      <section className="mx-auto max-w-6xl px-4 pt-3 md:hidden">
        {!focusMode && !isLivePage && (
          <button
            onClick={goToPlanner}
            className="w-full rounded-[28px] border border-zinc-200 bg-white px-5 py-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-700">Planner</p>
            <h3 className="mt-2 text-xl font-semibold tracking-tight text-zinc-950">{lang === 'en' ? 'Organize today first' : '오늘 할 일 먼저 정리하기'}</h3>
            <p className="mt-2 text-sm leading-6 text-zinc-600">{lang === 'en' ? 'If live focus feels too fast, sort your top priorities first.' : '라이브 집중이 바로 어렵다면, 먼저 우선순위를 정리하고 시작해보세요.'}</p>
            <div className="mt-4 inline-flex items-center rounded-full bg-violet-50 px-4 py-2 text-sm font-semibold text-violet-700 ring-1 ring-violet-100">
              {lang === 'en' ? 'Go to planner' : '우선순위 정리하러 가기'}
            </div>
          </button>
        )}
      </section>

      <section className="mx-auto hidden max-w-6xl px-6 pt-6 md:block">
        {!focusMode && !isLivePage && (
          <button
            onClick={goToLive}
            className="group w-full rounded-[36px] border border-violet-200 bg-[linear-gradient(135deg,rgba(245,241,255,0.96)_0%,rgba(237,233,254,0.92)_100%)] px-8 py-8 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <div className="flex items-center justify-between gap-8 xl:px-2">
              <div className="min-w-0">
                <div className="inline-flex items-center gap-2.5 rounded-full bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-violet-700 ring-1 ring-violet-100">
                  <span className="inline-block h-3 w-3 rounded-full bg-violet-600"></span>
                  LIVE
                </div>
                <h2 className="mt-6 text-2xl font-semibold tracking-tight text-zinc-950 xl:text-[30px]">{t('지금 함께 집중 중입니다')}</h2>
                <p className="mt-3 text-sm font-medium text-zinc-600 xl:text-base">🟢 {activeLiveSessions.length} {lang === 'en' ? 'people focusing now' : '명 집중 중'}</p>
              </div>

              <div className="shrink-0">
                <div className="rounded-full bg-violet-600 px-8 py-4 text-lg font-semibold text-white shadow-[0_16px_40px_rgba(124,58,237,0.22)] transition group-hover:bg-violet-500 xl:px-10 xl:py-4 xl:text-xl">
                  {t('라이브 참여하기')}
                </div>
              </div>
            </div>
          </button>
        )}
      </section>

      <section className="mx-auto hidden max-w-6xl px-6 pt-4 md:block">
        {!focusMode && !isLivePage && (
          <button
            onClick={goToPlanner}
            className="w-full rounded-[32px] border border-zinc-200 bg-white px-8 py-7 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <div className="flex items-center justify-between gap-8">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-700">Planner</p>
                <h3 className="mt-3 text-2xl font-semibold tracking-tight text-zinc-950">{lang === 'en' ? 'Not sure what to do first?' : '무엇부터 해야 할지 막막한가요?'} </h3>
                <p className="mt-3 text-sm leading-6 text-zinc-600">{lang === 'en' ? 'Sort your top priorities, then come back to live focus.' : '오늘 할 일을 먼저 정리한 뒤 라이브 집중으로 돌아오세요.'}</p>
              </div>
              <div className="shrink-0 rounded-full bg-violet-50 px-6 py-3 text-sm font-semibold text-violet-700 ring-1 ring-violet-100">
                {lang === 'en' ? 'Open planner' : '우선순위 정리하기'}
              </div>
            </div>
          </button>
        )}
      </section>

      <section className="mx-auto max-w-6xl px-4 py-6 md:px-6 md:py-8">
        <header className={`mb-8 overflow-hidden rounded-[36px] border border-zinc-900/5 bg-zinc-950 p-6 text-white shadow-[0_24px_80px_rgba(24,24,27,0.18)] transition md:p-8 ${focusMode ? "hidden" : ""}`}>
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-xl">
              <p className="text-sm text-zinc-400">{t('오늘의 리포트')}</p>
              <h1 className="mt-2 text-4xl font-bold tracking-tight md:text-5xl">{currentTime}</h1>
              <p className="mt-2 text-zinc-400">{currentDate}</p>
              <div className="mt-5 flex flex-wrap gap-2.5">
                <button onClick={startNow} className="rounded-2xl bg-white px-4 py-2.5 text-sm font-medium text-zinc-900 transition hover:scale-[1.01]">{t('지금 시작하기')}</button>
                <button onClick={quickStartFive} className="rounded-2xl bg-violet-500 px-4 py-2.5 text-sm font-medium text-white transition hover:scale-[1.01]">{t('5분만 시작')}</button>
                <button onClick={() => setExpandedReport((prev) => !prev)} className="rounded-2xl bg-white/10 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-white/15">{t('하루 리포트')} {expandedReport ? t('닫기') : t('보기')}</button>
                <button onClick={() => setDailySummaryOpen(true)} className="rounded-2xl bg-white/10 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-white/15">{t('하루 종료 리포트')}</button>
              </div>
            </div>

            <div className={`${expandedReport ? 'grid' : 'hidden'} gap-3 sm:grid-cols-2 lg:grid-cols-4 md:grid`}>
              <ReportCard label={t("완료")} value={`${completedTasks.length}`} sub={t("오늘 끝낸 일")} />
              <ReportCard label={t("시작")} value={`${startedCount}`} sub={t("시도한 일")} />
              <ReportCard label={t("진행률")} value={`${progress}%`} sub={t("전체 흐름")} />
              <ReportCard label={t("집중 점수")} value={`${focusScore}`} sub={t(rewardMessage)} />
            </div>
          </div>

          <div className="mt-6 h-3 overflow-hidden rounded-full bg-white/10">
            <div className="h-full rounded-full bg-emerald-400 transition-all duration-500" style={{ width: `${progress}%` }} />
          </div>

          {expandedReport && (
            <div className="mt-6 grid gap-4 md:grid-cols-3">
              <GlassCard title={t("오늘 남은 일")} value={`${todayTasks.length}`} caption={t("과하게 늘리지 않고 5개 이내 유지")} />
              <GlassCard title={t("현재 집중")} value={focusTask ? (lang === "en" ? tr("en", focusTask.title) : focusTask.title) : t('없음')} caption={t("한 번에 하나씩")} compact />
              <GlassCard title={t("타이머")} value={formatTimer(timerSeconds)} caption={t("지금 집중 흐름")} />
            </div>
          )}
        </header>

        <section className={`mb-8 grid gap-6 lg:grid-cols-[1.05fr_0.95fr] transition ${focusMode ? "hidden" : ""}`}>
          <Panel>
            <div className="text-center">
              <p className="text-sm font-medium text-violet-700">Focus Timer</p>
              <h2 className="mt-1 text-2xl font-semibold tracking-tight">{t("포커스 타이머")}</h2>
              <p className="mt-2 text-sm leading-6 text-zinc-500">개인용 뽀모도로 타이머예요. 할 일과 별개로 바로 집중할 때 사용해요.</p>
            </div>

            <div className="mt-6 flex justify-center">
              <div className="w-full max-w-[420px] rounded-[32px] bg-zinc-950 px-6 py-8 text-center text-white shadow-sm">
                <p className="text-sm text-zinc-400">{t("포커스 타이머")}</p>
                <p className="mt-3 text-6xl font-semibold tracking-tight md:text-7xl">{formatTimer(timerSeconds)}</p>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap justify-center gap-2">
              {FOCUS_PRESETS.map((minutes) => (
                <button key={minutes} onClick={() => { setFocusMinutes(minutes); setTimerSeconds(minutes * 60); }} className={`rounded-full px-4 py-2.5 text-sm transition ${focusMinutes === minutes ? 'bg-violet-600 text-white shadow-sm' : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'}`}>{lang === "en" ? `${minutes} min` : `${minutes}분`}</button>
              ))}
            </div>

            <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <button onClick={toggleTimer} className="w-full rounded-2xl bg-black px-5 py-3.5 text-sm font-medium text-white transition hover:scale-[1.01] sm:w-auto">{timerRunning ? t("일시정지") : t("타이머 시작")}</button>
              <button onClick={resetTimer} className="w-full rounded-2xl border border-zinc-200 px-5 py-3.5 text-sm transition hover:bg-zinc-50 sm:w-auto">{t("리셋")}</button>
              <button onClick={quickStartFive} className="w-full rounded-2xl border border-violet-200 bg-violet-50 px-5 py-3.5 text-sm text-violet-700 transition hover:bg-violet-100 sm:w-auto">{t("5분만 시작")}</button>
            </div>
          </Panel>

          <Panel>
            <p className="text-sm font-medium text-violet-700">{t("운영 원칙")}</p>
            <h2 className="mt-1 text-2xl font-semibold tracking-tight">FocusOS</h2>
            <div className="mt-5 grid gap-3">
              <RuleCard title={lang === "en" ? "Limit Today to 5 tasks" : t("Today는 5개 제한")} desc={t("오늘 보이는 일이 많아지면 시작 장벽이 커져서 수를 제한해요.")} />
              <RuleCard title={lang === "en" ? "Later is a backlog" : t("Later는 보관함")} desc={t("지금 안 해도 되는 일은 빼두고, 필요할 때만 Today로 옮겨요.")} />
              <RuleCard title={t("작업 분해")} desc={t("큰 일을 5분 안에 시작 가능한 단계로 잘게 나눠요.")} />
            </div>
          </Panel>
        </section>

        <div data-planner-anchor className={focusMode ? "ring-2 ring-violet-200 rounded-[36px]" : ""}><SectionCard
          eyebrow="Today"
          title={`${t("오늘 할 일")} (${todayTasks.length}/${TODAY_LIMIT})`}
          action={
            focusMode ? null : (
              <div className="flex w-full flex-col items-center gap-2 md:w-auto md:flex-row md:items-center">
                <button onClick={autoPrioritize} className="w-full max-w-[280px] rounded-2xl border border-zinc-200 px-4 py-3 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 md:w-auto md:max-w-none">{t('우선순위 자동정리')}</button>
              </div>
            )
          }
        >
          <div className="space-y-4">
            {(focusMode ? (focusTask ? [focusTask] : []) : todayTasks).length > 0 ? (focusMode ? (focusTask ? [focusTask] : []) : todayTasks).map((task) => (
              <TaskCard
                t={t}
                priorityBadge={PRIORITY_BADGE}
                statusBadge={STATUS_BADGE}
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
                lang={lang}
              />
            )) : <EmptyBox text={focusMode ? t("현재 진행 중인 작업이 없어요. 오늘 할 일에서 시작 버튼을 누르거나 5분만 시작으로 첫 작업을 시작해 보세요.") : t("오늘 할 일이 비어 있어요. 가장 먼저 시작할 한 가지만 넣어보세요.")} />}

            {!focusMode && (
              <div className="pt-2">
                <button onClick={() => addTask('today')} className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-zinc-300 px-4 py-3 text-sm font-medium text-zinc-600 transition hover:bg-zinc-50">
                  <InlineIcon name="add" className="h-4 w-4" />
                  {t('오늘 할 일 추가')}
                </button>
              </div>
            )}
          </div>
        </SectionCard></div>

        <section className={focusMode ? "hidden" : ""}><SectionCard
          eyebrow="Later"
          title={t("나중에 할 일")}
          action={<button onClick={() => addTask('later')} className="inline-flex items-center gap-2 rounded-2xl border-2 border-dashed border-zinc-300 px-4 py-3 text-sm font-medium text-zinc-600 transition hover:bg-zinc-50"><InlineIcon name="add" className="h-4 w-4" />{t('나중에 할 일 추가')}</button>}
        >
          <div className="space-y-4">
            {laterTasks.length > 0 ? laterTasks.map((task) => (
              <TaskCard
                t={t}
                priorityBadge={PRIORITY_BADGE}
                statusBadge={STATUS_BADGE}
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
                lang={lang}
              />
            )) : <EmptyBox text={t("지금 당장 안 해도 되는 일을 여기에 보관해두면 Today가 훨씬 가벼워져요.")} />}
          </div>
        </SectionCard></section>

        {completedTasks.length > 0 && (
          <section className={focusMode ? "hidden" : ""}><SectionCard
            eyebrow="Completed"
            title={t("완료 목록")}
            action={<span className="rounded-full bg-zinc-100 px-3 py-1 text-sm text-zinc-600">{completedTasks.length}개</span>}
          >
            <div className="space-y-3">
              {completedTasks.map((task) => (
                <div key={task.id} className="rounded-[28px] border border-zinc-100 bg-zinc-50/80 p-5 transition hover:scale-[1.005]">
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div>
                      <div className="flex flex-wrap gap-2">
                        <span className={`rounded-full px-3 py-1 text-xs ${PRIORITY_BADGE[task.priority]}`}>{tr(lang, task.priority)}</span>
                        <span className={`rounded-full px-3 py-1 text-xs ${STATUS_BADGE[task.status]}`}>{tr(lang, task.status)}</span>
                      </div>
                      <h3 className="mt-3 break-words text-lg font-semibold leading-8 text-zinc-900">{task.title}</h3>
                      {task.note && <p className="mt-1 break-words text-sm leading-7 text-zinc-600">{task.note}</p>}
                      <div className="mt-3 flex flex-wrap gap-3 text-sm text-zinc-500">
                        {task.start && <span>시작 {task.start}</span>}
                        {task.end && <span>종료 {task.end}</span>}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button onClick={() => restoreTask(task.id)} className="rounded-xl border border-violet-200 bg-white px-4 py-2 text-sm font-medium text-violet-700 transition hover:bg-violet-50">{t('복원')}</button>
                      <button onClick={() => deleteTask(task.id)} className="rounded-xl border px-4 py-2 text-sm transition hover:bg-zinc-50">삭제</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </SectionCard></section>
        )}

        <footer className="mt-10 border-t border-zinc-200 pb-10 pt-6 text-center text-sm text-zinc-500">
          <p className="font-medium text-zinc-700">FocusOS</p>
          <p className="mt-1">{t("작은 완료 하나가 흐름을 만듭니다.")}</p>
          <p className="mt-1 text-xs text-zinc-400">Focus • Start Small • Finish One Thing</p>
        </footer>

        {showScrollTop && (
          <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="fixed bottom-6 right-6 z-40 rounded-full bg-zinc-900 px-4 py-3 text-sm font-medium text-white shadow-lg transition hover:scale-105">{t("↑ 위로")}</button>
        )}

        {showTimerDone && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/45 px-4">
            <div className="w-full max-w-md rounded-[32px] border border-zinc-200 bg-white p-6 shadow-[0_30px_100px_rgba(24,24,27,0.18)]">
              <p className="text-sm font-semibold text-violet-700">Focus complete</p>
              <h3 className="mt-2 text-2xl font-bold tracking-tight text-zinc-950">{lang === 'en' ? 'Your focus session is done' : '집중이 완료됐어요'}</h3>
              <p className="mt-3 text-sm leading-6 text-zinc-600">{lang === 'en' ? `You finished a session with ${activeLiveSessions.length} people in live focus.` : `라이브에서 ${activeLiveSessions.length}명과 함께 집중을 마쳤어요.`}</p>
              <div className="mt-6 flex flex-col gap-2 sm:flex-row">
                <button onClick={() => { setShowTimerDone(false); if (timerSeconds === 0) setTimerSeconds(focusMinutes * 60); setTimerRunning(true); }} className="flex-1 rounded-2xl bg-zinc-950 px-4 py-3 text-sm font-semibold text-white transition hover:opacity-90">{lang === 'en' ? 'Start again' : '다시 집중하기'}</button>
                <button onClick={() => { setShowTimerDone(false); setTimerSeconds(5 * 60); }} className="flex-1 rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50">{lang === 'en' ? 'Take 5 min break' : '5분 쉬기'}</button>
              </div>
            </div>
          </div>
        )}

        {dailySummaryOpen && (
          <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/35 px-4">
            <div className="w-full max-w-lg rounded-[28px] bg-white p-6 shadow-2xl">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-violet-700">{t("하루 종료 리포트")}</p>
                  <h3 className="mt-1 text-2xl font-semibold text-zinc-900">{t("오늘의 정리")}</h3>
                </div>
                <button onClick={() => setDailySummaryOpen(false)} className="rounded-xl border px-3 py-2 text-sm">{t("닫기")}</button>
              </div>
              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                <SummaryTile label={t("완료")} value={String(dailySummary.completed)} />
                <SummaryTile label={t("시작")} value={String(dailySummary.started)} />
                <SummaryTile label={t("남은 일")} value={String(dailySummary.remaining)} />
              </div>
              <div className="mt-5 rounded-[24px] bg-zinc-50 p-4">
                <p className="text-sm text-zinc-500">{t("오늘 한마디")}</p>
                <p className="mt-2 text-lg font-semibold text-zinc-900">{t(dailySummary.rewardMessage)}</p>
              </div>
            </div>
          </div>
        )}

        {showCelebrate && (
          <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden">
            <div className="absolute left-1/2 top-24 -translate-x-1/2 rounded-full bg-violet-500 px-5 py-3 text-sm font-semibold text-white shadow-xl animate-[celebrate_1.2s_ease-out]">{t("완료! 잘했어요 ✨")}</div>
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

