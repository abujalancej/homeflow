import type {
  AnnualGoal,
  FutureCommitment,
  HomeflowMonth,
  HomeflowStore,
} from "./homeflow-types";

export const DEMO_START_YEAR = 2014;
export const DEMO_END_YEAR = 2026;
export const DEMO_END_MONTH = 8;

const DEMO_UPDATED_AT = "2026-08-27T09:00:00.000Z";
const seasonalIncome = [0, 0, 40, 0, 0, 0, 80, 0, 0, 0, 0, 120];
const seasonalSpending = [60, -20, 80, 0, 40, 100, 180, 90, 20, 70, 110, 260];

function roundToTen(value: number) {
  return Math.round(value / 10) * 10;
}

function createDemoGoal(year: number, yearIndex: number): AnnualGoal {
  const targetSavings = 4_800 + yearIndex * 240;

  return {
    id: `demo-goal-${year}`,
    year,
    targetSavings,
    purpose: "Colchón y planes",
    allocations: [
      {
        id: `demo-allocation-${year}-reserve`,
        name: "Colchón",
        amount: roundToTen(targetSavings * 0.7),
        accumulates: true,
      },
      {
        id: `demo-allocation-${year}-plans`,
        name: "Planes",
        amount: targetSavings - roundToTen(targetSavings * 0.7),
        accumulates: false,
      },
    ],
    updatedAt: DEMO_UPDATED_AT,
  };
}

function createDemoMonths(): HomeflowMonth[] {
  const months: HomeflowMonth[] = [];
  let netWorth = 6_400;

  for (let year = DEMO_START_YEAR; year <= DEMO_END_YEAR; year += 1) {
    const yearIndex = year - DEMO_START_YEAR;
    const lastMonth = year === DEMO_END_YEAR ? DEMO_END_MONTH : 12;

    for (let month = 1; month <= lastMonth; month += 1) {
      const monthValue = `${year}-${String(month).padStart(2, "0")}`;
      const income = roundToTen(
        1_450 + yearIndex * 75 + seasonalIncome[month - 1],
      );
      const spending = roundToTen(
        income * (0.73 + ((yearIndex + month) % 4) * 0.015) +
          seasonalSpending[month - 1],
      );
      const savings = income - spending;

      netWorth += savings;

      const cash = 120 + ((yearIndex + month) % 3) * 15;
      const savingsAccount = roundToTen((netWorth - cash) * 0.7);
      const currentAccount = netWorth - cash - savingsAccount;

      months.push({
        id: monthValue,
        month: monthValue,
        income,
        incomeEntries: [
          {
            id: `demo-income-${monthValue}`,
            name: "Nómina demo",
            amount: income,
          },
        ],
        cash,
        cashEntries: [
          {
            id: `demo-cash-${monthValue}`,
            name: "Efectivo",
            amount: cash,
          },
        ],
        accounts: [
          {
            id: `demo-current-${monthValue}`,
            name: "Cuenta principal",
            balance: currentAccount,
          },
          {
            id: `demo-savings-${monthValue}`,
            name: "Cuenta ahorro",
            balance: savingsAccount,
          },
        ],
        receivables: [],
        payables: [],
        adjustments: [],
        notes: undefined,
        updatedAt: DEMO_UPDATED_AT,
      });
    }
  }

  return months;
}

export function createDemoStore(): HomeflowStore {
  const months = createDemoMonths();
  const annualGoals = Array.from(
    { length: DEMO_END_YEAR - DEMO_START_YEAR + 1 },
    (_, index) => createDemoGoal(DEMO_START_YEAR + index, index),
  );
  const futureCommitments: FutureCommitment[] = [
    {
      id: "demo-commitment-1",
      name: "Mueble auxiliar",
      amount: 420,
      status: "planned",
      targetMonth: "2026-10",
      note: "Ejemplo de gasto previsto",
      updatedAt: DEMO_UPDATED_AT,
    },
  ];

  return {
    annualGoals,
    futureCommitments,
    months,
  };
}
