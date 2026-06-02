import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// 固定的分组配置
const FIXED_GROUPS = [
  { group_index: 0, question_ids: ['q1', 'q2', 'q3'] },
  { group_index: 1, question_ids: ['q4', 'q5', 'q6'] },
  { group_index: 2, question_ids: ['q7', 'q8', 'q9'] },
];

const MIN_SAMPLES_PER_GROUP = 3;

export async function GET() {
  try {
    const supabase = await createClient();

    // 统计每个分组的当前用户数（只统计有效的组 0, 1, 2）
    const { data: submissions } = await supabase
      .from('submissions')
      .select('group_index, status')
      .eq('version', 'v2');

    const groupUserCounts: Record<number, { total: number, completed: number }> = {};
    submissions?.forEach(sub => {
      // 只统计组 0, 1, 2
      const idx = sub.group_index ?? 0;
      if (idx < 0 || idx > 2) return; // 跳过无效的组

      if (!groupUserCounts[idx]) {
        groupUserCounts[idx] = { total: 0, completed: 0 };
      }
      groupUserCounts[idx].total++;
      if (sub.status === 'completed') {
        groupUserCounts[idx].completed++;
      }
    });

    console.log('当前分组统计:', groupUserCounts);

    // 第一阶段：优先分配给 completed 样本数不足 3 的分组
    // 找到完成数最少的组
    let minCompleted = Infinity;
    let targetGroup = FIXED_GROUPS[0];

    for (const group of FIXED_GROUPS) {
      const count = groupUserCounts[group.group_index]?.completed || 0;
      if (count < MIN_SAMPLES_PER_GROUP && count < minCompleted) {
        minCompleted = count;
        targetGroup = group;
      }
    }

    if (minCompleted < MIN_SAMPLES_PER_GROUP) {
      const question_set = ['q0', ...targetGroup.question_ids];
      console.log(`分配到组 ${targetGroup.group_index} (${targetGroup.question_ids.join(',')}), 当前完成数: ${minCompleted}`);
      return NextResponse.json({
        group_index: targetGroup.group_index,
        question_ids: targetGroup.question_ids,
        question_set: question_set
      });
    }

    // 第二阶段：所有组都有3个完成样本后，轮询分配
    // 找到用户数最少的组
    let minGroupIndex = 0;
    let minUsers = Infinity;

    for (const group of FIXED_GROUPS) {
      const totalUsers = groupUserCounts[group.group_index]?.total || 0;
      if (totalUsers < minUsers) {
        minUsers = totalUsers;
        minGroupIndex = group.group_index;
      }
    }

    const selectedGroup = FIXED_GROUPS.find(g => g.group_index === minGroupIndex) || FIXED_GROUPS[0];
    const question_set = ['q0', ...selectedGroup.question_ids];
    console.log(`轮询分配到组 ${selectedGroup.group_index} (${selectedGroup.question_ids.join(',')})`);

    return NextResponse.json({
      group_index: selectedGroup.group_index,
      question_ids: selectedGroup.question_ids,
      question_set: question_set
    });

  } catch (error) {
    console.error('获取分组失败:', error);
    // 返回默认分组
    return NextResponse.json({
      group_index: 0,
      question_ids: ['q1', 'q2', 'q3'],
      question_set: ['q0', 'q1', 'q2', 'q3']
    });
  }
}

export async function POST(request: Request) {
  try {
    const { group_index } = await request.json();

    if (typeof group_index !== 'number') {
      return NextResponse.json({ error: '无效的组别' }, { status: 400 });
    }

    // POST 端点现在不需要做任何操作
    // 因为我们从 submissions 表统计用户数，不需要维护 question_groups 表

    return NextResponse.json({
      success: true,
      group_index: group_index,
      message: '分配已记录'
    });

  } catch (error) {
    console.error('分配组别失败:', error);
    return NextResponse.json({ error: '分配组别失败' }, { status: 500 });
  }
}