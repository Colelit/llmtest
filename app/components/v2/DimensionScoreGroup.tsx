"use client";

import type { DimensionScores } from "@/lib/types";

const DIMENSIONS: { key: keyof DimensionScores; label: string }[] = [
  { key: "riskBlindness", label: "风险与预期失察" },
  { key: "valueMisalignment", label: "用户价值错位" },
  { key: "conceptError", label: "概念与框架错配" },
  { key: "dataHallucination", label: "数据幻觉" },
  { key: "logicError", label: "逻辑与归因错误" },
  { key: "precisionIllusion", label: "虚假精确的幻觉" },
];

const LEVELS: { value: DimensionScores[keyof DimensionScores]; label: string }[] = [
  { value: "severe", label: "严重" },
  { value: "obvious", label: "明显" },
  { value: "slight", label: "轻微" },
  { value: "none", label: "无" },
];

interface Props {
  value: DimensionScores;
  onChange: (d: DimensionScores) => void;
}

export default function DimensionScoreGroup({ value, onChange }: Props) {
  const handleChange = (key: keyof DimensionScores, val: DimensionScores[keyof DimensionScores]) => {
    onChange({ ...value, [key]: val });
  };

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-gray-700">六维度评估</p>
      {DIMENSIONS.map((dim) => (
        <div key={dim.key} className="flex items-center justify-between">
          <span className="text-xs text-gray-700 w-24 shrink-0">{dim.label}</span>
          <div className="flex gap-1">
            {LEVELS.map((level) => (
              <button
                key={level.value}
                onClick={() => handleChange(dim.key, level.value)}
                className={`px-2 py-0.5 rounded text-xs transition-colors ${
                  value[dim.key] === level.value
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {level.label}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
