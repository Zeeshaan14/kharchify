from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import Boolean, Date, DateTime, ForeignKey, Numeric, String, UniqueConstraint, false, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

# Money is stored as NUMERIC(12, 2) and handled as Decimal — never float.
Money = Numeric(12, 2)


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(100))
    hashed_password: Mapped[str] = mapped_column(String(255))
    # Decides what "today" and "this month" mean for this user.
    timezone: Mapped[str] = mapped_column(String(64), default="Asia/Kolkata", server_default="Asia/Kolkata")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    categories: Mapped[list["Category"]] = relationship(back_populates="user", cascade="all, delete-orphan")
    expenses: Mapped[list["Expense"]] = relationship(back_populates="user", cascade="all, delete-orphan")
    budgets: Mapped[list["Budget"]] = relationship(back_populates="user", cascade="all, delete-orphan")
    api_tokens: Mapped[list["ApiToken"]] = relationship(back_populates="user", cascade="all, delete-orphan")


class Category(Base):
    __tablename__ = "categories"
    __table_args__ = (UniqueConstraint("user_id", "name"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    name: Mapped[str] = mapped_column(String(50))
    icon: Mapped[str | None] = mapped_column(String(16))
    color: Mapped[str | None] = mapped_column(String(7))
    # Archived categories keep their history but can't receive new expenses.
    is_archived: Mapped[bool] = mapped_column(Boolean, default=False, server_default=false())

    user: Mapped[User] = relationship(back_populates="categories")


class Expense(Base):
    __tablename__ = "expenses"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    # Default NO ACTION (not RESTRICT): blocks deleting a used category, but is checked at
    # end of statement so deleting a user can cascade to both expenses and categories.
    category_id: Mapped[int] = mapped_column(ForeignKey("categories.id"), index=True)
    amount: Mapped[Decimal] = mapped_column(Money)
    spent_on: Mapped[date] = mapped_column(Date, index=True)
    payment_method: Mapped[str] = mapped_column(String(20), default="upi")
    note: Mapped[str | None] = mapped_column(String(255))
    # True = need, False = want, None = not tagged.
    is_need: Mapped[bool | None] = mapped_column(Boolean)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    user: Mapped[User] = relationship(back_populates="expenses")
    category: Mapped[Category] = relationship()


class Budget(Base):
    __tablename__ = "budgets"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    # NULL category_id = overall budget across all categories.
    category_id: Mapped[int | None] = mapped_column(ForeignKey("categories.id", ondelete="CASCADE"))
    period: Mapped[str] = mapped_column(String(10))  # "daily" | "monthly"
    amount: Mapped[Decimal] = mapped_column(Money)

    user: Mapped[User] = relationship(back_populates="budgets")
    category: Mapped[Category | None] = relationship()


class ApiToken(Base):
    """Long-lived personal token (e.g. for the iPhone Shortcut). Only the hash is stored."""

    __tablename__ = "api_tokens"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    name: Mapped[str] = mapped_column(String(50))
    token_hash: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    prefix: Mapped[str] = mapped_column(String(12))  # first chars, shown in UI to tell tokens apart
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    last_used_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    user: Mapped[User] = relationship(back_populates="api_tokens")
