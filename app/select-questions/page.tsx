"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function SelectQuestionsPage() {
  const router = useRouter();
  const [userInfo, setUserInfo] = useState<{ name: string } | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const storedUserInfo = localStorage.getItem('fineval_user_info');
    if (!storedUserInfo) {
      router.push('/');
      return;
    }
    setUserInfo(JSON.parse(storedUserInfo));
  }, [router]);

  const handleStart = () => {
    setIsLoading(true);
    router.push(`/evaluate?user=${encodeURIComponent(userInfo!.name)}`);
  };

  if (!userInfo) {
    return (
      <div className="flex min-h-screen items-center justify-center text-gray-600">
        正在加载...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center px-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl border border-gray-200 max-w-md w-full text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          准备开始评测
        </h1>

        <p className="text-gray-600 mb-2">
          您好，<span className="font-semibold text-blue-600">{userInfo.name}</span>！
        </p>

        <div className="bg-blue-50 rounded-lg p-4 mb-6 text-left">
          <h2 className="font-semibold text-blue-900 mb-2 text-center">评测说明</h2>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• 本次评测共 <strong>10 道题</strong>（1 道固定题 + 9 道分配题）</li>
            <li>• 每道题包含 8 个匿名 RIA 的回答</li>
            <li>• 系统已根据您的信息自动分配题目</li>
            <li>• 预计用时约 15-20 分钟</li>
            <li>• 可随时保存进度并继续</li>
          </ul>
        </div>

        <button
          onClick={handleStart}
          disabled={isLoading}
          className="w-full py-4 px-8 bg-blue-600 text-white text-lg font-bold rounded-xl hover:bg-blue-700 transform hover:scale-[1.02] transition-all shadow-lg hover:shadow-xl disabled:bg-gray-400 disabled:cursor-not-allowed disabled:transform-none"
        >
          {isLoading ? '正在准备试题...' : '开始答题'}
        </button>
      </div>
    </div>
  );
}
