from datetime import date, datetime
from decimal import Decimal
from typing import Annotated, Literal

from pydantic import BaseModel, BeforeValidator, ConfigDict, EmailStr, Field

# --- shared types ---

Amount = Annotated[Decimal, Field(gt=0, max_digits=12, decimal_places=2)]
PaymentMethod = Literal["upi", "cash", "card", "netbanking", "other"]
HexColor = Annotated[str, Field(pattern=r"^#[0-9A-Fa-f]{6}$")]
# Blank notes (e.g. a skipped prompt in the iPhone Shortcut) are stored as no note.
Note = Annotated[
    Annotated[str, Field(max_length=255)] | None,
    BeforeValidator(lambda v: (v.strip() or None) if isinstance(v, str) else v),
]


class ORMModel(BaseModel):
    model_config = ConfigDict(from_attributes=True)


# --- auth ---


class UserCreate(BaseModel):
    email: EmailStr
    name: str = Field(min_length=1, max_length=100)
    password: str = Field(min_length=8, max_length=128)


class UserOut(ORMModel):
    id: int
    email: EmailStr
    name: str
    timezone: str
    created_at: datetime


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


# --- categories ---


class CategoryCreate(BaseModel):
    name: str = Field(min_length=1, max_length=50)
    icon: str | None = Field(default=None, max_length=16)
    color: HexColor | None = None


class CategoryUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=50)
    icon: str | None = Field(default=None, max_length=16)
    color: HexColor | None = None
    is_archived: bool | None = None


class CategoryOut(ORMModel):
    id: int
    name: str
    icon: str | None
    color: str | None
    is_archived: bool


class CategoryBrief(ORMModel):
    id: int
    name: str
    icon: str | None


# --- expenses ---


class ExpenseCreate(BaseModel):
    amount: Amount
    category_id: int
    spent_on: date | None = None  # defaults to today in the user's timezone
    payment_method: PaymentMethod = "upi"
    note: Note = None
    is_need: bool | None = None


class ExpenseUpdate(BaseModel):
    amount: Amount | None = None
    category_id: int | None = None
    spent_on: date | None = None
    payment_method: PaymentMethod | None = None
    note: Note = None
    is_need: bool | None = None


class ExpenseOut(ORMModel):
    id: int
    amount: Decimal
    spent_on: date
    payment_method: str
    note: str | None
    is_need: bool | None
    category: CategoryBrief
    created_at: datetime


class ExpenseCreated(ExpenseOut):
    # Ready-made text for the iPhone Shortcut notification.
    message: str


class ExpensePage(BaseModel):
    items: list[ExpenseOut]
    total: int
    limit: int
    offset: int


# --- API tokens ---


class ApiTokenCreate(BaseModel):
    name: str = Field(min_length=1, max_length=50)


class ApiTokenOut(ORMModel):
    id: int
    name: str
    prefix: str
    created_at: datetime
    last_used_at: datetime | None


class ApiTokenCreated(ApiTokenOut):
    # Plain token — returned only once, at creation.
    token: str
