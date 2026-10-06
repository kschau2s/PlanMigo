from fastapi import APIRouter, HTTPException

from app.core.deps import CurrentUser, DBSession, SettingsDep
from app.core.security import create_access_token
from app.schemas.auth import LoginRequest, RegisterRequest, TokenResponse, UserOut
from app.services import auth as auth_service

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=TokenResponse)
async def register(request: RegisterRequest, db: DBSession, settings: SettingsDep) -> TokenResponse:
    try:
        user = await auth_service.register_user(db, request.email, request.password)
    except auth_service.EmailAlreadyRegisteredError as exc:
        raise HTTPException(status_code=409, detail="Diese E-Mail ist bereits registriert") from exc

    token = create_access_token(subject=str(user.id), settings=settings)
    return TokenResponse(access_token=token)


@router.post("/login", response_model=TokenResponse)
async def login(request: LoginRequest, db: DBSession, settings: SettingsDep) -> TokenResponse:
    try:
        user = await auth_service.authenticate_user(db, request.email, request.password)
    except auth_service.InvalidCredentialsError as exc:
        raise HTTPException(status_code=401, detail="E-Mail oder Passwort ist falsch") from exc

    token = create_access_token(subject=str(user.id), settings=settings)
    return TokenResponse(access_token=token)


@router.get("/me", response_model=UserOut)
async def me(user: CurrentUser) -> UserOut:
    return user
