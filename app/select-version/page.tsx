"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function SelectVersionPage() {
  const router = useRouter();
  const [userInfo, setUserInfo] = useState<any>(null);
  const [v1Count, setV1Count] = useState<number | null>(null);
  const [v2Count, setV2Count] = useState<number | null>(null);

  useEffect(() => {
    const storedUserInfo = localStorage.getItem("fineval_user_info");
    if (!storedUserInfo) {
      router.push("/");
      return;
    }
    setUserInfo(JSON.parse(storedUserInfo));

    // 动态获取各版本题目数量
    fetch("/api/question-counts")
      .then((res) => res.json())
      .then((data) => {
        setV1Count(data.v1 ?? null);
        setV2Count(data.v2 ?? null);
      })
      .catch(() => {
        // 降级：使用硬编码的近似值
        setV1Count(59);
        setV2Count(10);
      });
  }, [router]);

  const handleSelect = (version: "v1" | "v2") => {
    // 将选择结果存入 localStorage，供后续页面读取
    localStorage.setItem("fineval_selected_version", version);
    router.push(`/guidance?version=${version}`);
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
      <div className="max-w-2xl w-full">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            选择测评题库
          </h1>
          <p className="text-gray-600">
            您好，<span className="font-semibold text-blue-600">{userInfo.name}</span>！
            请根据您的偏好选择一套题库进行评测。
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* 旧题包 v1 */}
          <button
            onClick={() => handleSelect("v1")}
            className="bg-white p-6 rounded-2xl shadow-lg border-2 border-transparent hover:border-blue-500 hover:shadow-xl transition-all text-left group"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900 group-hover:text-blue-600 transition-colors">
                旧题包（v1）
              </h2>
              <span className="px-3 py-1 bg-gray-100 text-gray-600 text-sm rounded-full">
                经典版
              </span>
            </div>
            <p className="text-gray-600 mb-4 text-sm">
              覆盖广泛的金融投资场景，适合对RIA进行全面综合评估。
            </p>
            <ul className="text-sm text-gray-500 space-y-2 mb-4">
              <li className="flex items-center">
                <span className="w-1.5 h-1.5 bg-blue-500 rounded-full mr-2" />
                题目数量：{v1Count ?? "--"} 道
              </li>
              <li className="flex items-center">
                <span className="w-1.5 h-1.5 bg-blue-500 rounded-full mr-2" />
                评分系统：1-10分刻度 + 开放反馈
              </li>
              <li className="flex items-center">
                <span className="w-1.5 h-1.5 bg-blue-500 rounded-full mr-2" />
                每道题 8 个匿名模型回答
              </li>
            </ul>
            <div className="text-blue-600 font-semibold text-sm group-hover:underline">
              选择此题库 →
            </div>
          </button>

          {/* 新题包 v2 */}
          <button
            onClick={() => handleSelect("v2")}
            className="bg-white p-6 rounded-2xl shadow-lg border-2 border-transparent hover:border-green-500 hover:shadow-xl transition-all text-left group"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900 group-hover:text-green-600 transition-colors">
                新题包（v2）
              </h2>
              <span className="px-3 py-1 bg-green-100 text-green-700 text-sm rounded-full">
                升级版
              </span>
            </div>
            <p className="text-gray-600 mb-4 text-sm">
              聚焦深度分析能力评估，引入多维度错误检测框架。
            </p>
            <ul className="text-sm text-gray-500 space-y-2 mb-4">
              <li className="flex items-center">
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full mr-2" />
                题目数量：{v2Count ?? "--"} 道
              </li>
              <li className="flex items-center">
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full mr-2" />
                评分系统：1-10分刻度 + 六维度错误评估 + 开放反馈
              </li>
              <li className="flex items-center">
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full mr-2" />
                每道题 8 个匿名模型回答
              </li>
            </ul>
            <div className="text-green-600 font-semibold text-sm group-hover:underline">
              选择此题库 →
            </div>
          </button>
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          选择后可在评测过程中随时保存进度，下次登录可继续作答。
        </p>
      </div>
    </div>
  );
}
