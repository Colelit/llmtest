"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import EvaluationStandardsTable from '@/app/components/EvaluationStandardsTable';
import ErrorCategoriesTable from '@/app/components/ErrorCategoriesTable';

export default function GuidancePage() {
  const router = useRouter();
  const [userInfo, setUserInfo] = useState<any>(null);

  useEffect(() => {
    // 检查用户信息是否存在
    const storedUserInfo = localStorage.getItem('fineval_user_info');
    if (!storedUserInfo) {
      router.push('/');
      return;
    }
    setUserInfo(JSON.parse(storedUserInfo));
  }, [router]);

  const handleContinueToEvaluation = () => {
    router.push('/select-questions');
  };

  if (!userInfo) {
    return <div className="flex min-h-screen items-center justify-center">正在加载...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="container mx-auto px-4 py-8">
        {/* 头部欢迎信息 */}
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            欢迎，{userInfo.name}！
          </h1>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto">
            在开始评测之前，请仔细阅读以下评分标准和错误分类说明，这将帮助您进行更准确和一致的评价。
          </p>
        </div>

        {/* 评测说明卡片 */}
        <div className="bg-blue-50 rounded-lg p-6 mb-8 border border-blue-200">
          <h2 className="text-xl font-bold text-blue-900 mb-3">评测任务说明</h2>
          <div className="grid md:grid-cols-2 gap-6 text-sm text-blue-800">
            <div>
              <h3 className="font-semibold mb-2">📊 您将要做什么？</h3>
              <ul className="space-y-1 ml-4">
                <li>• 查看约60个金融投资相关问题</li>
                <li>• 每个问题有8个不同AI模型的回答</li>
                <li>• 对每个回答进行1-10分评分</li>
                <li>• 标记回答中存在的错误类型</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-2">⏱️ 预计用时与建议</h3>
              <ul className="space-y-1 ml-4">
                <li>• 总时长：30-45分钟</li>
                <li>• 可随时保存进度并继续</li>
                <li>• 建议先浏览所有回答再评分</li>
                <li>• 保持客观，基于专业标准评判</li>
              </ul>
            </div>
          </div>
        </div>

        {/* 评分标准表格 */}
        <div className="mb-8">
          <EvaluationStandardsTable />
        </div>

        {/* 错误类别表格 */}
        <div className="mb-8">
          <ErrorCategoriesTable />
        </div>

        {/* 评分案例展示 */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h3 className="text-lg font-bold text-gray-900 mb-4">评分示例</h3>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="border border-green-200 rounded-lg p-4 bg-green-50">
              <h4 className="font-semibold text-green-800 mb-2">✅ 高质量回答示例 (8-9分)</h4>
              <p className="text-sm text-green-700 mb-2">
                <strong>问题：</strong>我30岁，月收入2万，想为退休储备，应该如何配置投资组合？
              </p>
              <p className="text-sm text-green-700 mb-2">
                <strong>优质回答特征：</strong>
              </p>
              <ul className="text-xs text-green-600 ml-4 space-y-1">
                <li>• 考虑年龄、收入、风险承受能力</li>
                <li>• 提供具体可行的配置建议</li>
                <li>• 说明风险收益特征</li>
                <li>• 建议定期调整策略</li>
              </ul>
            </div>
            
            <div className="border border-red-200 rounded-lg p-4 bg-red-50">
              <h4 className="font-semibold text-red-800 mb-2">❌ 低质量回答示例 (2-3分)</h4>
              <p className="text-sm text-red-700 mb-2">
                <strong>问题：</strong>我30岁，月收入2万，想为退休储备，应该如何配置投资组合？
              </p>
              <p className="text-sm text-red-700 mb-2">
                <strong>问题回答特征：</strong>
              </p>
              <ul className="text-xs text-red-600 ml-4 space-y-1">
                <li>• 给出武断的"股票70%，债券30%"建议</li>
                <li>• 未考虑个人具体情况</li>
                <li>• 包含过时或错误的信息</li>
                <li>• 答非所问或逻辑混乱</li>
              </ul>
            </div>
          </div>
        </div>

        {/* 重要提醒 */}
        <div className="bg-yellow-50 rounded-lg p-6 mb-8 border border-yellow-200">
          <h3 className="text-lg font-bold text-yellow-800 mb-3">📋 评测重要提醒</h3>
          <div className="grid md:grid-cols-2 gap-4 text-sm text-yellow-700">
            <div>
              <h4 className="font-semibold mb-2">评分原则：</h4>
              <ul className="space-y-1 ml-4">
                <li>• 基于专业标准，不受个人偏好影响</li>
                <li>• 重点关注准确性和实用性</li>
                <li>• 考虑回答的完整性和逻辑性</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-2">标记错误：</h4>
              <ul className="space-y-1 ml-4">
                <li>• 可多选，一个回答可能有多种错误</li>
                <li>• 即使高分回答也可能存在特定问题</li>
                <li>• 没有发现错误时可以不选</li>
              </ul>
            </div>
          </div>
        </div>

        {/* 开始评测按钮 */}
        <div className="text-center">
          <button
            onClick={handleContinueToEvaluation}
            className="inline-flex items-center px-8 py-4 bg-blue-600 text-white text-lg font-bold rounded-lg hover:bg-blue-700 transform hover:scale-105 transition-all shadow-lg hover:shadow-xl"
          >
            <span>我已了解评分标准，开始评测</span>
            <svg className="ml-2 w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </button>
          <p className="mt-3 text-sm text-gray-500">
            点击开始后，您可以随时保存进度并继续评测
          </p>
        </div>
      </div>
    </div>
  );
}