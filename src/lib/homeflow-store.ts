import { promises as fs } from "node:fs";
import path from "node:path";
import type {
  AccountBalance,
  AnnualGoal,
  AnnualGoalAllocation,
  FutureCommitment,
  HomeflowMonth,
  HomeflowStore,
  MoneyEntry,
  WealthAdjustment,
} from "./homeflow-types";

const configuredDataDirectory = process.env.HOMEFLOW_DATA_DIR?.trim();
const DATA_DIR = configuredDataDirectory
  ? path.resolve(configuredDataDirectory)
  : path.join(process.cwd(), "data");
const DATA_FILE = path.join(DATA_DIR, "homeflow.json");
const BACKUP_FILE = path.join(DATA_DIR, "homeflow.backup.json");

export const HOMEFLOW_DATA_FORMAT = "homeflow";
export const HOMEFLOW_DATA_VERSION = 1;

export type HomeflowDataExport = {
  format: typeof HOMEFLOW_DATA_FORMAT;
  version: typeof HOMEFLOW_DATA_VERSION;
  exportedAt: string;
  data: HomeflowStore;
};

const emptyStore: HomeflowStore = {
  futureCommitments: [],
  annualGoals: [],
  months: [],
};

function cloneEmptyStore(): HomeflowStore {
  return JSON.parse(JSON.stringify(emptyStore)) as HomeflowStore;
}

function toText(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim()
    ? value.trim()
    : fallback;
}

