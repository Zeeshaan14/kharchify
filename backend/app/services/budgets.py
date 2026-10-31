import calendar
from datetime import date
from decimal import ROUND_HALF_UP, Decimal

from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.errors import ConflictError, NotFoundError
from app.models import Budget, Category, User
from app.schemas import BudgetCreate, BudgetProgress
from app.services.categories import get_usable_category
from app.services.expenses import format_inr, today_for, total_spent

WARNING_AT = Decimal("0.8")


def month_bounds(day: date) -> tuple[date, date]:
    """First and last day of day's calendar month."""
    last = calendar.monthrange(day.year, day.month)[1]
    return day.replace(day=1), day.replace(day=last)


def percent(part: Decimal, whole: Decimal) -> int:
    return int((part * 100 / whole).to_integral_value(ROUND_HALF_UP)) if whole else 0


def make_progress(limit: Decimal, spent: Decimal) -> BudgetProgress:
    ratio = spent / limit
    status = "ok" if ratio < WARNING_AT else "warning" if ratio <= 1 else "over"
    return BudgetProgress(
        limit=limit, spent=spent, remaining=limit - spent, percent=percent(spent, limit), status=status
    )


def budget_progress(db: Session, user: User, budget: Budget, day: date) -> BudgetProgress:
    """Progress for the day (daily budget) or day's calendar month (monthly budget)."""
    start, end = (day, day) if budget.period == "daily" else month_bounds(day)
    return make_progress(budget.amount, total_spent(db, user, start, end, budget.category_id))


def find_budget(db: Session, user: User, period: str, category_id: int | None) -> Budget | None:
    category_filter = Budget.category_id.is_(None) if category_id is None else Budget.category_id == category_id
    return db.scalar(select(Budget).where(Budget.user_id == user.id, Budget.period == period, category_filter))


def list_budgets(db: Session, user: User) -> list[Budget]:
    # Overall budgets first, then by category name.
    return list(
        db.scalars(
            select(Budget)
            .outerjoin(Category, Budget.category_id == Category.id)
            .options(joinedload(Budget.category))
            .where(Budget.user_id == user.id)
            .order_by(Budget.category_id.is_not(None), Category.name, Budget.period)
        )
    )


def get_budget(db: Session, user: User, budget_id: int) -> Budget:
    budget = db.get(Budget, budget_id)
    if budget is None or budget.user_id != user.id:
        raise NotFoundError("Budget not found")
    return budget


def create_budget(db: Session, user: User, data: BudgetCreate) -> Budget:
    # One budget per period and category (NULLs aren't unique in SQL, so checked here).
    category = get_usable_category(db, user, data.category_id) if data.category_id is not None else None
    if find_budget(db, user, data.period, data.category_id) is not None:
        target = category.name if category else "overall"
        raise ConflictError(f"A {data.period} {target} budget already exists")
    budget = Budget(user_id=user.id, category_id=data.category_id, period=data.period, amount=data.amount)
    db.add(budget)
    db.commit()
    db.refresh(budget)
    return budget


def update_budget(db: Session, user: User, budget_id: int, amount: Decimal) -> Budget:
    budget = get_budget(db, user, budget_id)
    budget.amount = amount
    db.commit()
    db.refresh(budget)
    return budget


def delete_budget(db: Session, user: User, budget_id: int) -> None:
    db.delete(get_budget(db, user, budget_id))
    db.commit()


def month_left_note(db: Session, user: User, category: Category) -> str | None:
    """'₹3,200 left this month' for the Shortcut alert: overall monthly budget, else the category's."""
    today = today_for(user)
    for category_id, scope in ((None, "this month"), (category.id, f"for {category.name} this month")):
        budget = find_budget(db, user, "monthly", category_id)
        if budget is None:
            continue
        remaining = budget_progress(db, user, budget, today).remaining
        if remaining >= 0:
            return f"{format_inr(remaining)} left {scope}"
        return f"{format_inr(-remaining)} over budget {scope}"
    return None
