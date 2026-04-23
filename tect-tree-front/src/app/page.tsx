export default function HomePage() {
  return (
    <main className="p-12">
      <h1 className="text-3xl font-bold mb-4">ATHENA DOCTRINE TECH TREE</h1>
      <p className="text-fg/70 mb-6">문서를 노드 형태로 열람하는 테크트리 서비스.</p>
      <ul className="space-y-2">
        <li><a href="/login" className="text-accent hover:underline">로그인</a></li>
        <li><a href="/signup" className="text-accent hover:underline">회원가입</a></li>
        <li><a href="/tree" className="text-accent hover:underline">트리 열람</a></li>
        <li><a href="/mypage" className="text-accent hover:underline">마이페이지</a></li>
        <li><a href="/admin" className="text-accent hover:underline">관리자</a></li>
      </ul>
    </main>
  );
}
