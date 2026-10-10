from typing import Any
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from datetime import timedelta
import re

from app.api import deps
from app.core import security
from app.core.config import settings
from app.models.models import User, UserSettings
from app.schemas.user import (
    UserCreate, UserResponse, Token, UserUpdate, UserPasswordUpdate,
    UserSettingsUpdate, UserSettingsResponse
)

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
    
    if not user_in.mobile_number:
        raise HTTPException(status_code=400, detail="Mobile number is required.")
        
    if not re.match(r'^(\+91)?\d{10}$', user_in.mobile_number):
        raise HTTPException(status_code=400, detail="Invalid Indian mobile number.")
        
    user_mobile = db.query(User).filter(User.mobile_number == user_in.mobile_number).first()
    if user_mobile:
        raise HTTPException(
            status_code=400,
            detail="The user with this mobile number already exists in the system.",
        )
        
    pwd = user_in.password
    if len(pwd) < 8 or not re.search(r'[A-Z]', pwd) or not re.search(r'[a-z]', pwd) or not re.search(r'\d', pwd) or not re.search(r'[@#$%!&]', pwd):
        raise HTTPException(
            status_code=400,
            detail="Password must be at least 8 characters, with 1 uppercase, 1 lowercase, 1 number, and 1 special character."
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
        mobile_number=user_in.mobile_number,
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
    
    pwd = body.new_password
    if len(pwd) < 8 or not re.search(r'[A-Z]', pwd) or not re.search(r'[a-z]', pwd) or not re.search(r'\d', pwd) or not re.search(r'[^a-zA-Z0-9]', pwd):
        raise HTTPException(
            status_code=400,
            detail="New password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special symbol."
        )

    if security.verify_password(body.new_password, current_user.password_hash):
        raise HTTPException(
            status_code=400,
            detail="New password must be different from current password."
        )
    
    current_user.password_hash = security.get_password_hash(body.new_password)
    db.commit()
    return {"success": True, "msg": "Password updated successfully"}

@router.get("/me/settings", response_model=UserSettingsResponse)
def get_user_settings(
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Get current user settings.
    """
    user_settings = db.query(UserSettings).filter(UserSettings.user_id == current_user.id).first()
    if not user_settings:
        user_settings = UserSettings(
            user_id=current_user.id,
            notifications_enabled=True,
            language="English",
            theme="Light"
        )
        db.add(user_settings)
        db.commit()
        db.refresh(user_settings)
        
    return user_settings

@router.put("/me/settings", response_model=UserSettingsResponse)
def update_user_settings(
    settings_in: UserSettingsUpdate,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Update current user settings.
    """
    user_settings = db.query(UserSettings).filter(UserSettings.user_id == current_user.id).first()
    if not user_settings:
        user_settings = UserSettings(
            user_id=current_user.id,
            notifications_enabled=True,
            language="English",
            theme="Light"
        )
        db.add(user_settings)
        
    if settings_in.notifications_enabled is not None:
        user_settings.notifications_enabled = settings_in.notifications_enabled
    if settings_in.language is not None and settings_in.language.strip():
        user_settings.language = settings_in.language.strip()
    if settings_in.theme is not None and settings_in.theme.strip():
        user_settings.theme = settings_in.theme.strip()
        
    db.commit()
    db.refresh(user_settings)
    return user_settings

@router.get("/admin/test")
def admin_only_test(
    current_user: User = Depends(deps.require_role(["admin"])),
) -> Any:
    """
    Test endpoint only accessible by admins.
    """
    return {"msg": f"Welcome Admin {current_user.name}"}

