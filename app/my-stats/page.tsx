import { Suspense } from 'react';
import MyStatsClient from './MyStatsClient';

export default function MyStatsPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-xl text-blue-600 font-semibold">正在加载...</div>
      </div>
    }>
      <MyStatsClient />
    </Suspense>
  );
}
