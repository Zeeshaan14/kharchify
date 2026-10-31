from datetime import date
from typing import Annotated

from fastapi import APIRouter, Query

from app.deps import CurrentUser, DbSession
from app.schemas import DashboardSummary
from app.services import dashboard as service

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/summary", response_model=DashboardSummary)
def summary(
    db: DbSession,
    user: CurrentUser,
    month: Annotated[
        str | None, Query(pattern=r"^\d{4}-(0[1-9]|1[0-2])$", description="YYYY-MM; defaults to the current month")
    ] = None,
):
    first_day = date.fromisoformat(f"{month}-01") if month else None
    return service.summary(db, user, first_day)
