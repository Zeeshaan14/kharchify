from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.errors import BadRequestError, ConflictError, NotFoundError
from app.models import Category, User
from app.schemas import CategoryCreate, CategoryUpdate


def list_categories(db: Session, user: User, include_archived: bool = False) -> list[Category]:
    query = select(Category).where(Category.user_id == user.id)
    if not include_archived:
        query = query.where(Category.is_archived.is_(False))
    return list(db.scalars(query.order_by(Category.name)))


def get_category(db: Session, user: User, category_id: int) -> Category:
    category = db.get(Category, category_id)
    # Another user's category looks exactly like a missing one.
    if category is None or category.user_id != user.id:
        raise NotFoundError("Category not found")
    return category


def get_usable_category(db: Session, user: User, category_id: int) -> Category:
    """A category that can receive new expenses or budgets (not archived)."""
    category = get_category(db, user, category_id)
    if category.is_archived:
        raise BadRequestError(f"Category '{category.name}' is archived")
    return category


def _ensure_name_free(db: Session, user: User, name: str, exclude_id: int | None = None) -> None:
    query = select(Category.id).where(Category.user_id == user.id, func.lower(Category.name) == name.lower())
    if exclude_id is not None:
        query = query.where(Category.id != exclude_id)
    if db.scalar(query) is not None:
        raise ConflictError(f"Category '{name}' already exists")


def create_category(db: Session, user: User, data: CategoryCreate) -> Category:
    name = data.name.strip()
    _ensure_name_free(db, user, name)
    category = Category(user_id=user.id, name=name, icon=data.icon, color=data.color)
    db.add(category)
    db.commit()
    db.refresh(category)
    return category


def update_category(db: Session, user: User, category_id: int, data: CategoryUpdate) -> Category:
    category = get_category(db, user, category_id)
    changes = data.model_dump(exclude_unset=True)

    if changes.get("name") is not None:
        changes["name"] = changes["name"].strip()
        _ensure_name_free(db, user, changes["name"], exclude_id=category.id)
    # name / is_archived can't be cleared; icon / color can.
    for field in ("name", "is_archived"):
        if field in changes and changes[field] is None:
            del changes[field]

    for field, value in changes.items():
        setattr(category, field, value)
    db.commit()
    db.refresh(category)
    return category
