from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import Date, DateTime, ForeignKey, Numeric, String, UniqueConstraint, func
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
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    categories: Mapped[list["Category"]] = relationship(back_populates="user", cascade="all, delete-orphan")
    expenses: Mapped[list["Expense"]] = relationship(back_populates="user", cascade="all, delete-orphan")
    budgets: Mapped[list["Budget"]] = relationship(back_populates="user", cascade="all, delete-orphan")


class Category(Base):
    __tablename__ = "categories"
    __table_args__ = (UniqueConstraint("user_id", "name"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    name: Mapped[str] = mapped_column(String(50))
    icon: Mapped[str | None] = mapped_column(String(16))
    color: Mapped[str | None] = mapped_column(String(7))

    user: Mapped[User] = relationship(back_populates="categories")


class Expense(Base):
    __tablename__ = "expenses"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    category_id: Mapped[int] = mapped_column(ForeignKey("categories.id", ondelete="RESTRICT"), index=True)
    amount: Mapped[Decimal] = mapped_column(Money)
    spent_on: Mapped[date] = mapped_column(Date, index=True)
    payment_method: Mapped[str] = mapped_column(String(20), default="upi")
    note: Mapped[str | None] = mapped_column(String(255))
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
