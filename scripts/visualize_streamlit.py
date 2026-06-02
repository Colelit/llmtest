import os
import json
import math
import pandas as pd
import streamlit as st
import altair as alt
import plotly.express as px

st.set_page_config(page_title="RIA 评测可视化 (v2)", layout="wide")

DEFAULT_DATA_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "submissions_rows.json")
Q_TYPE_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "q_type.json")

# ============ 题目分类配置 ============
QUESTION_CATEGORIES = {
    "现况解析": ["q1", "q2", "q3", "q5", "q6", "q7"],
    "涨跌预测": ["q4", "q8"],
    "投资建议": ["q9"]
}

CATEGORY_ORDER = ["现况解析", "涨跌预测", "投资建议"]

def get_question_category(qid: str) -> str:
    """根据题目ID返回类别"""
    for category, qids in QUESTION_CATEGORIES.items():
        if str(qid) in qids:
            return category
    return "其他"

def get_dynamic_range(values, padding=0.1, min_val=None, max_val=None):
    """计算动态区间，上下各留 padding 空间"""
    v_min = values.min() if hasattr(values, 'min') else min(values)
    v_max = values.max() if hasattr(values, 'max') else max(values)

    if v_min == v_max:
        return v_min - 1, v_max + 1

    range_val = v_max - v_min
    lower = math.floor(v_min - range_val * padding)
    upper = math.ceil(v_max + range_val * padding)

    # 应用最小最大值限制
    if min_val is not None:
        lower = max(lower, min_val)
    if max_val is not None:
        upper = min(upper, max_val)

    return lower, upper

# ============ 模型名称映射 ============
MODEL_DISPLAY_MAP = {
    "Deepseek": "DeepSeek",
    "model-b": "豆包",
    "maxiaocai": "蚂小财",
    "tonghuashun": "同花顺",
}

def map_model_name(model_name: str) -> str:
    return MODEL_DISPLAY_MAP.get(model_name, model_name)

# ============ v2 六维度配置 ============
DIMENSION_KEYS = [
    "riskBlindness",
    "valueMisalignment",
    "conceptError",
    "dataHallucination",
    "logicError",
    "precisionIllusion",
]

DIMENSION_LABELS = {
    "riskBlindness": "风险与预期失察",
    "valueMisalignment": "用户价值错位",
    "conceptError": "概念与框架错配",
    "dataHallucination": "数据幻觉",
    "logicError": "逻辑与归因错误",
    "precisionIllusion": "精准错觉",
}

DIMENSION_LABELS_LIST = [DIMENSION_LABELS[k] for k in DIMENSION_KEYS]

SEVERITY_ORDER = ["none", "slight", "obvious", "severe"]
SEVERITY_MAP = {"none": 0, "slight": 1, "obvious": 2, "severe": 3}
SEVERITY_LABELS = {"none": "无", "slight": "轻微", "obvious": "明显", "severe": "严重"}

# 热力图颜色：none(浅绿) → slight(黄) → obvious(橙) → severe(红)
SEVERITY_COLOR_SCALE = alt.Scale(
    domain=[0, 1, 2, 3],
    range=["#dcfce7", "#fef08a", "#fdba74", "#ef4444"],
)

SEVERITY_OPACITY_SCALE = alt.Scale(
    domain=["none", "slight", "obvious", "severe"],
    range=[0.15, 0.4, 0.7, 1.0],
)


def load_json(path: str):
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def parse_json_field(value):
    if value is None:
        return {}
    if isinstance(value, dict):
        return value
    if isinstance(value, str):
        value = value.strip()
        if not value:
            return {}
        try:
            return json.loads(value)
        except Exception:
            try:
                return json.loads(json.loads(value))
            except Exception:
                return {}
    return {}


def load_q_types(path: str):
    try:
        data = load_json(path)
    except Exception:
        return {}, {}, [], []

    qid_to_chain = {}
    qid_to_stage = {}
    chain_order = []
    stage_order = []

    for stage in data or []:
        stage_name = stage.get("stage_name")
        if not stage_name:
            continue
        stage_order.append(stage_name)

        value_chains = stage.get("value_chains", {}) or {}
        for chain_name, idx_list in value_chains.items():
            if chain_name not in chain_order:
                chain_order.append(chain_name)
            for qidx in idx_list or []:
                try:
                    q = int(qidx)
                except Exception:
                    continue
                qid_to_chain[q] = chain_name
                qid_to_stage[q] = stage_name

    chain_order = list(dict.fromkeys(chain_order))
    stage_order = list(dict.fromkeys(stage_order))
    return qid_to_chain, qid_to_stage, chain_order, stage_order


