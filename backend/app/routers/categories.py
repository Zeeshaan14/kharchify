from fastapi import APIRouter, status

from app.deps import CurrentUser, DbSession
from app.schemas import CategoryCreate, CategoryOut, CategoryUpdate
from app.services import categories as service

router = APIRouter(prefix="/categories", tags=["categories"])


@router.get("", response_model=list[CategoryOut])
def list_categories(db: DbSession, user: CurrentUser, include_archived: bool = False):
    return service.list_categories(db, user, include_archived)


@router.post("", response_model=CategoryOut, status_code=status.HTTP_201_CREATED)
def create_category(payload: CategoryCreate, db: DbSession, user: CurrentUser):
    return service.create_category(db, user, payload)


@router.patch("/{category_id}", response_model=CategoryOut)
def update_category(category_id: int, payload: CategoryUpdate, db: DbSession, user: CurrentUser):
    return service.update_category(db, user, category_id, payload)
