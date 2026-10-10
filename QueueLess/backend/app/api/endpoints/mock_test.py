from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy.sql.expression import func
from typing import List, Optional
import jwt

from app.api.deps import get_db, oauth2_scheme, settings, get_current_user
from fastapi.security import OAuth2PasswordBearer
from app.models.models import MockTestQuestion, MockTestAttempt, User
from app.schemas.mock_test import (
    QuestionOut, TestSubmissionRequest, TestSubmissionResponse,
    QuestionResultDetail, AttemptHistoryItem
)
from app.schemas.user import TokenData

router = APIRouter()

oauth2_scheme_optional = OAuth2PasswordBearer(
    tokenUrl=f"{settings.API_V1_STR}/auth/login", auto_error=False
)

def get_current_user_optional(db: Session = Depends(get_db), token: str = Depends(oauth2_scheme_optional)) -> Optional[User]:
    if not token:
        return None
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        token_data = TokenData(email=payload.get("sub"), role=payload.get("role"))
        user = db.query(User).filter(User.email == token_data.email).first()
        return user
    except Exception:
        return None


@router.get("/questions", response_model=List[QuestionOut])
def get_mock_test_questions(limit: int = 15, db: Session = Depends(get_db)):
    """Fetch 15 random questions for the mock test."""
    questions = db.query(MockTestQuestion).order_by(func.random()).limit(limit).all()
    if not questions:
        raise HTTPException(status_code=404, detail="No questions found in the database. Please contact administrator.")
    return questions


@router.post("/submit", response_model=TestSubmissionResponse)
def submit_mock_test(
    submission: TestSubmissionRequest, 
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    """Submit mock test answers and calculate score."""
    q_ids = [ans.question_id for ans in submission.answers]
    questions_db = db.query(MockTestQuestion).filter(MockTestQuestion.id.in_(q_ids)).all()
    q_dict = {q.id: q for q in questions_db}
    
    correct_count = 0
    incorrect_count = 0
    unanswered_count = 0
    details = []
    
    for ans in submission.answers:
        q = q_dict.get(ans.question_id)
        if not q:
            continue
            
        user_selected = ans.selected_option
        is_correct = False
        
        if user_selected is None:
            unanswered_count += 1
        elif user_selected == q.correct_option:
            correct_count += 1
            is_correct = True
        else:
            incorrect_count += 1
            
        details.append(
            QuestionResultDetail(
                question_id=q.id,
                category=q.category,
                question_text=q.question_text,
                options=q.options,
                user_selected=user_selected,
                correct_option=q.correct_option,
                explanation=q.explanation,
                sign_type=q.sign_type,
                is_correct=is_correct
            )
        )
    
    total = correct_count + incorrect_count + unanswered_count
    if total == 0:
        total = 1 
        
    score = correct_count
    percentage = (score / total) * 100
    passing_threshold = 10
    passed = score >= passing_threshold

    attempt = None
    if current_user:
        details_json = [d.dict() for d in details]
        attempt = MockTestAttempt(
            user_id=current_user.id,
            total_questions=total,
            correct_count=correct_count,
            incorrect_count=incorrect_count,
            unanswered_count=unanswered_count,
            score=score,
            percentage=percentage,
            time_taken_seconds=submission.time_taken_seconds,
            passed=passed,
            details_json=details_json
        )
        db.add(attempt)
        db.commit()
        db.refresh(attempt)
        attempt_id = attempt.id
    else:
        attempt_id = None
        
    return TestSubmissionResponse(
        attempt_id=attempt_id,
        total_questions=total,
        correct_count=correct_count,
        incorrect_count=incorrect_count,
        unanswered_count=unanswered_count,
        score=score,
        percentage=percentage,
        time_taken_seconds=submission.time_taken_seconds,
        passed=passed,
        passing_threshold=passing_threshold,
        details=details
    )


@router.get("/history", response_model=List[AttemptHistoryItem])
def get_mock_test_history(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get history of mock test attempts for logged-in user."""
    attempts = db.query(MockTestAttempt).filter(MockTestAttempt.user_id == current_user.id).order_by(MockTestAttempt.created_at.desc()).all()
    return attempts
