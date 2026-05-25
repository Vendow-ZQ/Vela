from pydantic import BaseModel, Field
from typing import Optional, List, Literal


# ========== Shared Types ==========

Strategy = Literal["稳", "冲", "保"]
PerceivedState = Literal["过轻", "轻松", "正常", "粘滞", "失败"]
FailureType = Literal["推不上去/没完成次数", "被压/需要保护", "疼痛/不适", "动作变形/主动放弃"]
ExerciseRole = Literal["main", "secondary", "isolation", "finisher", "technique"]
ExerciseStatus = Literal["pending", "active", "completed", "skipped", "replaced"]


# ========== User ==========

class UserProfile(BaseModel):
    id: str
    name: str
    goal: Literal["增肌", "减脂", "塑形", "增力", "力形兼备", "综合提升"]
    height_cm: int
    weight_kg: float
    training_age_months: int
    injury_history: List[str] = Field(default_factory=list)
    weekly_training_target: int = 3
    preferred_split: str = "PPL"


class BodyMetric(BaseModel):
    date: str
    weight_kg: float
    body_fat_percent: float
    muscle_mass_kg: float
    source: str = "mock"


# ========== Exercise ==========

class Exercise(BaseModel):
    id: str
    name: str
    category: str
    primary_muscles: List[str]
    role: ExerciseRole
    equipment: List[str]
    default_sets: tuple[int, int]
    default_rep_range: tuple[int, int]
    default_rest_sec: tuple[int, int]
    replacements: List[str]
    risk_notes: Optional[List[str]] = None


# ========== Training Plan ==========

class PlannedSet(BaseModel):
    set_index: int
    planned_weight_kg: float
    planned_reps: int
    planned_rest_sec: int


class SetRecord(BaseModel):
    set_index: int
    exercise_id: str
    planned_weight_kg: float
    planned_reps: int
    planned_rest_sec: int
    actual_weight_kg: float
    actual_reps: int
    perceived_state: PerceivedState
    failure_type: Optional[FailureType] = None
    free_text_note: Optional[str] = None
    rest_started_at: Optional[str] = None
    rest_ended_at: Optional[str] = None
    accepted_agent_adjustment: bool = True
    agent_adjustment_after_set: Optional[dict] = None


class ActiveExercise(BaseModel):
    id: str
    exercise_id: str
    name: str
    role: ExerciseRole
    planned_sets: List[PlannedSet]
    completed_sets: List[SetRecord] = Field(default_factory=list)
    status: ExerciseStatus = "pending"
    today_focus: str = ""


class TrainingPlan(BaseModel):
    id: str
    user_id: str
    status: str = "draft"
    structure: str = "PPL"
    focus: str = "push"
    strategy: Strategy = "稳"
    generated_from: dict = Field(default_factory=dict)
    exercises: List[ActiveExercise] = Field(default_factory=list)
    user_overrides: List[dict] = Field(default_factory=list)
    agent_adjustments: List[dict] = Field(default_factory=list)
    next_session_updates: List[str] = Field(default_factory=list)


# ========== Session ==========

class WorkoutSession(BaseModel):
    id: str
    user_id: str
    date: str
    focus: str
    started_at: str
    ended_at: Optional[str] = None
    duration_min: Optional[int] = None
    capacity_kg: Optional[float] = None
    planned_exercise_count: int = 0
    completed_exercise_count: int = 0
    exercises: List[ActiveExercise] = Field(default_factory=list)
    summary: Optional[str] = None
    key_judgement: Optional[str] = None
    next_suggestion: Optional[str] = None


# ========== Memory ==========

class ShortTermMemory(BaseModel):
    current_exercise_id: Optional[str] = None
    current_set_index: int = 0
    today_strategy: Optional[Strategy] = None
    user_state: Optional[str] = None
    available_time_min: Optional[int] = None
    discomfort: List[str] = Field(default_factory=list)
    consecutive_easy_sets: int = 0
    consecutive_sticky_sets: int = 0
    has_failure_in_current_exercise: bool = False
    current_exercise_replaced: bool = False


class LongTermMemory(BaseModel):
    id: str
    type: Literal["preference", "performance", "risk", "feedback_calibration", "plan"]
    content: str
    related_exercise_id: Optional[str] = None
    related_body_part: Optional[str] = None
    updated_at: str


class Memory(BaseModel):
    short_term: ShortTermMemory = Field(default_factory=ShortTermMemory)
    long_term: List[LongTermMemory] = Field(default_factory=list)


# ========== Agent Request/Response ==========

class NegotiationInput(BaseModel):
    step: int
    user_input: str
    previous_answers: dict = Field(default_factory=dict)


class PlanRequest(BaseModel):
    user_profile: UserProfile
    memory: Memory
    negotiation_input: dict


class PlanResponse(BaseModel):
    plan: TrainingPlan
    agent_message: str


class AdjustSetRequest(BaseModel):
    set_record: SetRecord
    active_plan: TrainingPlan
    memory: Memory


class AdjustSetResponse(BaseModel):
    adjustment: Optional[dict]
    agent_message: str
    next_set: Optional[PlannedSet] = None


class FailureRequest(BaseModel):
    failure_type: FailureType
    set_record: SetRecord
    active_plan: TrainingPlan
    memory: Memory


class FailureResponse(BaseModel):
    adjustment: dict
    agent_message: str
    risk_level: str
    should_end_exercise: bool = False


class ReplacementRequest(BaseModel):
    reason: str
    current_exercise: ActiveExercise
    active_plan: TrainingPlan
    memory: Memory


class ReplacementResponse(BaseModel):
    recommendation: dict
    agent_message: str


class ReviewRequest(BaseModel):
    session: WorkoutSession
    memory: Memory


class ReviewResponse(BaseModel):
    summary: str
    completion_status: str
    key_judgement: str
    next_suggestion: str
    exercise_summaries: List[dict] = Field(default_factory=list)
    next_plan_updates: List[str] = Field(default_factory=list)


class NegotiationResponse(BaseModel):
    next_question: Optional[str] = None
    options: List[str] = Field(default_factory=list)
    strategy: Optional[Strategy] = None
    agent_message: str