def build_profiles_and_evals(submissions):
    """解析 v2 数据，返回 profiles_df, eval_df, dimension_df, open_feedback_df"""
    profiles_rows = []
    eval_rows = []
    dimension_rows = []
    open_feedback_rows = []

    for row in submissions:
        user_name = row.get("user_name", "未知用户")
        status = row.get("status", None)
        created_at = row.get("created_at", None)
        version = row.get("version", "v1")

        profile = parse_json_field(row.get("user_profile"))
        eval_data = parse_json_field(row.get("evaluation_data"))

        profiles_rows.append({
            "user_name": user_name,
            "gender": profile.get("gender", "未知"),
            "usageFrequency": profile.get("usageFrequency", "未知"),
            "financialLearningYears": profile.get("financialLearningYears", "未知"),
            "status": status,
            "created_at": created_at,
            "version": version,
        })

        # 开放反馈
        open_fb = eval_data.pop("__openFeedback", {}) if isinstance(eval_data, dict) else {}
        if open_fb and isinstance(open_fb, dict):
            has_content = any(v and str(v).strip() for v in open_fb.values())
            if has_content:
                open_feedback_rows.append({
                    "user_name": user_name,
                    "suggestions": open_fb.get("suggestions", ""),
                    "modelAComment": open_fb.get("modelAComment", ""),
                    "modelBComment": open_fb.get("modelBComment", ""),
                    "supplementLeft": open_fb.get("supplementLeft", ""),
                    "supplementRight": open_fb.get("supplementRight", ""),
                    "interestedQuestions": open_fb.get("interestedQuestions", ""),
                })

        # 评分与六维度展开
        for qid, model_map in (eval_data or {}).items():
            for model_name, eval_obj in (model_map or {}).items():
                score = 0
                dims = {}
                if isinstance(eval_obj, dict):
                    score = eval_obj.get("score", 0) or 0
                    dims = eval_obj.get("dimensions", {}) or {}

                mapped_name = map_model_name(str(model_name))

                eval_rows.append({
                    "user_name": user_name,
                    "question_id": str(qid),
                    "model_name": mapped_name,
                    "score": int(score),
                    "status": status,
                    "version": version,
                })

                for dim_key in DIMENSION_KEYS:
                    severity = dims.get(dim_key, "none") if isinstance(dims, dict) else "none"
                    if severity not in SEVERITY_MAP:
                        severity = "none"
                    dimension_rows.append({
                        "user_name": user_name,
                        "question_id": str(qid),
                        "model_name": mapped_name,
                        "dimension": DIMENSION_LABELS.get(dim_key, dim_key),
                        "dimension_key": dim_key,
                        "severity": severity,
                        "severity_num": SEVERITY_MAP[severity],
                        "status": status,
                        "version": version,
                    })

    profiles_df = pd.DataFrame(profiles_rows)
    eval_df = pd.DataFrame(eval_rows)
    dimension_df = pd.DataFrame(dimension_rows)
    open_feedback_df = pd.DataFrame(open_feedback_rows)
    return profiles_df, eval_df, dimension_df, open_feedback_df


def pie_chart_from_series(title, series):
    df = series.value_counts(dropna=False).rename_axis("category").reset_index(name="count")
    if df.empty:
        st.info(f"{title}暂无数据")
        return
    chart = alt.Chart(df).mark_arc(innerRadius=40).encode(
        theta=alt.Theta(field="count", type="quantitative"),
        color=alt.Color(field="category", type="nominal", legend=alt.Legend(title=title)),
        tooltip=[alt.Tooltip("category:N", title=title), alt.Tooltip("count:Q", title="数量")]
    ).properties(width=280, height=280, title=title)
    st.altair_chart(chart, use_container_width=False)


def bar_chart_with_error(title_text, df, x_field, y_field, std_field=None, tooltip_fields=None, sort_desc=True, y_domain=None, dynamic_axis=False):
    if df.empty:
        st.info(f"{title_text}暂无数据")
        return

    sort_value = alt.SortField(field=y_field, order="descending" if sort_desc else "ascending")

    # 动态计算Y轴范围
    if dynamic_axis and y_domain is None:
        y_min, y_max = get_dynamic_range(df[y_field], padding=0.1)
        y_domain = [y_min, y_max]

    bars = alt.Chart(df).mark_bar().encode(
        x=alt.X(f"{x_field}:N", sort=sort_value, title=title_text),
        y=alt.Y(f"{y_field}:Q", title="值", scale=alt.Scale(domain=y_domain) if y_domain else alt.Scale()),
        color=alt.Color(
            f"{y_field}:Q",
            title="数值",
            scale=alt.Scale(scheme="reds", domain=y_domain) if y_domain else alt.Scale(scheme="reds"),
            legend=None,
        ),
        tooltip=tooltip_fields or ([x_field, y_field] + ([std_field] if std_field else [])),
    ).properties(height=360)

    if std_field:
        d = df.copy()
        d[std_field] = d[std_field].fillna(0)
        lower = d[y_field] - d[std_field]
        upper = d[y_field] + d[std_field]
        if y_domain:
            lower = lower.clip(lower=y_domain[0])
            upper = upper.clip(upper=y_domain[1])
        d["lower"] = lower
        d["upper"] = upper

        errorbar = alt.Chart(d).mark_errorbar().encode(
            x=alt.X(f"{x_field}:N", sort=sort_value),
            y=alt.Y("lower:Q"),
            y2="upper:Q",
        )
        chart = bars + errorbar
    else:
        chart = bars

    st.altair_chart(chart, use_container_width=True)


