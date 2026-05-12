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
  Radar
} from 'recharts';
import { ERROR_CATEGORIES, ERROR_CATEGORY_KEYS } from '@/lib/types';

interface EvaluationData {
  score: number;
  cons: string[];
}

interface SubmissionData {
  user_name: string;
  user_profile: any;
  evaluation_data: {
    [questionId: string]: {
      [modelId: string]: EvaluationData;
    };
  };
  duration_seconds: number;
  created_at?: string;
}

export default function MyStatsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const name = searchParams.get('name');
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
          .single();

        if (queryError) throw queryError;
        if (!submission) throw new Error('未找到该用户的提交记录');

        setData(submission);
      } catch (err: any) {
        console.error('Fetch error:', err);
        setError(err.message || '获取数据失败');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [name, supabase]);

  // Data Processing for Charts
  const stats = useMemo(() => {
    if (!data || !data.evaluation_data) return null;

    const evalData = data.evaluation_data;
    const modelScores: { [key: string]: number } = {};
    const questionScores: any[] = [];
    const errorCounts: { [key: string]: number } = {};

    // Initialize error counts
    ERROR_CATEGORY_KEYS.forEach(key => {
      errorCounts[key] = 0;
    });

    Object.keys(evalData).forEach(qId => {
      const qData = evalData[qId];
      const qEntry: any = { question: qId }; // For chart

      Object.keys(qData).forEach(modelId => {
        const mData = qData[modelId];
        
        // Total Scores
        modelScores[modelId] = (modelScores[modelId] || 0) + mData.score;

        // Question Scores
        qEntry[modelId] = mData.score;

        // Error Counts
        if (mData.cons && Array.isArray(mData.cons)) {
          mData.cons.forEach(errKey => {
            if (errorCounts[errKey] !== undefined) {
              errorCounts[errKey]++;
            }
          });
        }
      });
      questionScores.push(qEntry);
    });

    // Format for Recharts
    const modelScoreData = Object.keys(modelScores).map(mId => ({
      name: mId.replace('model-', '模型 '), // Simplify name
      fullId: mId,
      score: modelScores[mId]
    }));

    const errorData = Object.keys(errorCounts).map(key => ({
      name: ERROR_CATEGORIES[key as keyof typeof ERROR_CATEGORIES] || key,
      count: errorCounts[key],
      key: key
    })).filter(item => item.count > 0); // Optional: filter out zero counts or keep them

    return {
      modelScoreData,
      questionScores,
      errorData,
      totalQuestions: Object.keys(evalData).length
    };
  }, [data]);

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
          <Link 
            href="/"
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            返回首页
          </Link>
        </div>
      </div>
    );
  }

  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}分${s}秒`;
  };

  return (
    <div className="min-h-screen bg-gray-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header & User Info */}
        <div className="bg-white rounded-2xl shadow-lg p-6 md:p-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">评测统计报告</h1>
              <p className="text-gray-500 mt-1">感谢您参与本次评测，以下是您的详细数据概览</p>
            </div>
            <Link 
                href="/"
                className="mt-4 md:mt-0 px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 text-sm font-medium transition-colors"
            >
                返回首页
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 border-t border-gray-100 pt-6">
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
          </div>
          
           <div className="mt-4 text-sm text-gray-500">
              <span className="mr-4">金融知识: {data.user_profile?.financialLearningYears}</span>
              <span className="mr-4">性别: {data.user_profile?.gender}</span>
              <span>使用频率: {data.user_profile?.usageFrequency || data.user_profile?.experience}</span>
           </div>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* 1. Model Total Scores */}
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

            {/* 4. Error Statistics */}
            <div className="bg-white p-6 rounded-2xl shadow-lg flex flex-col">
                <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center">
                    <span className="w-2 h-8 bg-red-500 rounded-full mr-3"></span>
                    模型问题分布
                </h2>
                <div className="h-[350px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                            data={stats?.errorData}
                            layout="vertical"
                            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                        >
                            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                            <XAxis type="number" allowDecimals={false} />
                            <YAxis type="category" dataKey="name" width={100} tick={{fontSize: 11}} />
                            <Tooltip
                                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                            />
                            <Bar dataKey="count" fill="#EF4444" radius={[0, 4, 4, 0]} barSize={24} name="出现次数" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
                <p className="text-xs text-gray-400 mt-4 text-center">
                    *统计了您在所有回答中标记的各类错误次数
                </p>
            </div>
        </div>

        {/* 3. Question Scores Detail */}
        <div className="bg-white p-6 rounded-2xl shadow-lg">
            <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center">
                <span className="w-2 h-8 bg-purple-600 rounded-full mr-3"></span>
                分题目得分详情
            </h2>
            <div className="h-[400px] w-full overflow-x-auto">
                 {/* For large number of questions, this might get crowded. We assume reasonable count due to selection. */}
                 {/* We need to dynamically generate Bar components for each model */}
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                        data={stats?.questionScores}
                        margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                    >
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="question" />
                        <YAxis domain={[0, 10]} />
                        <Tooltip 
                             contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                        />
                        <Legend />
                        {/* 
                          Ideally we want one bar per model.
                          Since model IDs are dynamic, we get them from keys of first entry.
                          But wait, model IDs might be shuffled or different per question? 
                          Actually in this app, models are model-a to model-h usually.
                          Let's grab keys from the first question data.
                        */}
                        {stats?.questionScores[0] && Object.keys(stats.questionScores[0])
                            .filter(k => k !== 'question')
                            .map((key, index) => (
                                <Bar 
                                    key={key} 
                                    dataKey={key} 
                                    fill={`hsl(${index * 45}, 70%, 50%)`} 
                                    name={key.replace('model-', '模型 ')}
                                    radius={[4, 4, 0, 0]}
                                />
                            ))
                        }
                    </BarChart>
                </ResponsiveContainer>
            </div>
             <p className="text-xs text-gray-400 mt-4 text-center">
                *展示了每一道题目中，不同模型的得分对比
            </p>
        </div>

      </div>
    </div>
  );
}

