from fastapi import APIRouter, Response, status

from app.deps import DbSession, SessionUser
from app.schemas import ApiTokenCreate, ApiTokenCreated, ApiTokenOut
from app.services import tokens as service

# Token management needs a real login (JWT); an API token can't mint or revoke tokens.
router = APIRouter(prefix="/tokens", tags=["api tokens"])


@router.get("", response_model=list[ApiTokenOut])
def list_tokens(db: DbSession, user: SessionUser):
    return service.list_tokens(db, user)


@router.post("", response_model=ApiTokenCreated, status_code=status.HTTP_201_CREATED)
def create_token(payload: ApiTokenCreate, db: DbSession, user: SessionUser):
    api_token, plain = service.create_token(db, user, payload.name)
    return ApiTokenCreated(**ApiTokenOut.model_validate(api_token).model_dump(), token=plain)


@router.delete("/{token_id}", status_code=status.HTTP_204_NO_CONTENT)
def revoke_token(token_id: int, db: DbSession, user: SessionUser):
    service.revoke_token(db, user, token_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