def plot_score_radar_chart(title_text, radar_df, categories, fill_area=True, use_contrast_colors=False, dynamic_range=False):
    """基于平均得分的雷达图（0-10分或动态范围）"""
    if radar_df.empty:
        st.info(f"{title_text}暂无数据")
        return

    plot_df = radar_df[["model_name", "category", "value"]].copy()
    plot_df["category"] = pd.Categorical(plot_df["category"], categories=categories, ordered=True)
    categories_clean = [str(c).strip() for c in categories]
    plot_df["category"] = plot_df["category"].astype(str).str.strip()

    # 对比色配色方案
    if use_contrast_colors:
        color_discrete_sequence = [
            "#FF6B6B",  # 红色
            "#4ECDC4",  # 青色
            "#45B7D1",  # 蓝色
            "#96CEB4",  # 绿色
            "#FFEAA7",  # 黄色
            "#DDA0DD",  # 紫色
        ]
        color_discrete_sequence = color_discrete_sequence[:len(plot_df["model_name"].unique())]
    else:
        color_discrete_sequence = None

    fig = px.line_polar(
        plot_df,
        r="value",
        theta="category",
        color="model_name",
        line_close=True,
        markers=True,
        color_discrete_sequence=color_discrete_sequence,
    )

    # 向外填充
    if fill_area:
        fig.update_traces(fill='toself')

    # 计算动态Y轴范围
    if dynamic_range:
        min_val = math.floor(plot_df["value"].min())
        max_val = math.ceil(plot_df["value"].max())
        if min_val == max_val:
            min_val -= 1
            max_val += 1
        radial_range = [min_val, max_val]
        dtick_val = 1
    else:
        radial_range = [0, 10]
        dtick_val = 2

    fig.update_layout(
        title=title_text,
        polar=dict(
            radialaxis=dict(range=radial_range, dtick=dtick_val, showline=True),
            angularaxis=dict(
                showline=True,
                rotation=90,
                direction="clockwise",
                categoryorder="array",
                categoryarray=categories_clean,
                tickfont=dict(size=12),
            ),
        ),
        legend_title_text="模型",
        margin=dict(l=20, r=20, t=50, b=120),
    )
    st.plotly_chart(fig, use_container_width=True)


def plot_severity_radar_chart(title_text, radar_df, categories):
    """基于严重度（0-3）的雷达图"""
    if radar_df.empty:
        st.info(f"{title_text}暂无数据")
        return

    plot_df = radar_df[["model_name", "category", "value"]].copy()
    plot_df["category"] = pd.Categorical(plot_df["category"], categories=categories, ordered=True)
    categories_clean = [str(c).strip() for c in categories]
    plot_df["category"] = plot_df["category"].astype(str).str.strip()

    fig = px.line_polar(
        plot_df,
        r="value",
        theta="category",
        color="model_name",
        line_close=True,
        markers=True,
    )
    fig.update_layout(
        title=title_text,
        polar=dict(
            radialaxis=dict(range=[0, 3], dtick=1, showline=True),
            angularaxis=dict(
                showline=True,
                rotation=90,
                direction="clockwise",
                categoryorder="array",
                categoryarray=categories_clean,
                tickfont=dict(size=12),
            ),
        ),
        legend_title_text="模型",
        margin=dict(l=20, r=20, t=50, b=120),
    )
    st.plotly_chart(fig, use_container_width=True)


def build_score_radar_dataset(eval_df: pd.DataFrame, category_col: str, categories: list):
    """按分类维度聚合模型平均得分（0-10）"""
    df = eval_df.dropna(subset=[category_col]).copy()
    if df.empty or len(categories) == 0:
        return pd.DataFrame()

    agg = df.groupby(["model_name", category_col])["score"].mean().reset_index()
    agg = agg.rename(columns={category_col: "category", "score": "value"})

    all_models = sorted(df["model_name"].unique().tolist())
    grid = pd.MultiIndex.from_product([all_models, categories], names=["model_name", "category"])
    grid_df = pd.DataFrame(index=grid).reset_index()
    radar_df = grid_df.merge(agg, on=["model_name", "category"], how="left")
    radar_df["value"] = radar_df["value"].fillna(0.0)
    radar_df["category"] = pd.Categorical(radar_df["category"], categories=categories, ordered=True)
    return radar_df


def build_severity_radar_dataset(dimension_df: pd.DataFrame, category_col: str, categories: list):
    """按分类维度聚合模型平均严重度（0-3）"""
    df = dimension_df.dropna(subset=[category_col]).copy()
    if df.empty or len(categories) == 0:
        return pd.DataFrame()

    agg = df.groupby(["model_name", category_col])["severity_num"].mean().reset_index()
    agg = agg.rename(columns={category_col: "category", "severity_num": "value"})

    all_models = sorted(df["model_name"].unique().tolist())
    grid = pd.MultiIndex.from_product([all_models, categories], names=["model_name", "category"])
    grid_df = pd.DataFrame(index=grid).reset_index()
    radar_df = grid_df.merge(agg, on=["model_name", "category"], how="left")
    radar_df["value"] = radar_df["value"].fillna(0.0)
    radar_df["category"] = pd.Categorical(radar_df["category"], categories=categories, ordered=True)
    return radar_df


