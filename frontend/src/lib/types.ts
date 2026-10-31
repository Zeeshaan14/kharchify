// Shapes of the FastAPI responses (see backend/app/schemas.py). Money arrives as decimal strings.

export type Money = string;
export type PaymentMethod = "upi" | "cash" | "card" | "netbanking" | "other";
export type BudgetPeriod = "daily" | "monthly";
export type BudgetStatus = "ok" | "warning" | "over";

export interface User {
  id: number;
  email: string;
  name: string;
  timezone: string;
  created_at: string;
}

export interface Category {
  id: number;
  name: string;
  icon: string | null;
  color: string | null;
  is_archived: boolean;
}

export type CategoryBrief = Pick<Category, "id" | "name" | "icon">;

export interface Expense {
  id: number;
  amount: Money;
  spent_on: string; // YYYY-MM-DD
  payment_method: PaymentMethod;
  note: string | null;
  is_need: boolean | null;
  category: CategoryBrief;
  created_at: string;
}

export interface ExpenseCreated extends Expense {
  message: string;
}

export interface ExpensePage {
  items: Expense[];
  total: number;
  limit: number;
  offset: number;
}

export interface ExpenseInput {
  amount: string;
  category_id: number;
  spent_on?: string;
  payment_method?: PaymentMethod;
  note?: string | null;
  is_need?: boolean | null;
}

export interface BudgetProgress {
  limit: Money;
  spent: Money;
  remaining: Money;
  percent: number;
  status: BudgetStatus;
}

export interface Budget {
  id: number;
  period: BudgetPeriod;
  amount: Money;
  category: CategoryBrief | null;
  progress: BudgetProgress;
}

export interface CategorySpend {
  category: CategoryBrief;
  total: Money;
  share: number;
  budget: BudgetProgress | null;
}

export interface DashboardSummary {
  month: string; // YYYY-MM
  today: string;
  spent_today: Money;
  daily_budget: BudgetProgress | null;
  month_total: Money;
  monthly_budget: BudgetProgress | null;
  days_left: number | null;
  safe_to_spend_today: Money | null;
  by_category: CategorySpend[];
  top_expenses: Expense[];
  daily: { day: string; total: Money }[];
}

export interface ApiToken {
  id: number;
  name: string;
  prefix: string;
  created_at: string;
  last_used_at: string | null;
}

export interface ApiTokenCreated extends ApiToken {
  token: string;
}
