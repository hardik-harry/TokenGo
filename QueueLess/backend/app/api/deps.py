from typing import Generator, Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
import jwt
from jwt import PyJWTError
from pydantic import ValidationError
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.session import SessionLocal
from app.models.models import User
from app.schemas.user import TokenData

oauth2_scheme = OAuth2PasswordBearer(
    tokenUrl=f"{settings.API_V1_STR}/auth/login"
)

def get_db() -> Generator:
    try:
        db = SessionLocal()
        yield db
    finally:
        db.close()

def get_current_user(
    db: Session = Depends(get_db), token: str = Depends(oauth2_scheme)
) -> User:
    try:
        payload = jwt.decode(
            token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM]
        )
        token_data = TokenData(email=payload.get("sub"), role=payload.get("role"))
    except (PyJWTError, ValidationError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    user = db.query(User).filter(User.email == token_data.email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

def get_current_active_user(
    current_user: User = Depends(get_current_user),
) -> User:
    if current_user.status != "active":
        raise HTTPException(status_code=400, detail="Inactive user")
    return current_user

def require_role(roles: list[str]):
    def role_checker(current_user: User = Depends(get_current_active_user)):
        if current_user.role not in roles and current_user.role != "admin": # Admin can bypass
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not enough permissions to access this endpoint"
            )
        return current_user
    return role_checker

# Predefined role dependencies
get_current_citizen = Depends(require_role(["citizen"]))
get_current_employee = Depends(require_role(["employee"]))
get_current_admin = Depends(require_role(["admin"]))
