type PageProps = { params: { id: string } };

export default function NodeDetailPage({ params }: PageProps) {
  return (
    <main style={{ padding: 48 }}>
      <h1>노드 #{params.id}</h1>
      {/* TODO: 상세 조회, 잠금해제 모달 */}
    </main>
  );
}
