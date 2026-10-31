from fastapi import APIRouter, Response, status
from sqlalchemy.orm import Session

from app.deps import CurrentUser, DbSession
from app.models import Budget, User
from app.schemas import BudgetCreate, BudgetOut, BudgetUpdate, BudgetWithProgress
from app.services import budgets as service
from app.services.expenses import today_for

router = APIRouter(prefix="/budgets", tags=["budgets"])


def _with_progress(db: Session, user: User, budget: Budget) -> BudgetWithProgress:
    progress = service.budget_progress(db, user, budget, today_for(user))
    return BudgetWithProgress(**BudgetOut.model_validate(budget).model_dump(), progress=progress)


@router.get("", response_model=list[BudgetWithProgress])
def list_budgets(db: DbSession, user: CurrentUser):
    return [_with_progress(db, user, budget) for budget in service.list_budgets(db, user)]


@router.post("", response_model=BudgetWithProgress, status_code=status.HTTP_201_CREATED)
def create_budget(payload: BudgetCreate, db: DbSession, user: CurrentUser):
    return _with_progress(db, user, service.create_budget(db, user, payload))


@router.patch("/{budget_id}", response_model=BudgetWithProgress)
def update_budget(budget_id: int, payload: BudgetUpdate, db: DbSession, user: CurrentUser):
    return _with_progress(db, user, service.update_budget(db, user, budget_id, payload.amount))


@router.delete("/{budget_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_budget(budget_id: int, db: DbSession, user: CurrentUser):
    service.delete_budget(db, user, budget_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
