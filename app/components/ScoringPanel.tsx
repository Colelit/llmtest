"use client";

import type { ModelAnswer, EvaluationData, DimensionScores } from "@/lib/types";
import { ERROR_CATEGORIES, ERROR_CATEGORY_KEYS } from "@/lib/types";

interface ScoringPanelProps {
  answers: ModelAnswer[];
  evaluations: { [modelId: string]: EvaluationData };
  onUpdate: (modelId: string, data: EvaluationData) => void;
  version?: "v1" | "v2";
}

const DEFAULT_DIMENSIONS: DimensionScores = {
  riskBlindness: "none",
  valueMisalignment: "none",
  conceptError: "none",
  dataHallucination: "none",
  logicError: "none",
  precisionIllusion: "none",
};

const LEVELS = [
  { value: "severe" as const, label: "严重" },
  { value: "obvious" as const, label: "明显" },
  { value: "slight" as const, label: "轻微" },
  { value: "none" as const, label: "无" },
];

const DIMENSIONS = [
  { key: "riskBlindness" as const, label: "风险盲区" },
  { key: "valueMisalignment" as const, label: "价值错位" },
  { key: "conceptError" as const, label: "概念错误" },
  { key: "dataHallucination" as const, label: "数据幻觉" },
  { key: "logicError" as const, label: "逻辑错误" },
  { key: "precisionIllusion" as const, label: "精准错觉" },
];

export default function ScoringPanel({
  answers,
  evaluations,
  onUpdate,
  version = "v1",
}: ScoringPanelProps) {
  return (
    <div className="space-y-3">
      {answers.map((answer) => {
        const evalData = evaluations[answer.modelId] || { score: 0, cons: [] };

        const handleScoreChange = (score: number) => {
          onUpdate(answer.modelId, { ...evalData, score });
        };

        const handleCheckboxChange = (option: string) => {
          const newList = evalData.cons?.includes(option)
            ? evalData.cons.filter((item) => item !== option)
            : [...(evalData.cons || []), option];
          onUpdate(answer.modelId, { ...evalData, cons: newList });
        };

        const handleDimensionChange = (
          key: keyof DimensionScores,
          val: DimensionScores[keyof DimensionScores]
        ) => {
          onUpdate(answer.modelId, {
            ...evalData,
            dimensions: { ...(evalData.dimensions || DEFAULT_DIMENSIONS), [key]: val },
          });
        };

        return (
          <div key={answer.modelId} className="bg-gray-50 rounded-lg p-2 border border-gray-200">
            <h4 className="text-xs font-bold text-gray-800 mb-1.5 truncate">{answer.modelDisplayName}</h4>

            {/* 1-10 分评分 */}
            <div className="mb-2">
              <p className="text-xs font-medium text-gray-600 mb-1">评分</p>
              <div className="flex flex-wrap gap-0.5">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((s) => (
                  <button
                    key={s}
                    onClick={() => handleScoreChange(s)}
                    className={`w-5 h-5 rounded-full transition-colors text-[10px] flex items-center justify-center ${
                      evalData.score === s
                        ? "bg-blue-600 text-white"
                        : "bg-white border border-gray-300 hover:bg-gray-100 text-gray-700"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* v1: 错误类别复选框 */}
            {version === "v1" && (
              <div className="space-y-0.5">
                <p className="text-xs font-medium text-gray-600 mb-0.5">错误类别</p>
                {ERROR_CATEGORY_KEYS.map((key) => (
                  <label key={key} className="flex items-center space-x-1 text-[10px] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={evalData.cons?.includes(key) || false}
                      onChange={() => handleCheckboxChange(key)}
                      className="h-3 w-3 rounded border-gray-300 text-blue-600"
                    />
                    <span className="text-gray-700">{ERROR_CATEGORIES[key]}</span>
                  </label>
                ))}
              </div>
            )}

            {/* v2: 六维度评估 */}
            {version === "v2" && (
              <div className="space-y-1">
                <p className="text-xs font-medium text-gray-600">六维度</p>
                {DIMENSIONS.map((dim) => (
                  <div key={dim.key} className="flex items-center justify-between">
                    <span className="text-[10px] text-gray-600 w-14 shrink-0">{dim.label}</span>
                    <div className="flex gap-0.5">
                      {LEVELS.map((level) => (
                        <button
                          key={level.value}
                          onClick={() => handleDimensionChange(dim.key, level.value)}
                          className={`px-1 py-0.5 rounded text-[9px] transition-colors ${
                            (evalData.dimensions || DEFAULT_DIMENSIONS)[dim.key] === level.value
                              ? "bg-blue-600 text-white"
                              : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-100"
                          }`}
                        >
                          {level.label}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
