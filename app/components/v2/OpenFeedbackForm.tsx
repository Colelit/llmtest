"use client";

import type { OpenFeedback } from "@/lib/types";

interface Props {
  value: OpenFeedback;
  onChange: (f: OpenFeedback) => void;
}

export default function OpenFeedbackForm({ value, onChange }: Props) {
  const handleChange = (key: keyof OpenFeedback, val: string) => {
    onChange({ ...value, [key]: val });
  };

  const Field = ({
    label,
    k,
    placeholder,
    rows = 3,
  }: {
    label: string;
    k: keyof OpenFeedback;
    placeholder: string;
    rows?: number;
  }) => (
    <div>
      <label className="block text-xs font-medium text-gray-700 mb-1">{label}</label>
      <textarea
        value={value[k]}
        onChange={(e) => handleChange(k, e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className="w-full px-3 py-2 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 resize-y"
      />
    </div>
  );

  return (
    <div className="space-y-4 bg-white p-4 rounded-xl shadow-lg border border-gray-200">
      <h3 className="text-sm font-bold text-gray-800">开放反馈区</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field
          label="左侧模型补充说明"
          k="supplementLeft"
          placeholder="对左侧模型回答的补充或修正..."
        />
        <Field
          label="右侧模型补充说明"
          k="supplementRight"
          placeholder="对右侧模型回答的补充或修正..."
        />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field
          label="匿名模型A 评判"
          k="modelAComment"
          placeholder="对匿名模型A的整体评价..."
        />
        <Field
          label="匿名模型B 评判"
          k="modelBComment"
          placeholder="对匿名模型B的整体评价..."
        />
      </div>
      <Field
        label="感兴趣的问题"
        k="interestedQuestions"
        placeholder="哪些题目让你印象深刻？"
      />
      <Field
        label="对问卷的建议"
        k="suggestions"
        placeholder="对评测流程或题目的建议..."
      />
    </div>
  );
}
