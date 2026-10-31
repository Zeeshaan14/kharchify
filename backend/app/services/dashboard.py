from datetime import date, timedelta
from decimal import ROUND_DOWN, Decimal

from sqlalchemy import func, select
from sqlalchemy.orm import Session, joinedload

from app.models import Budget, Category, Expense, User
from app.services.budgets import find_budget, make_progress, month_bounds, percent
from app.services.expenses import today_for, total_spent

TOP_EXPENSES = 5


def summary(db: Session, user: User, month: date | None = None) -> dict:
    """Everything the dashboard shows for one calendar month (default: the current one)."""
    today = today_for(user)
    start, end = month_bounds(month or today)
    is_current = start <= today <= end
    month_filter = (Expense.user_id == user.id, Expense.spent_on.between(start, end))

    spent_today = total_spent(db, user, today, today)
    month_total = total_spent(db, user, start, end)

    daily = find_budget(db, user, "daily", None)
    monthly = find_budget(db, user, "monthly", None)

    days_left = safe_to_spend = None
    if monthly is not None and is_current:
        # Spread what was left at the start of today over the remaining days, minus today's spending.
        days_left = (end - today).days + 1
        left_before_today = monthly.amount - total_spent(db, user, start, today - timedelta(days=1))
        allowance = left_before_today / days_left - spent_today
        safe_to_spend = max(allowance, Decimal(0)).quantize(Decimal("0.01"), rounding=ROUND_DOWN)

    return {
        "month": f"{start:%Y-%m}",
        "today": today,
        "spent_today": spent_today,
        "daily_budget": make_progress(daily.amount, spent_today) if daily else None,
        "month_total": month_total,
        "monthly_budget": make_progress(monthly.amount, month_total) if monthly else None,
        "days_left": days_left,
        "safe_to_spend_today": safe_to_spend,
        "by_category": _by_category(db, user, month_filter, month_total),
        "top_expenses": list(
            db.scalars(
                select(Expense)
                .options(joinedload(Expense.category))
                .where(*month_filter)
                .order_by(Expense.amount.desc(), Expense.id.desc())
                .limit(TOP_EXPENSES)
            )
        ),
        "daily": _daily_totals(db, month_filter, start, min(end, today)),
    }


def _by_category(db: Session, user: User, month_filter: tuple, month_total: Decimal) -> list[dict]:
    """Spending per category, biggest first; budgeted categories are included even with nothing spent."""
    totals = dict(
        db.execute(select(Expense.category_id, func.sum(Expense.amount)).where(*month_filter).group_by(Expense.category_id)).all()
    )
    budgets = {
        b.category_id: b
        for b in db.scalars(
            select(Budget).where(Budget.user_id == user.id, Budget.period == "monthly", Budget.category_id.is_not(None))
        )
    }
    categories = db.scalars(select(Category).where(Category.id.in_(totals.keys() | budgets.keys())))

    rows = []
    for category in categories:
        total = totals.get(category.id, Decimal(0))
        budget = budgets.get(category.id)
        rows.append(
            {
                "category": category,
                "total": total,
                "share": percent(total, month_total),
                "budget": make_progress(budget.amount, total) if budget else None,
            }
        )
    return sorted(rows, key=lambda row: (-row["total"], row["category"].name))


def _daily_totals(db: Session, month_filter: tuple, start: date, last: date) -> list[dict]:
    """One entry per day from start to last (inclusive), zero-filled; empty for a future month."""
    totals = dict(db.execute(select(Expense.spent_on, func.sum(Expense.amount)).where(*month_filter).group_by(Expense.spent_on)).all())
    days = (last - start).days + 1
    return [
        {"day": day, "total": totals.get(day, Decimal(0))}
        for day in (start + timedelta(days=i) for i in range(max(days, 0)))
    ]
