import uuid
from collections.abc import AsyncGenerator

from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError
from sqlalchemy.ext.asyncio import AsyncSession
from typing_extensions import Annotated

from app.config import Settings, get_settings
from app.core.security import decode_access_token
from app.models.session import async_session_factory
from app.models.user import User


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with async_session_factory() as session:
        yield session


DBSession = Annotated[AsyncSession, Depends(get_db)]
SettingsDep = Annotated[Settings, Depends(get_settings)]

# auto_error=False: guests without a token are allowed on optional-auth endpoints.
_bearer_scheme = HTTPBearer(auto_error=False)
BearerCredentials = Annotated[HTTPAuthorizationCredentials | None, Depends(_bearer_scheme)]


async def get_optional_user(
    db: DBSession, settings: SettingsDep, credentials: BearerCredentials
) -> User | None:
    if credentials is None:
        return None
    try:
        payload = decode_access_token(credentials.credentials, settings)
        user_id = uuid.UUID(str(payload.get("sub")))
    except (JWTError, ValueError):
        return None
    return await db.get(User, user_id)


async def get_current_user(user: Annotated[User | None, Depends(get_optional_user)]) -> User:
    if user is None:
        raise HTTPException(
            status_code=401,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user


OptionalUser = Annotated[User | None, Depends(get_optional_user)]
CurrentUser = Annotated[User, Depends(get_current_user)]
