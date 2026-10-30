from sqlalchemy import select
from sqlalchemy.orm import Session

from app.errors import NotFoundError
from app.models import ApiToken, User
from app.security import generate_api_token, hash_api_token


def list_tokens(db: Session, user: User) -> list[ApiToken]:
    return list(db.scalars(select(ApiToken).where(ApiToken.user_id == user.id).order_by(ApiToken.created_at)))


def create_token(db: Session, user: User, name: str) -> tuple[ApiToken, str]:
    """Returns the row and the plain token; the plain token is never stored."""
    plain = generate_api_token()
    api_token = ApiToken(user_id=user.id, name=name.strip(), token_hash=hash_api_token(plain), prefix=plain[:10])
    db.add(api_token)
    db.commit()
    db.refresh(api_token)
    return api_token, plain


def revoke_token(db: Session, user: User, token_id: int) -> None:
    api_token = db.get(ApiToken, token_id)
    if api_token is None or api_token.user_id != user.id:
        raise NotFoundError("Token not found")
    db.delete(api_token)
    db.commit()
