"use client";

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import EvaluationStandardsTable from '@/app/components/EvaluationStandardsTable';
import ErrorCategoriesTable from '@/app/components/ErrorCategoriesTable';

// v2 六维度错误评估详细说明
const DIMENSION_DETAILS = [
  {
    key: 'riskBlindness',
    name: '风险与预期失察',
    description: '未能识别或充分披露投资中的潜在风险，对未来收益过度乐观，忽视极端市场情况。',
    examples: ['只强调收益不提示风险', '基于历史数据线性外推', '忽略个人风险承受能力'],
  },
  {
    key: 'valueMisalignment',
    name: '用户价值错位',
    description: '给出的建议与用户实际需求不符，或包含诱导性、不切实际的配置方案。',
    examples: ['向保守投资者推荐高风险产品', '忽略用户流动性需求', '回答与问题重点不符'],
  },
  {
    key: 'conceptError',
    name: '概念与框架错配',
    description: '基础金融概念理解错误，或不当混合不同理论框架导致分析逻辑混乱。',
    examples: ['混淆股票和债券特征', '错误解释复利计算', '不合理结合不同投资理论'],
  },
  {
    key: 'dataHallucination',
    name: '数据幻觉',
    description: '编造不存在的数据、引用错误的历史信息或选择性呈现事实以支持结论。',
    examples: ['引用错误的历史收益率', '编造不存在的金融产品', '使用过时政策信息'],
  },
  {
    key: 'logicError',
    name: '逻辑与归因错误',
    description: '推理过程存在逻辑漏洞，将相关性误读为因果，或基于单一指标得出过度结论。',
    examples: ['后视镜偏见', '将相关性误读为因果', '基于单一指标过度推断'],
  },
  {
    key: 'precisionIllusion',
    name: '精准错觉',
    description: '给出看似精确但缺乏依据的数字、比例或价格判断，缺乏灵活性和场景适配。',
    examples: ['武断配置比例如"70%股票"', '设定僵化止损点位', '无根据的具体时间预测'],
  },
];

function GuidancePageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [userInfo, setUserInfo] = useState<any>(null);
  const [version, setVersion] = useState<'v1' | 'v2'>('v1');
  const [showV1Notice, setShowV1Notice] = useState(false);

  useEffect(() => {
    // 检查用户信息是否存在
    const storedUserInfo = localStorage.getItem('fineval_user_info');
    if (!storedUserInfo) {
      router.push('/');
      return;
    }
    setUserInfo(JSON.parse(storedUserInfo));

    // 获取版本参数：优先 URL，其次 localStorage
    const urlVersion = searchParams.get('version');
    if (urlVersion === 'v1' || urlVersion === 'v2') {
      setVersion(urlVersion);
      localStorage.setItem('fineval_selected_version', urlVersion);
    } else {
      const storedVersion = localStorage.getItem('fineval_selected_version');
      if (storedVersion === 'v1' || storedVersion === 'v2') {
        setVersion(storedVersion);
      }
    }

    // 检查是否从 v1 重定向过来
    const v1Notice = sessionStorage.getItem('v1_deprecated_notice');
    if (v1Notice === 'true') {
      setShowV1Notice(true);
      sessionStorage.removeItem('v1_deprecated_notice');
    }
  }, [router, searchParams]);

  const handleContinueToEvaluation = () => {
    router.push(`/select-questions?version=${version}`);
  };

  const isV2 = version === 'v2';

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
            在开始评测之前，请仔细阅读以下评分标准和{isV2 ? '六维度错误评估' : '错误分类'}说明，这将帮助您进行更准确和一致的评价。
          </p>
        </div>

        {/* v1 下线提示 */}
        {showV1Notice && (
          <div className="mb-6 p-4 bg-yellow-50 border border-yellow-300 rounded-lg">
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0">
                <svg className="w-5 h-5 text-yellow-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-bold text-yellow-800">旧题包（v1）已下线</h3>
                <p className="text-sm text-yellow-700 mt-1">
                  旧题包评测已结束，不再接受新的评测数据。系统已自动为您切换到新题包（v2）。新题包包含更完善的六维度错误评估体系，感谢您的持续参与。
                </p>
              </div>
            </div>
          </div>
        )}

        {/* 题包版本标识 */}
        <div className={`py-2 px-4 rounded-lg shadow-sm border text-center mb-6 ${
          isV2
            ? 'bg-green-50 border-green-200 text-green-800'
            : 'bg-blue-50 border-blue-200 text-blue-800'
        }`}>
          <span className="text-sm font-semibold">
            当前选择：{isV2 ? '新题包（v2）' : '旧题包（v1）'}
          </span>
        </div>

        {/* 评测说明卡片 */}
        <div className="bg-blue-50 rounded-lg p-6 mb-8 border border-blue-200">
          <h2 className="text-xl font-bold text-blue-900 mb-3">评测任务说明</h2>
          <div className="grid md:grid-cols-2 gap-6 text-sm text-blue-800">
            <div>
              <h3 className="font-semibold mb-2">📊 您将要做什么？</h3>
              <ul className="space-y-1 ml-4">
                <li>• 查看{isV2 ? '18' : '约60'}个金融投资相关问题</li>
                <li>• 每个问题有 8 个不同AI模型的回答</li>
                <li>• 对每个回答进行1-10分评分</li>
                {isV2 ? (
                  <li>• 从六个维度评估回答中的错误严重程度</li>
                ) : (
                  <li>• 标记回答中存在的错误类型</li>
                )}
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-2">⏱️ 预计用时与建议</h3>
              <ul className="space-y-1 ml-4">
                <li>• 总时长：{isV2 ? '约120' : '30-45'}分钟</li>
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

        {/* v1: 错误类别表格 */}
        {!isV2 && (
          <div className="mb-8">
            <ErrorCategoriesTable />
          </div>
        )}

        {/* v2: 六维度错误评估详细说明 */}
        {isV2 && (
          <div className="bg-white rounded-lg shadow-md overflow-hidden mb-8">
            <div className="px-6 py-4 bg-green-600 text-white">
              <h3 className="text-lg font-bold">六维度错误评估说明</h3>
              <p className="text-sm opacity-90 mt-1">
                请从以下六个维度评估每个AI回答中存在的错误严重程度（严重 / 明显 / 轻微 / 无）
              </p>
            </div>
            <div className="divide-y divide-gray-200">
              {DIMENSION_DETAILS.map((dim, index) => (
                <div key={dim.key} className={`p-6 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                  <div className="flex items-start space-x-4">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                        <span className="text-green-600 font-bold text-sm">{index + 1}</span>
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-lg font-semibold text-gray-900 mb-2">{dim.name}</h4>
                      <p className="text-gray-700 mb-3 leading-relaxed">{dim.description}</p>
                      <div>
                        <h5 className="text-sm font-semibold text-gray-800 mb-2">典型表现：</h5>
                        <ul className="grid md:grid-cols-2 gap-2">
                          {dim.examples.map((example, exampleIndex) => (
                            <li key={exampleIndex} className="flex items-start space-x-2 text-sm text-gray-600">
                              <span className="text-green-400 mt-1.5 flex-shrink-0">•</span>
                              <span>{example}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="px-6 py-4 bg-gray-50 border-t">
              <p className="text-xs text-gray-600">
                <strong>评分提示：</strong> 每个维度独立评估，一个回答可能在多个维度存在不同程度的问题。请根据实际内容客观判断，&quot;无&quot;表示该维度未发现问题。
              </p>
            </div>
          </div>
        )}

        {/* 开放反馈说明 */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h3 className="text-lg font-bold text-gray-900 mb-4">开放反馈说明</h3>
          <div className="grid md:grid-cols-2 gap-6 text-sm text-gray-700">
            <div>
              <h4 className="font-semibold mb-2">补充说明</h4>
              <p>您可以在评测结束后，对特定模型的回答进行补充或修正。这有助于我们收集更全面的评估信息。</p>
            </div>
            <div>
              <h4 className="font-semibold mb-2">整体评判</h4>
              <p>您可以对不同匿名模型给出整体评价，指出其优势与不足，或分享您认为印象深刻的题目。</p>
            </div>
          </div>
          {isV2 && (
            <div className="mt-4 p-3 bg-green-50 rounded-lg border border-green-200">
              <p className="text-sm text-green-800">
                <strong>v2 特别说明：</strong> 新题包包含六维度错误评估和开放反馈区，请在完成所有题目评分后，认真填写开放反馈，您的意见对改进评测体系非常重要。
              </p>
            </div>
          )}
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
                <li>• 给出武断的&quot;股票70%，债券30%&quot;建议</li>
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
              <h4 className="font-semibold mb-2">{isV2 ? '维度评估' : '标记错误'}：</h4>
              <ul className="space-y-1 ml-4">
                {isV2 ? (
                  <>
                    <li>• 六个维度独立评估，互不影响</li>
                    <li>• 即使高分回答也可能存在特定维度问题</li>
                    <li>• 没有发现错误时选择&quot;无&quot;</li>
                  </>
                ) : (
                  <>
                    <li>• 可多选，一个回答可能有多种错误</li>
                    <li>• 即使高分回答也可能存在特定问题</li>
                    <li>• 没有发现错误时可以不选</li>
                  </>
                )}
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

export default function GuidancePage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center">正在加载...</div>}>
      <GuidancePageInner />
    </Suspense>
  );
}
