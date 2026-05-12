import os
import json
import pandas as pd
import streamlit as st
import altair as alt
import plotly.express as px

st.set_page_config(page_title="RIA 评测可视化", layout="wide")

DEFAULT_DATA_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "submissions_rows.json")
Q_TYPE_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "q_type.json")

ERROR_LABELS = {
    "factual_errors": "数据幻觉/事实硬伤",
    "logical_errors": "逻辑错误",
    "conceptual_errors": "概念错误",
    "precision_illusion": "精准错觉",
    "risk_blindness": "风险盲区",
    "value_misalignment": "价值错位",
}

@st.cache_data(show_spinner=False)
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
            # 某些导出可能重复转义，尝试再次反转义
            try:
                return json.loads(json.loads(value))
            except Exception:
                return {}
    return {}

def build_profiles_and_evals(submissions):
    profiles_rows = []
    eval_rows = []

    for row in submissions:
        user_name = row.get("user_name", "未知用户")
        status = row.get("status", None)
        created_at = row.get("created_at", None)

        profile = parse_json_field(row.get("user_profile"))
        eval_data = parse_json_field(row.get("evaluation_data"))

        # 用户画像
        profiles_rows.append({
            "user_name": user_name,
            "gender": profile.get("gender", "未知"),
            "usageFrequency": profile.get("usageFrequency", "未知"),
            "financialLearningYears": profile.get("financialLearningYears", "未知"),
            "status": status,
            "created_at": created_at,
        })

        # 评分展开
        for qid, model_map in (eval_data or {}).items():
            for model_name, eval_obj in (model_map or {}).items():
                score = 0
                cons = []
                if isinstance(eval_obj, dict):
                    score = eval_obj.get("score", 0) or 0
                    cons = eval_obj.get("cons", []) or []
                eval_rows.append({
                    "user_name": user_name,
                    "question_id": str(qid),
                    "model_name": str(model_name),
                    "score": int(score),
                    "cons": cons,
                    "status": status,
                })

    profiles_df = pd.DataFrame(profiles_rows)
    eval_df = pd.DataFrame(eval_rows)
    return profiles_df, eval_df

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

# 新增：带误差线的柱状图封装，可选固定Y轴范围
def bar_chart_with_error(
    title,
    df,
    x_field,
    y_field,
    std_field=None,
    tooltip_fields=None,
    sort_desc=True,
    y_domain=None
):
    if df.empty:
        st.info(f"{title}暂无数据")
        return

    # 统一排序：按 y_field 的值排序
    sort_value = alt.SortField(field=y_field, order='descending' if sort_desc else 'ascending')

    # 主体柱状图：按 y 值排序，颜色为红色渐变（值越高越深）
    bars = alt.Chart(df).mark_bar().encode(
        x=alt.X(f"{x_field}:N", sort=sort_value, title=title),
        y=alt.Y(
            f"{y_field}:Q",
            title="值",
            scale=alt.Scale(domain=y_domain) if y_domain else alt.Scale()
        ),
        color=alt.Color(
            f"{y_field}:Q",
            title="数值",
            scale=alt.Scale(scheme="reds", domain=y_domain) if y_domain else alt.Scale(scheme="reds"),
            legend=None  # 若需要图例可移除此行
        ),
        tooltip=tooltip_fields or ([x_field, y_field] + ([std_field] if std_field else []))
    ).properties(height=360)

    # 误差线（标准差）
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
            y2="upper:Q"
        )
        chart = bars + errorbar
    else:
        chart = bars

    st.altair_chart(chart, use_container_width=True)

# 新增：加载题目分类（阶段/价值链）并建立索引映射
def load_q_types(path: str):
    """
    读取 data/q_type.json，并返回：
    - qid_to_chain: 题目index -> 价值链名称
    - qid_to_stage: 题目index -> 阶段名称
    - chain_order: 价值链的有序列表（按文件出现顺序）
    - stage_order: 阶段的有序列表（按文件出现顺序）
    """
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
                # 若重复出现，后写覆盖前写（以最后一次为准）
                qid_to_chain[q] = chain_name
                qid_to_stage[q] = stage_name

    # 去重保持顺序
    chain_order = list(dict.fromkeys(chain_order))
    stage_order = list(dict.fromkeys(stage_order))
    return qid_to_chain, qid_to_stage, chain_order, stage_order

