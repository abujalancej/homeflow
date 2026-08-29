export type AccountBalance = {
  id: string;
  name: string;
  balance: number;
};

export type MoneyEntry = {
  id: string;
  name: string;
  amount: number;
  note?: string;
};

export type WealthAdjustment = {
  id: string;
  name: string;
  amount: number;
  note?: string;
};

export type FutureCommitmentStatus = "planned" | "committed";

export type FutureCommitment = {
  id: string;
  name: string;
  amount: number;
  status: FutureCommitmentStatus;
  targetMonth?: string;
  note?: string;
  updatedAt: string;
};

export type AnnualGoalAllocation = {
  id: string;
  name: string;
  amount: number;
  accumulates: boolean;
};

export type AnnualGoal = {
  id: string;
  year: number;
  targetSavings: number;
  purpose: string;
  allocations: AnnualGoalAllocation[];
  updatedAt: string;
};

export type HomeflowMonth = {
  id: string;
  month: string;
  income: number;
  incomeEntries: MoneyEntry[];
  cash: number;
  cashEntries: MoneyEntry[];
  accounts: AccountBalance[];
  receivables: MoneyEntry[];
  payables: MoneyEntry[];
  adjustments: WealthAdjustment[];
  notes?: string;
  updatedAt: string;
};

export type HomeflowStore = {
  months: HomeflowMonth[];
  annualGoals: AnnualGoal[];
  futureCommitments: FutureCommitment[];
};

export type MonthSummary = {
  accountTotal: number;
  receivableTotal: number;
  payableTotal: number;
  liquidTotal: number;
  netWorth: number;
  adjustmentTotal: number;
  realSavings: number | null;
  operationalSavings: number | null;
  savings: number | null;
  estimatedSpending: number | null;
  savingRate: number | null;
};
