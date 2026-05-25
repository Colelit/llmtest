import os
import json
import pandas as pd
import streamlit as st
import altair as alt
import plotly.express as px

st.set_page_config(page_title="RIA 评测可视化 (v2)", layout="wide")

DEFAULT_DATA_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "submissions_rows.json")
Q_TYPE_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "q_type.json")

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


def bar_chart_with_error(title_text, df, x_field, y_field, std_field=None, tooltip_fields=None, sort_desc=True, y_domain=None):
    if df.empty:
        st.info(f"{title_text}暂无数据")
        return

    sort_value = alt.SortField(field=y_field, order="descending" if sort_desc else "ascending")

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


def plot_score_radar_chart(title_text, radar_df, categories):
    """基于平均得分的雷达图（0-10分）"""
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
            radialaxis=dict(range=[0, 10], dtick=2, showline=True),
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


def main():
    st.title("RIA 评测数据可视化 (v2)")

    st.sidebar.header("数据设置")
    data_path = st.sidebar.text_input("数据文件路径", DEFAULT_DATA_PATH)
    status_filter = st.sidebar.radio("筛选提交状态", ["全部", "已完成"], index=1)
    exclude_zero = st.sidebar.checkbox("排除未评分（0分）", value=True)

    if not os.path.exists(data_path):
        st.error(f"数据文件不存在：{data_path}")
        st.stop()

    submissions = load_json(data_path)
    profiles_df, eval_df, dimension_df, open_feedback_df = build_profiles_and_evals(submissions)

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

    # ==================== ② 模型六维度雷达图 ====================
    st.subheader("模型六维度错误雷达图")
    st.caption("数值越高表示错误越严重（0=无，1=轻微，2=明显，3=严重）")
    if not dimension_df_scored.empty:
        radar_dim_df = build_severity_radar_dataset(dimension_df_scored, "dimension", DIMENSION_LABELS_LIST)
        plot_severity_radar_chart("六维度错误分布（按模型）", radar_dim_df, DIMENSION_LABELS_LIST)
    else:
        st.info("暂无六维度数据")

    # ==================== ③ 维度-题目热力图 ====================
    st.subheader("维度-题目热力图")
    st.caption("每道题在各维度上的平均错误严重度")
    if not dimension_df_scored.empty:
        q_heat = dimension_df_scored.groupby(["question_id", "dimension"])["severity_num"].mean().reset_index()

        # 排序题目ID
        def qid_sort_val(q):
            try:
                return int(q)
            except Exception:
                return float('inf')
        all_qids = sorted(dimension_df_scored["question_id"].unique(), key=qid_sort_val)

        # 完整网格
        grid_q = pd.MultiIndex.from_product([all_qids, DIMENSION_LABELS_LIST], names=["question_id", "dimension"])
        grid_q_df = pd.DataFrame(index=grid_q).reset_index()
        q_heat = grid_q_df.merge(q_heat, on=["question_id", "dimension"], how="left").fillna({"severity_num": 0})

        qheat_chart = alt.Chart(q_heat).mark_rect(stroke="white", strokeWidth=0.5).encode(
            x=alt.X("dimension:N", title="维度", sort=DIMENSION_LABELS_LIST),
            y=alt.Y("question_id:N", title="题目", sort=all_qids),
            color=alt.Color(
                "severity_num:Q",
                title="严重度",
                scale=SEVERITY_COLOR_SCALE,
                legend=alt.Legend(title="严重度", values=[0, 1, 2, 3], labelExpr="datum.value == 0 ? '无' : datum.value == 1 ? '轻微' : datum.value == 2 ? '明显' : '严重'"),
            ),
            tooltip=[
                alt.Tooltip("question_id:N", title="题目"),
                alt.Tooltip("dimension:N", title="维度"),
                alt.Tooltip("severity_num:Q", title="平均严重度", format=".2f"),
            ],
        ).properties(height=max(400, len(all_qids) * 35))

        st.altair_chart(qheat_chart, use_container_width=True)
    else:
        st.info("暂无维度-题目数据")

    # ==================== ④ 得分 vs 错误严重性散点图 ====================
    st.subheader("模型平均分 vs 六维度错误总分")
    st.caption("X轴为模型平均得分（越高越好），Y轴为六维度错误加权总分（越低越好）。右下角的点表示"得分高但错误也多"的异常。")
    if not eval_df_scored.empty and not dimension_df_scored.empty:
        model_avg_score = eval_df_scored.groupby("model_name")["score"].mean().reset_index().rename(columns={"score": "avg_score"})
        model_avg_severity = dimension_df_scored.groupby("model_name")["severity_num"].mean().reset_index().rename(columns={"severity_num": "avg_severity"})
        model_severity_total = dimension_df_scored.groupby("model_name")["severity_num"].sum().reset_index().rename(columns={"severity_num": "total_severity"})

        scatter_df = model_avg_score.merge(model_avg_severity, on="model_name").merge(model_severity_total, on="model_name")

        scatter = alt.Chart(scatter_df).mark_circle(size=200, opacity=0.8).encode(
            x=alt.X("avg_score:Q", title="平均得分", scale=alt.Scale(domain=[0, 10])),
            y=alt.Y("avg_severity:Q", title="平均严重度（0-3）", scale=alt.Scale(domain=[0, 3])),
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
