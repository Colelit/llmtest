"use client";

import { useEffect, useState, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from 'recharts';

// ============ v2 六维度配置 ============
const DIMENSION_KEYS = [
  'riskBlindness',
  'valueMisalignment',
  'conceptError',
  'dataHallucination',
  'logicError',
  'precisionIllusion',
] as const;

const DIMENSION_LABELS: Record<string, string> = {
  riskBlindness: '风险与预期失察',
  valueMisalignment: '用户价值错位',
  conceptError: '概念与框架错配',
  dataHallucination: '数据幻觉',
  logicError: '逻辑与归因错误',
  precisionIllusion: '精准错觉',
};

const SEVERITY_MAP: Record<string, number> = {
  none: 0,
  slight: 1,
  obvious: 2,
  severe: 3,
};

const SEVERITY_TEXT: Record<string, string> = {
  none: '无',
  slight: '轻微',
  obvious: '明显',
  severe: '严重',
};

const SEVERITY_BG: Record<string, string> = {
  none: 'bg-green-100 text-green-700',
  slight: 'bg-yellow-100 text-yellow-700',
  obvious: 'bg-orange-100 text-orange-700',
  severe: 'bg-red-100 text-red-700',
};

interface DimensionData {
  riskBlindness: string;
  valueMisalignment: string;
  conceptError: string;
  dataHallucination: string;
  logicError: string;
  precisionIllusion: string;
}

interface EvaluationData {
  score: number;
  dimensions: DimensionData;
}

interface OpenFeedback {
  suggestions?: string;
  modelAComment?: string;
  modelBComment?: string;
  supplementLeft?: string;
  supplementRight?: string;
  interestedQuestions?: string;
}

interface SubmissionData {
  user_name: string;
  user_profile: any;
  evaluation_data: {
    [questionId: string]: {
      [modelId: string]: EvaluationData;
    };
    __openFeedback?: OpenFeedback;
  };
  duration_seconds: number;
  created_at?: string;
  version?: string;
}

function formatModelName(modelId: string): string {
  const map: Record<string, string> = {
    Deepseek: 'DeepSeek',
    'model-b': '豆包',
    maxiaocai: '蚂小财',
    tonghuashun: '同花顺',
  };
  return map[modelId] || modelId;
}

export default function MyStatsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const name = searchParams?.get('name') ?? null;
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [data, setData] = useState<SubmissionData | null>(null);

  useEffect(() => {
    if (!name) {
      setError('未提供用户名');
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      try {
        const { data: submission, error: queryError } = await supabase
          .from('submissions')
          .select('*')
          .eq('user_name', name)
          .eq('version', 'v2')
          .maybeSingle();

        if (queryError) throw queryError;
        if (!submission) throw new Error('未找到该用户的 v2 提交记录');

        setData(submission as SubmissionData);
      } catch (err: any) {
        console.error('Fetch error:', err);
        setError(err.message || '获取数据失败');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [name, supabase]);

  // ============ 数据加工 ============
  const stats = useMemo(() => {
    if (!data || !data.evaluation_data) return null;

    const evalData = data.evaluation_data;
    const modelScores: Record<string, number> = {};
    const modelDimensionSums: Record<string, Record<string, number>> = {};
    const modelDimensionCounts: Record<string, Record<string, number>> = {};
    const questionScores: any[] = [];

    let openFeedback: OpenFeedback | null = null;

    Object.keys(evalData).forEach((qId) => {
      if (qId === '__openFeedback') {
        openFeedback = evalData[qId] as unknown as OpenFeedback;
        return;
      }

      const qData = evalData[qId];
      const qEntry: any = { question: qId };

      Object.keys(qData).forEach((modelId) => {
        const mData = qData[modelId];

        // 总分累加
        modelScores[modelId] = (modelScores[modelId] || 0) + mData.score;
        qEntry[modelId] = mData.score;

        // 六维度累加
        if (!modelDimensionSums[modelId]) {
          modelDimensionSums[modelId] = {};
          modelDimensionCounts[modelId] = {};
        }

        const dims = mData.dimensions || {};
        DIMENSION_KEYS.forEach((dimKey) => {
          const severity = (dims as any)[dimKey] || 'none';
          const num = SEVERITY_MAP[severity] ?? 0;
          modelDimensionSums[modelId][dimKey] = (modelDimensionSums[modelId][dimKey] || 0) + num;
          modelDimensionCounts[modelId][dimKey] = (modelDimensionCounts[modelId][dimKey] || 0) + 1;
        });
      });

      questionScores.push(qEntry);
    });

    // 模型总分数据（用于柱状图）
    const modelScoreData = Object.keys(modelScores).map((mId) => ({
      name: formatModelName(mId),
      fullId: mId,
      score: modelScores[mId],
    }));
    modelScoreData.sort((a, b) => b.score - a.score);

    // 六维度雷达图数据
    const allModels = Object.keys(modelScores);
    const radarData = DIMENSION_KEYS.map((dimKey) => {
      const entry: any = { dimension: DIMENSION_LABELS[dimKey] };
      allModels.forEach((mId) => {
        const sum = modelDimensionSums[mId]?.[dimKey] || 0;
        const count = modelDimensionCounts[mId]?.[dimKey] || 1;
        entry[mId] = Number((sum / count).toFixed(2));
      });
      return entry;
    });

    // 每个模型的六维度平均（用于详情卡片）
    const modelDimensionAvgs = allModels.map((mId) => {
      const dims: Record<string, { avg: number; severity: string; text: string; bgClass: string }> = {};
      DIMENSION_KEYS.forEach((dimKey) => {
        const sum = modelDimensionSums[mId]?.[dimKey] || 0;
        const count = modelDimensionCounts[mId]?.[dimKey] || 1;
        const avg = sum / count;
        // 找到最接近的平均严重度
        let closestSeverity = 'none';
        let closestDiff = Infinity;
        Object.entries(SEVERITY_MAP).forEach(([sev, num]) => {
          const diff = Math.abs(avg - num);
          if (diff < closestDiff) {
            closestDiff = diff;
            closestSeverity = sev;
          }
        });
        dims[dimKey] = {
          avg: Number(avg.toFixed(2)),
          severity: closestSeverity,
          text: SEVERITY_TEXT[closestSeverity],
          bgClass: SEVERITY_BG[closestSeverity],
        };
      });
      return {
        modelId: mId,
        modelName: formatModelName(mId),
        totalScore: modelScores[mId],
        dimensions: dims,
      };
    });
    modelDimensionAvgs.sort((a, b) => b.totalScore - a.totalScore);

    return {
      modelScoreData,
      questionScores,
      radarData,
      modelDimensionAvgs,
      allModels,
      openFeedback,
      totalQuestions: Object.keys(evalData).filter((k) => k !== '__openFeedback').length,
    };
  }, [data]);

  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}分${s}秒`;
  };

  // 雷达图颜色（8个模型）
  const RADAR_COLORS = [
    '#3B82F6', '#EF4444', '#10B981', '#F59E0B',
    '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16',
  ];

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-xl text-blue-600 font-semibold">正在生成您的统计报告...</div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 p-4">
        <div className="bg-white p-8 rounded-xl shadow-md text-center max-w-md">
          <h1 className="text-2xl font-bold text-red-600 mb-4">无法加载数据</h1>
          <p className="text-gray-600 mb-6">{error || '未找到数据'}</p>
          <Link href="/" className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors">
            返回首页
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* ============ 头部信息 ============ */}
        <div className="bg-white rounded-2xl shadow-lg p-6 md:p-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">评测统计报告</h1>
              <p className="text-gray-500 mt-1">感谢您参与本次 v2 评测，以下是您的详细数据概览</p>
            </div>
            <Link
              href="/"
              className="mt-4 md:mt-0 px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 text-sm font-medium transition-colors"
            >
              返回首页
            </Link>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 border-t border-gray-100 pt-6">
            <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
              <span className="block text-sm text-blue-600 font-semibold mb-1">评测官</span>
              <span className="block text-2xl font-bold text-gray-900">{data.user_name}</span>
            </div>
            <div className="bg-green-50 p-4 rounded-xl border border-green-100">
              <span className="block text-sm text-green-600 font-semibold mb-1">答题用时</span>
              <span className="block text-2xl font-bold text-gray-900">{formatDuration(data.duration_seconds)}</span>
            </div>
            <div className="bg-purple-50 p-4 rounded-xl border border-purple-100">
              <span className="block text-sm text-purple-600 font-semibold mb-1">完成题目</span>
              <span className="block text-2xl font-bold text-gray-900">{stats?.totalQuestions} 题</span>
            </div>
            <div className="bg-orange-50 p-4 rounded-xl border border-orange-100">
              <span className="block text-sm text-orange-600 font-semibold mb-1">测评版本</span>
              <span className="block text-2xl font-bold text-gray-900">{data.version?.toUpperCase() || 'V2'}</span>
            </div>
          </div>

          <div className="mt-4 text-sm text-gray-500">
            <span className="mr-4">金融知识: {data.user_profile?.financialLearningYears}</span>
            <span className="mr-4">性别: {data.user_profile?.gender}</span>
            <span>使用频率: {data.user_profile?.usageFrequency || data.user_profile?.experience}</span>
          </div>
        </div>

        {/* ============ 模型总得分 + 六维度雷达图 ============ */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* 模型总得分 */}
          <div className="bg-white p-6 rounded-2xl shadow-lg flex flex-col">
            <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center">
              <span className="w-2 h-8 bg-blue-600 rounded-full mr-3"></span>
              模型总得分排名
            </h2>
            <div className="h-[350px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={stats?.modelScoreData}
                  layout="vertical"
                  margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" width={80} />
                  <Tooltip
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                    cursor={{ fill: 'rgba(59, 130, 246, 0.1)' }}
                  />
                  <Bar dataKey="score" fill="#3B82F6" radius={[0, 4, 4, 0]} barSize={32} name="总分" />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <p className="text-xs text-gray-400 mt-4 text-center">
              *展示了您对不同模型给出的总评分累计
            </p>
          </div>

          {/* 六维度雷达图 */}
          <div className="bg-white p-6 rounded-2xl shadow-lg flex flex-col">
            <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center">
              <span className="w-2 h-8 bg-purple-600 rounded-full mr-3"></span>
              模型六维度错误雷达图
            </h2>
            <div className="h-[350px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={stats?.radarData}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="dimension" tick={{ fontSize: 11 }} />
                  <PolarRadiusAxis angle={90} domain={[0, 3]} tickCount={4} tick={{ fontSize: 10 }} />
                  {stats?.allModels.map((mId, idx) => (
                    <Radar
                      key={mId}
                      name={formatModelName(mId)}
                      dataKey={mId}
                      stroke={RADAR_COLORS[idx % RADAR_COLORS.length]}
                      fill={RADAR_COLORS[idx % RADAR_COLORS.length]}
                      fillOpacity={0.08}
                      strokeWidth={2}
                    />
                  ))}
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
            <p className="text-xs text-gray-400 mt-4 text-center">
              *数值越高表示错误越严重（0=无，1=轻微，2=明显，3=严重）
            </p>
          </div>
        </div>

        {/* ============ 六维度详情卡片 ============ */}
        <div className="bg-white p-6 rounded-2xl shadow-lg">
          <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center">
            <span className="w-2 h-8 bg-green-600 rounded-full mr-3"></span>
            模型六维度错误详情
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {stats?.modelDimensionAvgs.map((model) => (
              <div key={model.modelId} className="border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-bold text-gray-900">{model.modelName}</h3>
                  <span className="text-sm text-blue-600 font-semibold">总分: {model.totalScore}</span>
                </div>
                <div className="space-y-2">
                  {DIMENSION_KEYS.map((dimKey) => {
                    const dim = model.dimensions[dimKey];
                    return (
                      <div key={dimKey} className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">{DIMENSION_LABELS[dimKey]}</span>
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${dim.bgClass}`}>
                          {dim.text}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-4 text-center">
            *每个模型在六个维度上的平均错误严重程度
          </p>
        </div>

        {/* ============ 分题目得分详情 ============ */}
        <div className="bg-white p-6 rounded-2xl shadow-lg">
          <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center">
            <span className="w-2 h-8 bg-indigo-600 rounded-full mr-3"></span>
            分题目得分详情
          </h2>
          <div className="h-[400px] w-full overflow-x-auto">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats?.questionScores} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="question" />
                <YAxis domain={[0, 10]} />
                <Tooltip
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                />
                <Legend />
                {stats?.allModels.map((mId, idx) => (
                  <Bar
                    key={mId}
                    dataKey={mId}
                    fill={RADAR_COLORS[idx % RADAR_COLORS.length]}
                    name={formatModelName(mId)}
                    radius={[4, 4, 0, 0]}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="text-xs text-gray-400 mt-4 text-center">
            *展示了每一道题目中，不同模型的得分对比
          </p>
        </div>

        {/* ============ 开放反馈 ============ */}
        {stats?.openFeedback && (
          <div className="bg-white p-6 rounded-2xl shadow-lg">
            <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center">
              <span className="w-2 h-8 bg-pink-600 rounded-full mr-3"></span>
              开放反馈
            </h2>
            <div className="space-y-4">
              {stats.openFeedback.suggestions && (
                <div className="border border-gray-200 rounded-lg p-4">
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">建议与意见</h3>
                  <p className="text-gray-600 text-sm whitespace-pre-wrap">{stats.openFeedback.suggestions}</p>
                </div>
              )}
              {(stats.openFeedback.modelAComment || stats.openFeedback.modelBComment) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {stats.openFeedback.modelAComment && (
                    <div className="border border-gray-200 rounded-lg p-4">
                      <h3 className="text-sm font-semibold text-gray-700 mb-2">模型 A 评价</h3>
                      <p className="text-gray-600 text-sm whitespace-pre-wrap">{stats.openFeedback.modelAComment}</p>
                    </div>
                  )}
                  {stats.openFeedback.modelBComment && (
                    <div className="border border-gray-200 rounded-lg p-4">
                      <h3 className="text-sm font-semibold text-gray-700 mb-2">模型 B 评价</h3>
                      <p className="text-gray-600 text-sm whitespace-pre-wrap">{stats.openFeedback.modelBComment}</p>
                    </div>
                  )}
                </div>
              )}
              {(stats.openFeedback.supplementLeft || stats.openFeedback.supplementRight) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {stats.openFeedback.supplementLeft && (
                    <div className="border border-gray-200 rounded-lg p-4">
                      <h3 className="text-sm font-semibold text-gray-700 mb-2">左侧补充</h3>
                      <p className="text-gray-600 text-sm whitespace-pre-wrap">{stats.openFeedback.supplementLeft}</p>
                    </div>
                  )}
                  {stats.openFeedback.supplementRight && (
                    <div className="border border-gray-200 rounded-lg p-4">
                      <h3 className="text-sm font-semibold text-gray-700 mb-2">右侧补充</h3>
                      <p className="text-gray-600 text-sm whitespace-pre-wrap">{stats.openFeedback.supplementRight}</p>
                    </div>
                  )}
                </div>
              )}
              {stats.openFeedback.interestedQuestions && (
                <div className="border border-gray-200 rounded-lg p-4">
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">印象深刻的题目</h3>
                  <p className="text-gray-600 text-sm whitespace-pre-wrap">{stats.openFeedback.interestedQuestions}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
