'use client'; // 💡 다시 부활! (이 페이지는 클라이언트에서만 작동해야 합니다)

import dynamic from 'next/dynamic';

// 💡 1. 'use client'를 유지한 상태에서,
// 💡 2. .then((mod) => mod.default) 로 헷갈리지 않게 정확히 함수만 빼옵니다.
const MindMapAnimation = dynamic(
  () => import('./components/canvas/title/Main').then((mod) => mod.default),
  { ssr: false }
);

export default function Home() {
  return (
    <main style={{ margin: 0, padding: 0, overflow: 'hidden' }}>
      <MindMapAnimation />
    </main>
  );
}