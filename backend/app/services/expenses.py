from datetime import date, datetime
from decimal import Decimal
from zoneinfo import ZoneInfo

from sqlalchemy import func, select
from sqlalchemy.orm import Session, joinedload

from app.errors import BadRequestError, NotFoundError
from app.models import Expense, User
from app.schemas import ExpenseCreate, ExpenseUpdate
from app.services.categories import get_category

# Columns that may not be set to null on update.
REQUIRED_FIELDS = ("amount", "category_id", "spent_on", "payment_method")


def today_for(user: User) -> date:
    return datetime.now(ZoneInfo(user.timezone)).date()


def format_inr(amount: Decimal) -> str:
    """₹1,23,456.50 style (Indian digit grouping); drops .00 for whole rupees."""
    rupees, paise = f"{amount:.2f}".split(".")
    head, tail = rupees[:-3], rupees[-3:]
    groups = []
    while len(head) > 2:
        groups.insert(0, head[-2:])
        head = head[:-2]
    if head:
        groups.insert(0, head)
    grouped = ",".join([*groups, tail])
    return f"₹{grouped}" if paise == "00" else f"₹{grouped}.{paise}"


def _usable_category_id(db: Session, user: User, category_id: int) -> int:
    category = get_category(db, user, category_id)
    if category.is_archived:
        raise BadRequestError(f"Category '{category.name}' is archived")
    return category.id


def get_expense(db: Session, user: User, expense_id: int) -> Expense:
    expense = db.get(Expense, expense_id, options=[joinedload(Expense.category)])
    if expense is None or expense.user_id != user.id:
        raise NotFoundError("Expense not found")
    return expense


def create_expense(db: Session, user: User, data: ExpenseCreate) -> Expense:
    expense = Expense(
        user_id=user.id,
        category_id=_usable_category_id(db, user, data.category_id),
        amount=data.amount,
        spent_on=data.spent_on or today_for(user),
        payment_method=data.payment_method,
        note=data.note,
        is_need=data.is_need,
    )
    db.add(expense)
    db.commit()
    return get_expense(db, user, expense.id)


def list_expenses(
    db: Session,
    user: User,
    *,
    date_from: date | None = None,
    date_to: date | None = None,
    category_id: int | None = None,
    payment_method: str | None = None,
    q: str | None = None,
    limit: int = 50,
    offset: int = 0,
) -> tuple[list[Expense], int]:
    filters = [Expense.user_id == user.id]
    if date_from:
        filters.append(Expense.spent_on >= date_from)
    if date_to:
        filters.append(Expense.spent_on <= date_to)
    if category_id:
        filters.append(Expense.category_id == category_id)
    if payment_method:
        filters.append(Expense.payment_method == payment_method)
    if q:
        filters.append(Expense.note.ilike(f"%{q}%"))

    total = db.scalar(select(func.count()).select_from(Expense).where(*filters))
    items = db.scalars(
        select(Expense)
        .options(joinedload(Expense.category))
        .where(*filters)
        .order_by(Expense.spent_on.desc(), Expense.id.desc())
        .limit(limit)
        .offset(offset)
    )
    return list(items), total


def update_expense(db: Session, user: User, expense_id: int, data: ExpenseUpdate) -> Expense:
    expense = get_expense(db, user, expense_id)
    changes = data.model_dump(exclude_unset=True)

    for field in REQUIRED_FIELDS:
        if field in changes and changes[field] is None:
            raise BadRequestError(f"'{field}' cannot be empty")
    if "category_id" in changes and changes["category_id"] != expense.category_id:
        changes["category_id"] = _usable_category_id(db, user, changes["category_id"])

    for field, value in changes.items():
        setattr(expense, field, value)
    db.commit()
    db.expire(expense)
    return get_expense(db, user, expense.id)


def delete_expense(db: Session, user: User, expense_id: int) -> None:
    expense = get_expense(db, user, expense_id)
    db.delete(expense)
    db.commit()
