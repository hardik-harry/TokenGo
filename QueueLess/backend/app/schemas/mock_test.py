from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

class QuestionOut(BaseModel):
    id: int
    category: str
    question_text: str
    options: List[str]
    sign_type: Optional[str] = None

    class Config:
        from_attributes = True

class TestSubmissionItem(BaseModel):
    question_id: int
    selected_option: Optional[int] = None # 0, 1, 2, 3 or None if skipped

class TestSubmissionRequest(BaseModel):
    time_taken_seconds: int
    answers: List[TestSubmissionItem]

class QuestionResultDetail(BaseModel):
    question_id: int
    category: str
    question_text: str
    options: List[str]
    user_selected: Optional[int] = None
    correct_option: int
    explanation: str
    sign_type: Optional[str] = None
    is_correct: bool

class TestSubmissionResponse(BaseModel):
    attempt_id: Optional[int] = None
    total_questions: int
    correct_count: int
    incorrect_count: int
    unanswered_count: int
    score: int
    percentage: float
    time_taken_seconds: int
    passed: bool
    passing_threshold: int = 10
    details: List[QuestionResultDetail]

class AttemptHistoryItem(BaseModel):
    id: int
    total_questions: int
    correct_count: int
    incorrect_count: int
    unanswered_count: int
    score: int
    percentage: float
    time_taken_seconds: int
    passed: bool
    created_at: datetime

    class Config:
        from_attributes = True