# 新增：构造雷达图所需数据（极坐标 -> 笛卡尔坐标）
# 函数：build_radar_dataset（改为返回 Plotly 需要的长表）
def build_radar_dataset(eval_df: pd.DataFrame, category_col: str, categories: list, normalize_to: float = 10.0):
    """
    从 eval_df 聚合得到各模型在给定分类维度（category_col）的平均得分，
    将其展开到完整网格（所有模型 × 所有类别），缺失填 0。
    返回列：model_name, category, value（平均分，0-10），并设置类别为有序分类。
    """
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

    # 确保类别展示顺序一致
    radar_df["category"] = pd.Categorical(radar_df["category"], categories=categories, ordered=True)
    return radar_df

# 新增：绘制雷达图（叠加多边形 + 点 + 类目标签）
# 函数：plot_radar_chart（改为使用 st.plotly_chart + px.line_polar）
def plot_radar_chart(title: str, radar_df: pd.DataFrame, categories: list):
    if radar_df.empty:
        st.info(f"{title}暂无数据")
        return

    plot_df = radar_df[["model_name", "category", "value"]].copy()
    plot_df["category"] = pd.Categorical(plot_df["category"], categories=categories, ordered=True)
    # 关键：去除类目字符串可能的前后空格，避免与 categoryarray 不匹配
    categories_clean = [str(c).strip() for c in categories]
    plot_df["category"] = plot_df["category"].astype(str).str.strip()

    fig = px.line_polar(
        plot_df,
        r="value",
        theta="category",
        color="model_name",
        line_close=True,
        markers=True
    )
    fig.update_layout(
        title=title,
        polar=dict(
            radialaxis=dict(
                range=[0, 10],
                dtick=2,
                showline=True
            ),
            angularaxis=dict(
                showline=True,
                rotation=90,              # 第一类目从顶部开始
                direction="clockwise",    # 顺时针排列
                categoryorder="array",    # 按给定数组顺序
                categoryarray=categories_clean, # 使用清洗后的类目序列
                tickfont=dict(size=12)
            )
        ),
        legend_title_text="模型",
        margin=dict(l=20, r=20, t=50, b=120)  # 增大底部边距避免底部标签被裁切
    )

    st.plotly_chart(fig, use_container_width=True)

