import json
import asyncio
from datetime import datetime
from typing import Optional
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config import get_settings
from models import (
    UserProfile, Memory, ShortTermMemory, TrainingPlan, ActiveExercise, PlannedSet,
    PlanRequest, PlanResponse, AdjustSetRequest, AdjustSetResponse,
    FailureRequest, FailureResponse, ReplacementRequest, ReplacementResponse,
    ReviewRequest, ReviewResponse, NegotiationResponse, WorkoutSession,
)
from prompt_loader import load_prompt
from llm_client import get_llm_client

app = FastAPI(title="Vela Agent API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ========== Helper: deterministic fallback ==========

def normalize_strategy(value: Optional[str]) -> str:
    """Map UI labels and free-form values to the strict Strategy enum."""
    if value == "冲" or value == "我想冲一下":
        return "冲"
    if value == "保" or value == "我想保守一点":
        return "保"
    return "稳"


def normalize_plan_data(plan_data: dict) -> dict:
    plan_data = dict(plan_data)
    plan_data["strategy"] = normalize_strategy(plan_data.get("strategy"))
    return plan_data


def normalize_focus(value: Optional[str]) -> str:
    if value in {"pull", "Pull Day", "pull_day"}:
        return "pull"
    if value in {"legs", "leg", "Leg Day", "legs_day"}:
        return "legs"
    return "push"


def make_sets(count: int, weight: float, reps: int, rest_sec: int) -> list[dict]:
    return [
        {
            "set_index": i + 1,
            "planned_weight_kg": weight,
            "planned_reps": reps,
            "planned_rest_sec": rest_sec,
        }
        for i in range(count)
    ]

def fallback_plan_generator(user_profile: dict, memory: dict, negotiation: dict) -> dict:
    """Rule-based fallback when LLM is unavailable."""
    time_min = negotiation.get("available_time_min", 45)
    discomfort = negotiation.get("discomfort", [])
    state = negotiation.get("user_state", "正常")
    strategy = normalize_strategy(negotiation.get("strategy", "稳"))
    focus = normalize_focus(negotiation.get("focus", "push"))

    exercises = []
    if focus == "pull":
        exercises.append({
            "id": "ex_1", "exercise_id": "lat_pulldown", "name": "高位下拉",
            "role": "main", "planned_sets": make_sets(4, 55, 10, 150),
            "completed_sets": [], "status": "pending", "today_focus": "背阔主项，先把肩胛下沉做稳"
        })
        if time_min >= 45:
            exercises.extend([
                {"id": "ex_2", "exercise_id": "seated_row", "name": "坐姿划船", "role": "secondary", "planned_sets": make_sets(3, 45, 10, 120), "completed_sets": [], "status": "pending", "today_focus": "中背厚度，顶峰停顿"},
                {"id": "ex_3", "exercise_id": "face_pull", "name": "面拉", "role": "isolation", "planned_sets": make_sets(3, 18, 15, 75), "completed_sets": [], "status": "pending", "today_focus": "后束和肩胛稳定"},
                {"id": "ex_4", "exercise_id": "dumbbell_curl", "name": "哑铃弯举", "role": "isolation", "planned_sets": make_sets(3, 10, 12, 75), "completed_sets": [], "status": "pending", "today_focus": "手臂收尾，不借力"},
            ])
        if time_min >= 60:
            exercises.append({"id": "ex_5", "exercise_id": "straight_arm_pulldown", "name": "直臂下压", "role": "isolation", "planned_sets": make_sets(3, 20, 15, 75), "completed_sets": [], "status": "pending", "today_focus": "背阔孤立，控制离心"})
    elif focus == "legs":
        exercises.append({
            "id": "ex_1", "exercise_id": "leg_press", "name": "腿举",
            "role": "main", "planned_sets": make_sets(4, 120, 10, 180),
            "completed_sets": [], "status": "pending", "today_focus": "腿部主项，动作深度稳定"
        })
        if time_min >= 45:
            exercises.extend([
                {"id": "ex_2", "exercise_id": "romanian_deadlift", "name": "罗马尼亚硬拉", "role": "secondary", "planned_sets": make_sets(3, 60, 8, 150), "completed_sets": [], "status": "pending", "today_focus": "腘绳肌拉伸感，不抢重量"},
                {"id": "ex_3", "exercise_id": "leg_curl", "name": "腿弯举", "role": "isolation", "planned_sets": make_sets(3, 35, 12, 90), "completed_sets": [], "status": "pending", "today_focus": "后侧链容量"},
                {"id": "ex_4", "exercise_id": "calf_raise", "name": "提踵", "role": "isolation", "planned_sets": make_sets(3, 50, 15, 75), "completed_sets": [], "status": "pending", "today_focus": "小腿收尾，底部停顿"},
            ])
        if time_min >= 60:
            exercises.append({"id": "ex_5", "exercise_id": "leg_extension", "name": "腿屈伸", "role": "isolation", "planned_sets": make_sets(3, 35, 15, 75), "completed_sets": [], "status": "pending", "today_focus": "股四头肌泵感，不锁膝"})
    else:
        # Always include bench press as main unless shoulder/wrist discomfort
        skip_bench = any(d in ["肩", "肘", "腕"] for d in discomfort)
        main_exercise = "哑铃卧推" if skip_bench else "卧推"

        exercises.append({
            "id": "ex_1", "exercise_id": "bench_press", "name": main_exercise,
            "role": "main", "planned_sets": make_sets(4, 60, 8, 150),
            "completed_sets": [], "status": "pending", "today_focus": "稳定完成，不冲极限"
        })

        if time_min >= 45:
            exercises.extend([
                {"id": "ex_2", "exercise_id": "incline_dumbbell_press", "name": "上斜哑铃卧推", "role": "secondary", "planned_sets": make_sets(3, 20, 10, 120), "completed_sets": [], "status": "pending", "today_focus": "补上胸容量，动作控制"},
                {"id": "ex_3", "exercise_id": "dumbbell_shoulder_press", "name": "哑铃推肩", "role": "secondary", "planned_sets": make_sets(3, 16, 10, 120), "completed_sets": [], "status": "pending", "today_focus": "肩部容量，控制节奏"},
                {"id": "ex_4", "exercise_id": "lateral_raise", "name": "侧平举", "role": "isolation", "planned_sets": make_sets(3, 8, 15, 90), "completed_sets": [], "status": "pending", "today_focus": "肩中束收尾"},
            ])

        if time_min >= 60:
            exercises.append({"id": "ex_5", "exercise_id": "triceps_pushdown", "name": "三头下压", "role": "isolation", "planned_sets": make_sets(3, 25, 15, 90), "completed_sets": [], "status": "pending", "today_focus": "三头收尾"})

    plan = {
        "id": "plan_" + datetime.now().strftime("%Y%m%d%H%M%S"),
        "user_id": user_profile.get("id", "user_001"),
        "status": "active", "structure": "PPL", "focus": focus,
        "strategy": strategy,
        "generated_from": {**negotiation, "strategy": strategy, "focus": focus},
        "exercises": exercises,
        "user_overrides": [], "agent_adjustments": [], "next_session_updates": []
    }
    return plan


def fallback_adjust_set(set_record: dict, memory: dict) -> tuple[Optional[dict], str]:
    """Rule-based set adjustment fallback."""
    state = set_record.get("perceived_state", "正常")
    short_memory = memory.get("short_term", memory)
    base_weight = set_record.get("actual_weight_kg", set_record["planned_weight_kg"])
    base_reps = set_record.get("actual_reps", set_record["planned_reps"])

    if state == "正常":
        return None, "按计划继续。"

    if state == "过轻":
        return {
            "type": "increase_weight",
            "new_weight_kg": base_weight + 2.5,
            "new_reps": base_reps,
            "reason": "计划明显低估强度，需要立即提高训练刺激"
        }, "这组对你来说太轻了，下一组加到 {}kg，保持 {} 次。".format(
            base_weight + 2.5, base_reps
        )

    if state == "轻松":
        easy_count = short_memory.get("consecutive_easy_sets", 0) + 1
        if easy_count >= 2:
            return {
                "type": "increase_weight",
                "new_weight_kg": base_weight + 2.5,
                "new_reps": base_reps,
                "reason": "连续两组轻松，建议小幅加重"
            }, "连续两组轻松，下一组加到 {}kg。".format(base_weight + 2.5)
        return None, "这组轻松，先记录。如果下一组还是轻松，我会建议加重。"

    if state == "粘滞":
        sticky_count = short_memory.get("consecutive_sticky_sets", 0) + 1
        if sticky_count >= 2:
            return {
                "type": "reduce_reps_and_extend_rest",
                "new_weight_kg": base_weight,
                "new_reps": max(base_reps - 1, 5),
                "new_rest_sec": set_record.get("planned_rest_sec", 150) + 30,
                "reason": "连续两组粘滞，保守调整：保留重量，降低次数，延长休息"
            }, "连续两组粘滞，下一组保留 {}kg，目标 {} 次，多休息一会儿。".format(
                base_weight, max(base_reps - 1, 5)
            )
        return None, "这组有点粘滞，先记录。如果下一组还是粘滞，我会做保守调整。"

    if state == "失败":
        return {
            "type": "reduce_reps_extend_rest",
            "new_weight_kg": base_weight,
            "new_reps": max(base_reps - 2, 3),
            "new_rest_sec": set_record.get("planned_rest_sec", 150) + 60,
            "reason": "失败处理：降低目标次数，延长休息"
        }, "这组没有完成。下一组降低目标次数，多休息一下。"

    return None, ""


def fallback_failure_handler(failure_type: str, set_record: dict) -> tuple[dict, str, str, bool]:
    """Rule-based failure handling fallback."""
    risk_levels = {
        "推不上去/没完成次数": ("low", False),
        "被压/需要保护": ("high", True),
        "疼痛/不适": ("safety", True),
        "动作变形/主动放弃": ("medium-high", False),
    }
    risk_level, should_end = risk_levels.get(failure_type, ("low", False))

    messages = {
        "推不上去/没完成次数": "没关系，这次没完成。下一组降低目标次数，延长休息。",
        "被压/需要保护": "安全最重要。下一组降重 5-10%，建议找保护。",
        "疼痛/不适": "有疼痛就不要硬撑了。建议停止当前动作，观察一下。",
        "动作变形/主动放弃": "动作变形说明负荷可能太大了。下一组降重，优先保证动作质量。",
    }

    if failure_type == "推不上去/没完成次数":
        adjustment = {
            "type": "reduce_reps",
            "new_weight_kg": set_record.get("actual_weight_kg", set_record["planned_weight_kg"]),
            "new_reps": max(set_record.get("actual_reps", set_record["planned_reps"]) - 2, 3),
            "new_rest_sec": set_record.get("planned_rest_sec", 150) + 30,
        }
    elif failure_type == "被压/需要保护":
        adjustment = {
            "type": "reduce_weight",
            "new_weight_kg": round(set_record.get("actual_weight_kg", set_record["planned_weight_kg"]) * 0.9, 1),
            "new_reps": max(set_record.get("actual_reps", set_record["planned_reps"]) - 2, 3),
            "new_rest_sec": set_record.get("planned_rest_sec", 150) + 60,
        }
    elif failure_type == "疼痛/不适":
        adjustment = {
            "type": "stop_exercise",
            "new_weight_kg": 0, "new_reps": 0, "new_rest_sec": 0,
        }
        should_end = True
    else:  # 动作变形
        adjustment = {
            "type": "reduce_weight",
            "new_weight_kg": round(set_record.get("actual_weight_kg", set_record["planned_weight_kg"]) * 0.95, 1),
            "new_reps": max(set_record.get("actual_reps", set_record["planned_reps"]) - 1, 3),
            "new_rest_sec": set_record.get("planned_rest_sec", 150) + 30,
        }

    return adjustment, messages.get(failure_type, ""), risk_level, should_end


def fallback_review(session: dict) -> dict:
    """Rule-based training review fallback."""
    exercises = session.get("exercises", [])
    total_sets = sum(len(e.get("completed_sets", [])) for e in exercises)
    planned_sets = sum(len(e.get("planned_sets", [])) for e in exercises)
    completed_exercises = [e for e in exercises if e.get("status") == "completed"]

    # Calculate capacity
    capacity = 0
    sticky_count = 0
    normal_count = 0
    exercise_summaries = []

    for ex in exercises:
        ex_sets = ex.get("completed_sets", [])
        ex_capacity = sum(s.get("actual_weight_kg", 0) * s.get("actual_reps", 0) for s in ex_sets)
        capacity += ex_capacity
        ex_sticky = sum(1 for s in ex_sets if s.get("perceived_state") == "粘滞")
        ex_normal = sum(1 for s in ex_sets if s.get("perceived_state") == "正常")
        sticky_count += ex_sticky
        normal_count += ex_normal

        exercise_summaries.append({
            "name": ex.get("name", ""),
            "role": ex.get("role", ""),
            "completed_sets": len(ex_sets),
            "planned_sets": len(ex.get("planned_sets", [])),
            "capacity": ex_capacity,
            "normal_count": ex_normal,
            "sticky_count": ex_sticky,
            "conclusion": "完成稳定" if ex_sticky == 0 else "后半段出现粘滞",
        })

    summary = f"今天完成了 Push Day 的主要训练。共完成 {len(completed_exercises)} 个动作，{total_sets} 组训练。"
    if sticky_count > 0:
        summary += f"有 {sticky_count} 组出现粘滞，说明接近当前上限。"

    key_judgement = "训练完成度不错"
    if sticky_count >= 2:
        key_judgement = "后半段接近上限，建议下次保持当前重量继续稳定"
    elif normal_count == total_sets and total_sets > 0:
        key_judgement = "全部组正常完成，可以考虑下次小幅加重"

    next_suggestion = "下次继续保持当前节奏，重点关注动作质量。"
    if sticky_count >= 2:
        next_suggestion = "下次卧推继续保持当前重量，目标把所有组做到正常完成，再考虑加重。"

    return {
        "summary": summary,
        "completion_status": f"{len(completed_exercises)} / {len(exercises)} 个动作，{total_sets} / {planned_sets} 组",
        "key_judgement": key_judgement,
        "next_suggestion": next_suggestion,
        "exercise_summaries": exercise_summaries,
        "next_plan_updates": ["保持卧推当前重量，先稳定再进阶"],
    }


def fallback_replacement(reason: str, current_exercise: dict) -> tuple[dict, str]:
    """Rule-based exercise replacement fallback."""
    replacements = {
        "卧推": ["哑铃卧推", "器械推胸", "史密斯卧推", "上斜哑铃卧推"],
        "哑铃卧推": ["器械推胸", "史密斯卧推", "俯卧撑", "绳索夹胸"],
        "上斜哑铃卧推": ["上斜器械推胸", "上斜史密斯卧推", "俯卧撑"],
        "哑铃推肩": ["器械推肩", "杠铃推肩", "阿诺德推举"],
        "侧平举": ["绳索侧平举", "器械侧平举", "直立划船"],
        "三头下压": ["绳索下压", "窄距卧推", "臂屈伸"],
    }
    name = current_exercise.get("name", "")
    options = replacements.get(name, ["类似替代动作"])

    return {
        "recommended": options[0],
        "options": options,
        "reason": "它和原动作模式接近，今天仍然可以作为同部位主项。"
    }, f"建议替换为：{options[0]}"


# ========== API Routes ==========

@app.get("/")
async def root():
    return {"message": "Vela Agent API", "version": "0.1.0"}


@app.post("/api/agent/plan", response_model=PlanResponse)
async def generate_plan(req: PlanRequest):
    """Generate today's training plan."""
    try:
        client = get_llm_client()
        system_prompt = load_prompt("plan_generator")
        user_prompt = json.dumps({
            "user_profile": req.user_profile.model_dump(),
            "memory": req.memory.model_dump(),
            "negotiation_input": req.negotiation_input,
        }, ensure_ascii=False, indent=2)

        response_text = await client.chat(system_prompt, user_prompt, temperature=0.3)

        # Try to parse JSON from response
        try:
            parsed = json.loads(response_text)
            plan_data = parsed.get("plan", parsed)
            agent_message = parsed.get("agent_message", "计划已生成")
            plan_data = normalize_plan_data(plan_data)
        except json.JSONDecodeError:
            # Fallback: use rule-based
            plan_data = fallback_plan_generator(
                req.user_profile.model_dump(),
                req.memory.model_dump(),
                req.negotiation_input,
            )
            agent_message = "计划已生成"

        return PlanResponse(plan=TrainingPlan(**plan_data), agent_message=agent_message)

    except Exception as e:
        # Fallback on any error
        plan_data = fallback_plan_generator(
            req.user_profile.model_dump(),
            req.memory.model_dump(),
            req.negotiation_input,
        )
        return PlanResponse(plan=TrainingPlan(**plan_data), agent_message=f"计划已生成（规则模式）")


@app.post("/api/agent/adjust-set", response_model=AdjustSetResponse)
async def adjust_set(req: AdjustSetRequest):
    """Adjust next set based on current set feedback."""
    try:
        client = get_llm_client()
        system_prompt = load_prompt("set_adjustment")
        user_prompt = json.dumps({
            "set_record": req.set_record.model_dump(),
            "active_plan": req.active_plan.model_dump(),
            "memory": req.memory.model_dump(),
        }, ensure_ascii=False, indent=2)

        response_text = await client.chat(system_prompt, user_prompt, temperature=0.2)

        try:
            parsed = json.loads(response_text)
            adjustment = parsed.get("adjustment")
            agent_message = parsed.get("agent_message", "")
            next_set = parsed.get("next_set")
        except json.JSONDecodeError:
            adjustment, agent_message = fallback_adjust_set(
                req.set_record.model_dump(),
                req.memory.model_dump(),
            )
            next_set = None

        next_set_obj = PlannedSet(**next_set) if next_set else None
        return AdjustSetResponse(
            adjustment=adjustment,
            agent_message=agent_message,
            next_set=next_set_obj,
        )

    except Exception:
        adjustment, agent_message = fallback_adjust_set(
            req.set_record.model_dump(),
            req.memory.model_dump(),
        )
        return AdjustSetResponse(adjustment=adjustment, agent_message=agent_message)


@app.post("/api/agent/handle-failure", response_model=FailureResponse)
async def handle_failure(req: FailureRequest):
    """Handle failure event."""
    try:
        client = get_llm_client()
        system_prompt = load_prompt("failure_handling")
        user_prompt = json.dumps({
            "failure_type": req.failure_type,
            "set_record": req.set_record.model_dump(),
            "active_plan": req.active_plan.model_dump(),
            "memory": req.memory.model_dump(),
        }, ensure_ascii=False, indent=2)

        response_text = await client.chat(system_prompt, user_prompt, temperature=0.1)

        try:
            parsed = json.loads(response_text)
            adjustment = parsed.get("adjustment", {})
            agent_message = parsed.get("agent_message", "")
            risk_level = parsed.get("risk_level", "low")
            should_end = parsed.get("should_end_exercise", False)
        except json.JSONDecodeError:
            adjustment, agent_message, risk_level, should_end = fallback_failure_handler(
                req.failure_type,
                req.set_record.model_dump(),
            )

        return FailureResponse(
            adjustment=adjustment,
            agent_message=agent_message,
            risk_level=risk_level,
            should_end_exercise=should_end,
        )

    except Exception:
        adjustment, agent_message, risk_level, should_end = fallback_failure_handler(
            req.failure_type,
            req.set_record.model_dump(),
        )
        return FailureResponse(
            adjustment=adjustment,
            agent_message=agent_message,
            risk_level=risk_level,
            should_end_exercise=should_end,
        )


@app.post("/api/agent/replacement", response_model=ReplacementResponse)
async def handle_replacement(req: ReplacementRequest):
    """Recommend exercise replacement."""
    try:
        client = get_llm_client()
        system_prompt = load_prompt("replacement")
        user_prompt = json.dumps({
            "reason": req.reason,
            "current_exercise": req.current_exercise.model_dump(),
            "active_plan": req.active_plan.model_dump(),
            "memory": req.memory.model_dump(),
        }, ensure_ascii=False, indent=2)

        response_text = await client.chat(system_prompt, user_prompt, temperature=0.3)

        try:
            parsed = json.loads(response_text)
            recommendation = parsed.get("recommendation", {})
            agent_message = parsed.get("agent_message", "")
        except json.JSONDecodeError:
            recommendation, agent_message = fallback_replacement(
                req.reason,
                req.current_exercise.model_dump(),
            )

        return ReplacementResponse(recommendation=recommendation, agent_message=agent_message)

    except Exception:
        recommendation, agent_message = fallback_replacement(
            req.reason,
            req.current_exercise.model_dump(),
        )
        return ReplacementResponse(recommendation=recommendation, agent_message=agent_message)


@app.post("/api/agent/review", response_model=ReviewResponse)
async def generate_review(req: ReviewRequest):
    """Generate training review."""
    try:
        client = get_llm_client()
        system_prompt = load_prompt("review_generator")
        user_prompt = json.dumps({
            "session": req.session.model_dump(),
            "memory": req.memory.model_dump(),
        }, ensure_ascii=False, indent=2)

        response_text = await client.chat(system_prompt, user_prompt, temperature=0.4)

        try:
            parsed = json.loads(response_text)
            review_data = parsed
        except json.JSONDecodeError:
            review_data = fallback_review(req.session.model_dump())

        return ReviewResponse(**review_data)

    except Exception:
        review_data = fallback_review(req.session.model_dump())
        return ReviewResponse(**review_data)


@app.post("/api/agent/negotiation")
async def negotiation_step(data: dict):
    """Handle negotiation step."""
    step = data.get("step", 1)
    user_input = data.get("user_input", "")
    previous = data.get("previous_answers", {})

    questions = {
        1: {"q": "开始前先确认一下，今天身体状态怎么样？", "options": ["轻松兴奋", "正常", "有点困 / 疲劳", "自己说一句"]},
        2: {"q": "今天大概能练多久？我会根据时间压缩或展开课表。", "options": ["30 分钟", "45 分钟", "60 分钟", "自己输入"]},
        3: {"q": "今天有没有哪里不舒服，或者需要避开的动作？", "options": ["没有", "肩 / 肘 / 腕", "腰 / 髋 / 膝", "其他 / 自己说一句"]},
        4: {"q": "", "options": ["按这个来", "我想冲一下", "我想保守一点", "自己说一句"]},
    }

    if step == 4:
        state = previous.get("state", "正常")
        time_str = previous.get("time", "45 分钟")
        discomfort = previous.get("discomfort", "没有")
        strategy = "稳"
        if "轻松" in state:
            strategy = "冲"
        elif "困" in state or "疲劳" in state:
            strategy = "保"

        msg = f"基于你今天状态{state}、可训练 {time_str}、{discomfort}，我建议今天走「{strategy}」：按 Push Day 推进，卧推做主项。"
        return NegotiationResponse(
            next_question=msg,
            options=questions[4]["options"],
            strategy=strategy,
            agent_message=msg,
        )

    q_data = questions.get(step, questions[1])
    return NegotiationResponse(
        next_question=q_data["q"],
        options=q_data["options"],
        agent_message=q_data["q"],
    )


if __name__ == "__main__":
    import uvicorn
    settings = get_settings()
    uvicorn.run(app, host=settings.backend_host, port=settings.backend_port)
