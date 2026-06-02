import os
import json
import pandas as pd
import streamlit as st
import altair as alt
import plotly.express as px

st.set_page_config(page_title="RIA 评测可视化 (v2)", layout="wide")

# ============ Supabase 连接 ============
from supabase import create_client

@st.cache_resource
def get_supabase_client():
    url = st.secrets.get("SUPABASE_URL") or os.environ.get("SUPABASE_URL")
    key = st.secrets.get("SUPABASE_ANON_KEY") or os.environ.get("SUPABASE_ANON_KEY")

    if not url or not key:
        st.error("缺少 Supabase 凭证，请在环境变量或 Secrets 中配置")
        st.stop()

    return create_client(url, key)

def fetch_submissions_data():
    """从 Supabase 实时获取数据"""
    try:
        client = get_supabase_client()
        response = client.table("submissions").select("*").order("created_at", desc=True).execute()
        return response.data or []
    except Exception as e:
        st.error(f"数据获取失败: {e}")
        return []

# ============ 配置 ============
MODEL_DISPLAY_MAP = {
    "Deepseek": "DeepSeek",
    "model-b": "豆包",
    "maxiaocai": "蚂小财",
    "tonghuashun": "同花顺",
}

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
SEVERITY_COLOR_SCALE = alt.Scale(
    domain=[0, 1, 2, 3],
    range=["#dcfce7", "#fef08a", "#fdba74", "#ef4444"],
)

# ============ 数据处理 ============
def map_model_name(model_name: str) -> str:
    return MODEL_DISPLAY_MAP.get(model_name, model_name)

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

def build_profiles_and_evals(submissions):
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

    return (
        pd.DataFrame(profiles_rows),
        pd.DataFrame(eval_rows),
        pd.DataFrame(dimension_rows),
        pd.DataFrame(open_feedback_rows),
    )

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

    st.altair_chart(chart, use_container_width=True)

def main():
    st.title("RIA 评测数据可视化 (v2) - 实时连接")

    st.sidebar.header("数据控制")

    if st.sidebar.button("🔄 刷新数据"):
        st.cache_resource.clear()
        st.rerun()

    status_filter = st.sidebar.radio("筛选提交状态", ["全部", "已完成"], index=1)
    exclude_zero = st.sidebar.checkbox("排除未评分（0分）", value=True)

    # 获取数据
    with st.spinner("正在从 Supabase 加载数据..."):
        submissions = fetch_submissions_data()
        profiles_df, eval_df, dimension_df, open_feedback_df = build_profiles_and_evals(submissions)

    if profiles_df.empty:
        st.warning("暂无数据，请先在评测系统中完成一些提交")
        st.stop()

    # 状态过滤
    if status_filter == "已完成":
        profiles_df = profiles_df[profiles_df["status"] == "completed"]
        eval_df = eval_df[eval_df["status"] == "completed"]
        dimension_df = dimension_df[dimension_df["status"] == "completed"]

    if exclude_zero and "score" in eval_df.columns:
        eval_df = eval_df[eval_df["score"] > 0]
        valid_keys = eval_df[["user_name", "question_id", "model_name"]].drop_duplicates()
        dimension_df = dimension_df.merge(valid_keys, on=["user_name", "question_id", "model_name"], how="inner")

    # 用户筛选
    if not profiles_df.empty:
        all_users = sorted(profiles_df["user_name"].unique().tolist())
    else:
        all_users = []

    selected_users = st.sidebar.multiselect("只保留这些用户（不选=全部）", options=all_users, default=[])

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

    excluded_questions = st.sidebar.multiselect("排除这些题目（不选=不排除）", options=qids_options, default=[])

    eval_df_scored = eval_df
    dimension_df_scored = dimension_df
    if excluded_questions:
        eval_df_scored = eval_df_scored[~eval_df_scored["question_id"].isin(excluded_questions)]
        dimension_df_scored = dimension_df_scored[~dimension_df_scored["question_id"].isin(excluded_questions)]

    # 数据概览
    st.subheader("数据概览")
    col1, col2, col3, col4 = st.columns(4)
    col1.metric("提交总数", len(profiles_df["user_name"].unique()))
    col2.metric("评分记录数", len(eval_df_scored))
    col3.metric("覆盖问题数", len(eval_df_scored["question_id"].unique()))
    col4.metric("六维度记录数", len(dimension_df_scored))
    st.caption(f"最后更新: {submissions[0].get('created_at', '未知') if submissions else '无数据'}")

    # 用户情况统计
    st.subheader("用户情况统计")
    ucols = st.columns(3)
    with ucols[0]:
        pie_chart_from_series("性别分布", profiles_df["gender"])
    with ucols[1]:
        pie_chart_from_series("使用频率分布", profiles_df["usageFrequency"])
    with ucols[2]:
        pie_chart_from_series("金融学习年限分布", profiles_df["financialLearningYears"])

    # 模型平均得分
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

    # 六维度错误热力图
    st.subheader("六维度错误热力图（模型 × 维度）")
    st.caption("颜色越深表示该模型在该维度上的错误越严重。绿色=无，黄色=轻微，橙色=明显，红色=严重。")
    if not dimension_df_scored.empty:
        heat_agg = dimension_df_scored.groupby(["model_name", "dimension"])["severity_num"].mean().reset_index()

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

    # 开放反馈汇总
    st.subheader("开放反馈汇总")
    if not open_feedback_df.empty:
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

if __name__ == "__main__":
    main()