def main():
    st.title("RIA 评测数据可视化")

    st.sidebar.header("数据设置")
    data_path = st.sidebar.text_input("数据文件路径", DEFAULT_DATA_PATH)
    status_filter = st.sidebar.radio("筛选提交状态", ["全部", "已完成"], index=1)
    exclude_zero = st.sidebar.checkbox("排除未评分（0分）", value=True)

    if not os.path.exists(data_path):
        st.error(f"数据文件不存在：{data_path}")
        st.stop()

    submissions = load_json(data_path)
    profiles_df, eval_df = build_profiles_and_evals(submissions)

    # 题目分类加载与映射
    qid_to_chain, qid_to_stage, chain_order, stage_order = load_q_types(Q_TYPE_PATH)

    # 将 question_id 转为整数索引并映射到阶段/价值链
    if not eval_df.empty:
        eval_df["qid_int"] = pd.to_numeric(eval_df["question_id"], errors="coerce")
        eval_df["value_chain"] = eval_df["qid_int"].apply(lambda x: qid_to_chain.get(int(x), None) if pd.notnull(x) else None)
        eval_df["stage_name"] = eval_df["qid_int"].apply(lambda x: qid_to_stage.get(int(x), None) if pd.notnull(x) else None)

    # 状态过滤
    if status_filter == "已完成":
        profiles_df = profiles_df[profiles_df["status"] == "completed"]
        eval_df = eval_df[eval_df["status"] == "completed"]

    if exclude_zero and "score" in eval_df.columns:
        eval_df = eval_df[eval_df["score"] > 0]

    # 侧栏：用户多选筛选（空表示不过滤）
    if not profiles_df.empty:
        all_users = sorted(profiles_df["user_name"].unique().tolist())
    else:
        all_users = []
    selected_users = st.sidebar.multiselect(
        "只保留这些用户（不选=全部）",
        options=all_users,
        default=[],
        help="选择后仅展示这些用户的画像与评测数据"
    )

    if selected_users:
        profiles_df = profiles_df[profiles_df["user_name"].isin(selected_users)]
        eval_df = eval_df[eval_df["user_name"].isin(selected_users)]

    # 侧栏：题目排除（不选=不排除，仅影响基于得分的统计）
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

    excluded_questions = st.sidebar.multiselect(
        "排除这些题目（不选=不排除）",
        options=qids_options,
        default=[],
        help="被排除的题目不会参与任何基于得分的图表与统计"
    )

    # 得分相关统计的专用副本（应用题目排除）
    eval_df_scored = eval_df
    if excluded_questions:
        eval_df_scored = eval_df_scored[~eval_df_scored["question_id"].isin(excluded_questions)]

    st.subheader("数据概览")
    col1, col2, col3 = st.columns(3)
    col1.metric("提交总数", len(profiles_df["user_name"].unique()))
    # 概览中的评分记录数与覆盖问题数以排除后的得分数据为准
    col2.metric("评分记录数", len(eval_df_scored))
    col3.metric("覆盖问题数", len(eval_df_scored["question_id"].unique()))

    # 用户情况统计
    st.subheader("用户情况统计")
    ucols = st.columns(3)
    with ucols[0]:
        pie_chart_from_series("性别分布", profiles_df["gender"])
    with ucols[1]:
        pie_chart_from_series("使用频率分布", profiles_df["usageFrequency"])
    with ucols[2]:
        pie_chart_from_series("金融学习年限分布", profiles_df["financialLearningYears"])

    # 模型情况统计 - 平均得分 + 误差线；固定Y轴到0-10
    st.subheader("模型平均得分（含标准差误差线）")
    if not eval_df_scored.empty:
        model_scores = eval_df_scored.groupby("model_name")["score"].agg(["mean", "std", "count"]).reset_index()
        model_scores.rename(columns={"mean": "avg_score", "std": "std_score", "count": "samples"}, inplace=True)
        # 固定评分范围到0-10
        bar_chart_with_error(
            title="模型",
            df=model_scores,
            x_field="model_name",
            y_field="avg_score",
            std_field="std_score",
            tooltip_fields=["model_name", "avg_score", "std_score", "samples"],
            sort_desc=True,
            y_domain=[0, 10]
        )

    # 新增：模型在不同价值链维度的平均得分（雷达图）
    st.subheader("模型在价值链维度的平均得分（雷达图）")
    if not eval_df_scored.empty and 'value_chain' in eval_df_scored.columns and len(chain_order) > 0:
        radar_chain_df = build_radar_dataset(eval_df_scored, "value_chain", chain_order, normalize_to=10.0)
        plot_radar_chart("价值链（平均分）", radar_chain_df, chain_order)
    else:
        st.info("暂无价值链分类或评分数据")

    # 新增：模型在不同阶段的平均得分（雷达图）
    st.subheader("模型在阶段维度的平均得分（雷达图）")
    if not eval_df_scored.empty and 'stage_name' in eval_df_scored.columns and len(stage_order) > 0:
        radar_stage_df = build_radar_dataset(eval_df_scored, "stage_name", stage_order, normalize_to=10.0)
        plot_radar_chart("阶段（平均分）", radar_stage_df, stage_order)
    else:
        st.info("暂无阶段分类或评分数据")

    # 错误类别频次（按用户平均 + 标准差误差线）
    st.subheader("错误类别平均频次（按用户）")
    # 展开错误记录
    error_rows = []
    for _, row in eval_df.iterrows():
        cons = row.get("cons") or []
        for err in cons:
            error_rows.append({
                "user_name": row.get("user_name", "未知用户"),
                "model_name": row.get("model_name", "未知模型"),
                "error": err
            })
    error_df = pd.DataFrame(error_rows)
    if error_df.empty:
        st.info("暂无错误类别数据")
    else:
        error_df["error_label"] = error_df["error"].map(lambda k: ERROR_LABELS.get(k, k))
        all_errors = list(sorted(error_df["error_label"].unique()))
        all_users = list(sorted(profiles_df["user_name"].unique()))
        # 构造用户 × 错误类型的完整网格，缺失计数补0
        grid = pd.MultiIndex.from_product([all_users, all_errors], names=("user_name", "error_label"))
        grid_df = pd.DataFrame(index=grid).reset_index()
        error_user_counts = error_df.groupby(["user_name", "error_label"]).size().reset_index(name="count")
        error_user_counts = grid_df.merge(error_user_counts, on=["user_name", "error_label"], how="left").fillna({"count": 0})

        error_stats = error_user_counts.groupby("error_label")["count"].agg(["mean", "std", "count"]).reset_index()
        error_stats.rename(columns={"mean": "mean_count", "std": "std_count", "count": "samples"}, inplace=True)

        bar_chart_with_error(
            title="错误类别",
            df=error_stats,
            x_field="error_label",
            y_field="mean_count",
            std_field="std_count",
            tooltip_fields=["error_label", "mean_count", "std_count", "samples"],
            sort_desc=True,
            y_domain=None  # 错误频次不固定轴，按数据自适应
        )

        # 新增：错误频次 × 模型热力图（按用户平均）
        st.subheader("错误频次与模型热力图（按用户平均）")
        all_models = list(sorted(eval_df["model_name"].unique()))
        grid2 = pd.MultiIndex.from_product([all_users, all_models, all_errors], names=("user_name", "model_name", "error_label"))
        grid2_df = pd.DataFrame(index=grid2).reset_index()

        error_model_counts = error_df.groupby(["user_name", "model_name", "error_label"]).size().reset_index(name="count")
        error_model_counts = grid2_df.merge(error_model_counts, on=["user_name", "model_name", "error_label"], how="left").fillna({"count": 0})

        model_error_stats = error_model_counts.groupby(["model_name", "error_label"])["count"].mean().reset_index()
        model_error_stats.rename(columns={"count": "mean_count"}, inplace=True)

        heat = alt.Chart(model_error_stats).mark_rect().encode(
            x=alt.X("model_name:N", title="模型"),
            y=alt.Y("error_label:N", title="错误类型"),
            color=alt.Color("mean_count:Q", title="平均频次", scale=alt.Scale(scheme="reds")),
            tooltip=["model_name", "error_label", alt.Tooltip("mean_count:Q", title="平均频次", format=".2f")]
        ).properties(height=440)

        # 可选叠加数值标签
        text = alt.Chart(model_error_stats).mark_text(baseline="middle").encode(
            x="model_name:N",
            y="error_label:N",
            text=alt.Text("mean_count:Q", format=".2f"),
            color=alt.value("#000")
        )
        st.altair_chart(heat + text, use_container_width=True)

    # 新增模块：统计每个模型得分最低的10个题目
    st.subheader("各模型最低分题目TOP10")
    if not eval_df_scored.empty:
        # 每模型总体平均分
        model_avg_df = eval_df_scored.groupby("model_name")["score"].mean().reset_index().rename(columns={"score": "model_avg"})

        # 每模型-题目 平均分与样本数
        mq = (
            eval_df_scored.groupby(["model_name", "question_id"])['score']
            .agg(['mean', 'count'])
            .reset_index()
            .rename(columns={'mean': 'avg_score', 'count': 'samples'})
        )

        # 合并总体平均分，计算低于总体平均分的差值
        mq = mq.merge(model_avg_df, on="model_name", how="left")
        mq["diff_lower_than_model_avg"] = mq["model_avg"] - mq["avg_score"]

        # 为展示准备标签和排序
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
                    "diff_lower_than_model_avg": "低于模型平均分"
                })
                st.dataframe(table, use_container_width=True)

                # 可视化：最低分题目条形图（颜色映射为低于平均分的差值）
                chart_df = mdf.copy()
                chart = alt.Chart(chart_df).mark_bar().encode(
                    x=alt.X("question_id:N", title="题目ID"),
                    y=alt.Y("avg_score:Q", title="该题平均分"),
                    color=alt.Color(
                        "diff_lower_than_model_avg:Q",
                        title="低于模型平均分",
                        scale=alt.Scale(scheme="reds")
                    ),
                    tooltip=[
                        "question_id",
                        alt.Tooltip("avg_score:Q", title="该题平均分", format=".2f"),
                        alt.Tooltip("samples:Q", title="样本数"),
                        alt.Tooltip("diff_lower_than_model_avg:Q", title="低于平均分", format=".2f")
                    ]
                ).properties(height=320)
                st.altair_chart(chart, use_container_width=True)

    with st.expander("查看原始数据（可选）", expanded=False):
        st.write("Profiles（用户画像）", profiles_df)
        st.write("Evaluations（评分展开）", eval_df)

if __name__ == "__main__":
    main()