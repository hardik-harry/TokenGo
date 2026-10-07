from typing import Any
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from datetime import timedelta

from app.api import deps
from app.core import security
from app.core.config import settings
from app.models.models import User
from app.schemas.user import UserCreate, UserResponse, Token, UserUpdate, UserPasswordUpdate

router = APIRouter()

@router.post("/register", response_model=UserResponse)
def register_user(
    *,
    db: Session = Depends(deps.get_db),
    user_in: UserCreate,
) -> Any:
    """
    Register new user.
    """
    user = db.query(User).filter(User.email == user_in.email).first()
    if user:
        raise HTTPException(
            status_code=400,
            detail="The user with this email already exists in the system.",
        )
    
    # Enforce role boundaries on public registration (e.g. only citizens automatically)
    assigned_role = "citizen"
    if user_in.role in ["employee", "admin"]:
        # Only admin should be able to create admins/employees theoretically
        # But for this iteration, unless authenticated as admin, fallback to citizen
        assigned_role = "citizen"
        
    user = User(
        name=user_in.name,
        email=user_in.email,
        password_hash=security.get_password_hash(user_in.password),
        role=assigned_role
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user

@router.post("/login", response_model=Token)
def login_access_token(
    db: Session = Depends(deps.get_db), form_data: OAuth2PasswordRequestForm = Depends()
) -> Any:
    """
    OAuth2 compatible token login, get an access token for future requests
    """
    user = db.query(User).filter(User.email == form_data.username).first()
    if not user or not security.verify_password(form_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    elif user.status != "active":
        raise HTTPException(status_code=400, detail="Inactive user")
        
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    return {
        "access_token": security.create_access_token(
            user.email, user.role, expires_delta=access_token_expires
        ),
        "token_type": "bearer",
    }

@router.get("/me", response_model=UserResponse)
def read_user_me(
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Get current user (role agnostic).
    """
    return current_user

@router.put("/me", response_model=UserResponse)
def update_user_me(
    user_in: UserUpdate,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Update current user securely natively.
    """
    if user_in.name is not None:
        current_user.name = user_in.name
    if user_in.mobile_number is not None:
        current_user.mobile_number = user_in.mobile_number
        
    db.commit()
    db.refresh(current_user)
    return current_user

@router.put("/me/password")
def update_password_me(
    body: UserPasswordUpdate,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Update current user password securely.
    """
    if not security.verify_password(body.current_password, current_user.password_hash):
        raise HTTPException(status_code=400, detail="Incorrect current password")
    
    current_user.password_hash = security.get_password_hash(body.new_password)
    db.commit()
    return {"msg": "Password updated successfully"}

@router.get("/admin/test")
def admin_only_test(
    current_user: User = Depends(deps.require_role(["admin"])),
) -> Any:
    """
    Test endpoint only accessible by admins.
    """
    return {"msg": f"Welcome Admin {current_user.name}"}
