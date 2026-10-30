from datetime import date
from typing import Annotated

from fastapi import APIRouter, Query, Response, status

from app.deps import CurrentUser, DbSession
from app.schemas import ExpenseCreate, ExpenseCreated, ExpenseOut, ExpensePage, ExpenseUpdate, PaymentMethod
from app.services import expenses as service

router = APIRouter(prefix="/expenses", tags=["expenses"])


@router.get("", response_model=ExpensePage)
def list_expenses(
    db: DbSession,
    user: CurrentUser,
    date_from: date | None = None,
    date_to: date | None = None,
    category_id: int | None = None,
    payment_method: PaymentMethod | None = None,
    q: Annotated[str | None, Query(max_length=100, description="Search in notes")] = None,
    limit: Annotated[int, Query(ge=1, le=100)] = 50,
    offset: Annotated[int, Query(ge=0)] = 0,
):
    items, total = service.list_expenses(
        db,
        user,
        date_from=date_from,
        date_to=date_to,
        category_id=category_id,
        payment_method=payment_method,
        q=q,
        limit=limit,
        offset=offset,
    )
    return ExpensePage(items=items, total=total, limit=limit, offset=offset)


@router.post("", response_model=ExpenseCreated, status_code=status.HTTP_201_CREATED)
def create_expense(payload: ExpenseCreate, db: DbSession, user: CurrentUser):
    expense = service.create_expense(db, user, payload)
    message = f"✅ {service.format_inr(expense.amount)} added to {expense.category.name}"
    return ExpenseCreated(**ExpenseOut.model_validate(expense).model_dump(), message=message)


@router.get("/{expense_id}", response_model=ExpenseOut)
def get_expense(expense_id: int, db: DbSession, user: CurrentUser):
    return service.get_expense(db, user, expense_id)


@router.patch("/{expense_id}", response_model=ExpenseOut)
def update_expense(expense_id: int, payload: ExpenseUpdate, db: DbSession, user: CurrentUser):
    return service.update_expense(db, user, expense_id, payload)


@router.delete("/{expense_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_expense(expense_id: int, db: DbSession, user: CurrentUser):
    service.delete_expense(db, user, expense_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
