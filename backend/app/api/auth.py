from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.models.user import User
from app.schemas.auth import UserRegister, UserLogin, Token, UserResponse
from app.core.security import verify_password, get_password_hash, create_access_token
from app.api.deps import get_current_user

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/register", response_model=Token)
def register(user_in: UserRegister, db: Session = Depends(get_db)):
    # Check existing email
    if db.query(User).filter(User.email == user_in.email).first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email address already exists."
        )
    # Check existing username
    if db.query(User).filter(User.username == user_in.username).first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This username is already taken. Please choose another."
        )

    user = User(
        email=user_in.email,
        username=user_in.username,
        hashed_password=get_password_hash(user_in.password),
        full_name=user_in.full_name or user_in.username,
        is_active=True,
        is_admin=False
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    access_token = create_access_token(subject=user.id)
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "email": user.email,
            "username": user.username,
            "full_name": user.full_name,
            "is_admin": user.is_admin
        }
    }

@router.post("/login", response_model=Token)
def login(login_in: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(
        (User.email == login_in.username_or_email) | (User.username == login_in.username_or_email)
    ).first()

    if not user or not verify_password(login_in.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username/email or password.",
            headers={"WWW-Authenticate": "Bearer"}
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This user account has been disabled."
        )

    access_token = create_access_token(subject=user.id)
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "email": user.email,
            "username": user.username,
            "full_name": user.full_name,
            "is_admin": user.is_admin
        }
    }

@router.post("/demo", response_model=Token)
def demo_login(db: Session = Depends(get_db)):
    """One-click login as Demo Data Analyst for immediate testing."""
    demo_user = db.query(User).filter(User.email == "demo@insightai.com").first()
    if not demo_user:
        demo_user = User(
            email="demo@insightai.com",
            username="demouser",
            hashed_password=get_password_hash("demo123456"),
            full_name="Alex Data Analyst",
            is_active=True,
            is_admin=True
        )
        db.add(demo_user)
        db.commit()
        db.refresh(demo_user)

    access_token = create_access_token(subject=demo_user.id)
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": demo_user.id,
            "email": demo_user.email,
            "username": demo_user.username,
            "full_name": demo_user.full_name,
            "is_admin": demo_user.is_admin
        }
    }

@router.post("/logout")
def logout():
    return {"message": "Successfully logged out"}
