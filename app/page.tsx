"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function WelcomePage() {
  const router = useRouter();
  const supabase = createClient();
  const [name, setName] = useState('');
  const [financialLearningYears, setFinancialLearningYears] = useState('无基础（0年）');
  const [gender, setGender] = useState('不愿透露');
  const [usageFrequency, setUsageFrequency] = useState('每天');
  
  const [isLoading, setIsLoading] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [formError, setFormError] = useState('');

  const proceedToEvaluation = () => {
    const userInfo = {
      name: name.trim(),
      profile: {
        financialLearningYears,
        gender,
        usageFrequency,
      },
      startTime: new Date().toISOString(),
    };
    localStorage.setItem('fineval_user_info', JSON.stringify(userInfo));
    router.push('/select-version');
  };

  const handleStart = async () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      setFormError('请输入您的昵称');
      return;
    }
    setFormError('');
    setIsLoading(true);

    try {
      const { data, error } = await supabase
        .from('submissions')
        .select('user_name')
        .eq('user_name', trimmedName)
        .limit(1);

      setIsLoading(false);

      if (error) {
        console.error('查询用户失败:', error);
        setFormError('数据库查询失败，请稍后重试。');
        return;
      }

      if (data && data.length > 0) {
        setShowConfirmation(true);
      } else {
        proceedToEvaluation();
      }
    } catch (err) {
      setIsLoading(false);
      console.error('提交出错:', err);
      setFormError('系统错误，请稍后重试。');
    }
  };

  const handleConfirmation = (isCurrentUser: boolean) => {
    setShowConfirmation(false);
    if (isCurrentUser) {
      proceedToEvaluation();
    } else {
      setFormError(`昵称 "${name.trim()}" 已被使用，建议使用 "${name.trim()}${Math.floor(Math.random() * 100)}" 或其他昵称。`);
    }
  };

  const ConfirmationModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-8 rounded-lg shadow-2xl text-center max-w-sm mx-auto">
        <h3 className="text-xl font-bold mb-4">确认用户</h3>
        <p className="mb-6">
          昵称 <span className="font-bold text-blue-600">&quot;{name.trim()}&quot;</span> 已存在。请问这是您本人吗？
        </p>
        <div className="space-y-3">
          <button
            onClick={() => handleConfirmation(true)}
            className="w-full px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-semibold"
          >
            是的，继续答题
          </button>
          <button
            onClick={() => handleConfirmation(false)}
            className="w-full px-6 py-3 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors font-semibold"
          >
            不是我，换个昵称
          </button>
        </div>
      </div>
    </div>
  );
  
  const FormError = () => {
      if (!formError) return null;
      
      const errorParts = formError.split(/(".*?")/);
  
      return (
          <p className="mt-2 text-sm text-red-600">
              {errorParts.map((part, index) => 
                  part.startsWith('"') && part.endsWith('"') ? 
                  <span key={index} className="font-semibold">{part.slice(1, -1)}</span> : 
                  part
              )}
          </p>
      );
  };

  return (
    <div className="min-h-screen bg-gray-100 text-gray-800 relative">
      
      {/* Confirmation Modal */}
      {showConfirmation && <ConfirmationModal />}

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-20">
        
        <header className="text-center mb-16">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-gray-900 tracking-tight leading-tight">
                欢迎来到智能投资助手<span className="text-blue-600">(RIA)</span>匿名评测平台
            </h1>
            <p className="mt-4 text-xl text-gray-600 max-w-3xl mx-auto">
                携手探索智能投资助手的边界，您的洞察至关重要
            </p>
        </header>

        <main className="grid md:grid-cols-3 gap-12 lg:gap-16">
          {/* Left Column: Project Info */}
          <div className="md:col-span-1 prose prose-lg max-w-none text-gray-700">
              <div className="p-6 bg-white rounded-lg shadow-sm border border-gray-200">
                <h2 className="!mt-0">关于我们与项目</h2>
                <p>您好！我们是来自清华大学五道口金融学院财富管理研究中心的研究人员。</p>
                <p>我们发起了这个项目，旨在建立一个以 &quot;人&quot; 为核心的评测基准，并创建一个高质量、开放的评测数据集，促进AI社区的透明与发展。</p>
              </div>
              
              <div className="mt-8 p-6 bg-white rounded-lg shadow-sm border border-gray-200">
                <h2 className="!mt-0">数据隐私与安全</h2>
                <p>我们郑重承诺保护您的隐私。所有模型均匿名处理，个人信息仅用于统计分析，绝不用于商业目的或分享。所有研究结果将以聚合、匿名的形式发布。</p>
              </div>

              <div className="mt-8 p-6 bg-white rounded-lg shadow-sm border border-gray-200">
                <h2 className="!mt-0">联系我们</h2>
                <p>有任何意见或者建议都可以邮件告知我们：</p>
                <p className="font-semibold text-blue-600 break-all">wuhh.2018@tsinghua.org.cn</p>
              </div>
          </div>

          {/* Right Column: Mission and Form */}
          <div className="md:col-span-2">
            <div className="bg-white p-8 md:p-10 rounded-2xl shadow-xl border border-gray-200">
              <div className="prose prose-lg max-w-none text-gray-700">
                  <h2>您的任务：成为 RIA 评测官</h2>
                  <p>接下来，您将化身为一位专业的 &quot;RIA 评测官&quot;。您的任务很简单：</p>
                  <ul>
                      <li><strong>比较回答</strong>：您可以自由选择回答N个不同的问题，以及 8个匿名RIA对这些问题的回答。</li>
                      <li><strong>打分评价</strong>：为每个回答打出 1-10星 的分数。</li>
                      <li><strong>勾选标签</strong>：勾选每个回答你认为的缺点。</li>
                      <li><strong>注</strong>：推荐使用谷歌浏览器，如果显示有不全的问题，请按下 ctrl + +(-) 放大(缩小)网页。</li>
                  </ul>
                  <p>整个评测过程预计需要 <strong> 10分钟（回答5题所需时间）</strong>。感谢您投入宝贵的时间参与这个有意义的项目！</p>
                  
                  <h3 className="text-center mt-10">准备好了吗？</h3>
                  <p className="text-center">请您填写以下基本信息，它将帮助我们更好地理解评测结果。</p>
              </div>

              <form  className="mt-8 space-y-6">
                <div className="space-y-4">
                  <div>
                    <label htmlFor="name" className="block text-sm font-semibold text-gray-800 mb-1">您的昵称：</label>
                    <input
                      id="name"
                      name="name"
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="appearance-none rounded-md relative block w-full px-4 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-base"
                      placeholder="请输入您的昵称"
                    />
                    {formError && <FormError />}
                  </div>
                  <div>
                    <label htmlFor="financialLearningYears" className="block text-sm font-semibold text-gray-800 mb-1">您的金融知识学习年限：</label>
                    <select
                      id="financialLearningYears"
                      name="financialLearningYears"
                      value={financialLearningYears}
                      onChange={(e) => setFinancialLearningYears(e.target.value)}
                      className="appearance-none rounded-md relative block w-full px-4 py-3 border border-gray-300 bg-white text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-base"
                    >
                      <option>无基础（0年）</option>
                      <option>初学者（1-2年）</option>
                      <option>中级（3-5年）</option>
                      <option>高级（5-10年）</option>
                      <option>专家级（10年以上）</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor="gender" className="block text-sm font-semibold text-gray-800 mb-1">您的性别：</label>
                    <select
                      id="gender"
                      name="gender"
                      value={gender}
                      onChange={(e) => setGender(e.target.value)}
                      className="appearance-none rounded-md relative block w-full px-4 py-3 border border-gray-300 bg-white text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-base"
                    >
                      <option>不愿透露</option>
                      <option>男性</option>
                      <option>女性</option>
                      <option>其他</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor="usage" className="block text-sm font-semibold text-gray-800 mb-1">您使用大模型的频率：</label>
                    <select
                      id="usage"
                      name="usage"
                      value={usageFrequency}
                      onChange={(e) => setUsageFrequency(e.target.value)}
                      className="appearance-none rounded-md relative block w-full px-4 py-3 border border-gray-300 bg-white text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-base"
                    >
                      <option>每天</option>
                      <option>每周数次</option>
                      <option>偶尔使用</option>
                      <option>几乎不用</option>
                    </select>
                  </div>
                </div>

                <div className="pt-4 text-center">
                  <button
                    type="button"
                    onClick={handleStart}
                    disabled={isLoading || showConfirmation}
                    className="w-full md:w-1/2 lg:w-auto inline-block py-4 px-12 border border-transparent text-lg font-bold rounded-full text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all transform hover:scale-105 shadow-lg hover:shadow-xl disabled:bg-gray-400 disabled:cursor-not-allowed"
                  >
                    {isLoading ? '查询中...' : '开始评测'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