def build_category_scores(eval_df: pd.DataFrame) -> pd.DataFrame:
    """计算每个模型在各类题目上的平均得分"""
    eval_df["category"] = eval_df["question_id"].apply(get_question_category)
    category_scores = eval_df.groupby(["model_name", "category"])["score"].mean().reset_index()
    category_scores = category_scores.rename(columns={"score": "value"})

    # 过滤掉"其他"类别
    category_scores = category_scores[category_scores["category"].isin(CATEGORY_ORDER)]

    if category_scores.empty:
        return pd.DataFrame()

    all_models = sorted(eval_df["model_name"].unique().tolist())
    grid = pd.MultiIndex.from_product([all_models, CATEGORY_ORDER], names=["model_name", "category"])
    grid_df = pd.DataFrame(index=grid).reset_index()
    radar_df = grid_df.merge(category_scores, on=["model_name", "category"], how="left")
    radar_df["value"] = radar_df["value"].fillna(0.0)
    radar_df["category"] = pd.Categorical(radar_df["category"], categories=CATEGORY_ORDER, ordered=True)
    return radar_df


def build_model_dimension_severity(dimension_df: pd.DataFrame) -> pd.DataFrame:
    """计算模型在六维度上的平均严重度（用于模型-维度雷达图）"""
    model_dim = dimension_df.groupby(["model_name", "dimension"])["severity_num"].mean().reset_index()
    model_dim = model_dim.rename(columns={"severity_num": "value"})

    all_models = sorted(dimension_df["model_name"].unique().tolist())
    grid = pd.MultiIndex.from_product([all_models, DIMENSION_LABELS_LIST], names=["model_name", "category"])
    grid_df = pd.DataFrame(index=grid).reset_index()
    radar_df = grid_df.merge(model_dim, left_on=["model_name", "category"], right_on=["model_name", "dimension"], how="left")
    radar_df = radar_df.rename(columns={"dimension": "original_dimension"})
    radar_df["value"] = radar_df["value"].fillna(0.0)
    radar_df["category"] = pd.Categorical(radar_df["category"], categories=DIMENSION_LABELS_LIST, ordered=True)
    return radar_df[["model_name", "category", "value"]]


def build_dimension_frequency(dimension_df: pd.DataFrame) -> pd.DataFrame:
    """计算六维度错误频次（模型×维度）"""
    freq = dimension_df.groupby(["model_name", "dimension"]).size().reset_index(name="frequency")
    return freq


def get_group_stats():
    """从API获取分组统计信息"""
    try:
        import requests
        response = requests.get("http://localhost:10005/api/group-stats", timeout=5)
        if response.status_code == 200:
            return response.json()
        else:
            return None
    except Exception:
        return None


def load_from_supabase():
    """从 Supabase 直接获取最新数据"""
    try:
        from export_supabase import get_client
        client = get_client()

        result = client.table('submissions').select('*').eq('version', 'v2').execute()
        if result.data:
            return result.data
        return None
    except Exception as e:
        print(f"从 Supabase 加载数据失败: {e}")
        return None


