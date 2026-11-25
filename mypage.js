const client = supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

async function loadMyPage() {
  const { data: { user }, error: userError } = await client.auth.getUser();
  if (userError || !user) return location.replace('index.html');

  const { data, error } = await client.from('profiles')
    .select('display_name, introduction').eq('user_id', user.id).single();
  if (error) {
    document.querySelector('#profile-status').textContent = '프로필 조회 실패: ' + error.message;
    return;
  }
  document.querySelector('#profile-email').textContent = user.email;
  document.querySelector('#profile-name').textContent = data.display_name;
  document.querySelector('#profile-text').textContent = data.introduction || '자기소개가 아직 없습니다.';
  document.querySelector('#profile-status').textContent = 'Supabase 프로필 연결 완료';
}

document.querySelector('#mypage-logout').addEventListener('click', async () => {
  await client.auth.signOut();
  location.replace('index.html');
});

loadMyPage();