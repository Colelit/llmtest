import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST() {
  try {
    const supabase = await createClient();

    // 清空现有分组
    const { error: deleteError } = await supabase
      .from('question_groups')
      .delete()
      .neq('group_index', -1); // 删除所有

    if (deleteError) {
      console.error('清空分组失败:', deleteError);
    }

    // 创建新分组
    const groups = [
      { group_index: 0, question_ids: ['q1', 'q2', 'q3'], target_users: 3, current_users: 0, is_active: true },
      { group_index: 1, question_ids: ['q4', 'q5', 'q6'], target_users: 3, current_users: 0, is_active: true },
      { group_index: 2, question_ids: ['q7', 'q8', 'q9'], target_users: 3, current_users: 0, is_active: true },
    ];

    for (const group of groups) {
      const { error: insertError } = await supabase
        .from('question_groups')
        .insert(group);

      if (insertError) {
        console.error(`插入组 ${group.group_index} 失败:`, insertError);
        return NextResponse.json({ error: insertError.message }, { status: 500 });
      }
    }

    // 验证结果
    const { data: result, error: fetchError } = await supabase
      .from('question_groups')
      .select('*')
      .order('group_index');

    if (fetchError) {
      console.error('查询分组失败:', fetchError);
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      groups: result
    });

  } catch (error) {
    console.error('初始化分组失败:', error);
    return NextResponse.json({ error: '初始化分组失败' }, { status: 500 });
  }
}