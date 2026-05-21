"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

function getUrlParam(key: string): string | null {
  if (typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.search);
  return params.get(key);
}

export default function SelectQuestionsPage() {
  const router = useRouter();
  const supabase = createClient();
  const [userInfo, setUserInfo] = useState<{ name: string; profile: object; startTime: string } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [version, setVersion] = useState<'v1' | 'v2'>('v1');

  useEffect(() => {
    const storedUserInfo = localStorage.getItem('fineval_user_info');
    if (!storedUserInfo) {
      router.push('/');
      return;
    }
    setUserInfo(JSON.parse(storedUserInfo));

    // 获取版本参数：优先从 URL query 读取，其次从 localStorage 读取
    const urlVersion = getUrlParam('version');
    if (urlVersion === 'v1' || urlVersion === 'v2') {
      setVersion(urlVersion);
      localStorage.setItem('fineval_selected_version', urlVersion);
    } else {
      const storedVersion = localStorage.getItem('fineval_selected_version');
      if (storedVersion === 'v1' || storedVersion === 'v2') {
        setVersion(storedVersion);
      }
    }
  }, [router]);

  const handleStart = async () => {
    if (!userInfo) return;
    setIsLoading(true);

    try {
      // 1. 优先检查 localStorage 中是否已有绑定的 bucket_index
      const storedBucket = localStorage.getItem('fineval_bucket_index');
      if (storedBucket !== null) {
        const bucketIndex = parseInt(storedBucket, 10);
        if (!isNaN(bucketIndex)) {
          router.push(`/evaluate?version=${version}&bucket=${bucketIndex}`);
          return;
        }
      }

      // 2. 查询 Supabase 中是否已有该用户当前版本的 bucket 分配记录
      // （兼容没有 bucket_index/version 列的旧表，出错则降级到本地逻辑）
      let existingSubmission = null;
      try {
        const { data, error } = await supabase
          .from('submissions')
          .select('user_name, bucket_index')
          .eq('user_name', userInfo.name)
          .eq('version', version)
          .maybeSingle();
        if (!error) existingSubmission = data;
      } catch (e) {
        console.warn('查询 bucket_index 失败（可能列不存在）:', e);
      }

      if (existingSubmission && existingSubmission.bucket_index !== null && existingSubmission.bucket_index !== undefined) {
        // 已存在分配记录，直接使用
        const bucketIndex = existingSubmission.bucket_index;
        localStorage.setItem('fineval_bucket_index', String(bucketIndex));
        router.push(`/evaluate?version=${version}&bucket=${bucketIndex}`);
        return;
      }

      // 3. 新用户：查询当前系统内已分配的用户总数
      const { count: assignedCount, error: countError } = await supabase
        .from('submissions')
        .select('*', { count: 'exact', head: true });

      if (countError) {
        console.error('查询用户总数失败:', countError);
        fallbackAllocation(userInfo.name);
        return;
      }

      const count = assignedCount ?? 0;
      const bucketIndex = count % 10;

      // 4. 持久化到 localStorage
      localStorage.setItem('fineval_bucket_index', String(bucketIndex));

      // 5. 尝试持久化到 Supabase（兼容旧表结构）
      try {
        await supabase
          .from('submissions')
          .upsert({
            user_name: userInfo.name,
            user_profile: userInfo.profile,
            bucket_index: bucketIndex,
            status: 'assigned',
            version: version,
            created_at: new Date().toISOString(),
          }, { onConflict: 'user_name' });
      } catch (e) {
        console.warn('保存 bucket_index 到 Supabase 失败（可能列不存在）:', e);
        // 不影响继续答题，localStorage 已保存
      }

      // 6. 跳转到 evaluate 页面（带上 version 参数）
      router.push(`/evaluate?version=${version}&bucket=${bucketIndex}`);
    } catch (err) {
      console.error('分配题包出错:', err);
      fallbackAllocation(userInfo.name);
    }
  };

  const fallbackAllocation = (name: string) => {
    // 降级：用字符串哈希取模
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = ((hash << 5) - hash + name.charCodeAt(i)) | 0;
    }
    const bucketIndex = Math.abs(hash) % 10;
    localStorage.setItem('fineval_bucket_index', String(bucketIndex));
    router.push(`/evaluate?version=${version}&bucket=${bucketIndex}`);
  };

  if (!userInfo) {
    return (
      <div className="flex min-h-screen items-center justify-center text-gray-600">
        正在加载...
      </div>
    );
  }

  // 根据版本动态计算题目数量和模型数量
  const isV2 = version === 'v2';
  // v2 专用配置：18 道题、8 个模型、预计 120 分钟；v1 保持原有配置
  const bucketSize = isV2 ? 18 : 18; // v1: BUCKET_MATRIX 中题包大小约 17-18；v2: 18 道题
  const modelCount = isV2 ? 8 : 8;   // v1/v2 均为 8 个模型回答
  const estimatedTime = isV2 ? '120' : '15-20';

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center px-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl border border-gray-200 max-w-md w-full text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          准备开始评测
        </h1>

        {/* 题包版本标识 */}
        <div className={`py-1.5 px-3 rounded-lg shadow-sm border text-center mb-4 ${
          isV2
            ? 'bg-green-50 border-green-200 text-green-800'
            : 'bg-blue-50 border-blue-200 text-blue-800'
        }`}>
          <span className="text-sm font-semibold">
            当前测评：{isV2 ? '新题包（v2）' : '旧题包（v1）'}
          </span>
        </div>

        <p className="text-gray-600 mb-2">
          您好，<span className="font-semibold text-blue-600">{userInfo.name}</span>！
        </p>

        <div className={`rounded-lg p-4 mb-6 text-left ${isV2 ? 'bg-green-50 border border-green-200' : 'bg-blue-50'}`}>
          <h2 className={`font-semibold mb-2 text-center ${isV2 ? 'text-green-900' : 'text-blue-900'}`}>评测说明</h2>
          <ul className={`text-sm space-y-1 ${isV2 ? 'text-green-800' : 'text-blue-800'}`}>
            <li>• 本次评测共 <strong>{bucketSize} 道题</strong>{!isV2 && `（1 道固定题 + ${bucketSize - 1} 道分配题）`}</li>
            <li>• 每道题包含 {modelCount} 个匿名 RIA 的回答</li>
            <li>• 系统已根据您的信息自动分配题目</li>
            <li>• 预计用时约 {estimatedTime} 分钟</li>
            <li>• 可随时保存进度并继续</li>
          </ul>
          {isV2 && (
            <div className="mt-3 p-2 bg-white rounded border border-green-200 text-xs text-green-700">
              <strong>提示：</strong>本套题目包含六维度错误评估，请仔细阅读评分标准后再开始答题。
            </div>
          )}
        </div>

        <button
          onClick={handleStart}
          disabled={isLoading}
          className={`w-full py-4 px-8 text-white text-lg font-bold rounded-xl transform hover:scale-[1.02] transition-all shadow-lg hover:shadow-xl disabled:bg-gray-400 disabled:cursor-not-allowed disabled:transform-none ${
            isV2 ? 'bg-green-600 hover:bg-green-700' : 'bg-blue-600 hover:bg-blue-700'
          }`}
        >
          {isLoading ? '正在准备试题...' : '开始答题'}
        </button>
      </div>
    </div>
  );
}
