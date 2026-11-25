const statusBox = document.querySelector('#status');
const memberPanel = document.querySelector('#member-panel');
const signedOutState = document.querySelector('#signed-out-state');
const sessionDot = document.querySelector('#session-dot');
const memberEmail = document.querySelector('#member-email');
const passwordInput = document.querySelector('#password');

function showStatus(message, isError = false) {
  statusBox.textContent = message;
  statusBox.style.background = isError ? '#fee2e2' : '#e0f2fe';
}

function credentials() {
  const email = document.querySelector('#email').value.trim();
  const password = passwordInput.value;
  if (!email || password.length < 4 || password.length > 8) {
    showStatus('전자우편과 4~8자리 비밀번호를 확인하세요.', true);
    return null;
  }
  return { email, password };
}

const configured = typeof SUPABASE_URL === 'string' &&
  typeof SUPABASE_PUBLISHABLE_KEY === 'string' &&
  SUPABASE_URL.startsWith('https://') &&
  !SUPABASE_URL.includes('프로젝트-ref') &&
  !SUPABASE_PUBLISHABLE_KEY.includes('공개키');

if (!configured) {
  showStatus('연결 설정이 필요합니다. 3.6.3에서 Project URL·publishable key와 Auth URL을 설정하세요.', true);
} else {
  startApp();
}

function startApp() {
const client = supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

document.querySelector('#signup').addEventListener('click', async () => {
  const values = credentials();
  if (!values) return;
  const { data, error } = await client.auth.signUp({
    ...values,
    options: { emailRedirectTo: new URL('index.html', location.href).href }
  });
  if (error) return showStatus('회원가입 실패: ' + error.message, true);
  showStatus(data.session ? '회원가입되었습니다.'
                          : '확인 메일의 링크를 누른 뒤 로그인하세요.');
});

document.querySelector('#auth-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const values = credentials();
  if (!values) return;
  const { error } = await client.auth.signInWithPassword(values);
  if (error) return showStatus('전자우편, 비밀번호, 메일 확인을 점검하세요.', true);
  showStatus('로그인되었습니다.');
});

function renderSession(session) {
  const user = session?.user;
  memberPanel.hidden = !user;
  signedOutState.hidden = Boolean(user);
  sessionDot.classList.toggle('is-online', Boolean(user));
  memberEmail.textContent = user ? `현재 사용자 · ${user.email}` : '';
  if (user) loadProfile(user.id);
}

client.auth.onAuthStateChange((_event, session) => renderSession(session));
client.auth.getSession().then(({ data, error }) => {
  if (error) return showStatus('세션 확인 실패: ' + error.message, true);
  renderSession(data.session);
  if (!data.session) showStatus('회원가입하거나 로그인하세요.');
});

async function loadProfile(userId) {
  const { data, error } = await client.from('profiles')
    .select('display_name, introduction').eq('user_id', userId).maybeSingle();
  if (error) return showStatus('프로필 읽기 실패: ' + error.message, true);
  document.querySelector('#display-name').value = data?.display_name ?? '';
  document.querySelector('#introduction').value = data?.introduction ?? '';
}

document.querySelector('#profile-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const { data: { user } } = await client.auth.getUser();
  if (!user) return showStatus('먼저 로그인하세요.', true);
  const { error } = await client.from('profiles').upsert({
    user_id: user.id,
    display_name: document.querySelector('#display-name').value.trim(),
    introduction: document.querySelector('#introduction').value.trim(),
    updated_at: new Date().toISOString()
  });
  if (error) return showStatus('저장 실패: ' + error.message, true);
  location.href = 'mypage.html';
});

document.querySelector('#logout').addEventListener('click', async () => {
  const { error } = await client.auth.signOut();
  showStatus(error ? '로그아웃 실패: ' + error.message : '로그아웃되었습니다.', Boolean(error));
});
}