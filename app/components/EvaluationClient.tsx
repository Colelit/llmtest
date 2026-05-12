"use client";

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { Question, EvaluationData, LayoutMode } from '@/lib/types';
import { createClient } from '@/lib/supabase/client';
import EvaluationCard from './EvaluationCard';
import SidebarToggle from './SidebarToggle';

interface EvaluationState {
  [questionId: string]: {
    [modelId: string]: EvaluationData;
  };
}

export default function EvaluationClient({ allQuestions }: { allQuestions: Question[] }) {
  const router = useRouter();
  const supabase = createClient();

  const [userInfo, setUserInfo] = useState<{ name: string, profile: object, startTime: string } | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [currentPageIndex, setCurrentPageIndex] = useState(0); // 升级为通用分页索引
  const [evaluations, setEvaluations] = useState<EvaluationState>({});
  const [layoutMode, setLayoutMode] = useState<LayoutMode>('2x4'); // 默认为 2x4
  const [isCollapsed, setIsCollapsed] = useState(false); // 侧边栏折叠状态

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true); // 新增：用于加载历史记录的loading状态

  // Effect to run on component mount
  useEffect(() => {
    const initialize = async () => {
      // 1. 获取用户信息
      const storedUserInfo = localStorage.getItem('fineval_user_info');
      if (!storedUserInfo) {
        router.push('/');
        return;
      }
      const parsedUserInfo = JSON.parse(storedUserInfo);
      setUserInfo(parsedUserInfo);

      // 恢复侧边栏折叠状态
      const savedCollapsed = localStorage.getItem('sidebar_collapsed');
      if (savedCollapsed) {
        setIsCollapsed(savedCollapsed === 'true');
      }

      // 2. 初始化空的评价状态
      const initialEvals: EvaluationState = {};
      let lastQuestionId: string | null = null;
      allQuestions.forEach(q => {
        initialEvals[q.id] = {};
        q.answers.forEach(a => {
          initialEvals[q.id][a.modelId] = { score: 0, cons: [] };
        });
      });

      // 3. 加载用户历史进度
      const { data: progress, error } = await supabase
        .from('user_progress')
        .select('question_id, model_id, evaluation_data')
        .eq('user_id', parsedUserInfo.name);

      if (error) {
        console.error('获取进度失败:', error);
      } else if (progress && progress.length > 0) {
        progress.forEach(item => {
          if (initialEvals[item.question_id] && initialEvals[item.question_id][item.model_id]) {
            initialEvals[item.question_id][item.model_id] = item.evaluation_data;
            lastQuestionId = item.question_id;
          }
        });

        // 恢复到上次作答的问题
        if (lastQuestionId) {
          const lastIndex = allQuestions.findIndex(q => q.id === lastQuestionId);
          if (lastIndex !== -1) {
            setCurrentQuestionIndex(lastIndex);
          }
        }
      }

      setEvaluations(initialEvals);
      setIsLoading(false);
    };

    initialize();
  }, [allQuestions, router, supabase]);

  const handleUpdateEvaluation = useCallback(async (questionId: string, modelId: string, data: EvaluationData) => {
    // 立即更新UI
    setEvaluations(prev => ({
      ...prev,
      [questionId]: {
        ...prev[questionId],
        [modelId]: data,
      },
    }));

    // 后台保存到数据库
    if (userInfo) {
      const { error } = await supabase
        .from('user_progress')
        .upsert({
          user_id: userInfo.name,
          question_id: questionId,
          model_id: modelId,
          evaluation_data: data,
          updated_at: new Date().toISOString(),
        });

      if (error) {
        console.error('保存进度失败:', error);
        // 可以在这里给用户一些提示
      }
    }
  }, [supabase, userInfo]);

  // 侧边栏折叠切换函数
  const toggleSidebar = useCallback(() => {
    setIsCollapsed(prev => {
      const newState = !prev;
      localStorage.setItem('sidebar_collapsed', String(newState));
      return newState;
    });
  }, []);

  const goToQuestion = (index: number) => {
    if (index >= 0 && index < allQuestions.length) {
      setCurrentQuestionIndex(index);
      setCurrentPageIndex(0); // 切换问题时，重置分页索引
    }
  };

  const isEvaluationComplete = () => {
    return Object.values(evaluations).every(questionEvals =>
      Object.values(questionEvals).every(modelEval => modelEval.score > 0)
    );
  }
  // 新增：生成未完成评分的详细提示
  const getIncompleteMessage = () => {
    const items: string[] = [];
    allQuestions.forEach(q => {
      const missing = q.answers
        .filter(a => !evaluations[q.id] || !evaluations[q.id][a.modelId] || evaluations[q.id][a.modelId].score <= 0)
        .map(a => a.modelDisplayName);
      if (missing.length > 0) {
        items.push(`问题 ${q.id}（未评分：${missing.join('、')}）`);
      }
    });
    if (items.length === 0) return '';
    const limit = 8; // 提示最多显示8项，避免过长
    const listed = items.slice(0, limit).join('；');
    const remaining = items.length - limit;
    return remaining > 0
      ? `您还有未完成评分的项目：${listed}；等 ${remaining} 题。`
      : `您还有未完成评分的项目：${listed}。`;
  };

  const handleEarlySubmit = async () => {
    if (!userInfo) {
      setSubmitMessage("无法获取用户信息，请刷新重试。");
      return;
    }
    setIsSubmitting(true);
    setSubmitMessage("正在保存您的评测进度，请稍候...");

    const submissionData = {
      user_name: userInfo.name,
      user_profile: userInfo.profile,
      evaluation_data: evaluations,
      duration_seconds: Math.floor((new Date().getTime() - new Date(userInfo.startTime).getTime()) / 1000),
      status: 'in-progress', // 新增状态字段
    };

    // 使用 upsert 来更新或插入提交
    const { error } = await supabase.from('submissions').upsert(submissionData, { onConflict: 'user_name' });

    setIsSubmitting(false);
    if (error) {
      setSubmitMessage(`保存失败: ${error.message}`);
      console.error("Early submit error:", error);
    } else {
      setSubmitMessage('您的进度已成功保存！您可以随时关闭页面，下次使用相同昵称登录即可继续。');
      // 5秒后自动清除消息
      setTimeout(() => setSubmitMessage(''), 5000);
    }
  };

  const handleSubmit = async () => {
    if (!isEvaluationComplete()) {
      const msg = getIncompleteMessage();
      setSubmitMessage(msg || "您还有未完成评分的项目，请检查。");
      return;
    }
    if (!userInfo) {
      setSubmitMessage("无法获取用户信息，请刷新重试。");
      return;
    }

    setIsSubmitting(true);
    setSubmitMessage("正在提交所有评价，请稍候...");

    const submissionData = {
      user_name: userInfo.name,
      user_profile: userInfo.profile,
      evaluation_data: evaluations,
      duration_seconds: Math.floor((new Date().getTime() - new Date(userInfo.startTime).getTime()) / 1000),
      status: 'completed', // 状态为完成
    };

    // 最终提交也用 upsert，以防用户直接点这个
    const { error } = await supabase.from('submissions').upsert(submissionData, { onConflict: 'user_name' });

    if (error) {
      setIsSubmitting(false);
      setSubmitMessage(`提交失败: ${error.message}`);
    } else {
      // 提交成功后，清理该用户的进度
      await supabase.from('user_progress').delete().eq('user_id', userInfo.name);
      localStorage.removeItem('fineval_user_info');
      
      const params = new URLSearchParams();
      params.set('name', userInfo.name);
      router.push(`/thank-you?${params.toString()}`);
    }
  };

  if (isLoading || !userInfo) {
    return <div className="flex min-h-screen items-center justify-center">正在加载您的答题进度...</div>;
  }

  // 获取侧边栏 CSS 类
  const getSidebarClasses = () => {
    const baseClasses = 'bg-white shadow-md hidden md:block overflow-y-auto sidebar-transition relative';
    const widthClass = isCollapsed ? 'w-12' : 'w-48';
    const paddingClass = isCollapsed ? 'p-2' : 'p-6';
    
    return `${baseClasses} ${widthClass} ${paddingClass}`;
  };

  const currentQuestion = allQuestions[currentQuestionIndex];

  // 根据布局模式返回对应的CSS类和每页模型数
  const getModelsPerPage = () => {
    return layoutMode === '1x8' ? 1 : 2;
  };

  const getLayoutClasses = () => {
    switch (layoutMode) {
      case '1x8':
        return 'grid-cols-1';
      case '2x4':
      default:
        return 'grid-cols-1 md:grid-cols-2';
    }
  };

  // 根据布局和分页获取要展示的答案 (每题8个模型)
  const getAnswersToDisplay = () => {
    const answers = currentQuestion.answers;
    const modelsPerPage = getModelsPerPage();
    return answers.slice(currentPageIndex * modelsPerPage, currentPageIndex * modelsPerPage + modelsPerPage);
  };

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Left Sidebar for Navigation */}
      <aside className={getSidebarClasses()}>
        <SidebarToggle isCollapsed={isCollapsed} onToggle={toggleSidebar} />
        
        {!isCollapsed && (
          <>
            <div className="mb-6 text-center">
              <p className="text-sm text-gray-500">当前用户</p>
              <h2 className="text-lg font-bold text-blue-600 break-words">{userInfo?.name}</h2>
            </div>
            <h2 className="text-lg font-bold mb-4">问题列表</h2>
            <nav className="space-y-2">
              {allQuestions.map((q, index) => (
                <button
                  key={q.id}
                  onClick={() => goToQuestion(index)}
                  className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                    index === currentQuestionIndex ? 'bg-blue-100 text-blue-700 font-bold' : 'hover:bg-gray-100'
                  }`}
                >
                  问题 {q.id}
                </button>
              ))}
            </nav>
          </>
        )}
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-2 md:p-4 lg:p-6 flex flex-col">
        {/* 问题卡片区域 - 响应式高度分配 */}
        <div className="question-card-mobile question-card-desktop flex flex-col flex-1">
          <div className="flex-shrink-0 mb-1">
            <div className="py-2 px-3 bg-white rounded-lg shadow-md border border-gray-200">
              <h1 className="text-lg md:text-xl font-bold text-gray-800">
                问题 {currentQuestion.id}/{allQuestions.length}:
              </h1>
              <p className="mt-1 text-sm md:text-base text-gray-600">{currentQuestion.text}</p>
            </div>
          </div>

          <div className={`flex-1 grid ${getLayoutClasses()} gap-2 md:gap-3 overflow-y-auto smooth-scroll`}>
            {getAnswersToDisplay().map((answer, index) => (
              <EvaluationCard
                key={`${currentQuestion.id}-${answer.modelId}-${index}`}
                questionId={currentQuestion.id}
                answer={answer}
                evaluation={evaluations[currentQuestion.id]?.[answer.modelId]}
                onUpdate={handleUpdateEvaluation}
              />
            ))}
          </div>
        </div>

        {/* 底部控制区域 - 紧贴页面底部 */}
        <div className="flex-shrink-0 bg-white border-t border-gray-200">
          {/* 单行布局：分页 + 布局选择 + 问题导航 + 提交操作 */}
          <div className="flex flex-wrap justify-between items-center px-2 md:px-4 py-1 gap-2">
            {/* 左侧：分页控制 */}
            <div className="flex items-center space-x-2">
              {(() => {
                const totalPages = layoutMode === '1x8' ? 8 : 4;
                const pageUnit = layoutMode === '1x8' ? '模型' : '组';
                
                return (
                  <>
                    <button
                      onClick={() => setCurrentPageIndex(prev => Math.max(0, prev - 1))}
                      disabled={currentPageIndex === 0}
                      className="px-2 py-1 bg-gray-100 border rounded-md disabled:opacity-50 text-xs btn-hover hover:bg-gray-200 transition-colors"
                    >
                      上一{pageUnit}
                    </button>
                    <span className="text-xs font-medium text-gray-700 min-w-[60px] text-center">
                      第 {currentPageIndex + 1}/{totalPages} {pageUnit}
                    </span>
                    <button
                      onClick={() => setCurrentPageIndex(prev => Math.min(totalPages - 1, prev + 1))}
                      disabled={currentPageIndex === totalPages - 1}
                      className="px-2 py-1 bg-gray-100 border rounded-md disabled:opacity-50 text-xs btn-hover hover:bg-gray-200 transition-colors"
                    >
                      下一{pageUnit}
                    </button>
                  </>
                );
              })()}
            </div>

            {/* 中间左：布局选择器 */}
            <div className="flex items-center space-x-1">
              <span className="text-xs font-medium text-gray-700 hidden sm:inline">布局:</span>
              <button 
                onClick={() => setLayoutMode('1x8')} 
                className={`px-2 py-1 text-xs rounded-md btn-hover transition-colors ${
                  layoutMode === '1x8' ? 'bg-blue-600 text-white shadow-md' : 'bg-gray-100 border hover:bg-gray-200'
                }`}
              >
                1×8
              </button>
              <button 
                onClick={() => setLayoutMode('2x4')} 
                className={`px-2 py-1 text-xs rounded-md btn-hover transition-colors ${
                  layoutMode === '2x4' ? 'bg-blue-600 text-white shadow-md' : 'bg-gray-100 border hover:bg-gray-200'
                }`}
              >
                2×4
              </button>
            </div>

            {/* 中间右：提交按钮组 */}
            <div className="flex items-center space-x-1">
              <button
                onClick={handleEarlySubmit}
                disabled={isSubmitting}
                className="px-2 md:px-3 py-1 text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:bg-gray-400 font-medium btn-hover transition-colors text-xs"
              >
                {isSubmitting ? '处理中...' : '随时交卷'}
              </button>
              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className={`px-2 md:px-3 py-1 text-white rounded-md font-medium btn-hover transition-colors text-xs ${
                  isEvaluationComplete() ? 'bg-green-600 hover:bg-green-700' : 'bg-gray-400 hover:bg-gray-400 cursor-pointer'
                }`}
              >
                {isSubmitting ? '处理中...' : '完成提交'}
              </button>
            </div>

            {/* 右侧：问题导航 + 进度信息 */}
            <div className="flex items-center space-x-2">
              <button
                onClick={() => goToQuestion(currentQuestionIndex - 1)}
                disabled={currentQuestionIndex === 0}
                className="px-2 py-1 bg-gray-100 border rounded-md disabled:opacity-50 btn-hover hover:bg-gray-200 transition-colors text-xs"
              >
                上一问题
              </button>
              <span className="text-xs text-gray-500 hidden sm:inline">
                {currentQuestionIndex + 1}/{allQuestions.length}
              </span>
              <button
                onClick={() => goToQuestion(currentQuestionIndex + 1)}
                disabled={currentQuestionIndex === allQuestions.length - 1}
                className="px-2 py-1 bg-gray-100 border rounded-md disabled:opacity-50 btn-hover hover:bg-gray-200 transition-colors text-xs"
              >
                下一问题
              </button>
            </div>
          </div>

          {/* 提交信息 */}
          {submitMessage && (
            <div className="px-2 md:px-4 py-0.5 bg-gray-50 border-t border-gray-100">
              <p className={`text-xs text-center ${
                submitMessage.includes('失败') ? 'text-red-600' : 'text-green-600'
              }`}>
                {submitMessage}
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}