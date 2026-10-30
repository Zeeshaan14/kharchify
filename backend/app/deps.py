from datetime import datetime, timezone
from typing import Annotated

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import ApiToken, User
from app.security import API_TOKEN_PREFIX, decode_access_token, hash_api_token

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

DbSession = Annotated[Session, Depends(get_db)]


def _unauthorized() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid or expired token",
        headers={"WWW-Authenticate": "Bearer"},
    )


def get_current_user(db: DbSession, token: Annotated[str, Depends(oauth2_scheme)]) -> User:
    """Accepts a login JWT or a personal API token (kh_...)."""
    if token.startswith(API_TOKEN_PREFIX):
        api_token = db.scalar(select(ApiToken).where(ApiToken.token_hash == hash_api_token(token)))
        if api_token is None:
            raise _unauthorized()
        api_token.last_used_at = datetime.now(timezone.utc)
        db.commit()
        return api_token.user

    user_id = decode_access_token(token)
    user = db.get(User, user_id) if user_id is not None else None
    if user is None:
        raise _unauthorized()
    return user


def get_session_user(db: DbSession, token: Annotated[str, Depends(oauth2_scheme)]) -> User:
    """Login JWT only — for sensitive actions an API token must not do (e.g. creating more tokens)."""
    if token.startswith(API_TOKEN_PREFIX):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Log in to manage API tokens")
    return get_current_user(db, token)


CurrentUser = Annotated[User, Depends(get_current_user)]
SessionUser = Annotated[User, Depends(get_session_user)]