function toOptionalText(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function toNumber(value: unknown): number {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function toBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function createId(prefix: string, index: number): string {
  return `${prefix}-${index + 1}`;
}

function normalizeAccounts(value: unknown): AccountBalance[] {
  if (!Array.isArray(value)) return [];

  return value.map((item, index) => {
    const entry = item as Partial<AccountBalance>;

    return {
      id: toText(entry.id, createId("account", index)),
      name: toText(entry.name, `Cuenta ${index + 1}`),
      balance: toNumber(entry.balance),
    };
  });
}

function normalizeEntries(value: unknown, prefix: string): MoneyEntry[] {
  if (!Array.isArray(value)) return [];

  return value.map((item, index) => {
    const entry = item as Partial<MoneyEntry>;

    return {
      id: toText(entry.id, createId(prefix, index)),
      name: toText(entry.name, `Movimiento ${index + 1}`),
      amount: toNumber(entry.amount),
      note: toOptionalText(entry.note),
    };
  });
}

function normalizeAdjustments(value: unknown): WealthAdjustment[] {
  if (!Array.isArray(value)) return [];

  return value.map((item, index) => {
    const entry = item as Partial<WealthAdjustment>;

    return {
      id: toText(entry.id, createId("adjustment", index)),
      name: toText(entry.name, `Ajuste ${index + 1}`),
      amount: toNumber(entry.amount),
      note: toOptionalText(entry.note),
    };
  });
}

function normalizeFutureCommitments(value: unknown): FutureCommitment[] {
  if (!Array.isArray(value)) return [];

  return value.map((item, index) => {
    const commitment = item as Partial<FutureCommitment>;

    return {
      id: toText(commitment.id, createId("commitment", index)),
      name: toText(commitment.name, `Compromiso ${index + 1}`),
      amount: Math.max(0, toNumber(commitment.amount)),
      status: commitment.status === "committed" ? "committed" : "planned",
      targetMonth: toOptionalText(commitment.targetMonth),
      note: toOptionalText(commitment.note),
      updatedAt: toText(commitment.updatedAt, new Date().toISOString()),
    };
  });
}

function normalizeAllocations(value: unknown): AnnualGoalAllocation[] {
  if (!Array.isArray(value)) return [];

  return value.map((item, index) => {
    const allocation = item as Partial<AnnualGoalAllocation>;

    return {
      id: toText(allocation.id, createId("allocation", index)),
      name: toText(allocation.name, `Partida ${index + 1}`),
      amount: toNumber(allocation.amount),
      accumulates: toBoolean(allocation.accumulates, true),
    };
  });
}

function normalizeAnnualGoal(value: unknown): AnnualGoal {
  const source = value as Partial<AnnualGoal>;
  const year = toNumber(source.year) || new Date().getFullYear();
  const allocations = normalizeAllocations(source.allocations);

  return {
    id: toText(source.id, `goal-${year}`),
    year,
    targetSavings: allocations.reduce(
      (total, allocation) => total + allocation.amount,
      0,
    ),
    purpose: toText(source.purpose, "Ahorro anual"),
    allocations,
    updatedAt: toText(source.updatedAt, new Date().toISOString()),
  };
}

function normalizeMonth(value: unknown): HomeflowMonth {
  const source = value as Partial<HomeflowMonth>;
  const month = toText(source.month, new Date().toISOString().slice(0, 7));
  const legacyIncome = toNumber(source.income);
  const incomeEntries = normalizeEntries(source.incomeEntries, "income");
  const normalizedIncomeEntries =
    incomeEntries.length > 0
      ? incomeEntries
      : legacyIncome > 0
        ? [{ id: createId("income", 0), name: "Ingreso", amount: legacyIncome }]
        : [];
  const income = normalizedIncomeEntries.reduce(
    (total, entry) => total + entry.amount,
    0,
  );
  const legacyCash = toNumber(source.cash);
  const cashEntries = normalizeEntries(source.cashEntries, "cash");
  const normalizedCashEntries =
    cashEntries.length > 0
      ? cashEntries
      : legacyCash > 0
        ? [{ id: createId("cash", 0), name: "Efectivo", amount: legacyCash }]
        : [];
  const cash = normalizedCashEntries.reduce(
    (total, entry) => total + entry.amount,
    0,
  );

  return {
    id: month,
    month,
    income,
    incomeEntries: normalizedIncomeEntries,
    cash,
    cashEntries: normalizedCashEntries,
    accounts: normalizeAccounts(source.accounts),
    receivables: normalizeEntries(source.receivables, "receivable"),
    payables: normalizeEntries(source.payables, "payable"),
    adjustments: normalizeAdjustments(source.adjustments),
    notes: toOptionalText(source.notes),
    updatedAt: toText(source.updatedAt, new Date().toISOString()),
  };
}

function normalizeStore(value: unknown): HomeflowStore {
  const source = value as Partial<HomeflowStore>;

  if (!Array.isArray(source.months)) {
    return cloneEmptyStore();
  }

  return {
    annualGoals: Array.isArray(source.annualGoals)
      ? source.annualGoals.map(normalizeAnnualGoal)
      : cloneEmptyStore().annualGoals,
    futureCommitments: normalizeFutureCommitments(source.futureCommitments),
    months: source.months.map(normalizeMonth),
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeImportedStore(value: unknown): HomeflowStore {
  if (!isRecord(value)) {
    throw new Error("El archivo de datos no tiene un formato válido.");
  }

  if (value.format === HOMEFLOW_DATA_FORMAT) {
    if (value.version !== HOMEFLOW_DATA_VERSION) {
      throw new Error("La versión del archivo de datos no es compatible.");
    }

    if (!("data" in value)) {
      throw new Error("El archivo de datos no contiene información.");
    }
  }

  const source = value.format === HOMEFLOW_DATA_FORMAT ? value.data : value;

  if (!isRecord(source)) {
    throw new Error("El archivo de datos no tiene un formato válido.");
  }

  if (
    !Array.isArray(source.months) ||
    !Array.isArray(source.annualGoals) ||
    !Array.isArray(source.futureCommitments)
  ) {
    throw new Error("Faltan colecciones de datos obligatorias.");
  }

  return normalizeStore(source);
}

async function writeStore(store: HomeflowStore): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(DATA_FILE, JSON.stringify(store, null, 2), "utf8");
}

export async function readHomeflowStore(): Promise<HomeflowStore> {
  try {
    const file = await fs.readFile(DATA_FILE, "utf8");
    return normalizeStore(JSON.parse(file));
  } catch (error) {
    if (
      error instanceof Error &&
      "code" in error &&
      error.code === "ENOENT"
    ) {
      const initialStore = cloneEmptyStore();
      await writeStore(initialStore);
      return initialStore;
    }

    throw error;
  }
}

export function createHomeflowDataExport(store: HomeflowStore): HomeflowDataExport {
  return {
    format: HOMEFLOW_DATA_FORMAT,
    version: HOMEFLOW_DATA_VERSION,
    exportedAt: new Date().toISOString(),
    data: store,
  };
}

export async function replaceHomeflowStore(value: unknown): Promise<HomeflowStore> {
  const importedStore = normalizeImportedStore(value);
  const currentStore = await readHomeflowStore();

  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(
    BACKUP_FILE,
    JSON.stringify(createHomeflowDataExport(currentStore), null, 2),
    "utf8",
  );
  await writeStore(importedStore);

  return importedStore;
}

export async function upsertHomeflowMonth(value: unknown): Promise<HomeflowStore> {
  const store = await readHomeflowStore();
  const month = normalizeMonth(value);
  const existingIndex = store.months.findIndex((item) => item.id === month.id);

  if (existingIndex >= 0) {
    store.months[existingIndex] = month;
  } else {
    store.months.push(month);
  }

  await writeStore(store);
  return store;
}

export async function deleteHomeflowMonth(id: string): Promise<HomeflowStore> {
  const store = await readHomeflowStore();
  const nextStore = {
    annualGoals: store.annualGoals,
    futureCommitments: store.futureCommitments,
    months: store.months.filter((month) => month.id !== id),
  };

  await writeStore(nextStore);
  return nextStore;
}

export async function upsertAnnualGoal(value: unknown): Promise<HomeflowStore> {
  const store = await readHomeflowStore();
  const annualGoal = normalizeAnnualGoal({
    ...(value as Partial<AnnualGoal>),
    updatedAt: new Date().toISOString(),
  });
  const existingIndex = store.annualGoals.findIndex(
    (goal) => goal.year === annualGoal.year,
  );

  if (existingIndex >= 0) {
    store.annualGoals[existingIndex] = annualGoal;
  } else {
    store.annualGoals.push(annualGoal);
  }

  await writeStore(store);
  return store;
}

export async function replaceFutureCommitments(
  value: unknown,
): Promise<HomeflowStore> {
  const store = await readHomeflowStore();
  store.futureCommitments = normalizeFutureCommitments(value);
  await writeStore(store);
  return store;
}