def main():
    st.title("RIA 评测数据可视化 (v2)")

    st.sidebar.header("数据设置")

    # 数据源选择
    data_source = st.sidebar.radio("数据源", ["Supabase 实时数据", "本地 JSON 文件"], index=0)

    submissions = None
    data_source_info = ""

    if data_source == "Supabase 实时数据":
        submissions = load_from_supabase()
        if submissions:
            data_source_info = f"✓ Supabase 实时数据 ({len(submissions)} 条记录)"
            last_updated = datetime.datetime.now().strftime("%H:%M:%S")
            st.sidebar.success(f"{data_source_info} (更新于 {last_updated})")
        else:
            st.sidebar.error("无法连接 Supabase，使用本地数据")
            data_source = "本地 JSON 文件"

    if data_source == "本地 JSON 文件":
        data_path = st.sidebar.text_input("数据文件路径", DEFAULT_DATA_PATH)
        if os.path.exists(data_path):
            submissions = load_json(data_path)
            data_source_info = f"本地文件: {os.path.basename(data_path)}"
            st.sidebar.info(data_source_info)
        else:
            st.error(f"数据文件不存在：{data_path}")
            st.stop()

    view_mode = st.sidebar.radio("视图模式", ["全题目视图", "分组视图"], index=0)
    status_filter = st.sidebar.radio("筛选提交状态", ["全部", "已完成"], index=1)
    exclude_zero = st.sidebar.checkbox("排除未评分（0分）", value=True)

    if not submissions:
        st.error("无法加载数据")
        st.stop()

    profiles_df, eval_df, dimension_df, open_feedback_df = build_profiles_and_evals(submissions)

    # ==================== 分组统计 ====================
    if view_mode == "分组视图":
        st.subheader("分组统计")
        group_data = get_group_stats()

        if group_data and group_data.get('groups'):
            summary = group_data.get('summary', {})
            groups = group_data.get('groups', [])

            col1, col2, col3, col4 = st.columns(4)
            col1.metric("总分组数", summary.get('total_groups', 0))
            col2.metric("目标用户数", summary.get('total_target_users', 0))
            col3.metric("已完成用户数", summary.get('total_current_users', 0))
            col4.metric("总体进度", f"{summary.get('overall_progress', 0):.1f}%")

            # 分组进度表格
            st.write("各组进度：")
            group_table = []
            for group in groups:
                progress = (group.get('current_users', 0) / group.get('target_users', 1)) * 100
                group_table.append({
                    "组别": f"组 {group['group_index']}",
                    "题目": ', '.join(group.get('question_ids', [])),
                    "进度": f"{group.get('current_users', 0)}/{group.get('target_users', 0)}",
                    "完成度": f"{progress:.1f}%",
                })

            if group_table:
                st.dataframe(pd.DataFrame(group_table), use_container_width=True, hide_index=True)
        else:
            st.info("暂无分组数据或API未连接")

    # 题目分类加载
    qid_to_chain, qid_to_stage, chain_order, stage_order = load_q_types(Q_TYPE_PATH)

    if not eval_df.empty:
        eval_df["qid_int"] = pd.to_numeric(eval_df["question_id"], errors="coerce")
        eval_df["value_chain"] = eval_df["qid_int"].apply(lambda x: qid_to_chain.get(int(x), None) if pd.notnull(x) else None)
        eval_df["stage_name"] = eval_df["qid_int"].apply(lambda x: qid_to_stage.get(int(x), None) if pd.notnull(x) else None)
        dimension_df["qid_int"] = pd.to_numeric(dimension_df["question_id"], errors="coerce")
        dimension_df["value_chain"] = dimension_df["qid_int"].apply(lambda x: qid_to_chain.get(int(x), None) if pd.notnull(x) else None)
        dimension_df["stage_name"] = dimension_df["qid_int"].apply(lambda x: qid_to_stage.get(int(x), None) if pd.notnull(x) else None)

    # 状态过滤
    if status_filter == "已完成":
        profiles_df = profiles_df[profiles_df["status"] == "completed"]
        eval_df = eval_df[eval_df["status"] == "completed"]
        dimension_df = dimension_df[dimension_df["status"] == "completed"]

    if exclude_zero and "score" in eval_df.columns:
        eval_df = eval_df[eval_df["score"] > 0]
        # 维度数据也同步过滤（通过 merge 关联）
        valid_keys = eval_df[["user_name", "question_id", "model_name"]].drop_duplicates()
        dimension_df = dimension_df.merge(valid_keys, on=["user_name", "question_id", "model_name"], how="inner")

    # 用户筛选
    if not profiles_df.empty:
        all_users = sorted(profiles_df["user_name"].unique().tolist())
    else:
        all_users = []
    selected_users = st.sidebar.multiselect("只保留这些用户（不选=全部）", options=all_users, default=[], help="选择后仅展示这些用户的数据")

    if selected_users:
        profiles_df = profiles_df[profiles_df["user_name"].isin(selected_users)]
        eval_df = eval_df[eval_df["user_name"].isin(selected_users)]
        dimension_df = dimension_df[dimension_df["user_name"].isin(selected_users)]
        open_feedback_df = open_feedback_df[open_feedback_df["user_name"].isin(selected_users)]

    # 题目排除
    if not eval_df.empty:
        qids_unique = eval_df["question_id"].dropna().unique().tolist()
        def _qid_sort_key(q):
            s = str(q)
            try:
                return (0, int(s))
            except Exception:
                return (1, s)
        qids_options = sorted(qids_unique, key=_qid_sort_key)
    else:
        qids_options = []

    excluded_questions = st.sidebar.multiselect("排除这些题目（不选=不排除）", options=qids_options, default=[], help="被排除的题目不参与任何基于得分的图表")

    eval_df_scored = eval_df
    dimension_df_scored = dimension_df
    if excluded_questions:
        eval_df_scored = eval_df_scored[~eval_df_scored["question_id"].isin(excluded_questions)]
        dimension_df_scored = dimension_df_scored[~dimension_df_scored["question_id"].isin(excluded_questions)]

    # ==================== 数据概览 ====================
    st.subheader("数据概览")
    col1, col2, col3, col4 = st.columns(4)
    col1.metric("提交总数", len(profiles_df["user_name"].unique()))
    col2.metric("评分记录数", len(eval_df_scored))
    col3.metric("覆盖问题数", len(eval_df_scored["question_id"].unique()))
    col4.metric("六维度记录数", len(dimension_df_scored))

    # ==================== 用户情况统计 ====================
    st.subheader("用户情况统计")
    ucols = st.columns(3)
    with ucols[0]:
        pie_chart_from_series("性别分布", profiles_df["gender"])
    with ucols[1]:
        pie_chart_from_series("使用频率分布", profiles_df["usageFrequency"])
    with ucols[2]:
        pie_chart_from_series("金融学习年限分布", profiles_df["financialLearningYears"])

    # ==================== 模型平均得分 ====================
    st.subheader("模型平均得分（含标准差误差线）")
    if not eval_df_scored.empty:
        model_scores = eval_df_scored.groupby("model_name")["score"].agg(["mean", "std", "count"]).reset_index()
        model_scores.rename(columns={"mean": "avg_score", "std": "std_score", "count": "samples"}, inplace=True)
        bar_chart_with_error(
            title_text="模型",
            df=model_scores,
            x_field="model_name",
            y_field="avg_score",
            std_field="std_score",
            tooltip_fields=["model_name", "avg_score", "std_score", "samples"],
            sort_desc=True,
            y_domain=[0, 10],
        )

    # ==================== ① 六维度错误热力图（模型×维度） ====================
    st.subheader("六维度错误热力图（模型 × 维度）")
    st.caption("颜色越深表示该模型在该维度上的错误越严重。绿色=无，黄色=轻微，橙色=明显，红色=严重。")
    if not dimension_df_scored.empty:
        heat_agg = dimension_df_scored.groupby(["model_name", "dimension"])["severity_num"].mean().reset_index()

        # 确保完整网格
        all_models = sorted(dimension_df_scored["model_name"].unique())
        grid = pd.MultiIndex.from_product([all_models, DIMENSION_LABELS_LIST], names=["model_name", "dimension"])
        grid_df = pd.DataFrame(index=grid).reset_index()
        heat_agg = grid_df.merge(heat_agg, on=["model_name", "dimension"], how="left").fillna({"severity_num": 0})

        heat = alt.Chart(heat_agg).mark_rect(stroke="white", strokeWidth=1).encode(
            x=alt.X("dimension:N", title="维度", sort=DIMENSION_LABELS_LIST),
            y=alt.Y("model_name:N", title="模型", sort=all_models),
            color=alt.Color(
                "severity_num:Q",
                title="平均严重度",
                scale=SEVERITY_COLOR_SCALE,
                legend=alt.Legend(title="严重度", values=[0, 1, 2, 3], labelExpr="datum.value == 0 ? '无' : datum.value == 1 ? '轻微' : datum.value == 2 ? '明显' : '严重'"),
            ),
            tooltip=[
                alt.Tooltip("model_name:N", title="模型"),
                alt.Tooltip("dimension:N", title="维度"),
                alt.Tooltip("severity_num:Q", title="平均严重度", format=".2f"),
            ],
        ).properties(height=max(300, len(all_models) * 45))

        text = alt.Chart(heat_agg).mark_text(baseline="middle", fontSize=12).encode(
            x=alt.X("dimension:N", sort=DIMENSION_LABELS_LIST),
            y=alt.Y("model_name:N", sort=all_models),
            text=alt.Text("severity_num:Q", format=".2f"),
            color=alt.condition(alt.datum.severity_num > 1.5, alt.value("white"), alt.value("#333")),
        )

        st.altair_chart(heat + text, use_container_width=True)
    else:
        st.info("暂无六维度数据")

    # ==================== ② 六维度错误频次热力图（模型×维度） ====================
    st.subheader("六维度错误频次热力图（模型 × 维度）")
    st.caption("颜色越深表示该模型在该维度上的错误出现次数越多。浅黄=次数少，深绿=次数多。")
    if not dimension_df_scored.empty:
        freq_df = build_dimension_frequency(dimension_df_scored)

        # 确保完整网格
        all_models = sorted(dimension_df_scored["model_name"].unique())
        grid = pd.MultiIndex.from_product([all_models, DIMENSION_LABELS_LIST], names=["model_name", "dimension"])
        grid_df = pd.DataFrame(index=grid).reset_index()
        freq_df = grid_df.merge(freq_df, on=["model_name", "dimension"], how="left").fillna({"frequency": 0})

        # 计算动态颜色范围
        max_freq = freq_df["frequency"].max()

        freq_heat = alt.Chart(freq_df).mark_rect(stroke="white", strokeWidth=1).encode(
            x=alt.X("dimension:N", title="维度", sort=DIMENSION_LABELS_LIST),
            y=alt.Y("model_name:N", title="模型", sort=all_models),
            color=alt.Color(
                "frequency:Q",
                title="错误频次",
                scale=alt.Scale(
                    domain=[0, max_freq],
                    scheme="greens",
                ),
                legend=alt.Legend(title="频次"),
            ),
            tooltip=[
                alt.Tooltip("model_name:N", title="模型"),
                alt.Tooltip("dimension:N", title="维度"),
                alt.Tooltip("frequency:Q", title="错误次数", format=".0f"),
            ],
        ).properties(height=max(300, len(all_models) * 45))

        freq_text = alt.Chart(freq_df).mark_text(baseline="middle", fontSize=12).encode(
            x=alt.X("dimension:N", sort=DIMENSION_LABELS_LIST),
            y=alt.Y("model_name:N", sort=all_models),
            text=alt.Text("frequency:Q", format=".0f"),
            color=alt.condition(alt.datum.frequency > max_freq * 0.6, alt.value("white"), alt.value("#333")),
        )

        st.altair_chart(freq_heat + freq_text, use_container_width=True)
    else:
        st.info("暂无六维度频次数据")

    # ==================== ③ 模型在各类题目上的得分雷达图 ====================
    st.subheader("模型在各类题目上的得分雷达图")
    st.caption("角度=题目类别（现况解析/涨跌预测/投资建议），每个模型一条线，向外填充，使用对比色。动态Y轴范围（最低分向下取整，最高分向上取整）")
    if not eval_df_scored.empty:
        category_radar_df = build_category_scores(eval_df_scored)
        if not category_radar_df.empty:
            plot_score_radar_chart("题目分类得分（按模型）", category_radar_df, CATEGORY_ORDER, fill_area=True, use_contrast_colors=True, dynamic_range=True)
        else:
            st.info("暂无题目分类数据（题目ID格式需为 q1, q2, ...）")
    else:
        st.info("暂无题目分类数据")

    # ==================== ④ 得分 vs 错误严重性散点图 ====================
    st.subheader("模型平均分 vs 六维度错误总分")
    st.caption("X轴为模型平均得分（越高越好），Y轴为六维度错误加权总分（越低越好）。右下角的点表示\"得分高但错误也多\"的异常。动态坐标轴范围。")
    if not eval_df_scored.empty and not dimension_df_scored.empty:
        model_avg_score = eval_df_scored.groupby("model_name")["score"].mean().reset_index().rename(columns={"score": "avg_score"})
        model_avg_severity = dimension_df_scored.groupby("model_name")["severity_num"].mean().reset_index().rename(columns={"severity_num": "avg_severity"})
        model_severity_total = dimension_df_scored.groupby("model_name")["severity_num"].sum().reset_index().rename(columns={"severity_num": "total_severity"})

        scatter_df = model_avg_score.merge(model_avg_severity, on="model_name").merge(model_severity_total, on="model_name")

        # 动态坐标轴范围
        x_min, x_max = get_dynamic_range(scatter_df["avg_score"], padding=0.1, min_val=0, max_val=10)
        y_min, y_max = get_dynamic_range(scatter_df["avg_severity"], padding=0.1, min_val=0, max_val=3)

        scatter = alt.Chart(scatter_df).mark_circle(size=200, opacity=0.8).encode(
            x=alt.X("avg_score:Q", title="平均得分", scale=alt.Scale(domain=[x_min, x_max])),
            y=alt.Y("avg_severity:Q", title="平均严重度（0-3）", scale=alt.Scale(domain=[y_min, y_max])),
            color=alt.Color("model_name:N", title="模型"),
            size=alt.Size("total_severity:Q", title="错误总次数"),
            tooltip=["model_name", alt.Tooltip("avg_score:Q", format=".2f"), alt.Tooltip("avg_severity:Q", format=".2f"), alt.Tooltip("total_severity:Q", format=".0f")],
        ).properties(height=400)

        # 添加模型标签
        text = alt.Chart(scatter_df).mark_text(dy=-15, fontSize=11).encode(
            x="avg_score:Q",
            y="avg_severity:Q",
            text="model_name:N",
            color=alt.value("#333"),
        )

        st.altair_chart(scatter + text, use_container_width=True)
    else:
        st.info("暂无足够数据")

    # ==================== ⑤ 错误级别堆叠柱状图 ====================
    st.subheader("各模型错误级别分布（堆叠）")
    st.caption("每个模型在六个维度上，各严重级别的出现次数")
    if not dimension_df_scored.empty:
        severity_counts = dimension_df_scored.groupby(["model_name", "severity"]).size().reset_index(name="count")

        # 确保所有级别都有
        all_models = sorted(dimension_df_scored["model_name"].unique())
        grid_s = pd.MultiIndex.from_product([all_models, SEVERITY_ORDER], names=["model_name", "severity"])
        grid_s_df = pd.DataFrame(index=grid_s).reset_index()
        severity_counts = grid_s_df.merge(severity_counts, on=["model_name", "severity"], how="left").fillna({"count": 0})
        severity_counts["severity"] = pd.Categorical(severity_counts["severity"], categories=SEVERITY_ORDER, ordered=True)
        severity_counts["severity_label"] = severity_counts["severity"].map(SEVERITY_LABELS)

        stacked = alt.Chart(severity_counts).mark_bar().encode(
            x=alt.X("model_name:N", title="模型", sort=all_models),
            y=alt.Y("count:Q", title="出现次数", stack="zero"),
            color=alt.Color(
                "severity_label:N",
                title="严重级别",
                scale=alt.Scale(
                    domain=["无", "轻微", "明显", "严重"],
                    range=["#dcfce7", "#fef08a", "#fdba74", "#ef4444"],
                ),
                sort=["无", "轻微", "明显", "严重"],
            ),
            tooltip=["model_name", "severity_label", alt.Tooltip("count:Q", format=".0f")],
        ).properties(height=400)

        st.altair_chart(stacked, use_container_width=True)
    else:
        st.info("暂无错误级别数据")

    # ==================== 价值链/阶段雷达图（保留） ====================
    st.subheader("模型在价值链维度的平均得分（雷达图）")
    if not eval_df_scored.empty and "value_chain" in eval_df_scored.columns and len(chain_order) > 0:
        radar_chain_df = build_score_radar_dataset(eval_df_scored, "value_chain", chain_order)
        plot_score_radar_chart("价值链（平均分）", radar_chain_df, chain_order)
    else:
        st.info("暂无价值链分类或评分数据")

    st.subheader("模型在阶段维度的平均得分（雷达图）")
    if not eval_df_scored.empty and "stage_name" in eval_df_scored.columns and len(stage_order) > 0:
        radar_stage_df = build_score_radar_dataset(eval_df_scored, "stage_name", stage_order)
        plot_score_radar_chart("阶段（平均分）", radar_stage_df, stage_order)
    else:
        st.info("暂无阶段分类或评分数据")

    # ==================== 模型六维度错误雷达图 ====================
    st.subheader("模型六维度错误雷达图")
    st.caption("角度=六维度，每个模型一条线，浅蓝到深蓝渐变。数值越高表示错误越严重（0=无，1=轻微，2=明显，3=严重）")
    if not dimension_df_scored.empty:
        model_dim_radar_df = build_model_dimension_severity(dimension_df_scored)
        if not model_dim_radar_df.empty:
            plot_severity_radar_chart("六维度错误分布（按模型）", model_dim_radar_df, DIMENSION_LABELS_LIST)
        else:
            st.info("暂无六维度数据")
    else:
        st.info("暂无六维度数据")

    # ==================== ⑥ 开放反馈汇总面板 ====================
    st.subheader("开放反馈汇总")
    if not open_feedback_df.empty:
        # 展平为长表格展示
        feedback_display = []
        for _, row in open_feedback_df.iterrows():
            user = row["user_name"]
            for field, label in [
                ("suggestions", "建议与意见"),
                ("modelAComment", "模型A评价"),
                ("modelBComment", "模型B评价"),
                ("supplementLeft", "左侧补充"),
                ("supplementRight", "右侧补充"),
                ("interestedQuestions", "印象深刻的题目"),
            ]:
                val = row.get(field, "")
                if val and str(val).strip():
                    feedback_display.append({
                        "用户": user,
                        "反馈类型": label,
                        "内容": str(val).strip(),
                    })

        if feedback_display:
            fb_df = pd.DataFrame(feedback_display)
            st.dataframe(fb_df, use_container_width=True, hide_index=True)
        else:
            st.info("用户填写了开放反馈但内容为空")
    else:
        st.info("暂无开放反馈数据")

    # ==================== 最低分题目TOP10（保留） ====================
    st.subheader("各模型最低分题目TOP10")
    if not eval_df_scored.empty:
        model_avg_df = eval_df_scored.groupby("model_name")["score"].mean().reset_index().rename(columns={"score": "model_avg"})

        mq = (
            eval_df_scored.groupby(["model_name", "question_id"])["score"]
            .agg(["mean", "count"])
            .reset_index()
            .rename(columns={"mean": "avg_score", "count": "samples"})
        )
        mq = mq.merge(model_avg_df, on="model_name", how="left")
        mq["diff_lower_than_model_avg"] = mq["model_avg"] - mq["avg_score"]

        models = sorted(mq["model_name"].unique().tolist())
        tabs = st.tabs(models if models else ["无模型数据"])
        for i, m in enumerate(models):
            with tabs[i]:
                mdf = mq[mq["model_name"] == m].sort_values(by="avg_score", ascending=True).head(10)
                if mdf.empty:
                    st.info("该模型暂无题目评分数据")
                    continue

                overall = mdf["model_avg"].iloc[0]
                st.write(f"模型：{m}（总体平均分：{overall:.2f}）")

                table = mdf[["question_id", "avg_score", "samples", "diff_lower_than_model_avg"]].copy()
                table = table.rename(columns={
                    "question_id": "题目ID",
                    "avg_score": "该题平均分",
                    "samples": "样本数",
                    "diff_lower_than_model_avg": "低于模型平均分",
                })
                st.dataframe(table, use_container_width=True)

                chart_df = mdf.copy()
                chart = alt.Chart(chart_df).mark_bar().encode(
                    x=alt.X("question_id:N", title="题目ID"),
                    y=alt.Y("avg_score:Q", title="该题平均分"),
                    color=alt.Color("diff_lower_than_model_avg:Q", title="低于模型平均分", scale=alt.Scale(scheme="reds")),
                    tooltip=["question_id", alt.Tooltip("avg_score:Q", format=".2f"), alt.Tooltip("samples:Q", title="样本数"), alt.Tooltip("diff_lower_than_model_avg:Q", format=".2f")],
                ).properties(height=320)
                st.altair_chart(chart, use_container_width=True)

    # ==================== 原始数据 ====================
    with st.expander("查看原始数据（可选）", expanded=False):
        st.write("Profiles（用户画像）", profiles_df)
        st.write("Evaluations（评分展开）", eval_df)
        st.write("Dimensions（六维度展开）", dimension_df)
        st.write("Open Feedback（开放反馈）", open_feedback_df)


if __name__ == "__main__":
    main()
