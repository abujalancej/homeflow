import type { HomeflowMonth, MonthSummary } from "./homeflow-types";

export function sumAmounts<T>(items: T[], pick: (item: T) => number): number {
  return items.reduce((total, item) => total + pick(item), 0);
}

export function sortMonthsAscending(months: HomeflowMonth[]): HomeflowMonth[] {
  return [...months].sort((a, b) => a.month.localeCompare(b.month));
}

export function sortMonthsDescending(months: HomeflowMonth[]): HomeflowMonth[] {
  return [...months].sort((a, b) => b.month.localeCompare(a.month));
}

export function findPreviousMonth(
  months: HomeflowMonth[],
  current: HomeflowMonth,
): HomeflowMonth | null {
  const ordered = sortMonthsAscending(months);
  const index = ordered.findIndex((month) => month.id === current.id);
  return index > 0 ? ordered[index - 1] : null;
}

export function calculateBaseSummary(
  month: HomeflowMonth,
): Omit<
  MonthSummary,
  "realSavings" | "operationalSavings" | "savings" | "estimatedSpending" | "savingRate"
> {
  const accountTotal = sumAmounts(month.accounts, (account) => account.balance);
  const receivableTotal = sumAmounts(
    month.receivables,
    (entry) => entry.amount,
  );
  const payableTotal = sumAmounts(month.payables, (entry) => entry.amount);
  const adjustmentTotal = sumAmounts(
    month.adjustments ?? [],
    (entry) => entry.amount,
  );
  const liquidTotal = accountTotal + month.cash;
  const netWorth = liquidTotal + receivableTotal - payableTotal;

  return {
    accountTotal,
    adjustmentTotal,
    receivableTotal,
    payableTotal,
    liquidTotal,
    netWorth,
  };
}

export function calculateMonthSummary(
  month: HomeflowMonth,
  previousMonth: HomeflowMonth | null,
): MonthSummary {
  const base = calculateBaseSummary(month);

  if (!previousMonth) {
    return {
      ...base,
      realSavings: null,
      operationalSavings: null,
      savings: null,
      estimatedSpending: null,
      savingRate: null,
    };
  }

  const previous = calculateBaseSummary(previousMonth);
  const realSavings = base.netWorth - previous.netWorth;
  const operationalSavings = realSavings + base.adjustmentTotal;
  const estimatedSpending =
    month.income > 0 ? month.income - operationalSavings : null;
  const savingRate =
    month.income > 0 ? operationalSavings / month.income : null;

  return {
    ...base,
    realSavings,
    operationalSavings,
    savings: operationalSavings,
    estimatedSpending,
    savingRate,
  };
}

export function formatMonthName(value: string, locale = "es-ES"): string {
  const [year, month] = value.split("-").map(Number);

  if (!year || !month) {
    return value;
  }

  const label = new Intl.DateTimeFormat(locale, {
    month: "long",
  }).format(new Date(year, month - 1, 1));

  return `${label.charAt(0).toLocaleUpperCase(locale) + label.slice(1)} ${year}`;
}

export function formatShortMonthName(value: string, locale = "es-ES"): string {
  const [year, month] = value.split("-").map(Number);

  if (!year || !month) {
    return value;
  }

  const label = new Intl.DateTimeFormat(locale, {
    month: "short",
  })
    .format(new Date(year, month - 1, 1))
    .replace(".", "");

  return label.charAt(0).toLocaleUpperCase(locale) + label.slice(1);
}

export function formatShortMonthYear(value: string, locale = "es-ES"): string {
  const [year] = value.split("-").map(Number);

  if (!year) {
    return value;
  }

  return `${formatShortMonthName(value, locale)} ${year}`;
}
