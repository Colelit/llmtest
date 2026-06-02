import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();

    // 获取所有分组信息
    const { data: groups, error } = await supabase
      .from('question_groups')
      .select('*')
      .order('group_index');

    if (error) {
      console.error('获取分组统计失败:', error);
      return NextResponse.json({ error: '获取分组统计失败' }, { status: 500 });
    }

    // 计算总体统计
    const totalGroups = groups?.length || 0;
    const totalTargetUsers = groups?.reduce((sum, group) => sum + group.target_users, 0) || 0;
    const totalCurrentUsers = groups?.reduce((sum, group) => sum + group.current_users, 0) || 0;
    const overallProgress = totalTargetUsers > 0 ? (totalCurrentUsers / totalTargetUsers) * 100 : 0;

    // 获取各组的实际用户数据
    const groupsWithStats = await Promise.all((groups || []).map(async (group) => {
      // 查询该组的已完成用户
      const { data: users, error: usersError } = await supabase
        .from('submissions')
        .select('user_name, status, created_at')
        .eq('version', 'v2')
        .eq('group_index', group.group_index);

      const completedUsers = users?.filter(u => u.status === 'completed') || [];
      const progress = (group.current_users / group.target_users) * 100;

      return {
        ...group,
        progress: Math.round(progress * 10) / 10, // 保留一位小数
        users: completedUsers.map(u => ({
          user_name: u.user_name,
          created_at: u.created_at
        })),
        user_count: completedUsers.length
      };
    }));

    return NextResponse.json({
      summary: {
        total_groups: totalGroups,
        total_target_users: totalTargetUsers,
        total_current_users: totalCurrentUsers,
        overall_progress: Math.round(overallProgress * 10) / 10
      },
      groups: groupsWithStats
    });

  } catch (error) {
    console.error('获取分组统计失败:', error);
    return NextResponse.json({ error: '获取分组统计失败' }, { status: 500 });
  }
}