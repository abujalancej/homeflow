"use client";

import Link from "next/link";
import Image from "next/image";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowDown,
  faArrowLeft,
  faArrowUp,
  faBrain,
  faBullseye,
  faCalendar,
  faCalendarDays,
  faChartLine,
  faChevronDown,
  faChevronLeft,
  faChevronRight,
  faClock,
  faDatabase,
  faDownload,
  faDollarSign,
  faEllipsis,
  faEuroSign,
  faFileExport,
  faFileExcel,
  faFloppyDisk,
  faHouse,
  faCircleInfo,
  faLandmark,
  faMoneyBills,
  faNoteSticky,
  faEquals,
  faPen,
  faPiggyBank,
  faPlus,
  faRotateLeft,
  faArrowRight,
  faScaleBalanced,
  faTrash,
  faUpload,
  faWallet,
  faXmark,
} from "@fortawesome/free-solid-svg-icons";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import {
  type ChangeEvent,
  type CSSProperties,
  type DragEvent,
  type ReactNode,
  useMemo,
  useRef,
  useState,
  useEffect,
} from "react";
import {
  I18nContext,
  LANGUAGE_LOCALES,
  createTranslator,
  type Currency,
  type Language,
  type Translator,
  useI18n,
} from "@/lib/homeflow-i18n";
import {
  calculateBaseSummary,
  calculateMonthSummary,
  formatMonthName,
  formatShortMonthName,
  formatShortMonthYear,
  sortMonthsAscending,
  sortMonthsDescending,
} from "@/lib/homeflow-math";
import type {
  AccountBalance,
  AnnualGoal,
  AnnualGoalAllocation,
  FutureCommitment,
  FutureCommitmentStatus,
  HomeflowMonth,
  HomeflowStore,
  MoneyEntry,
  MonthSummary,
  WealthAdjustment,
} from "@/lib/homeflow-types";
import {
  createDemoStore,
} from "@/lib/homeflow-demo";

type EntryGroup = "receivables" | "payables";
type RegisterDeleteKind =
  | "account"
  | "income"
  | "cash"
  | EntryGroup
  | "commitment"
  | "adjustment";
type RegisterDeleteTarget = {
  id: string;
  kind: RegisterDeleteKind;
  name: string;
};
type ReorderableMonthCollection =
  | "accounts"
  | "incomeEntries"
  | "cashEntries"
  | "receivables"
  | "payables"
  | "adjustments";
type ReorderHandler = (draggedId: string, targetId: string) => void;
type EvolutionRangeMode = "recent" | "custom" | "all";
type EvolutionMetric = "netWorth" | "savings" | "income" | "spending";
type Theme = "light" | "dark";
type DataMode = "real" | "demo";
type SplashPhase = "visible" | "leaving" | "hidden";
export type HomeflowView =
  | "dashboard"
  | "evolution"
  | "forecast"
  | "analysis"
  | "goal"
  | "register"
  | "export";
type HistoryPoint = { month: HomeflowMonth; summary: MonthSummary };
type ForecastScenario = {
  estimatedTotal: number;
  monthSavings: { label: string; value: number | null }[];
  projectedSavings: number;
  year: number;
};
type ForecastStats = {
  average: number;
  max: number;
  min: number;
};
type ForecastModel = {
  baseNetWorth: number;
  basePoint: HistoryPoint;
  scenarios: ForecastScenario[];
  stats: {
    estimatedTotal: ForecastStats;
  } | null;
};
type HistoricalComparisonStatus = "above" | "below" | "close";
type HistoricalComparisonMetric = {
  average: number;
  current: number;
  difference: number;
  id: "income" | "spending" | "savings" | "savingRate";
  samples: number;
  status: HistoricalComparisonStatus;
};
type HistoricalComparison = {
  metrics: HistoricalComparisonMetric[];
  samples: number;
};

const APP_VERSION = "1.1.0";
const ACTIVE_MONTH_KEY = "homeflow.activeMonth";
const DATA_MODE_KEY = "homeflow.dataMode";
const CURRENCY_KEY = "homeflow.currency";
const DEMO_STORE_KEY = "homeflow.demoStore";
const LANGUAGE_KEY = "homeflow.language";
const THEME_KEY = "homeflow.theme";
const SPLASH_MIN_VISIBLE_MS = 2200;
const SPLASH_FADE_MS = 440;
let hasShownAppSplash = false;
let desktopSettings: Record<string, string> | null = null;

type HomeflowDesktopBridge = {
  getSettings: () => Promise<Record<string, string>>;
  isDesktop: boolean;
  removeSetting: (key: string) => Promise<void>;
  setSetting: (key: string, value: string) => Promise<void>;
};

function getDesktopBridge() {
  if (typeof window === "undefined") return null;

  return (
    window as Window & { homeflowDesktop?: HomeflowDesktopBridge }
  ).homeflowDesktop ?? null;
}

function readPersistedSetting(key: string) {
  if (desktopSettings && Object.prototype.hasOwnProperty.call(desktopSettings, key)) {
    return desktopSettings[key];
  }

  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function persistSetting(key: string, value: string) {
  if (desktopSettings) desktopSettings[key] = value;

  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Native desktop storage below remains available if localStorage is unavailable.
  }

  const bridge = getDesktopBridge();
  if (bridge) void bridge.setSetting(key, value).catch(() => undefined);
}

function removePersistedSetting(key: string) {
  if (desktopSettings) delete desktopSettings[key];

  try {
    window.localStorage.removeItem(key);
  } catch {
    // Native desktop storage below remains available if localStorage is unavailable.
  }

  const bridge = getDesktopBridge();
  if (bridge) void bridge.removeSetting(key).catch(() => undefined);
}

const VIEW_NAV: {
  href: string;
  icon: IconDefinition;
  id: HomeflowView;
  label: string;
}[] = [
  { href: "/", icon: faHouse, id: "dashboard", label: "Resumen" },
  {
    href: "/register",
    icon: faEuroSign,
    id: "register",
    label: "Registro",
  },
  { href: "/analysis", icon: faScaleBalanced, id: "analysis", label: "Análisis" },
  { href: "/evolution", icon: faChartLine, id: "evolution", label: "Evolución" },
  { href: "/forecast", icon: faBrain, id: "forecast", label: "Previsión" },
  { href: "/annual-goal", icon: faBullseye, id: "goal", label: "Meta anual" },
  { href: "/data", icon: faDatabase, id: "export", label: "Datos" },
];

const EVOLUTION_METRICS: {
  icon: IconDefinition;
  id: EvolutionMetric;
  label: string;
}[] = [
  { icon: faWallet, id: "netWorth", label: "Patrimonio" },
  { icon: faPiggyBank, id: "savings", label: "Ahorro operativo" },
  { icon: faArrowUp, id: "income", label: "Ingresos" },
  { icon: faArrowDown, id: "spending", label: "Gasto estimado" },
];

function createId(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function cloneMonth(month: HomeflowMonth) {
  return JSON.parse(JSON.stringify(month)) as HomeflowMonth;
}

function cloneGoal(goal: AnnualGoal) {
  return JSON.parse(JSON.stringify(goal)) as AnnualGoal;
}

function cloneFutureCommitments(commitments: FutureCommitment[]) {
  return JSON.parse(JSON.stringify(commitments)) as FutureCommitment[];
}

function cloneStore(store: HomeflowStore) {
  return JSON.parse(JSON.stringify(store)) as HomeflowStore;
}

function reorderItems<T extends { id: string }>(
  items: T[],
  draggedId: string,
  targetId: string,
): T[] {
  const draggedIndex = items.findIndex((item) => item.id === draggedId);
  const targetIndex = items.findIndex((item) => item.id === targetId);

  if (
    draggedIndex < 0 ||
    targetIndex < 0 ||
    draggedIndex === targetIndex
  ) {
    return items;
  }

  const nextItems = [...items];
  const [draggedItem] = nextItems.splice(draggedIndex, 1);

  if (!draggedItem) return items;

  nextItems.splice(targetIndex, 0, draggedItem);
  return nextItems;
}

function startSortableDrag(event: DragEvent<HTMLElement>, id: string) {
  event.dataTransfer.effectAllowed = "move";
  event.dataTransfer.setData("text/plain", id);
  event.currentTarget.classList.add("is-dragging");
}

function endSortableDrag(event: DragEvent<HTMLElement>) {
  event.currentTarget.classList.remove("is-dragging", "is-drag-target");
}

function allowSortableDrop(event: DragEvent<HTMLElement>) {
  event.preventDefault();
  event.dataTransfer.dropEffect = "move";
  event.currentTarget.classList.add("is-drag-target");
}

function leaveSortableDrop(event: DragEvent<HTMLElement>) {
  event.currentTarget.classList.remove("is-drag-target");
}

function dropSortableItem(
  event: DragEvent<HTMLElement>,
  targetId: string,
  onReorder: ReorderHandler,
) {
  event.preventDefault();
  event.currentTarget.classList.remove("is-drag-target");

  const draggedId = event.dataTransfer.getData("text/plain");

  if (draggedId && draggedId !== targetId) {
    onReorder(draggedId, targetId);
  }
}

function readDemoStore(): HomeflowStore {
  try {
    const stored = window.sessionStorage.getItem(DEMO_STORE_KEY);

    if (stored) {
      const parsed = JSON.parse(stored) as Partial<HomeflowStore>;

      if (
        Array.isArray(parsed.months) &&
        Array.isArray(parsed.annualGoals) &&
        Array.isArray(parsed.futureCommitments)
      ) {
        return cloneStore(parsed as HomeflowStore);
      }
    }
  } catch {
    // Fall back to the built-in demo when session storage is unavailable.
  }

  return createDemoStore();
}

function writeDemoStore(store: HomeflowStore) {
  try {
    window.sessionStorage.setItem(DEMO_STORE_KEY, JSON.stringify(store));
  } catch {
    // DEMO remains editable in memory if session storage is unavailable.
  }
}

function parseLocalizedNumber(value: string, locale: string) {
  const compact = value.trim().replace(/[\s€$]/g, "");
  if (!compact) return 0;

  const lastComma = compact.lastIndexOf(",");
  const lastDot = compact.lastIndexOf(".");
  let normalized = compact;

  if (lastComma >= 0 && lastDot >= 0) {
    const decimalSeparator = lastComma > lastDot ? "," : ".";
    const groupingSeparator = decimalSeparator === "," ? "." : ",";
    normalized = compact
      .replaceAll(groupingSeparator, "")
      .replace(decimalSeparator, ".");
  } else if (lastComma >= 0) {
    const isEnglishGrouping =
      locale.startsWith("en") && /^-?\d{1,3}(,\d{3})+$/.test(compact);
    normalized = isEnglishGrouping
      ? compact.replaceAll(",", "")
      : compact.replace(",", ".");
  } else if (lastDot >= 0) {
    const isEuropeanGrouping =
      !locale.startsWith("en") && /^-?\d{1,3}(\.\d{3})+$/.test(compact);
    normalized = isEuropeanGrouping ? compact.replaceAll(".", "") : compact;
  }

  const number = Number(normalized);
  return Number.isFinite(number) ? number : null;
}

function formatEditableNumber(value: number, locale: string) {
  return new Intl.NumberFormat(locale, {
    maximumFractionDigits: 2,
    useGrouping: true,
  }).format(value);
}

function LocalizedMoneyInput({
  ariaLabel,
  className,
  disabled,
  onValueChange,
  value,
}: {
  ariaLabel: string;
  className?: string;
  disabled: boolean;
  onValueChange: (value: number) => void;
  value: number;
}) {
  const { locale } = useI18n();
  const isFocused = useRef(false);
  const [displayValue, setDisplayValue] = useState(() =>
    formatEditableNumber(value, locale),
  );

  useEffect(() => {
    if (!isFocused.current) {
      setDisplayValue(formatEditableNumber(value, locale));
    }
  }, [locale, value]);

  return (
    <input
      aria-label={ariaLabel}
      className={className}
      type="text"
      inputMode="decimal"
      value={displayValue}
      disabled={disabled}
      onBlur={() => {
        isFocused.current = false;
        const parsed = parseLocalizedNumber(displayValue, locale);
        const nextValue = parsed ?? value;
        onValueChange(nextValue);
        setDisplayValue(formatEditableNumber(nextValue, locale));
      }}
      onChange={(event) => {
        const nextDisplayValue = event.target.value;
        setDisplayValue(nextDisplayValue);
        const parsed = parseLocalizedNumber(nextDisplayValue, locale);
        if (parsed !== null) onValueChange(parsed);
      }}
      onFocus={() => {
        isFocused.current = true;
      }}
    />
  );
}

function getCurrentMonthValue() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function getNextMonthValue(value: string) {
  const [year, month] = value.split("-").map(Number);

  if (!year || !month) {
    return getCurrentMonthValue();
  }

  const next = new Date(year, month, 1);
  return `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}`;
}

function createMonthFromTemplate(
  month: string,
  template: HomeflowMonth | null | undefined,
  t: Translator,
): HomeflowMonth {
  const incomeEntries =
    template?.incomeEntries?.map((entry) => ({
      ...entry,
      id: createId("income"),
    })) ??
    (template?.income
      ? [{ id: createId("income"), name: t("Ingreso"), amount: template.income }]
      : []);
  const cashEntries =
    template?.cashEntries?.map((entry) => ({
      ...entry,
      id: createId("cash"),
    })) ??
    (template?.cash
      ? [{ id: createId("cash"), name: t("Efectivo"), amount: template.cash }]
      : []);

  return {
    id: month,
    month,
    income: incomeEntries.reduce((total, entry) => total + entry.amount, 0),
    incomeEntries,
    cash: cashEntries.reduce((total, entry) => total + entry.amount, 0),
    cashEntries,
    accounts:
      template?.accounts.map((account) => ({
        ...account,
        id: createId("account"),
      })) ?? [
        { id: createId("account"), name: t("Cuenta corriente"), balance: 0 },
        { id: createId("account"), name: t("Cuenta ahorro"), balance: 0 },
      ],
    receivables:
      template?.receivables.map((entry) => ({
        ...entry,
        id: createId("receivable"),
      })) ?? [],
    payables:
      template?.payables.map((entry) => ({
        ...entry,
        id: createId("payable"),
      })) ?? [],
    adjustments: [],
    notes: "",
    updatedAt: new Date().toISOString(),
  };
}

function createDefaultGoal(year: number, t: Translator): AnnualGoal {
  return {
    id: `goal-${year}`,
    year,
    targetSavings: 12000,
    purpose: t("Ahorro anual"),
    allocations: [
      {
        id: createId("allocation"),
        name: t("Fondo de emergencia"),
        amount: 6000,
        accumulates: true,
      },
      {
        id: createId("allocation"),
        name: t("Inversión"),
        amount: 4000,
        accumulates: true,
      },
      {
        id: createId("allocation"),
        name: t("Ocio planificado"),
        amount: 2000,
        accumulates: false,
      },
    ],
    updatedAt: new Date().toISOString(),
  };
}

function getGoalForYear(goals: AnnualGoal[], year: number, t: Translator): AnnualGoal {
  const existing = goals.find((goal) => goal.year === year);
  return existing ? cloneGoal(existing) : createDefaultGoal(year, t);
}

function findPreviousForDraft(months: HomeflowMonth[], draft: HomeflowMonth) {
  const previousMonths = sortMonthsAscending(months).filter(
    (month) => month.month < draft.month,
  );

  return previousMonths.at(-1) ?? null;
}

function formatCurrency(
  value: number | null,
  locale = "es-ES",
  currency: Currency = "EUR",
) {
  if (value === null) return locale.startsWith("ca") ? "Sense dada" : locale.startsWith("en") ? "No data" : "Sin dato";
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    currencyDisplay: "narrowSymbol",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatPreciseCurrency(
  value: number,
  locale = "es-ES",
  currency: Currency = "EUR",
) {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    currencyDisplay: "narrowSymbol",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatEmptyCurrency(locale: string, currency: Currency) {
  const currencySymbol = new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    currencyDisplay: "narrowSymbol",
    maximumFractionDigits: 0,
  })
    .formatToParts(0)
    .find((part) => part.type === "currency")?.value;

  return `- ${currencySymbol ?? currency}`;
}

function formatSignedCurrency(
  value: number | null,
  locale = "es-ES",
  currency: Currency = "EUR",
) {
  if (value === null) return locale.startsWith("ca") ? "Sense històric" : locale.startsWith("en") ? "No history" : "Sin histórico";
  if (Math.round(value) === 0) return formatEmptyCurrency(locale, currency);
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    currencyDisplay: "narrowSymbol",
    signDisplay: "always",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatSavingRate(value: number | null, locale = "es-ES") {
  if (value === null) return locale.startsWith("ca") ? "Sense històric" : locale.startsWith("en") ? "No history" : "Sin histórico";
  return `${Math.round(value * 100)}%`;
}

function getSavingsClass(value: number | null) {
  if (value === null || Math.round(value) === 0) return "is-neutral";
  return value > 0 ? "is-positive" : "is-negative";
}

function getHistoricalComparisonStatus(
  current: number,
  average: number,
): HistoricalComparisonStatus {
  const tolerance = Math.max(1, Math.abs(average) * 0.05);

  if (Math.abs(current - average) <= tolerance) return "close";
  return current > average ? "above" : "below";
}

function buildHistoricalComparison(
  month: HomeflowMonth,
  summary: MonthSummary,
  history: HistoryPoint[],
): HistoricalComparison | null {
  const sameMonthHistory = history.filter(
    (point) =>
      point.month.month < month.month &&
      point.month.month.slice(5) === month.month.slice(5),
  );

  if (sameMonthHistory.length === 0) return null;

  const metrics: {
    current: number | null;
    id: HistoricalComparisonMetric["id"];
    values: (point: HistoryPoint) => number | null;
  }[] = [
    { current: month.income, id: "income", values: (point) => point.month.income },
    {
      current: summary.estimatedSpending,
      id: "spending",
      values: (point) => point.summary.estimatedSpending,
    },
    {
      current: summary.savings,
      id: "savings",
      values: (point) => point.summary.savings,
    },
    {
      current: summary.savingRate,
      id: "savingRate",
      values: (point) => point.summary.savingRate,
    },
  ];

  const comparisons = metrics.flatMap((metric) => {
    if (metric.current === null) return [];

    const values = sameMonthHistory
      .map(metric.values)
      .filter((value): value is number => value !== null);

    if (values.length === 0) return [];

    const average = values.reduce((total, value) => total + value, 0) / values.length;
    const difference = metric.current - average;

    return [{
      average,
      current: metric.current,
      difference,
      id: metric.id,
      samples: values.length,
      status: getHistoricalComparisonStatus(metric.current, average),
    }];
  });

  return comparisons.length > 0
    ? { metrics: comparisons, samples: sameMonthHistory.length }
    : null;
}

function getNiceChartStep(value: number) {
  if (!Number.isFinite(value) || value <= 0) return 1;

  const exponent = Math.floor(Math.log10(value));
  const fraction = value / 10 ** exponent;
  const niceFraction =
    fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 5 ? 5 : 10;

  return niceFraction * 10 ** exponent;
}

function getSummaryForMonth(
  month: HomeflowMonth,
  orderedMonths: HomeflowMonth[],
) {
  const index = orderedMonths.findIndex((item) => item.id === month.id);
  const previous = index > 0 ? orderedMonths[index - 1] : null;
  return calculateMonthSummary(month, previous);
}

function calculateStats(values: number[]): ForecastStats | null {
  if (values.length === 0) return null;

  return {
    average: values.reduce((total, value) => total + value, 0) / values.length,
    max: Math.max(...values),
    min: Math.min(...values),
  };
}

function getForecastMonthsAfter(baseMonth: string) {
  const baseMonthNumber = Number(baseMonth.slice(5));
  return Array.from({ length: Math.max(0, 12 - baseMonthNumber) }, (_, index) =>
    String(baseMonthNumber + index + 1).padStart(2, "0"),
  );
}

function buildForecast(
  history: HistoryPoint[],
  baseMonth: string,
  locale: string,
): ForecastModel | null {
  const basePoint =
    history.find((point) => point.month.month === baseMonth) ??
    history.filter((point) => point.summary.netWorth !== null).at(-1) ??
    null;

  if (!basePoint) return null;

  const monthsToProject = getForecastMonthsAfter(basePoint.month.month);
  const baseYear = Number(basePoint.month.month.slice(0, 4));
  const years = Array.from(
    new Set(
      history
        .map((point) => Number(point.month.month.slice(0, 4)))
        .filter((year) => year < baseYear),
    ),
  ).sort((a, b) => a - b);
  const savingsByMonth = new Map(
    history.map((point) => [point.month.month, point.summary.savings]),
  );
  const scenarios = years
    .map((year) => {
      const monthSavings = monthsToProject.map((monthNumber) => {
        const value = savingsByMonth.get(`${year}-${monthNumber}`) ?? null;
        return {
          label: formatShortMonthName(`${baseYear}-${monthNumber}`, locale),
          value,
        };
      });
      const projectedSavings = monthSavings.reduce(
        (total, item) => total + (item.value ?? 0),
        0,
      );
      const estimatedTotal = basePoint.summary.netWorth + projectedSavings;

      return {
        estimatedTotal,
        monthSavings,
        projectedSavings,
        year,
      };
    })
    .filter((scenario) =>
      scenario.monthSavings.some(
        (item) => item.value !== null && Math.round(item.value) !== 0,
      ),
    );

  return {
    baseNetWorth: basePoint.summary.netWorth,
    basePoint,
    scenarios,
    stats:
      scenarios.length === 0
        ? null
        : {
            estimatedTotal: calculateStats(
              scenarios.map((scenario) => scenario.estimatedTotal),
            ) as ForecastStats,
          },
  };
}

function calculateAnnualProgress(
  year: number,
  targetSavings: number,
  history: HistoryPoint[],
) {
  const yearPoints = history.filter(
    (point) => Number(point.month.month.slice(0, 4)) === year,
  );
  const saved = yearPoints.reduce(
    (total, point) => total + (point.summary.savings ?? 0),
    0,
  );
  const income = yearPoints.reduce((total, point) => total + point.month.income, 0);
  const closedMonths = yearPoints.length;
  const remaining = Math.max(0, targetSavings - saved);
  const monthsLeft = Math.max(1, 12 - closedMonths);

  return {
    closedMonths,
    income,
    monthlyNeed: remaining / monthsLeft,
    progress: targetSavings > 0 ? saved / targetSavings : 0,
    remaining,
    saved,
    savingRate: income > 0 ? saved / income : null,
  };
}

function SummaryMetric({
  detail,
  icon,
  label,
  tone = "neutral",
  value,
  valueClassName,
}: {
  detail: string;
  icon: ReactNode;
  label: string;
  tone?: "neutral" | "positive" | "negative" | "blue" | "amber";
  value: string;
  valueClassName?: string;
}) {
  return (
    <article className={`metric-card tone-${tone}`}>
      <div className="metric-top">
        <span>{label}</span>
        {icon}
      </div>
      <strong className={valueClassName}>{value}</strong>
      <small>{detail}</small>
    </article>
  );
}

function AppIcon({
  icon,
  size = 16,
}: {
  icon: IconDefinition;
  size?: number;
}) {
  return (
    <FontAwesomeIcon
      aria-hidden="true"
      className="app-icon"
      icon={icon}
      style={{ width: `${size}px`, height: `${size}px` }}
    />
  );
}

function AppSplash({ ready }: { ready: boolean }) {
  const { t } = useI18n();
  const [phase, setPhase] = useState<SplashPhase>(() =>
    hasShownAppSplash ? "hidden" : "visible",
  );
  const startedAtRef = useRef<number | null>(null);

  useEffect(() => {
    if (hasShownAppSplash) return;

    if (startedAtRef.current === null) {
      startedAtRef.current = Date.now();
    }

    if (!ready) return;

    const elapsed = Date.now() - startedAtRef.current;
    const delayBeforeLeaving = Math.max(0, SPLASH_MIN_VISIBLE_MS - elapsed);

    const leaveTimer = window.setTimeout(() => {
      setPhase("leaving");
    }, delayBeforeLeaving);
    const hideTimer = window.setTimeout(() => {
      hasShownAppSplash = true;
      setPhase("hidden");
    }, delayBeforeLeaving + SPLASH_FADE_MS);

    return () => {
      window.clearTimeout(leaveTimer);
      window.clearTimeout(hideTimer);
    };
  }, [ready]);

  if (phase === "hidden") return null;

  return (
    <div
      className={`app-splash is-${phase}`}
      role="status"
      aria-live="polite"
      aria-label={t("Cargando HomeFlow")}
    >
      <div className="splash-filigree splash-filigree-one" aria-hidden="true" />
      <div className="splash-filigree splash-filigree-two" aria-hidden="true" />
      <div className="splash-content">
        <div className="splash-logo" aria-hidden="true">
          <Image
            src="/homeflow-logo.png"
            alt=""
            width={148}
            height={148}
            priority
          />
          <span className="splash-logo-glow" />
        </div>
        <div className="splash-copy">
          <strong>HomeFlow</strong>
          <span>{t("Oink your money")}</span>
        </div>
        <div className="splash-progress" aria-hidden="true">
          <span />
        </div>
        <small>v{APP_VERSION}</small>
      </div>
    </div>
  );
}

function PreferencesMenu({
  currency,
  dataMode,
  language,
  onCurrencyChange,
  onDataModeChange,
  onLanguageChange,
}: {
  currency: Currency;
  dataMode: DataMode;
  language: Language;
  onCurrencyChange: (currency: Currency) => void;
  onDataModeChange: (mode: DataMode) => void;
  onLanguageChange: (language: Language) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const { t } = useI18n();

  function changeTheme(nextTheme: Theme) {
    document.documentElement.dataset.theme = nextTheme;
    persistSetting(THEME_KEY, nextTheme);
  }

  return (
    <div
      className="preferences-menu"
      onBlur={(event) => {
        const nextFocus = event.relatedTarget;

        if (!(nextFocus instanceof Node) || !event.currentTarget.contains(nextFocus)) {
          setIsOpen(false);
        }
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          setIsOpen(false);
        }
      }}
    >
      <button
        className="icon-button preferences-trigger action-neutral"
        type="button"
        aria-controls="preferences-popover"
        aria-expanded={isOpen}
        aria-label={t("Abrir preferencias")}
        title={t("Preferencias")}
        onClick={() => setIsOpen((current) => !current)}
      >
        <AppIcon icon={faEllipsis} size={16} />
      </button>

      {isOpen && (
        <section
          className="preferences-popover"
          id="preferences-popover"
          aria-label={t("Preferencias")}
        >
          <div className="preferences-heading">
            <span>{t("Preferencias")}</span>
            <small>{t("Personaliza HomeFlow")}</small>
          </div>

          <div className="preference-field language-field">
            <span className="preference-label">
              {t("Idioma")}
            </span>
            <div
              className="data-mode-switch language-switch"
              role="group"
              aria-label={t("Idioma de la aplicación")}
            >
              <button
                type="button"
                aria-label="Español"
                aria-pressed={language === "es"}
                onClick={() => onLanguageChange("es")}
              >
                <span>ESP</span>
              </button>
              <button
                type="button"
                aria-label="Català"
                aria-pressed={language === "ca"}
                onClick={() => onLanguageChange("ca")}
              >
                <span>CAT</span>
              </button>
              <button
                type="button"
                aria-label="English"
                aria-pressed={language === "en"}
                onClick={() => onLanguageChange("en")}
              >
                <span>ENG</span>
              </button>
            </div>
          </div>

          <div className="preference-field">
            <span className="preference-label">{t("Moneda")}</span>
            <div
              className="data-mode-switch currency-switch"
              role="group"
              aria-label={t("Moneda de la aplicación")}
            >
              <button
                type="button"
                aria-label={t("Usar euros")}
                aria-pressed={currency === "EUR"}
                onClick={() => onCurrencyChange("EUR")}
              >
                <span>EUR</span>
              </button>
              <button
                type="button"
                aria-label={t("Usar dólares estadounidenses")}
                aria-pressed={currency === "USD"}
                onClick={() => onCurrencyChange("USD")}
              >
                <span>USD</span>
              </button>
            </div>
          </div>

          <div className="preference-field">
            <span className="preference-label">{t("Apariencia")}</span>
            <div className="theme-switch" role="group" aria-label={t("Apariencia")}>
              <button
                type="button"
                data-theme-option="light"
                aria-label={t("Activar apariencia clara")}
                onClick={() => changeTheme("light")}
              >
                <span>{t("Claro")}</span>
              </button>
              <button
                type="button"
                data-theme-option="dark"
                aria-label={t("Activar apariencia oscura")}
                onClick={() => changeTheme("dark")}
              >
                <span>{t("Oscuro")}</span>
              </button>
            </div>
          </div>

          <div className="preference-field">
            <span className="preference-label">{t("Fuente de datos")}</span>
            <div className="data-mode-switch" role="group" aria-label={t("Fuente de datos")}>
              <button
                type="button"
                data-data-mode-option="real"
                aria-label={t("Usar datos reales")}
                aria-pressed={dataMode === "real"}
                onClick={() => onDataModeChange("real")}
              >
                <span>Real</span>
              </button>
              <button
                type="button"
                data-data-mode-option="demo"
                aria-label={t("Usar datos de demostración")}
                aria-pressed={dataMode === "demo"}
                onClick={() => onDataModeChange("demo")}
              >
                <span>DEMO</span>
              </button>
            </div>
          </div>

          <footer className="preferences-footer">
            <div>
              <span>HomeFlow v{APP_VERSION} by </span>
              <a
                href="https://github.com/abujalancej/homeflow"
                target="_blank"
                rel="noopener noreferrer"
              >
                abujalancej
              </a>
            </div>
          </footer>
        </section>
      )}
    </div>
  );
}

function EmptyState({ copy, title }: { copy: string; title: string }) {
  return (
    <section className="empty-state" aria-label={title}>
      <AppIcon icon={faDatabase} size={24} />
      <h1>{title}</h1>
      <p>{copy}</p>
    </section>
  );
}

function getViewMeta(view: HomeflowView, t: Translator) {
  switch (view) {
    case "evolution":
      return {
        detail: t("Patrimonio neto y ahorro cierre a cierre"),
        eyebrow: t("Evolución"),
        title: t("Evolución mes a mes"),
      };
    case "forecast":
      return {
        detail: t("Previsión de ahorro"),
        eyebrow: t("Previsión"),
        title: t("Posible evolución"),
      };
    case "analysis":
      return {
        detail: t("Composición del patrimonio, liquidez y ahorro del mes activo"),
        eyebrow: t("Análisis"),
        title: t("Detalle del cierre"),
      };
    case "goal":
      return {
        detail: t("Objetivo, propósito y desglose anual"),
        eyebrow: t("Meta anual"),
        title: t("Propósito de ahorro"),
      };
    case "register":
      return {
        detail: t("Saldos, ingresos y ajustes del mes activo"),
        eyebrow: t("Registro mensual"),
        title: t("Datos del cierre"),
      };
    case "export":
      return {
        detail: t("Informes en Excel y copias de seguridad en JSON"),
        eyebrow: t("Datos"),
        title: t("Gestión de datos"),
      };
    default:
      return {
        detail: t("Patrimonio, liquidez y ahorro del mes activo"),
        eyebrow: t("Resumen"),
        title: t("Balance del hogar"),
      };
  }
}

export default function HomeflowApp({
  view = "dashboard",
}: {
  view?: HomeflowView;
}) {
  const [months, setMonths] = useState<HomeflowMonth[]>([]);
  const [annualGoals, setAnnualGoals] = useState<AnnualGoal[]>([]);
  const [futureCommitments, setFutureCommitments] = useState<FutureCommitment[]>([]);
  const [savedFutureCommitments, setSavedFutureCommitments] =
    useState<FutureCommitment[]>([]);
  const [currency, setCurrency] = useState<Currency>("EUR");
  const [language, setLanguage] = useState<Language>("es");
  const t = useMemo(() => createTranslator(language), [language]);
  const locale = LANGUAGE_LOCALES[language];
  const [goalDraft, setGoalDraft] = useState<AnnualGoal>(() =>
    createDefaultGoal(new Date().getFullYear(), t),
  );
  const [activeYear, setActiveYear] = useState(new Date().getFullYear());
  const [evolutionStart, setEvolutionStart] = useState("");
  const [evolutionEnd, setEvolutionEnd] = useState("");
  const [evolutionRangeMode, setEvolutionRangeMode] =
    useState<EvolutionRangeMode>("recent");
  const [evolutionMetric, setEvolutionMetric] =
    useState<EvolutionMetric>("netWorth");
  const [exportStart, setExportStart] = useState("");
  const [exportEnd, setExportEnd] = useState("");
  const [draft, setDraft] = useState<HomeflowMonth | null>(null);
  const [draftOriginalId, setDraftOriginalId] = useState("");
  const [isMonthEditing, setIsMonthEditing] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<HomeflowMonth | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [deleteItemTarget, setDeleteItemTarget] =
    useState<RegisterDeleteTarget | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isGoalSaving, setIsGoalSaving] = useState(false);
  const [isGoalEditing, setIsGoalEditing] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [isGoalDirty, setIsGoalDirty] = useState(false);
  const [isCommitmentsDirty, setIsCommitmentsDirty] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [pendingImportFile, setPendingImportFile] = useState<File | null>(null);
  const [dataTransferStatus, setDataTransferStatus] = useState<
    "success" | "error" | null
  >(null);
  const [dataTransferMessage, setDataTransferMessage] = useState("");
  const [dataMode, setDataMode] = useState<DataMode>("real");
  const loadRequestRef = useRef(0);
  const importFileInputRef = useRef<HTMLInputElement | null>(null);

  async function loadStore(mode: DataMode) {
    const requestId = loadRequestRef.current + 1;
    loadRequestRef.current = requestId;
    setDataMode(mode);
    setIsLoading(true);

    try {
      let store: HomeflowStore;

      if (mode === "demo") {
        store = readDemoStore();
      } else {
        const response = await fetch("/api/months", { cache: "no-store" });

        if (!response.ok) {
          throw new Error("Request failed");
        }

        store = (await response.json()) as HomeflowStore;
      }

      if (requestId !== loadRequestRef.current) return;

      const ordered = sortMonthsDescending(store.months);
      const activeMonthKey = `${ACTIVE_MONTH_KEY}.${mode}`;
      const storedActiveId =
        readPersistedSetting(activeMonthKey) ??
        (mode === "real"
          ? readPersistedSetting(ACTIVE_MONTH_KEY)
          : null);
      const firstMonth =
        ordered.find((month) => month.id === storedActiveId) ?? ordered[0] ?? null;
      const goalYear = firstMonth
        ? Number(firstMonth.month.slice(0, 4))
        : new Date().getFullYear();
      const initialDraft = firstMonth
        ? cloneMonth(firstMonth)
        : view === "register"
          ? createMonthFromTemplate(getCurrentMonthValue(), null, t)
          : null;

      setMonths(store.months);
      setAnnualGoals(store.annualGoals ?? []);
      setFutureCommitments(cloneFutureCommitments(store.futureCommitments ?? []));
      setSavedFutureCommitments(
        cloneFutureCommitments(store.futureCommitments ?? []),
      );
      setActiveYear(goalYear);
      setDraft(initialDraft);
      setDraftOriginalId(firstMonth?.id ?? "");
      setIsMonthEditing(!firstMonth && view === "register");
      setIsDirty(!firstMonth && view === "register");
      setIsCommitmentsDirty(false);
      setGoalDraft(getGoalForYear(store.annualGoals ?? [], goalYear, t));
      setIsGoalDirty(false);
      setIsGoalEditing(false);
    } catch {
      if (requestId !== loadRequestRef.current) return;
      setMonths([]);
      setAnnualGoals([]);
      setFutureCommitments([]);
      setSavedFutureCommitments([]);
      setDraft(null);
      setDraftOriginalId("");
    } finally {
      if (requestId === loadRequestRef.current) {
        setIsLoading(false);
      }
    }
  }

  useEffect(() => {
    let cancelled = false;

    async function initialise() {
      const bridge = getDesktopBridge();

      if (bridge) {
        try {
          desktopSettings = await bridge.getSettings();
        } catch {
          desktopSettings = {};
        }
      } else {
        desktopSettings = null;
      }

      if (cancelled) return;

      const storedLanguage = readPersistedSetting(LANGUAGE_KEY);
      if (storedLanguage === "es" || storedLanguage === "ca" || storedLanguage === "en") {
        setLanguage(storedLanguage);
      }

      const storedCurrency = readPersistedSetting(CURRENCY_KEY);
      if (storedCurrency === "EUR" || storedCurrency === "USD") {
        setCurrency(storedCurrency);
      }

      const storedTheme = readPersistedSetting(THEME_KEY);
      if (storedTheme === "light" || storedTheme === "dark") {
        document.documentElement.dataset.theme = storedTheme;
      }

      const storedMode = readPersistedSetting(DATA_MODE_KEY);
      const initialMode: DataMode = storedMode === "demo" ? "demo" : "real";
      await loadStore(initialMode);
    }

    void initialise();

    return () => {
      cancelled = true;
      loadRequestRef.current += 1;
    };
  }, []);

  function changeLanguage(nextLanguage: Language) {
    persistSetting(LANGUAGE_KEY, nextLanguage);
    setLanguage(nextLanguage);
  }

  function changeCurrency(nextCurrency: Currency) {
    persistSetting(CURRENCY_KEY, nextCurrency);
    setCurrency(nextCurrency);
  }

  async function importHomeflowData(file: File) {
    setIsImporting(true);
    setDataTransferStatus(null);
    setDataTransferMessage("");

    try {
      const content = await file.text();
      let payload: unknown;

      try {
        payload = JSON.parse(content);
      } catch {
        throw new Error(t("El archivo seleccionado no contiene un JSON válido."));
      }

      const response = await fetch("/api/data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = (await response.json().catch(() => null)) as {
        message?: string;
      } | null;

      if (!response.ok) {
        throw new Error(
          result?.message
            ? t(result.message)
            : t("No se pudo importar la base de datos."),
        );
      }

      persistSetting(DATA_MODE_KEY, "real");
      removePersistedSetting(`${ACTIVE_MONTH_KEY}.real`);
      removePersistedSetting(ACTIVE_MONTH_KEY);
      await loadStore("real");
      setDataTransferStatus("success");
      setDataTransferMessage(
        t("Datos importados correctamente. Se ha guardado una copia de seguridad."),
      );
    } catch (error) {
      setDataTransferStatus("error");
      setDataTransferMessage(
        error instanceof Error
          ? error.message
          : t("No se pudo importar la base de datos."),
      );
    } finally {
      setIsImporting(false);
    }
  }

  function handleImportFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (file) setPendingImportFile(file);
  }

  function changeDataMode(nextMode: DataMode) {
    if (nextMode === dataMode) return;

    persistSetting(DATA_MODE_KEY, nextMode);
    setDataMode(nextMode);
    setMonths([]);
    setAnnualGoals([]);
    setFutureCommitments([]);
    setSavedFutureCommitments([]);
    setDraft(null);
    setDraftOriginalId("");
    setDeleteTarget(null);
    setDeleteConfirmation("");
    setDeleteItemTarget(null);
    setIsMonthEditing(false);
    setIsGoalEditing(false);
    setIsDirty(false);
    setIsGoalDirty(false);
    setIsCommitmentsDirty(false);
    void loadStore(nextMode);
  }

  function createNewMonth() {
    const template = draftOriginalId ? draft : descendingMonths[0] ?? null;
    const usedMonths = new Set(months.map((month) => month.month));
    let monthValue = template
      ? getNextMonthValue(template.month)
      : getCurrentMonthValue();

    while (usedMonths.has(monthValue)) {
      monthValue = getNextMonthValue(monthValue);
    }

    const nextDraft = createMonthFromTemplate(monthValue, template, t);
    setDraft(nextDraft);
    setDraftOriginalId("");
    setIsMonthEditing(true);
    setActiveYear(Number(nextDraft.month.slice(0, 4)));
    persistSetting(
      `${ACTIVE_MONTH_KEY}.${dataMode}`,
      nextDraft.id,
    );
    setIsDirty(true);
    syncGoalForYear(Number(nextDraft.month.slice(0, 4)));
  }

  const orderedMonths = useMemo(() => sortMonthsAscending(months), [months]);
  const descendingMonths = useMemo(
    () => sortMonthsDescending(months),
    [months],
  );
  const availableYears = useMemo(
    () =>
      Array.from(
        new Set(descendingMonths.map((month) => Number(month.month.slice(0, 4)))),
      ).filter(Boolean),
    [descendingMonths],
  );
  const goalYearOptions = useMemo(
    () =>
      Array.from(
        new Set([
          ...availableYears,
          ...annualGoals.map((goal) => goal.year),
          activeYear,
          goalDraft.year,
          new Date().getFullYear(),
          new Date().getFullYear() + 1,
        ]),
      )
        .filter(Boolean)
        .sort((a, b) => b - a),
    [activeYear, annualGoals, availableYears, goalDraft.year],
  );
  const previousMonth = useMemo(
    () => (draft ? findPreviousForDraft(months, draft) : null),
    [draft, months],
  );
  const summary = useMemo(
    () => (draft ? calculateMonthSummary(draft, previousMonth) : null),
    [draft, previousMonth],
  );
  const futureCommitmentTotal = useMemo(
    () =>
      futureCommitments.reduce(
        (total, commitment) => total + commitment.amount,
        0,
      ),
    [futureCommitments],
  );
  const history = useMemo(
    () =>
      orderedMonths.map((month) => ({
        month,
        summary: getSummaryForMonth(month, orderedMonths),
      })),
    [orderedMonths],
  );
  const previousMonthSavings = useMemo(
    () =>
      previousMonth
        ? (history.find((point) => point.month.id === previousMonth.id)?.summary
            .savings ?? null)
        : null,
    [history, previousMonth],
  );
  const savingsComparison =
    summary?.savings == null || previousMonthSavings == null
      ? null
      : summary.savings - previousMonthSavings;
  const forecastBaseMonthValue =
    draft?.month ||
    history.filter((point) => point.summary.netWorth !== null).at(-1)?.month.month ||
    "";
  const forecast = useMemo(
    () => buildForecast(history, forecastBaseMonthValue, locale),
    [forecastBaseMonthValue, history, locale],
  );
  const forecastYear =
    Number(forecastBaseMonthValue.slice(0, 4)) || activeYear;
  const forecastYearCommitments = useMemo(
    () =>
      futureCommitments
        .filter((commitment) =>
          commitment.targetMonth?.startsWith(`${forecastYear}-`),
        )
        .sort((a, b) =>
          (a.targetMonth ?? "").localeCompare(b.targetMonth ?? ""),
        ),
    [forecastYear, futureCommitments],
  );
  const forecastFutureCommitmentTotal = useMemo(
    () =>
      forecastYearCommitments.reduce(
        (total, commitment) => total + commitment.amount,
        0,
      ),
    [forecastYearCommitments],
  );
  const goalTargetSavings = useMemo(
    () =>
      goalDraft.allocations.reduce(
        (total, allocation) => total + allocation.amount,
        0,
      ),
    [goalDraft.allocations],
  );
  const goalNonAccumulableTotal = useMemo(
    () =>
      goalDraft.allocations.reduce(
        (total, allocation) =>
          allocation.accumulates ? total : total + allocation.amount,
        0,
      ),
    [goalDraft.allocations],
  );
  const annualProgress = useMemo(
    () =>
      calculateAnnualProgress(
        goalDraft.year,
        goalTargetSavings,
        history,
      ),
    [goalDraft.year, goalTargetSavings, history],
  );
  const isGoalPersistDirty = isGoalDirty || goalDraft.targetSavings !== goalTargetSavings;
  const activeEvolutionEndIndex = history.findIndex(
    (point) => point.month.month === draft?.month,
  );
  const recentEvolutionEndIndex =
    activeEvolutionEndIndex >= 0 && history[activeEvolutionEndIndex]
      ? activeEvolutionEndIndex
      : Math.max(0, history.length - 1);
  const recentEvolutionStart =
    history[Math.max(0, recentEvolutionEndIndex - 11)]?.month.month ?? "";
  const recentEvolutionEnd =
    history[recentEvolutionEndIndex]?.month.month ?? recentEvolutionStart;
  const evolutionStartMonth =
    evolutionRangeMode === "all"
      ? history[0]?.month.month || ""
      : evolutionStart || recentEvolutionStart;
  const evolutionEndMonth =
    evolutionRangeMode === "all"
      ? history.at(-1)?.month.month || evolutionStartMonth
      : evolutionEnd || recentEvolutionEnd;
  const evolutionHistory = useMemo(
    () =>
      history.filter(
        (point) =>
          point.month.month >= evolutionStartMonth &&
          point.month.month <= evolutionEndMonth,
      ),
    [evolutionEndMonth, evolutionStartMonth, history],
  );
  const isFullEvolutionHistory = evolutionRangeMode === "all";
  const isRecentEvolutionHistory = evolutionRangeMode === "recent";
  const exportStartMonth = exportStart || history[0]?.month.month || getCurrentMonthValue();
  const exportEndMonth = exportEnd || history.at(-1)?.month.month || exportStartMonth;
  const exportUrl = `/api/export?from=${encodeURIComponent(exportStartMonth)}&to=${encodeURIComponent(exportEndMonth)}&mode=${dataMode}`;
  const monthPickerYears = useMemo(() => {
    const years = orderedMonths.map((month) => Number(month.month.slice(0, 4)));
    const currentYear = new Date().getFullYear();
    const minYear = Math.min(...years, currentYear) - 1;
    const maxYear = Math.max(...years, currentYear) + 1;

    return Array.from(
      { length: maxYear - minYear + 1 },
      (_, index) => minYear + index,
    );
  }, [orderedMonths]);

  function syncGoalForYear(year: number, goals = annualGoals) {
    setGoalDraft(getGoalForYear(goals, year, t));
    setIsGoalDirty(false);
    setIsGoalEditing(false);
  }

  function selectGoalYear(year: number) {
    syncGoalForYear(year);
  }

  function setActiveMonth(month: HomeflowMonth) {
    setDraft(cloneMonth(month));
    setDraftOriginalId(month.id);
    setIsMonthEditing(false);
    setActiveYear(Number(month.month.slice(0, 4)));
    persistSetting(`${ACTIVE_MONTH_KEY}.${dataMode}`, month.id);
    setIsDirty(false);
    setFutureCommitments(cloneFutureCommitments(savedFutureCommitments));
    setIsCommitmentsDirty(false);
    syncGoalForYear(Number(month.month.slice(0, 4)));
  }

  function updateDraft(update: (current: HomeflowMonth) => HomeflowMonth) {
    setDraft((current) => {
      if (!current) return current;
      return update({ ...current, updatedAt: new Date().toISOString() });
    });
    setIsDirty(true);
  }

  function reorderDraftCollection(
    collection: ReorderableMonthCollection,
    draggedId: string,
    targetId: string,
  ) {
    updateDraft((current) => {
      const items = current[collection] as Array<
        AccountBalance | MoneyEntry | WealthAdjustment
      >;
      const reordered = reorderItems(items, draggedId, targetId);

      return reordered === items
        ? current
        : ({ ...current, [collection]: reordered } as HomeflowMonth);
    });
  }

  function updateGoal(update: (current: AnnualGoal) => AnnualGoal) {
    setGoalDraft((current) =>
      update({ ...current, updatedAt: new Date().toISOString() }),
    );
    setIsGoalDirty(true);
  }

  function updateFutureCommitment(
    id: string,
    update: Partial<Omit<FutureCommitment, "id">>,
  ) {
    setFutureCommitments((current) =>
      current.map((commitment) =>
        commitment.id === id
          ? { ...commitment, ...update, updatedAt: new Date().toISOString() }
          : commitment,
      ),
    );
    setIsCommitmentsDirty(true);
  }

  function addFutureCommitment() {
    setFutureCommitments((current) => [
      ...current,
      {
        id: createId("commitment"),
        name: t("Nuevo compromiso"),
        amount: 0,
        status: "planned",
        updatedAt: new Date().toISOString(),
      },
    ]);
    setIsCommitmentsDirty(true);
  }

  function removeFutureCommitment(id: string) {
    setFutureCommitments((current) =>
      current.filter((commitment) => commitment.id !== id),
    );
    setIsCommitmentsDirty(true);
  }

  function reorderFutureCommitments(draggedId: string, targetId: string) {
    setFutureCommitments((current) => {
      const reordered = reorderItems(current, draggedId, targetId);
      return reordered === current ? current : reordered;
    });
    setIsCommitmentsDirty(true);
  }

  function requestDeleteItem(kind: RegisterDeleteKind, id: string) {
    let name: string | undefined;

    switch (kind) {
      case "account":
        name = draft?.accounts.find((account) => account.id === id)?.name;
        break;
      case "income":
        name = draft?.incomeEntries.find((entry) => entry.id === id)?.name;
        break;
      case "cash":
        name = draft?.cashEntries.find((entry) => entry.id === id)?.name;
        break;
      case "receivables":
      case "payables":
        name = draft?.[kind]?.find((entry) => entry.id === id)?.name;
        break;
      case "commitment":
        name = futureCommitments.find((commitment) => commitment.id === id)?.name;
        break;
      case "adjustment":
        name = draft?.adjustments.find((adjustment) => adjustment.id === id)?.name;
        break;
    }

    if (name === undefined) return;

    setDeleteItemTarget({
      id,
      kind,
      name: name.trim() || t("Elemento sin nombre"),
    });
  }

  function confirmDeleteItem() {
    const target = deleteItemTarget;
    if (!target) return;

    switch (target.kind) {
      case "account":
        removeAccount(target.id);
        break;
      case "income":
        removeIncomeEntry(target.id);
        break;
      case "cash":
        removeCashEntry(target.id);
        break;
      case "receivables":
      case "payables":
        removeEntry(target.kind, target.id);
        break;
      case "commitment":
        removeFutureCommitment(target.id);
        break;
      case "adjustment":
        removeAdjustment(target.id);
        break;
    }

    setDeleteItemTarget(null);
  }

  function convertFutureCommitment(id: string) {
    const commitment = futureCommitments.find((item) => item.id === id);

    if (!commitment || !draft) return;

    updateDraft((current) => ({
      ...current,
      payables: [
        ...current.payables,
        {
          id: createId("payable"),
          name: commitment.name,
          amount: commitment.amount,
          note: commitment.note,
        },
      ],
    }));
    setFutureCommitments((current) =>
      current.filter((item) => item.id !== id),
    );
    setIsCommitmentsDirty(true);
  }

  async function saveMonth() {
    if (!draft) return;

    const monthAlreadyExists = months.some(
      (month) => month.id === draft.month && month.id !== draftOriginalId,
    );

    if (monthAlreadyExists) {
      return;
    }

    setIsSaving(true);

    try {
      if (dataMode === "demo") {
        const saved: HomeflowMonth = {
          ...cloneMonth(draft),
          id: draft.month,
          updatedAt: new Date().toISOString(),
        };
        const nextMonths = months.filter(
          (month) =>
            month.id !== draftOriginalId && month.id !== saved.id,
        );
        const store: HomeflowStore = {
          annualGoals,
          futureCommitments: cloneFutureCommitments(futureCommitments),
          months: [...nextMonths, saved],
        };

        writeDemoStore(store);
        setMonths(store.months);
        setFutureCommitments(cloneFutureCommitments(store.futureCommitments));
        setSavedFutureCommitments(
          cloneFutureCommitments(store.futureCommitments),
        );
        setDraft(cloneMonth(saved));
        setDraftOriginalId(saved.id);
        setIsMonthEditing(false);
        persistSetting(`${ACTIVE_MONTH_KEY}.demo`, saved.id);
        setIsDirty(false);
        setIsCommitmentsDirty(false);
        return;
      }

      const response = await fetch("/api/months", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });

      if (!response.ok) {
        throw new Error("Request failed");
      }

      let store = (await response.json()) as HomeflowStore;

      if (isCommitmentsDirty) {
        const commitmentsResponse = await fetch("/api/commitments", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(futureCommitments),
        });

        if (!commitmentsResponse.ok) {
          throw new Error("Request failed");
        }

        store = (await commitmentsResponse.json()) as HomeflowStore;
      }

      const saved = store.months.find((month) => month.id === draft.month);

      setMonths(store.months);
      setAnnualGoals(store.annualGoals ?? annualGoals);
      setFutureCommitments(cloneFutureCommitments(store.futureCommitments ?? []));
      setSavedFutureCommitments(
        cloneFutureCommitments(store.futureCommitments ?? []),
      );

      if (saved) {
        setDraft(cloneMonth(saved));
        setDraftOriginalId(saved.id);
        setIsMonthEditing(false);
        persistSetting(`${ACTIVE_MONTH_KEY}.${dataMode}`, saved.id);
      }

      setIsDirty(false);
      setIsCommitmentsDirty(false);
    } catch {
    } finally {
      setIsSaving(false);
    }
  }

  async function saveAnnualGoal() {
    setIsGoalSaving(true);

    try {
      if (dataMode === "demo") {
        const savedGoal: AnnualGoal = {
          ...cloneGoal(goalDraft),
          targetSavings: goalTargetSavings,
          updatedAt: new Date().toISOString(),
        };
        const store: HomeflowStore = {
          annualGoals: [
            ...annualGoals.filter((goal) => goal.year !== savedGoal.year),
            savedGoal,
          ],
          futureCommitments: cloneFutureCommitments(futureCommitments),
          months: months.map(cloneMonth),
        };

        writeDemoStore(store);
        setAnnualGoals(store.annualGoals);
        setGoalDraft(cloneGoal(savedGoal));
        setIsGoalDirty(false);
        setIsGoalEditing(false);
        return;
      }

      const response = await fetch("/api/goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...goalDraft,
          targetSavings: goalTargetSavings,
        }),
      });

      if (!response.ok) {
        throw new Error("Request failed");
      }

      const store = (await response.json()) as HomeflowStore;
      const savedGoal = store.annualGoals.find(
        (goal) => goal.year === goalDraft.year,
      );

      setAnnualGoals(store.annualGoals);
      if (savedGoal) {
        setGoalDraft(cloneGoal(savedGoal));
      }
      setIsGoalDirty(false);
      setIsGoalEditing(false);
    } catch {
    } finally {
      setIsGoalSaving(false);
    }
  }

  async function confirmDeleteMonth() {
    if (
      !deleteTarget ||
      deleteConfirmation !== deleteTarget.month
    ) {
      return;
    }

    setIsSaving(true);

    try {
      let store: HomeflowStore;

      if (dataMode === "demo") {
        store = {
          annualGoals: annualGoals.map(cloneGoal),
          futureCommitments: cloneFutureCommitments(futureCommitments),
          months: months
            .filter((month) => month.id !== deleteTarget.id)
            .map(cloneMonth),
        };
        writeDemoStore(store);
      } else {
        const response = await fetch(
          `/api/months?id=${encodeURIComponent(deleteTarget.id)}`,
          { method: "DELETE" },
        );

        if (!response.ok) {
          throw new Error("Request failed");
        }

        store = (await response.json()) as HomeflowStore;
      }
      const ordered = sortMonthsDescending(store.months);
      const nextActive = ordered[0] ?? null;

      setMonths(store.months);
      setAnnualGoals(store.annualGoals ?? annualGoals);
      setDraftOriginalId(nextActive?.id ?? "");
      setIsMonthEditing(false);
      setActiveYear(
        nextActive ? Number(nextActive.month.slice(0, 4)) : new Date().getFullYear(),
      );
      setDraft(nextActive ? cloneMonth(nextActive) : null);
      if (nextActive) {
        persistSetting(
          `${ACTIVE_MONTH_KEY}.${dataMode}`,
          nextActive.id,
        );
        syncGoalForYear(Number(nextActive.month.slice(0, 4)), store.annualGoals);
      } else {
        removePersistedSetting(`${ACTIVE_MONTH_KEY}.${dataMode}`);
      }
      setDeleteTarget(null);
      setDeleteConfirmation("");
      setIsDirty(false);
    } catch {
    } finally {
      setIsSaving(false);
    }
  }

  function updateAccountName(id: string, name: string) {
    updateDraft((current) => ({
      ...current,
      accounts: current.accounts.map((account) =>
        account.id === id ? { ...account, name } : account,
      ),
    }));
  }

  function updateAccountBalance(id: string, balance: number) {
    updateDraft((current) => ({
      ...current,
      accounts: current.accounts.map((account) =>
        account.id === id ? { ...account, balance } : account,
      ),
    }));
  }

  function addAccount() {
    updateDraft((current) => ({
      ...current,
      accounts: [
        ...current.accounts,
        { id: createId("account"), name: t("Nueva cuenta"), balance: 0 },
      ],
    }));
  }

  function removeAccount(id: string) {
    updateDraft((current) => ({
      ...current,
      accounts: current.accounts.filter((account) => account.id !== id),
    }));
  }

  function updateIncomeName(id: string, name: string) {
    updateDraft((current) => {
      const entries = current.incomeEntries.map((entry) =>
        entry.id === id ? { ...entry, name } : entry,
      );

      return {
        ...current,
        income: entries.reduce((total, entry) => total + entry.amount, 0),
        incomeEntries: entries,
      };
    });
  }

  function updateIncomeAmount(id: string, amount: number) {
    updateDraft((current) => {
      const entries = current.incomeEntries.map((entry) =>
        entry.id === id ? { ...entry, amount } : entry,
      );

      return {
        ...current,
        income: entries.reduce((total, entry) => total + entry.amount, 0),
        incomeEntries: entries,
      };
    });
  }

  function addIncomeEntry() {
    updateDraft((current) => {
      const entries = [
        ...current.incomeEntries,
        { id: createId("income"), name: t("Nuevo ingreso"), amount: 0 },
      ];

      return {
        ...current,
        income: entries.reduce((total, entry) => total + entry.amount, 0),
        incomeEntries: entries,
      };
    });
  }

  function removeIncomeEntry(id: string) {
    updateDraft((current) => {
      const entries = current.incomeEntries.filter((entry) => entry.id !== id);

      return {
        ...current,
        income: entries.reduce((total, entry) => total + entry.amount, 0),
        incomeEntries: entries,
      };
    });
  }

  function updateCashName(id: string, name: string) {
    updateDraft((current) => {
      const entries = current.cashEntries.map((entry) =>
        entry.id === id ? { ...entry, name } : entry,
      );

      return {
        ...current,
        cash: entries.reduce((total, entry) => total + entry.amount, 0),
        cashEntries: entries,
      };
    });
  }

  function updateCashAmount(id: string, amount: number) {
    updateDraft((current) => {
      const entries = current.cashEntries.map((entry) =>
        entry.id === id ? { ...entry, amount } : entry,
      );

      return {
        ...current,
        cash: entries.reduce((total, entry) => total + entry.amount, 0),
        cashEntries: entries,
      };
    });
  }

  function addCashEntry() {
    updateDraft((current) => {
      const entries = [
        ...current.cashEntries,
        { id: createId("cash"), name: t("Nuevo efectivo"), amount: 0 },
      ];

      return {
        ...current,
        cash: entries.reduce((total, entry) => total + entry.amount, 0),
        cashEntries: entries,
      };
    });
  }

  function removeCashEntry(id: string) {
    updateDraft((current) => {
      const entries = current.cashEntries.filter((entry) => entry.id !== id);

      return {
        ...current,
        cash: entries.reduce((total, entry) => total + entry.amount, 0),
        cashEntries: entries,
      };
    });
  }

  function updateEntryName(group: EntryGroup, id: string, name: string) {
    updateDraft((current) => ({
      ...current,
      [group]: current[group].map((entry) =>
        entry.id === id ? { ...entry, name } : entry,
      ),
    }));
  }

  function updateEntryAmount(group: EntryGroup, id: string, amount: number) {
    updateDraft((current) => ({
      ...current,
      [group]: current[group].map((entry) =>
        entry.id === id ? { ...entry, amount } : entry,
      ),
    }));
  }

  function addEntry(group: EntryGroup) {
    const name = group === "receivables" ? t("Me deben") : t("Debo");
    const prefix = group === "receivables" ? "receivable" : "payable";

    updateDraft((current) => ({
      ...current,
      [group]: [
        ...current[group],
        { id: createId(prefix), name, amount: 0 },
      ],
    }));
  }

  function removeEntry(group: EntryGroup, id: string) {
    updateDraft((current) => ({
      ...current,
      [group]: current[group].filter((entry) => entry.id !== id),
    }));
  }

  function updateAdjustmentName(id: string, name: string) {
    updateDraft((current) => ({
      ...current,
      adjustments: current.adjustments.map((adjustment) =>
        adjustment.id === id ? { ...adjustment, name } : adjustment,
      ),
    }));
  }

  function updateAdjustmentAmount(id: string, amount: number) {
    updateDraft((current) => ({
      ...current,
      adjustments: current.adjustments.map((adjustment) =>
        adjustment.id === id ? { ...adjustment, amount } : adjustment,
      ),
    }));
  }

  function addAdjustment() {
    updateDraft((current) => ({
      ...current,
      adjustments: [
        ...current.adjustments,
        { id: createId("adjustment"), name: t("Amortización"), amount: 0 },
      ],
    }));
  }

  function removeAdjustment(id: string) {
    updateDraft((current) => ({
      ...current,
      adjustments: current.adjustments.filter((adjustment) => adjustment.id !== id),
    }));
  }

  function addAllocation(accumulates: boolean) {
    updateGoal((current) => ({
      ...current,
      allocations: [
        ...current.allocations,
        {
          id: createId("allocation"),
          name: t("Nueva partida"),
          amount: 0,
          accumulates,
        },
      ],
    }));
  }

  function updateAllocation(
    id: string,
    key: keyof Pick<AnnualGoalAllocation, "accumulates" | "amount" | "name">,
    value: boolean | number | string,
  ) {
    updateGoal((current) => ({
      ...current,
      allocations: current.allocations.map((allocation) =>
        allocation.id === id ? { ...allocation, [key]: value } : allocation,
      ),
    }));
  }

  function removeAllocation(id: string) {
    updateGoal((current) => ({
      ...current,
      allocations: current.allocations.filter((allocation) => allocation.id !== id),
    }));
  }

  function reorderGoalAllocations(draggedId: string, targetId: string) {
    updateGoal((current) => {
      const dragged = current.allocations.find(
        (allocation) => allocation.id === draggedId,
      );
      const target = current.allocations.find(
        (allocation) => allocation.id === targetId,
      );

      if (!dragged || !target || dragged.accumulates !== target.accumulates) {
        return current;
      }

      const group = current.allocations.filter(
        (allocation) => allocation.accumulates === dragged.accumulates,
      );
      const reorderedGroup = reorderItems(group, draggedId, targetId);
      let groupIndex = 0;

      return {
        ...current,
        allocations: current.allocations.map((allocation) => {
          if (allocation.accumulates !== dragged.accumulates) {
            return allocation;
          }

          const reorderedAllocation = reorderedGroup[groupIndex];
          groupIndex += 1;
          return reorderedAllocation ?? allocation;
        }),
      };
    });
  }

  const savingsTone =
    summary?.savings == null
      ? "neutral"
      : summary.savings >= 0
        ? "positive"
        : "negative";
  const monthLabel = draft
    ? formatMonthName(draft.month, locale)
    : t("Sin cierre");
  const viewMeta = getViewMeta(view, t);
  const titleTrendValue = summary?.savings ?? null;
  const titleTrendIcon =
    titleTrendValue === null || titleTrendValue === 0
      ? faEquals
      : titleTrendValue > 0
        ? faArrowUp
        : faArrowDown;
  const compactTitle =
    view === "evolution"
      ? `${t("Evolución de {metric}", {
          metric: getEvolutionMetricLabel(evolutionMetric, t).toLocaleLowerCase(locale),
        })}`
      : viewMeta.detail;
  const isNewMonthDraft = Boolean(draft && !draftOriginalId);
  const isDemoMode = dataMode === "demo";
  const canEditMonth =
    view === "register" && (isMonthEditing || isNewMonthDraft);

  function startMonthEdit() {
    if (!draft) return;
    setIsMonthEditing(true);
  }

  function cancelMonthEdit() {
    if (!draft) return;

    setFutureCommitments(cloneFutureCommitments(savedFutureCommitments));
    setIsCommitmentsDirty(false);

    if (!draftOriginalId) {
      const fallback = descendingMonths[0] ?? null;
      setDraft(fallback ? cloneMonth(fallback) : null);
      setDraftOriginalId(fallback?.id ?? "");
      setIsMonthEditing(false);
      setIsDirty(false);
      return;
    }

    const storedMonth = months.find((month) => month.id === draftOriginalId);

    if (storedMonth) {
      setDraft(cloneMonth(storedMonth));
      setActiveYear(Number(storedMonth.month.slice(0, 4)));
      persistSetting(
        `${ACTIVE_MONTH_KEY}.${dataMode}`,
        storedMonth.id,
      );
    }

    setIsMonthEditing(false);
    setIsDirty(false);
  }

  function changeActiveMonthValue(month: string) {
    const nextMonth = month || getCurrentMonthValue();
    const existingMonth = months.find((item) => item.month === nextMonth);

    if (existingMonth && existingMonth.id !== draftOriginalId) {
      setActiveMonth(existingMonth);
      return;
    }

    if (!canEditMonth && existingMonth) {
      setActiveMonth(existingMonth);
      return;
    }

    if (!canEditMonth) {
      return;
    }

    updateDraft((current) => ({
      ...current,
      id: nextMonth,
      month: nextMonth,
    }));
    setActiveYear(Number(nextMonth.slice(0, 4)));
    persistSetting(`${ACTIVE_MONTH_KEY}.${dataMode}`, nextMonth);
    syncGoalForYear(Number(nextMonth.slice(0, 4)));
  }

  return (
    <I18nContext.Provider value={{ currency, language, locale, t }}>
      <main className="hf-shell" data-currency={currency}>
      <AppSplash ready={!isLoading} />

      <aside className="hf-rail" aria-label={t("Navegación")}>
        <div className="rail-brand">
          <span className="brand-mark" aria-hidden="true">
            <Image
              src="/homeflow-logo.png"
              alt=""
              width={52}
              height={52}
              priority
            />
          </span>
          <div className="rail-brand-copy">
            <strong>HomeFlow</strong>
            <div className="rail-brand-version">
              <span>v{APP_VERSION}</span>
              {isDemoMode && (
                <span className="data-mode-badge is-demo">DEMO</span>
              )}
            </div>
          </div>
        </div>

        <nav className="rail-nav" aria-label={t("Zonas")}>
          {VIEW_NAV.map((item) => {
            const Icon =
              item.id === "register" && currency === "USD"
                ? faDollarSign
                : item.icon;

            return (
              <Link
                className={item.id === view ? "is-active" : ""}
                href={item.href}
                key={item.id}
              >
                <AppIcon icon={Icon} size={15} />
                <span>{t(item.label)}</span>
              </Link>
            );
          })}
        </nav>

      </aside>

      <section className="hf-content" aria-label="HomeFlow">
        <header className="topbar">
          <div className="page-title is-compact">
            <p>{viewMeta.eyebrow}</p>
            <h1>{compactTitle}</h1>
          </div>

          <div className="topbar-controls">
            {draft && (
              <>
              <MonthYearSelect
              label={t("Mes activo")}
                value={draft.month}
                years={monthPickerYears}
                onChange={changeActiveMonthValue}
              />

              </>
            )}
            <PreferencesMenu
              currency={currency}
              dataMode={dataMode}
              language={language}
              onCurrencyChange={changeCurrency}
              onDataModeChange={changeDataMode}
              onLanguageChange={changeLanguage}
            />
          </div>
        </header>

        <div className="page-transition" key={view}>
          {isLoading && (
            <EmptyState
              title={t("Cargando datos")}
              copy={
                isDemoMode
                  ? t("Preparando datos ficticios para la demo.")
                  : t("Conectando con el backend local.")
              }
            />
          )}

          {!isLoading && !draft && (
            <EmptyState
              title={t("Sin cierres")}
              copy={t("Ve a Registro para crear el primer mes.")}
            />
          )}

          {!isLoading && draft && summary && (
            <>
            {(view === "dashboard" || view === "analysis" || view === "register") && (
              <div className={`view-period${view === "register" ? " has-actions" : ""}`}>
                <div>
                  <p>
                    {t("Mes")}
                  </p>
                  <div className="view-period-title">
                    <h2>{monthLabel}</h2>
                    {titleTrendValue !== null && (
                      <span
                        className={`title-trend ${getSavingsClass(titleTrendValue)}`}
                        title={formatSignedCurrency(titleTrendValue, locale, currency)}
                        aria-label={`${t("Ahorro operativo")} ${formatSignedCurrency(titleTrendValue, locale, currency)}`}
                      >
                        <AppIcon icon={titleTrendIcon} size={14} />
                      </span>
                    )}
                  </div>
                </div>
                {view === "register" && (
                  <div className="view-period-actions">
                    {!canEditMonth && (
                      <button
                        className="button secondary icon-only action-edit"
                        type="button"
                        onClick={startMonthEdit}
                        aria-label={t("Editar mes")}
                        title={t("Editar mes")}
                      >
                        <AppIcon icon={faPen} size={14} />
                      </button>
                    )}
                    {canEditMonth && (
                      <button
                        className="button secondary icon-only action-cancel"
                        type="button"
                        onClick={cancelMonthEdit}
                        disabled={isSaving}
                        aria-label={t("Cancelar edición")}
                        title={t("Cancelar edición")}
                      >
                        <AppIcon icon={faRotateLeft} size={14} />
                      </button>
                    )}
                    <button
                      className="button secondary icon-only action-add"
                      type="button"
                      onClick={createNewMonth}
                      aria-label={t("Nuevo mes")}
                      title={t("Nuevo mes")}
                    >
                      <AppIcon icon={faPlus} size={14} />
                    </button>
                    <button
                      className="button primary icon-only action-save"
                      type="button"
                      onClick={saveMonth}
                      disabled={
                        !draft ||
                        isSaving ||
                        (!isDirty && !isCommitmentsDirty) ||
                        !canEditMonth
                      }
                      aria-label={isSaving ? t("Guardando mes") : t("Guardar mes")}
                      title={isSaving ? t("Guardando mes") : t("Guardar mes")}
                    >
                      <AppIcon icon={faFloppyDisk} size={14} />
                    </button>
                    <button
                      className="button danger ghost icon-only action-delete"
                      type="button"
                      onClick={() => draft && setDeleteTarget(cloneMonth(draft))}
                      disabled={!draft || isSaving || canEditMonth}
                      aria-label={t("Borrar mes")}
                      title={t("Borrar mes")}
                    >
                      <AppIcon icon={faTrash} size={14} />
                    </button>
                  </div>
                )}
              </div>
            )}
            {view === "dashboard" && (
              <>
                <section className="hero-grid" aria-label={t("Resumen mensual")}>
                  <article className={`hero-panel ${getSavingsClass(summary.savings)}`}>
                    <div className="panel-overline">
                      <span>{t("Patrimonio neto")}</span>
                      <AppIcon icon={faWallet} size={16} />
                    </div>
                    <h2>{formatCurrency(summary.netWorth, locale, currency)}</h2>
                    <div className="hero-meta">
                      <span>
                        {previousMonth && previousMonthSavings !== null
                          ? `${t("Ahorro vs {month}", {
                              month: formatMonthName(previousMonth.month, locale).replace(
                                /\s+\d{4}$/,
                                "",
                              ),
                            })}`
                          : t("Sin ahorro anterior comparable")}
                      </span>
                      <strong className={getSavingsClass(savingsComparison)}>
                        {formatSignedCurrency(savingsComparison, locale, currency)}
                      </strong>
                    </div>
                  </article>

                  <div className="metrics-grid">
                    <SummaryMetric
                      detail={`${formatSavingRate(summary.savingRate, locale)} ${t("de ingresos")}`}
                      icon={<AppIcon icon={faPiggyBank} size={16} />}
                      label={t("Ahorro operativo")}
                      tone={savingsTone}
                      value={formatSignedCurrency(summary.savings, locale, currency)}
                      valueClassName={getSavingsClass(summary.savings)}
                    />
                    <SummaryMetric
                      detail={
                        forecastFutureCommitmentTotal > 0
                          ? t("Tras previstos {year}: {value}", {
                              year: forecastYear,
                              value: formatCurrency(
                                summary.liquidTotal - forecastFutureCommitmentTotal,
                                locale,
                                currency,
                              ),
                            })
                          : t("Cuentas y efectivo")
                      }
                      icon={<AppIcon icon={faMoneyBills} size={16} />}
                      label={t("Liquidez")}
                      tone="blue"
                      value={formatCurrency(summary.liquidTotal, locale, currency)}
                    />
                    <SummaryMetric
                      detail={t("Deudas a tu favor")}
                      icon={<AppIcon icon={faArrowUp} size={15} />}
                      label={t("A cobrar")}
                      tone="positive"
                      value={formatCurrency(summary.receivableTotal, locale, currency)}
                      valueClassName={getSavingsClass(summary.receivableTotal)}
                    />
                    <SummaryMetric
                      detail={t("Ingresos menos ahorro")}
                      icon={<AppIcon icon={faArrowDown} size={15} />}
                      label={t("Gasto estimado")}
                      tone="amber"
                      value={formatCurrency(summary.estimatedSpending, locale, currency)}
                      valueClassName={getSavingsClass(
                        summary.estimatedSpending === null
                          ? null
                          : -summary.estimatedSpending,
                      )}
                    />
                  </div>
                </section>

                <section
                  className="hero-planned-expenses dashboard-planned-expenses"
                  aria-label={t("Gastos previstos de {year}", { year: forecastYear })}
                >
                  <div className="dashboard-planned-summary">
                    <div className="hero-planned-heading">
                      <span>
                        {t("Gastos previstos · {year}", { year: forecastYear })}
                      </span>
                    </div>
                    <strong className="hero-planned-total">
                      {formatCurrency(forecastFutureCommitmentTotal, locale, currency)}
                    </strong>
                  </div>
                  <span className="dashboard-planned-icon" aria-hidden="true">
                    <AppIcon icon={faCalendarDays} size={16} />
                  </span>
                  {forecastYearCommitments.length > 0 ? (
                    <div className="hero-planned-list">
                      {forecastYearCommitments.map((commitment) => (
                        <span
                          className={`hero-planned-item ${
                            commitment.status === "committed"
                              ? "is-committed"
                              : ""
                          }`}
                          key={commitment.id}
                          title={
                            commitment.status === "committed"
                              ? t("Compromiso contratado")
                              : t("Gasto previsto")
                          }
                        >
                          <b>{commitment.name}</b>
                          <small>
                            {formatShortMonthYear(commitment.targetMonth ?? "", locale)} ·{" "}
                            {formatCurrency(commitment.amount, locale, currency)}
                          </small>
                        </span>
                      ))}
                    </div>
                  ) : (
                    <small className="hero-planned-empty">
                      {t("Sin gastos previstos para este año")}
                    </small>
                  )}
                </section>
              </>
            )}

            {view === "evolution" && (
              <section className="zone-panel page-panel evolution-panel" aria-label={t("Evolución mes a mes")}>
                <SectionHeader
                  eyebrow="Periodo"
                  title={`${formatMonthName(evolutionStartMonth, locale)} — ${formatMonthName(evolutionEndMonth, locale)}`}
                  icon={<AppIcon icon={faChartLine} size={17} />}
                />
                <div className="evolution-toolbar">
                  <div
                    className="evolution-range"
                    role="group"
                    aria-label={t("Rango de meses del gráfico")}
                  >
                    <MonthYearSelect
                      label={t("Desde")}
                      value={evolutionStartMonth}
                      years={monthPickerYears}
                      onChange={(month) => {
                        setEvolutionRangeMode("custom");
                        setEvolutionStart(month);

                        if (month > evolutionEndMonth) {
                          setEvolutionEnd(month);
                        }
                      }}
                    />

                    <MonthYearSelect
                      label={t("Hasta")}
                      value={evolutionEndMonth}
                      years={monthPickerYears}
                      onChange={(month) => {
                        setEvolutionRangeMode("custom");
                        setEvolutionEnd(month);

                        if (month < evolutionStartMonth) {
                          setEvolutionStart(month);
                        }
                      }}
                    />
                  </div>

                  <div className="evolution-toolbar-actions">
                    <div className="chart-metric-control">
                      <span>{t("Dato del gráfico")}</span>
                      <div className="range-mode" aria-label={t("Dato del gráfico")}>
                        {EVOLUTION_METRICS.map((metric) => {
                          const Icon = metric.icon;
                          const isActive = evolutionMetric === metric.id;

                          return (
                            <button
                              className={`range-mode-button ${
                                isActive ? "is-active" : ""
                              }`}
                              type="button"
                              aria-pressed={isActive}
                              key={metric.id}
                              aria-label={t(metric.label)}
                              title={t(metric.label)}
                              onClick={() => setEvolutionMetric(metric.id)}
                            >
                              <AppIcon icon={Icon} size={14} />
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    <div className="chart-range-control">
                      <span>{t("Modo de rango")}</span>
                      <div className="range-mode" aria-label={t("Modo de rango")}>
                        <button
                          className={`range-mode-button ${
                            isRecentEvolutionHistory ? "is-active" : ""
                          }`}
                          type="button"
                          aria-pressed={isRecentEvolutionHistory}
                          aria-label={t("Últimos 12 meses")}
                          title={t("Últimos 12 meses")}
                          onClick={() => {
                            setEvolutionRangeMode("recent");
                            setEvolutionStart("");
                            setEvolutionEnd("");
                          }}
                        >
                          <AppIcon icon={faCalendarDays} size={14} />
                        </button>
                        <button
                          className={`range-mode-button ${
                            isFullEvolutionHistory ? "is-active" : ""
                          }`}
                          type="button"
                          aria-pressed={isFullEvolutionHistory}
                          aria-label={t("Todo el histórico")}
                          title={t("Todo el histórico")}
                          onClick={() => {
                            setEvolutionRangeMode("all");
                            setEvolutionStart("");
                            setEvolutionEnd("");
                          }}
                        >
                          <AppIcon icon={faCalendar} size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
                <EvolutionChart metric={evolutionMetric} points={evolutionHistory} />
              </section>
            )}

            {view === "forecast" && (
              <ForecastPanel
                forecast={forecast}
                futureCommitmentTotal={forecastFutureCommitmentTotal}
                futureCommitmentYear={forecastYear}
                nonAccumulableTotal={goalNonAccumulableTotal}
              />
            )}

            {view === "analysis" && (
              <MonthAnalysisPanel
                futureCommitments={futureCommitments}
                history={history}
                month={draft}
                previousMonth={previousMonth}
                summary={summary}
              />
            )}

            {view === "goal" && (
              <AnnualGoalPanel
                annualProgress={annualProgress}
                canEdit
                goalYearOptions={goalYearOptions}
                goalDraft={goalDraft}
                isEditing={isGoalEditing}
                isGoalDirty={isGoalPersistDirty}
                isGoalSaving={isGoalSaving}
                onAddAllocation={addAllocation}
                onCancel={() => syncGoalForYear(goalDraft.year)}
                onEdit={() => setIsGoalEditing(true)}
                onRemoveAllocation={removeAllocation}
                onReorderAllocation={reorderGoalAllocations}
                onSave={saveAnnualGoal}
                onSelectGoalYear={selectGoalYear}
                onUpdateAllocation={updateAllocation}
                onUpdateGoal={updateGoal}
              />
            )}

            {view === "export" && (
              <section className="ledger-grid data-ledger-grid" aria-label={t("Gestión de datos")}>
                <section className="zone-panel export-panel" aria-label={t("Informe")}>
                  <SectionHeader
                    eyebrow="Informe"
                    title="Informe en Excel"
                    icon={<AppIcon icon={faFileExcel} size={17} />}
                  />

                  <div className="export-controls">
                    <div className="data-range-fields">
                      <MonthYearSelect
                        label={t("Desde")}
                        value={exportStartMonth}
                        years={monthPickerYears}
                        onChange={(month) => {
                          setExportStart(month);

                          if (month > exportEndMonth) {
                            setExportEnd(month);
                          }
                        }}
                      />
                      <MonthYearSelect
                        label={t("Hasta")}
                        value={exportEndMonth}
                        years={monthPickerYears}
                        onChange={(month) => {
                          setExportEnd(month);

                          if (month < exportStartMonth) {
                            setExportStart(month);
                          }
                        }}
                      />
                    </div>
                    <a
                      className="button primary icon-only action-export"
                      href={exportUrl}
                      download
                      aria-label={t("Descargar Excel")}
                      title={t("Descargar Excel")}
                    >
                      <AppIcon icon={faFileExport} size={15} />
                    </a>
                  </div>
                </section>

                <section className="zone-panel backup-panel" aria-label={t("Copia de seguridad")}>
                  <SectionHeader
                    eyebrow="Copia de seguridad"
                    title="Importar o exportar todos tus datos"
                    icon={<AppIcon icon={faDatabase} size={17} />}
                  />
                  <div className="export-controls backup-controls">
                    <div className="data-range-fields">
                      <MonthYearSelect
                        disabled
                        emptyLabel={t("Sin datos")}
                        label={t("Desde")}
                        value={history[0]?.month.month ?? ""}
                        years={monthPickerYears}
                        onChange={() => undefined}
                      />
                      <MonthYearSelect
                        disabled
                        emptyLabel={t("Sin datos")}
                        label={t("Hasta")}
                        value={history.at(-1)?.month.month ?? ""}
                        years={monthPickerYears}
                        onChange={() => undefined}
                      />
                    </div>
                    <div className="data-transfer-actions">
                      <a
                        className="button secondary icon-only data-transfer-export action-export"
                        href="/api/data"
                        download
                        aria-label={t("Exportar JSON")}
                        title={t("Exportar JSON")}
                      >
                        <AppIcon icon={faDownload} size={14} />
                      </a>
                      <button
                        className="button secondary icon-only data-transfer-import action-import"
                        type="button"
                        disabled={isImporting}
                        onClick={() => importFileInputRef.current?.click()}
                        aria-label={isImporting ? t("Importando…") : t("Importar JSON")}
                        title={isImporting ? t("Importando…") : t("Importar JSON")}
                      >
                        <AppIcon icon={faUpload} size={14} />
                      </button>
                    </div>
                  </div>
                  <input
                    ref={importFileInputRef}
                    className="data-transfer-file-input"
                    type="file"
                    accept="application/json,.json"
                    onChange={handleImportFile}
                  />
                  {dataTransferMessage && (
                    <p
                      className={`data-transfer-status is-${dataTransferStatus ?? "error"}`}
                      role="status"
                    >
                      {dataTransferMessage}
                    </p>
                  )}
                </section>
              </section>
            )}

            {view === "register" && (
              <section
                className={`ledger-grid${canEditMonth ? "" : " is-readonly"}`}
                aria-label={t("Registro mensual")}
              >
                <section className="zone-panel accounts-panel">
                  <SectionHeader
                    eyebrow={t("Saldos")}
                    icon={
                      <button
                        className="icon-button action-add"
                        type="button"
                        onClick={addAccount}
                        disabled={!canEditMonth}
                        aria-label={t("Añadir cuenta")}
                        title={t("Añadir cuenta")}
                      >
                        <AppIcon icon={faPlus} size={14} />
                      </button>
                    }
                    title={t("Cuentas bancarias")}
                  />

                  <div className="rows">
                    {draft.accounts.map((account) => (
                      <AccountRow
                        account={account}
                        disabled={!canEditMonth}
                        key={account.id}
                        onBalanceChange={updateAccountBalance}
                        onNameChange={updateAccountName}
                        onReorder={(draggedId, targetId) =>
                          reorderDraftCollection("accounts", draggedId, targetId)
                        }
                        onRemove={(id) => requestDeleteItem("account", id)}
                      />
                    ))}
                  </div>
                </section>

                <IncomePanel
                  disabled={!canEditMonth}
                  entries={draft.incomeEntries}
                  onAdd={addIncomeEntry}
                  onAmountChange={updateIncomeAmount}
                  onNameChange={updateIncomeName}
                  onReorder={(draggedId, targetId) =>
                    reorderDraftCollection("incomeEntries", draggedId, targetId)
                  }
                  onRemove={(id) => requestDeleteItem("income", id)}
                  total={draft.income}
                />

                <CashPanel
                  disabled={!canEditMonth}
                  entries={draft.cashEntries}
                  onAdd={addCashEntry}
                  onAmountChange={updateCashAmount}
                  onNameChange={updateCashName}
                  onReorder={(draggedId, targetId) =>
                    reorderDraftCollection("cashEntries", draggedId, targetId)
                  }
                  onRemove={(id) => requestDeleteItem("cash", id)}
                  total={draft.cash}
                />

                <DebtPanel
                  entries={draft.receivables}
                  group="receivables"
                  icon={<AppIcon icon={faArrowUp} size={16} />}
                  onAdd={addEntry}
                  onAmountChange={updateEntryAmount}
                  onNameChange={updateEntryName}
                  onReorder={(draggedId, targetId) =>
                    reorderDraftCollection("receivables", draggedId, targetId)
                  }
                  onRemove={(group, id) => requestDeleteItem(group, id)}
                  disabled={!canEditMonth}
                  title={t("Me deben")}
                  total={summary.receivableTotal}
                />

                <DebtPanel
                  entries={draft.payables}
                  group="payables"
                  icon={<AppIcon icon={faArrowDown} size={16} />}
                  onAdd={addEntry}
                  onAmountChange={updateEntryAmount}
                  onNameChange={updateEntryName}
                  onReorder={(draggedId, targetId) =>
                    reorderDraftCollection("payables", draggedId, targetId)
                  }
                  onRemove={(group, id) => requestDeleteItem(group, id)}
                  disabled={!canEditMonth}
                  title={t("Debo")}
                  total={summary.payableTotal}
                />

                <FutureCommitmentsPanel
                  commitments={futureCommitments}
                  disabled={!canEditMonth}
                  liquidTotal={summary.liquidTotal}
                  years={monthPickerYears}
                  onAdd={addFutureCommitment}
                  onAmountChange={(id, amount) =>
                    updateFutureCommitment(id, { amount })
                  }
                  onConvert={convertFutureCommitment}
                  onNameChange={(id, name) =>
                    updateFutureCommitment(id, { name })
                  }
                  onRemove={(id) => requestDeleteItem("commitment", id)}
                  onReorder={reorderFutureCommitments}
                  onStatusChange={(id, status) =>
                    updateFutureCommitment(id, { status })
                  }
                  onTargetMonthChange={(id, targetMonth) =>
                    updateFutureCommitment(id, {
                      targetMonth: targetMonth || undefined,
                    })
                  }
                  total={futureCommitmentTotal}
                />

                <AdjustmentPanel
                  adjustments={draft.adjustments}
                  disabled={!canEditMonth}
                  onAdd={addAdjustment}
                  onAmountChange={updateAdjustmentAmount}
                  onNameChange={updateAdjustmentName}
                  onReorder={(draggedId, targetId) =>
                    reorderDraftCollection("adjustments", draggedId, targetId)
                  }
                  onRemove={(id) => requestDeleteItem("adjustment", id)}
                  total={summary.adjustmentTotal}
                />

                <section className="zone-panel notes-panel">
                  <SectionHeader
                    eyebrow={t("Cierre")}
                    icon={<AppIcon icon={faNoteSticky} size={17} />}
                    title={t("Notas del mes")}
                  />
                  <textarea
                    value={draft.notes ?? ""}
                    disabled={!canEditMonth}
                    onChange={(event) =>
                      updateDraft((current) => ({
                        ...current,
                        notes: event.target.value,
                      }))
                    }
                    placeholder={t("Hipoteca, vacaciones, compras grandes...")}
                  />
                </section>
              </section>
            )}
            </>
          )}
        </div>
      </section>

      {view === "register" && deleteTarget && (
        <DeleteMonthDialog
          confirmation={deleteConfirmation}
          isDeleting={isSaving}
          month={deleteTarget}
          onCancel={() => {
            setDeleteTarget(null);
            setDeleteConfirmation("");
          }}
          onChangeConfirmation={setDeleteConfirmation}
          onConfirm={confirmDeleteMonth}
        />
      )}
      {view === "register" && deleteItemTarget && (
        <DeleteItemDialog
          item={deleteItemTarget}
          onCancel={() => setDeleteItemTarget(null)}
          onConfirm={confirmDeleteItem}
        />
      )}
      {pendingImportFile && (
        <ImportDataDialog
          fileName={pendingImportFile.name}
          onCancel={() => setPendingImportFile(null)}
          onConfirm={() => {
            const file = pendingImportFile;
            setPendingImportFile(null);
            void importHomeflowData(file);
          }}
        />
      )}
      </main>
    </I18nContext.Provider>
  );
}

function SectionHeader({
  eyebrow,
  icon,
  title,
}: {
  eyebrow: string;
  icon: ReactNode;
  title: string;
}) {
  const { t } = useI18n();

  return (
    <div className="section-heading">
      <div>
        <p>{t(eyebrow)}</p>
        <h2>{t(title)}</h2>
      </div>
      {icon}
    </div>
  );
}

function MonthYearSelect({
  compact = false,
  disabled = false,
  emptyLabel,
  label,
  onChange,
  value,
  years,
}: {
  compact?: boolean;
  disabled?: boolean;
  emptyLabel?: string;
  label: string;
  onChange: (value: string) => void;
  value: string;
  years: number[];
}) {
  const { locale, t } = useI18n();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedYear, selectedMonth] = value.split("-");
  const year = Number(selectedYear) || new Date().getFullYear();
  const month = Number(selectedMonth) || new Date().getMonth() + 1;
  const availableYears = Array.from(
    new Set([...(years.length > 0 ? years : [year]), year]),
  );
  const minYear = Math.min(...availableYears);
  const maxYear = Math.max(...availableYears);
  const displayValue = value
    ? formatShortMonthYear(value, locale)
    : (emptyLabel ?? t("Seleccionar mes"));

  function emit(nextYear: number, nextMonth: number) {
    onChange(`${nextYear}-${String(nextMonth).padStart(2, "0")}`);
  }

  function changeYear(direction: -1 | 1) {
    const nextYear = Math.min(maxYear, Math.max(minYear, year + direction));
    emit(nextYear, month);
  }

  return (
    <fieldset
      className={`month-year-field${compact ? " is-compact" : ""}`}
      onBlur={(event) => {
        const nextFocus = event.relatedTarget;

        if (!(nextFocus instanceof Node) || !event.currentTarget.contains(nextFocus)) {
          setIsOpen(false);
        }
      }}
    >
      {!compact && <legend>{label}</legend>}
      <div className="month-picker">
        <button
          className="month-picker-trigger"
          type="button"
          disabled={disabled}
          aria-expanded={isOpen}
          aria-label={`${label}: ${displayValue}`}
          onClick={() => setIsOpen((current) => !current)}
        >
          {displayValue}
        </button>

        {isOpen && (
          <div className="month-picker-popover" role="dialog" aria-label={label}>
            <div className="month-picker-header">
              <button
                className="month-picker-nav"
                type="button"
                onClick={() => changeYear(-1)}
                disabled={year <= minYear}
                aria-label={t("Año anterior")}
                title={t("Año anterior")}
              >
                <AppIcon icon={faChevronLeft} size={12} />
              </button>
              <strong>{year}</strong>
              <button
                className="month-picker-nav"
                type="button"
                onClick={() => changeYear(1)}
                disabled={year >= maxYear}
                aria-label={t("Año siguiente")}
                title={t("Año siguiente")}
              >
                <AppIcon icon={faChevronRight} size={12} />
              </button>
            </div>

            <div className="month-picker-grid">
              {Array.from({ length: 12 }, (_, index) => index + 1).map((monthNumber) => {
                const monthValue = `${year}-${String(monthNumber).padStart(2, "0")}`;
                const isSelected = monthNumber === month;

                return (
                  <button
                    className={`month-picker-month ${isSelected ? "is-selected" : ""}`}
                    type="button"
                    key={monthNumber}
                    onClick={() => {
                      emit(year, monthNumber);
                      setIsOpen(false);
                    }}
                    aria-label={`${label}: ${formatShortMonthYear(monthValue, locale)}`}
                  >
                    {formatShortMonthName(monthValue, locale)}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </fieldset>
  );
}

function getEvolutionValue(point: HistoryPoint, metric: EvolutionMetric) {
  switch (metric) {
    case "savings":
      return point.summary.savings;
    case "income":
      return point.month.income;
    case "spending":
      return point.summary.estimatedSpending;
    default:
      return point.summary.netWorth;
  }
}

function getEvolutionMetricLabel(metric: EvolutionMetric, t: Translator) {
  return t(EVOLUTION_METRICS.find((item) => item.id === metric)?.label ?? "Dato");
}

function EvolutionChart({
  metric,
  points,
}: {
  metric: EvolutionMetric;
  points: HistoryPoint[];
}) {
  const { currency, locale, t } = useI18n();
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const chartPoints = points
    .map((point) => ({
      point,
      value: getEvolutionValue(point, metric),
    }))
    .filter((item): item is { point: HistoryPoint; value: number } => item.value !== null);
  const metricLabel = getEvolutionMetricLabel(metric, t);

  if (chartPoints.length === 0) {
    return <div className="chart-empty">{t("Sin meses para representar.")}</div>;
  }

  const leftPadding = 90;
  const rightPadding = 34;
  const topPadding = 28;
  const bottomPadding = 42;
  const width = 920;
  const height = 320;
  const values = chartPoints.map((item) => item.value);
  const rawMinValue = Math.min(...values);
  const rawMaxValue = Math.max(...values);
  const rawRange = Math.max(
    rawMaxValue - rawMinValue,
    Math.abs(rawMaxValue) * 0.04,
    100,
  );
  const step = getNiceChartStep(rawRange / 4);
  const minValue = Math.floor((rawMinValue - rawRange * 0.08) / step) * step;
  const maxValue = Math.ceil((rawMaxValue + rawRange * 0.08) / step) * step;
  const range = Math.max(step, maxValue - minValue);
  const tickCount = Math.round(range / step);
  const ticks = Array.from(
    { length: tickCount + 1 },
    (_, index) => maxValue - index * step,
  );
  const plotWidth = width - leftPadding - rightPadding;
  const x = (index: number) =>
    leftPadding + (index * plotWidth) / Math.max(1, chartPoints.length - 1);
  const y = (value: number) =>
    topPadding +
    ((maxValue - value) / range) *
      (height - topPadding - bottomPadding);
  const linePath = chartPoints
    .map(({ value }, index) => `${index === 0 ? "M" : "L"} ${x(index)} ${y(value)}`)
    .join(" ");
  const areaPath = `${linePath} L ${x(chartPoints.length - 1)} ${height - bottomPadding} L ${leftPadding} ${
    height - bottomPadding
  } Z`;
  const hoveredIndex = hoveredId
    ? chartPoints.findIndex((item) => item.point.month.id === hoveredId)
    : -1;
  const hoveredItem = hoveredIndex >= 0 ? chartPoints[hoveredIndex] : null;
  const hoveredPoint = hoveredItem?.point ?? null;
  const hoveredX = hoveredIndex >= 0 ? x(hoveredIndex) : 0;
  const hoveredY = hoveredItem ? y(hoveredItem.value) : 0;
  const tooltipWidth = 224;
  const tooltipLeft = Math.min(
    width - tooltipWidth / 2 - 8,
    Math.max(tooltipWidth / 2 + 8, hoveredX),
  );
  const showTooltipBelow = hoveredY < 150;
  const labelInterval = Math.max(1, Math.ceil(chartPoints.length / 14));
  const dotRadius =
    chartPoints.length > 72 ? 1.8 : chartPoints.length > 36 ? 2.6 : 3.8;

  return (
    <div className="chart-shell">
      <div className="chart-viewport" tabIndex={0}>
        <div className="chart-canvas">
          <svg
            className="evolution-svg"
            viewBox={`0 0 ${width} ${height}`}
            role="img"
          >
            <title>
              {t("Evolución mensual de {metric}", {
                metric: metricLabel.toLocaleLowerCase(locale),
              })}
            </title>
            <defs>
              <linearGradient id="homeflow-area" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="#6759e8" stopOpacity="0.28" />
                <stop offset="58%" stopColor="#168bd2" stopOpacity="0.1" />
                <stop offset="100%" stopColor="#13a89e" stopOpacity="0" />
              </linearGradient>
            </defs>
            {ticks.map((tick) => {
              const gridY = y(tick);

              return (
                <g key={tick}>
                  <text
                    className="chart-axis-label"
                    x={leftPadding - 12}
                    y={gridY + 4}
                  >
                    {formatCurrency(tick, locale, currency)}
                  </text>
                  <line
                    className="chart-gridline"
                    x1={leftPadding}
                    x2={width - rightPadding}
                    y1={gridY}
                    y2={gridY}
                  />
                </g>
              );
            })}
            <path className="chart-area" d={areaPath} />
            <path className="chart-line" d={linePath} />
            {chartPoints.map(({ point, value }, index) => {
              const previousValue = chartPoints[index - 1]?.value ?? value;
              const delta = value - previousValue;
              const dotClass =
                index === 0 || delta === 0
                  ? "is-neutral"
                  : delta > 0
                    ? "is-positive"
                    : "is-negative";

              return (
                <g key={point.month.id}>
                  <circle
                    className={`chart-dot ${dotClass}`}
                    cx={x(index)}
                    cy={y(value)}
                    r={dotRadius}
                  />
                  <circle
                    aria-label={`${formatMonthName(point.month.month, locale)}: ${formatCurrency(value, locale, currency)} ${t("en")} ${metricLabel.toLocaleLowerCase(locale)}`}
                    className="chart-hit-area"
                    cx={x(index)}
                    cy={y(value)}
                    r="10"
                    tabIndex={0}
                    onBlur={() => setHoveredId(null)}
                    onFocus={() => setHoveredId(point.month.id)}
                  />
                  {(index === 0 ||
                    index === chartPoints.length - 1 ||
                    index % labelInterval === 0) && (
                    <text className="chart-label" x={x(index)} y={height - 10}>
                      {point.month.month.slice(5)}/{point.month.month.slice(2, 4)}
                    </text>
                  )}
                </g>
              );
            })}
            <rect
              className="chart-hover-layer"
              x={leftPadding}
              y={topPadding}
              width={plotWidth}
              height={height - topPadding - bottomPadding}
              onPointerLeave={() => setHoveredId(null)}
              onPointerMove={(event) => {
                const svg = event.currentTarget.ownerSVGElement;

                if (!svg) return;

                const bounds = svg.getBoundingClientRect();
                const pointerX =
                  ((event.clientX - bounds.left) / bounds.width) * width;
                const position = Math.max(
                  0,
                  Math.min(1, (pointerX - leftPadding) / plotWidth),
                );
                const index = Math.round(position * (chartPoints.length - 1));
                setHoveredId(chartPoints[index].point.month.id);
              }}
            />
          </svg>

          {hoveredPoint && (
            <div
              className={`chart-tooltip ${showTooltipBelow ? "is-below" : ""}`}
              style={{
                left: `${(tooltipLeft / width) * 100}%`,
                top: `${((showTooltipBelow ? hoveredY + 18 : hoveredY - 18) / height) * 100}%`,
              }}
            >
              <strong>{formatMonthName(hoveredPoint.month.month, locale)}</strong>
              <dl>
                <div>
                  <dt>{metricLabel}</dt>
                  <dd
                    className={getSavingsClass(
                      metric === "netWorth" || metric === "income"
                        ? null
                        : hoveredItem?.value ?? null,
                    )}
                  >
                    {formatCurrency(hoveredItem?.value ?? null, locale, currency)}
                  </dd>
                </div>
                <div>
                  <dt>{t("Patrimonio")}</dt>
                  <dd>{formatCurrency(hoveredPoint.summary.netWorth, locale, currency)}</dd>
                </div>
                <div>
                  <dt>{t("Ahorro")}</dt>
                  <dd className={getSavingsClass(hoveredPoint.summary.savings)}>
                    {formatSignedCurrency(hoveredPoint.summary.savings, locale, currency)}
                  </dd>
                </div>
                <div>
                  <dt>{t("Liquidez")}</dt>
                  <dd>{formatCurrency(hoveredPoint.summary.liquidTotal, locale, currency)}</dd>
                </div>
                <div>
                  <dt>{t("Ingresos")}</dt>
                  <dd>{formatCurrency(hoveredPoint.month.income, locale, currency)}</dd>
                </div>
                <div>
                  <dt>{t("Gasto estimado")}</dt>
                  <dd
                    className={getSavingsClass(
                      hoveredPoint.summary.estimatedSpending === null
                        ? null
                        : -hoveredPoint.summary.estimatedSpending,
                    )}
                  >
                    {formatCurrency(hoveredPoint.summary.estimatedSpending, locale, currency)}
                  </dd>
                </div>
              </dl>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ForecastPanel({
  forecast,
  futureCommitmentTotal,
  futureCommitmentYear,
  nonAccumulableTotal,
}: {
  forecast: ForecastModel | null;
  futureCommitmentTotal: number;
  futureCommitmentYear: number;
  nonAccumulableTotal: number;
}) {
  const { currency, locale, t } = useI18n();
  const monthLabels = forecast?.scenarios[0]?.monthSavings.map((item) => item.label) ?? [];
  const forecastColumnWidth = 96;
  const tableMinWidth = Math.max(
    620,
    (monthLabels.length + 2) * forecastColumnWidth,
  );
  const statsRows = forecast?.stats
    ? [
        {
          label: t("Media"),
          total: forecast.stats.estimatedTotal.average,
          accumulable: forecast.stats.estimatedTotal.average - nonAccumulableTotal,
          afterCommitments:
            forecast.stats.estimatedTotal.average -
            nonAccumulableTotal -
            futureCommitmentTotal,
        },
        {
          label: t("Mínimo"),
          total: forecast.stats.estimatedTotal.min,
          accumulable: forecast.stats.estimatedTotal.min - nonAccumulableTotal,
          afterCommitments:
            forecast.stats.estimatedTotal.min -
            nonAccumulableTotal -
            futureCommitmentTotal,
        },
        {
          label: t("Máximo"),
          total: forecast.stats.estimatedTotal.max,
          accumulable: forecast.stats.estimatedTotal.max - nonAccumulableTotal,
          afterCommitments:
            forecast.stats.estimatedTotal.max -
            nonAccumulableTotal -
            futureCommitmentTotal,
        },
      ]
    : [];

  return (
    <section className="zone-panel forecast-panel" aria-label={t("Previsión")}>
      {!forecast || forecast.scenarios.length === 0 ? (
        <div className="chart-empty">
          {forecast && Number(forecast.basePoint.month.month.slice(5)) === 12
            ? t("En diciembre no hay meses futuros que estimar.")
            : t("No hay ahorro histórico útil para calcular la previsión.")}
        </div>
      ) : (
        <>
          <SectionHeader
            eyebrow="Histórico de referencia"
            title="Ahorro mensual por año"
            icon={<AppIcon icon={faCalendarDays} size={17} />}
          />

          <div className="forecast-base-strip">
            <span>{t("Base")}</span>
            <strong>{formatCurrency(forecast.baseNetWorth, locale, currency)}</strong>
          </div>

          <div className="forecast-table-wrap">
            <table className="forecast-table" style={{ minWidth: tableMinWidth }}>
              <colgroup>
                <col className="forecast-year-col" />
                {monthLabels.map((label) => (
                  <col className="forecast-month-col" key={`col-${label}`} />
                ))}
                <col className="forecast-estimate-col" />
              </colgroup>
              <thead>
                <tr>
                  <th className="forecast-year-cell">{t("Año")}</th>
                  {monthLabels.map((label) => (
                    <th className="forecast-month-cell" key={label}>
                      {label}
                    </th>
                  ))}
                  <th className="forecast-estimate-cell">{t("Estimación")}</th>
                </tr>
              </thead>
              <tbody>
                {forecast.scenarios.map((scenario) => (
                  <tr key={scenario.year}>
                    <th className="forecast-year-cell">{scenario.year}</th>
                    {scenario.monthSavings.map((item) => (
                      <td
                        className={`forecast-month-cell ${getSavingsClass(item.value)}`}
                        key={`${scenario.year}-${item.label}`}
                      >
                        {formatSignedCurrency(item.value, locale, currency)}
                      </td>
                    ))}
                    <td className="forecast-estimate-cell">
                      {formatCurrency(scenario.estimatedTotal, locale, currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <section className="forecast-summary-panel" aria-label={t("Resumen de estimación")}>
            <SectionHeader
              eyebrow="Escenarios de cierre"
              title="Posibles escenarios"
              icon={<AppIcon icon={faChartLine} size={17} />}
            />
            <div className="forecast-summary-grid">
              {statsRows.map((row) => (
                <div className="forecast-summary-item" key={row.label}>
                  <span>{row.label}</span>
                  <strong>{formatCurrency(row.total, locale, currency)}</strong>
                  <small>{t("Acumulable: {value}", { value: formatCurrency(row.accumulable, locale, currency) })}</small>
                  <small>
                    {t("Tras compromisos {year}: {value}", {
                      year: futureCommitmentYear,
                      value: formatCurrency(row.afterCommitments, locale, currency),
                    })}
                  </small>
                </div>
              ))}
            </div>
          </section>
        </>
      )}
    </section>
  );
}

function MonthAnalysisPanel({
  futureCommitments,
  history,
  month,
  previousMonth,
  summary,
}: {
  futureCommitments: FutureCommitment[];
  history: HistoryPoint[];
  month: HomeflowMonth;
  previousMonth: HomeflowMonth | null;
  summary: MonthSummary;
}) {
  const { currency, locale, t } = useI18n();
  const pendingBalance = summary.receivableTotal - summary.payableTotal;
  const sortedAccounts = [...month.accounts].sort((a, b) => b.balance - a.balance);
  const sortedIncomeEntries = [...month.incomeEntries].sort(
    (a, b) => b.amount - a.amount,
  );
  const sortedCashEntries = [...month.cashEntries].sort((a, b) => b.amount - a.amount);
  const sortedReceivables = [...month.receivables].sort((a, b) => b.amount - a.amount);
  const sortedPayables = [...month.payables].sort((a, b) => b.amount - a.amount);
  const sortedFutureCommitments = [...futureCommitments].sort(
    (a, b) => b.amount - a.amount,
  );
  const futureCommitmentTotal = futureCommitments.reduce(
    (total, commitment) => total + commitment.amount,
    0,
  );
  const sortedAdjustments = [...month.adjustments].sort(
    (a, b) => Math.abs(b.amount) - Math.abs(a.amount),
  );
  const previousSummary = previousMonth ? calculateBaseSummary(previousMonth) : null;
  const accountDelta =
    previousSummary === null ? null : summary.accountTotal - previousSummary.accountTotal;
  const notes = month.notes?.trim();
  const pendingTone =
    pendingBalance === 0 ? "is-neutral" : pendingBalance > 0 ? "is-positive" : "is-negative";
  const historicalComparison = buildHistoricalComparison(month, summary, history);
  const historicalSampleLabel = historicalComparison
    ? historicalComparison.samples === 1
      ? t("1 cierre anterior de {month}", {
          month: formatShortMonthName(month.month, locale),
        })
      : t("{count} cierres anteriores de {month}", {
          count: historicalComparison.samples,
          month: formatShortMonthName(month.month, locale),
        })
    : null;
  const historicalMetricLabels: Record<HistoricalComparisonMetric["id"], string> = {
    income: t("Ingresos"),
    savingRate: t("Ahorro sobre ingresos"),
    savings: t("Ahorro operativo"),
    spending: t("Gasto estimado"),
  };

  return (
    <section className="zone-panel analysis-panel" aria-label={t("Análisis del mes")}>
      <div className="analysis-note">
        <div className="analysis-note-heading">
          <span>{t("Notas del mes")}</span>
          <AppIcon icon={faNoteSticky} size={16} />
        </div>
        <p>{notes || t("Sin notas introducidas.")}</p>
      </div>

      {historicalComparison && historicalSampleLabel && (
        <section
          className="analysis-historical"
          aria-label={t("Comparación histórica")}
        >
          <header className="analysis-historical-heading">
            <div>
              <span>{t("Comparación histórica")}</span>
              <p>{historicalSampleLabel}</p>
            </div>
            <AppIcon icon={faCalendarDays} size={17} />
          </header>
          <div className="analysis-historical-grid">
            {historicalComparison.metrics.map((metric) => {
              const isRate = metric.id === "savingRate";
              const formatValue = (value: number) =>
                isRate
                  ? formatSavingRate(value, locale)
                  : formatCurrency(value, locale, currency);
              const formatDifference = (value: number) =>
                isRate
                  ? `${value > 0 ? "+" : ""}${Math.round(value * 100)} pp`
                  : formatSignedCurrency(value, locale, currency);
              const statusLabel =
                metric.status === "above"
                  ? t("Por encima de la media")
                  : metric.status === "below"
                    ? t("Por debajo de la media")
                    : t("Cerca de la media");
              const statusIcon =
                metric.status === "above"
                  ? faArrowUp
                  : metric.status === "below"
                    ? faArrowDown
                    : faEquals;

              return (
                <article
                  className={`analysis-historical-card is-${metric.status}`}
                  key={metric.id}
                >
                  <span>{historicalMetricLabels[metric.id]}</span>
                  <strong>{formatValue(metric.current)}</strong>
                  <small>
                    {t("Media histórica")}: {formatValue(metric.average)}
                  </small>
                  <div className="analysis-historical-status">
                    <AppIcon icon={statusIcon} size={12} />
                    <span>{statusLabel}</span>
                    <em>{formatDifference(metric.difference)}</em>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      )}

      <div className="analysis-groups">
        <AnalysisGroup title={t("Patrimonio")} columns={2} icon={faWallet}>
          <AnalysisTile
            label={t("Patrimonio")}
            tooltip={t("Liquidez más lo que te deben, menos lo que debes.")}
            value={formatCurrency(summary.netWorth, locale, currency)}
          />
          <AnalysisTile
            label={t("Liquidez")}
            tooltip={t("Suma de cuentas bancarias y efectivo.")}
            value={formatCurrency(summary.liquidTotal, locale, currency)}
          />
        </AnalysisGroup>

        <AnalysisGroup title={t("Ahorro")} columns={3} icon={faPiggyBank}>
          <AnalysisTile
            label={t("Ahorro operativo")}
            tooltip={t("Ahorro real del mes más ajustes patrimoniales no operativos.")}
            value={formatSignedCurrency(summary.savings, locale, currency)}
            valueClassName={getSavingsClass(summary.savings)}
          />
          <AnalysisTile
            label={t("Ahorro real")}
            tooltip={t("Cambio directo del patrimonio frente al mes anterior, sin corregir ajustes.")}
            value={formatSignedCurrency(summary.realSavings, locale, currency)}
            valueClassName={getSavingsClass(summary.realSavings)}
          />
          <AnalysisTile
            label={t("Ajustes")}
            tooltip={t("Movimientos no operativos que se suman al ahorro real para no falsear el mes.")}
            value={formatSignedCurrency(summary.adjustmentTotal, locale, currency)}
            valueClassName={getSavingsClass(summary.adjustmentTotal)}
          />
        </AnalysisGroup>

        <AnalysisGroup title={t("Actividad")} columns={3} icon={faChartLine}>
          <AnalysisTile
            label={t("Ingresos")}
            tooltip={t("Importe ingresado en la ficha del mes.")}
            value={formatCurrency(month.income, locale, currency)}
          />
          <AnalysisTile
            label={t("Gasto estimado")}
            tooltip={t("Ingresos menos ahorro operativo. Es una aproximación del gasto ordinario.")}
            value={formatCurrency(summary.estimatedSpending, locale, currency)}
            valueClassName={getSavingsClass(
              summary.estimatedSpending === null ? null : -summary.estimatedSpending,
            )}
          />
          <AnalysisTile
            label={t("Ahorro sobre ingresos")}
            tooltip={t("Porcentaje de los ingresos que se ha convertido en ahorro.")}
            value={formatSavingRate(summary.savingRate, locale)}
          />
        </AnalysisGroup>

        <AnalysisGroup
          title={t("Pendientes y previsiones")}
          columns={3}
          icon={faClock}
        >
          <AnalysisTile
            label={t("Pendiente neto")}
            tooltip={t("Lo que te deben menos lo que debes. Puede ser positivo o negativo.")}
            value={formatSignedCurrency(pendingBalance, locale, currency)}
            valueClassName={pendingTone}
          />
          <AnalysisTile
            label={t("Compromisos futuros")}
            tooltip={t("Importes previstos o contratados que se muestran como referencia, sin alterar el ahorro ni el gasto del mes.")}
            value={formatCurrency(futureCommitmentTotal, locale, currency)}
          />
          <AnalysisTile
            label={t("Variación en cuentas")}
            tooltip={t("Cambio del saldo total en cuentas bancarias frente al mes anterior.")}
            value={formatSignedCurrency(accountDelta, locale, currency)}
            valueClassName={getSavingsClass(accountDelta)}
          />
        </AnalysisGroup>
      </div>

      <div className="analysis-detail-grid">
        <AnalysisList
          density="large"
          emptyText={t("Sin ingresos introducidos.")}
          items={sortedIncomeEntries.map((entry) => ({
            id: entry.id,
            label: entry.name,
            value: formatCurrency(entry.amount, locale, currency),
          }))}
          title={t("Ingresos")}
          total={formatCurrency(month.income, locale, currency)}
        />
        <AnalysisList
          density="large"
          emptyText={t("Sin efectivo introducido.")}
          items={sortedCashEntries.map((entry) => ({
            id: entry.id,
            label: entry.name,
            value: formatCurrency(entry.amount, locale, currency),
          }))}
          title={t("Efectivo")}
          total={formatCurrency(month.cash, locale, currency)}
        />
        <AnalysisList
          density="large"
          className="analysis-detail-accounts"
          emptyText={t("Sin cuentas introducidas.")}
          items={sortedAccounts.map((account) => ({
            id: account.id,
            label: account.name,
            value: formatCurrency(account.balance, locale, currency),
          }))}
          title={t("Cuentas")}
          total={formatCurrency(summary.accountTotal, locale, currency)}
        />
        <div className="analysis-pending-group">
          <AnalysisList
            density="large"
            emptyText={t("Sin cobros pendientes.")}
            items={sortedReceivables.map((entry) => ({
              id: entry.id,
              label: entry.name,
              value: formatCurrency(entry.amount, locale, currency),
            }))}
            title={t("Me deben")}
            total={formatCurrency(summary.receivableTotal, locale, currency)}
          />
          <AnalysisList
            density="large"
            emptyText={t("Sin pagos pendientes.")}
            items={sortedPayables.map((entry) => ({
              id: entry.id,
              label: entry.name,
              value: formatCurrency(entry.amount, locale, currency),
            }))}
            title={t("Debo")}
            total={formatCurrency(summary.payableTotal, locale, currency)}
          />
        </div>
        <AnalysisList
          density="large"
          emptyText={t("Sin compromisos futuros.")}
          items={sortedFutureCommitments.map((commitment) => ({
            id: commitment.id,
            label: `${commitment.name} · ${
              commitment.status === "committed" ? t("Contratado") : t("Previsto")
            }${
              commitment.targetMonth
                ? ` · ${formatShortMonthYear(commitment.targetMonth, locale)}`
                : ""
            }`,
            value: formatCurrency(commitment.amount, locale, currency),
          }))}
          title={t("Compromisos futuros")}
          total={formatCurrency(futureCommitmentTotal, locale, currency)}
        />
        <AnalysisList
          density="compact"
          className="analysis-detail-adjustments"
          emptyText={`${t("Sin ajustes patrimoniales")}.`}
          items={sortedAdjustments.map((entry) => ({
            id: entry.id,
            label: entry.name,
            value: formatSignedCurrency(entry.amount, locale, currency),
          }))}
          title={t("Ajustes")}
          total={formatSignedCurrency(summary.adjustmentTotal, locale, currency)}
        />
      </div>
    </section>
  );
}

function AnalysisGroup({
  children,
  columns,
  icon,
  title,
}: {
  children: ReactNode;
  columns: 2 | 3;
  icon: IconDefinition;
  title: string;
}) {
  const { t } = useI18n();

  return (
    <section className="analysis-group">
      <div className="analysis-group-heading">
        <h3>{t(title)}</h3>
        <AppIcon icon={icon} size={16} />
      </div>
      <div
        className="analysis-grid"
        style={{ "--analysis-columns": columns } as CSSProperties}
      >
        {children}
      </div>
    </section>
  );
}

function AnalysisTile({
  label,
  tooltip,
  value,
  valueClassName,
}: {
  label: string;
  tooltip?: string;
  value: string;
  valueClassName?: string;
}) {
  const { t } = useI18n();

  return (
    <div className="analysis-tile">
      <span className="analysis-tile-label">
        {t(label)}
        {tooltip && (
          <span
            aria-label={t(tooltip)}
            className="analysis-tooltip"
            data-tooltip={t(tooltip)}
            role="img"
            tabIndex={0}
            title={t(tooltip)}
          >
            <AppIcon icon={faCircleInfo} size={11} />
          </span>
        )}
      </span>
      <strong className={valueClassName}>{value}</strong>
    </div>
  );
}

function AnalysisList({
  className = "",
  density = "large",
  emptyText,
  items,
  title,
  total,
}: {
  className?: string;
  density?: "compact" | "large";
  emptyText: string;
  items: { id?: string; label: string; value: string }[];
  title: string;
  total: string;
}) {
  const { t } = useI18n();

  return (
    <section className={`analysis-list is-${density} ${className}`.trim()}>
      <header>
        <div>
          <span>{t(title)}</span>
          <small>
            {items.length === 1
              ? `1 ${t("concepto")}`
              : `${items.length} ${t("conceptos")}`}
          </small>
        </div>
        <strong>{total}</strong>
      </header>
      <div className="analysis-list-rows">
        {items.length === 0 ? (
          <p>{emptyText}</p>
        ) : (
          items.map((item, index) => (
            <div
              className="analysis-list-row"
              key={item.id ?? `${title}-${item.label}-${index}`}
            >
              <span>{item.label}</span>
              <strong>{item.value}</strong>
            </div>
          ))
        )}
      </div>
    </section>
  );
}

function AnnualGoalPanel({
  annualProgress,
  canEdit,
  goalYearOptions,
  goalDraft,
  isEditing,
  isGoalDirty,
  isGoalSaving,
  onAddAllocation,
  onCancel,
  onEdit,
  onRemoveAllocation,
  onReorderAllocation,
  onSave,
  onSelectGoalYear,
  onUpdateAllocation,
  onUpdateGoal,
}: {
  annualProgress: ReturnType<typeof calculateAnnualProgress>;
  canEdit: boolean;
  goalYearOptions: number[];
  goalDraft: AnnualGoal;
  isEditing: boolean;
  isGoalDirty: boolean;
  isGoalSaving: boolean;
  onAddAllocation: (accumulates: boolean) => void;
  onCancel: () => void;
  onEdit: () => void;
  onRemoveAllocation: (id: string) => void;
  onReorderAllocation: ReorderHandler;
  onSave: () => void;
  onSelectGoalYear: (year: number) => void;
  onUpdateAllocation: (
    id: string,
    key: keyof Pick<AnnualGoalAllocation, "accumulates" | "amount" | "name">,
    value: boolean | number | string,
  ) => void;
  onUpdateGoal: (update: (current: AnnualGoal) => AnnualGoal) => void;
}) {
  const { currency, locale, t } = useI18n();
  const progressPercent = Math.max(0, Math.round(annualProgress.progress * 100));
  const progressRingPercent = Math.min(100, progressPercent);
  const progressColor =
    progressPercent >= 70
      ? "#4ce0b1"
      : progressPercent >= 35
        ? "#ffd166"
        : "#ff7d91";
  const allocationTotal = goalDraft.allocations.reduce(
    (total, allocation) => total + allocation.amount,
    0,
  );
  const accumulableTotal = goalDraft.allocations.reduce(
    (total, allocation) =>
      allocation.accumulates ? total + allocation.amount : total,
    0,
  );
  const nonAccumulableTotal = allocationTotal - accumulableTotal;
  const accumulableAllocations = goalDraft.allocations.filter(
    (allocation) => allocation.accumulates,
  );
  const nonAccumulableAllocations = goalDraft.allocations.filter(
    (allocation) => !allocation.accumulates,
  );

  function renderAllocation(allocation: AnnualGoalAllocation) {
    return (
      <SortableRow
        className="allocation-row"
        disabled={!isEditing || !canEdit}
        id={allocation.id}
        key={allocation.id}
        onReorder={onReorderAllocation}
      >
        <span className="row-icon" aria-hidden="true">
          <AppIcon
            icon={allocation.accumulates ? faPiggyBank : faMoneyBills}
            size={15}
          />
        </span>
        <input
          aria-label={t("Nombre de la partida")}
          value={allocation.name}
          disabled={!isEditing || !canEdit}
          onChange={(event) =>
            onUpdateAllocation(allocation.id, "name", event.target.value)
          }
        />
        <span className="money-input-wrap">
          <LocalizedMoneyInput
            ariaLabel={t("Importe de {name}", { name: allocation.name })}
            value={allocation.amount}
            disabled={!isEditing || !canEdit}
            onValueChange={(amount) =>
              onUpdateAllocation(
                allocation.id,
                "amount",
                amount,
              )
            }
          />
        </span>
        <button
          className="icon-button muted danger-icon action-delete"
          type="button"
          onClick={() => onRemoveAllocation(allocation.id)}
          disabled={!isEditing || !canEdit}
          aria-label={t("Eliminar {name}", { name: allocation.name })}
          title={t("Eliminar")}
        >
          <AppIcon icon={faTrash} size={14} />
        </button>
      </SortableRow>
    );
  }

  return (
    <div
      className={`goal-page${isEditing ? "" : " is-readonly"}`}
      id="meta"
      aria-label={t("Meta anual")}
    >
      <div className="view-period has-actions goal-view-period">
        <div>
          <p>{t("Año")}</p>
          <div className="view-period-title">
            <div className="goal-year-control">
              <h2>{goalDraft.year}</h2>
              <AppIcon icon={faChevronDown} size={12} />
              <select
                className="goal-year-select"
                value={goalDraft.year}
                disabled={isEditing}
                aria-label={t("Año")}
                onChange={(event) => onSelectGoalYear(Number(event.target.value))}
              >
                {goalYearOptions.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
        <div className="view-period-actions">
          {isEditing ? (
            <button
              className="button secondary icon-only action-cancel"
              type="button"
              onClick={onCancel}
              disabled={isGoalSaving}
              aria-label={t("Cancelar edición de la meta")}
              title={t("Cancelar edición")}
            >
              <AppIcon icon={faRotateLeft} size={14} />
            </button>
          ) : (
            <button
              className="button secondary icon-only action-edit"
              type="button"
              onClick={onEdit}
              disabled={!canEdit}
              aria-label={t("Editar meta")}
              title={t("Editar meta")}
            >
              <AppIcon icon={faPen} size={13} />
            </button>
          )}
          <button
            className="button primary icon-only action-save"
            type="button"
            onClick={onSave}
            disabled={!canEdit || !isEditing || isGoalSaving || !isGoalDirty}
            aria-label={isGoalSaving ? t("Guardando meta") : t("Guardar meta")}
            title={isGoalSaving ? t("Guardando meta") : t("Guardar meta")}
          >
            <AppIcon icon={faFloppyDisk} size={14} />
          </button>
        </div>
      </div>

      <section className="goal-hero">
        <div className="goal-summary-heading">
          <div>
            {isEditing ? (
              <input
                className="goal-purpose-input"
                value={goalDraft.purpose}
                disabled={!canEdit}
                aria-label={t("Propósito")}
                onChange={(event) =>
                  onUpdateGoal((current) => ({
                    ...current,
                    purpose: event.target.value,
                  }))
                }
              />
            ) : (
              <h2>{goalDraft.purpose || t("Sin propósito definido")}</h2>
            )}
          </div>
          <AppIcon icon={faBullseye} size={17} />
        </div>
        <div className="goal-progress-layout">
          <div className="goal-progress-main">
            <div
              className="progress-ring"
              style={{
                background: `conic-gradient(${progressColor} ${progressRingPercent}%, rgba(255,255,255,0.16) 0)`,
              }}
            >
              <span className="progress-ring-content">
                <strong>{progressPercent}%</strong>
                <small>{formatCurrency(annualProgress.saved, locale, currency)}</small>
              </span>
            </div>
            <div className="goal-numbers">
              <strong>{formatCurrency(allocationTotal, locale, currency)}</strong>
              <span>{t("objetivo anual")}</span>
            </div>
          </div>
          <div className="goal-stat-grid">
            <AnalysisTile label={t("Pendiente")} value={formatCurrency(annualProgress.remaining, locale, currency)} />
            <AnalysisTile
              label={t("Ritmo necesario")}
              value={formatCurrency(annualProgress.monthlyNeed, locale, currency)}
            />
            <AnalysisTile label={t("Meses registrados")} value={`${annualProgress.closedMonths}/12`} />
          </div>
        </div>
      </section>

      <section
        className="ledger-grid goal-ledger-grid"
        aria-label={t("Datos y desglose de la meta")}
      >
        <section className="zone-panel goal-allocation-panel">
          <SectionHeader
            eyebrow="Acumulable"
            title={formatPreciseCurrency(accumulableTotal, locale, currency)}
            icon={
              <button
                className="icon-button action-add"
                type="button"
                onClick={() => onAddAllocation(true)}
                disabled={!isEditing || !canEdit}
                aria-label={t("Añadir partida")}
                title={t("Añadir partida")}
              >
                <AppIcon icon={faPlus} size={14} />
              </button>
            }
          />
          <div className="allocation-list">
            {accumulableAllocations.length > 0 ? (
              accumulableAllocations.map(renderAllocation)
            ) : (
              <div className="empty-row goal-allocation-empty">
                {t("Sin partidas en este grupo.")}
              </div>
            )}
          </div>
        </section>

        <section className="zone-panel goal-allocation-panel">
          <SectionHeader
            eyebrow="No acumulable"
            title={formatPreciseCurrency(nonAccumulableTotal, locale, currency)}
            icon={
              <button
                className="icon-button action-add"
                type="button"
                onClick={() => onAddAllocation(false)}
                disabled={!isEditing || !canEdit}
                aria-label={t("Añadir partida")}
                title={t("Añadir partida")}
              >
                <AppIcon icon={faPlus} size={14} />
              </button>
            }
          />
          <div className="allocation-list">
            {nonAccumulableAllocations.length > 0 ? (
              nonAccumulableAllocations.map(renderAllocation)
            ) : (
              <div className="empty-row goal-allocation-empty">
                {t("Sin partidas en este grupo.")}
              </div>
            )}
          </div>
        </section>
      </section>
    </div>
  );
}

function SortableRow({
  children,
  className,
  disabled,
  id,
  onReorder,
}: {
  children: ReactNode;
  className: string;
  disabled: boolean;
  id: string;
  onReorder: ReorderHandler;
}) {
  return (
    <div
      className={`${className} sortable-row`}
      draggable={!disabled}
      onDragEnd={endSortableDrag}
      onDragEnter={allowSortableDrop}
      onDragLeave={leaveSortableDrop}
      onDragOver={allowSortableDrop}
      onDragStart={(event) => startSortableDrag(event, id)}
      onDrop={(event) => dropSortableItem(event, id, onReorder)}
    >
      {children}
    </div>
  );
}

function AccountRow({
  account,
  disabled,
  onBalanceChange,
  onNameChange,
  onReorder,
  onRemove,
}: {
  account: AccountBalance;
  disabled: boolean;
  onBalanceChange: (id: string, balance: number) => void;
  onNameChange: (id: string, name: string) => void;
  onReorder: ReorderHandler;
  onRemove: (id: string) => void;
}) {
  const { t } = useI18n();

  return (
    <SortableRow
      className="data-row"
      disabled={disabled}
      id={account.id}
      onReorder={onReorder}
    >
      <span className="row-icon" aria-hidden="true">
        <AppIcon icon={faLandmark} size={15} />
      </span>
      <input
        aria-label={t("Nombre de la cuenta")}
        value={account.name}
        disabled={disabled}
        onChange={(event) => onNameChange(account.id, event.target.value)}
      />
      <span className="money-input-wrap amount-input-wrap">
        <LocalizedMoneyInput
          ariaLabel={t("Saldo de {name}", { name: account.name })}
          className="amount-input"
          value={account.balance}
          disabled={disabled}
          onValueChange={(balance) =>
            onBalanceChange(account.id, balance)
          }
        />
      </span>
      <button
        className="icon-button muted danger-icon action-delete"
        type="button"
        onClick={() => onRemove(account.id)}
        disabled={disabled}
        aria-label={t("Eliminar {name}", { name: account.name })}
        title={t("Eliminar")}
      >
        <AppIcon icon={faTrash} size={14} />
      </button>
    </SortableRow>
  );
}

function IncomePanel({
  disabled,
  entries,
  onAdd,
  onAmountChange,
  onNameChange,
  onReorder,
  onRemove,
  total,
}: {
  disabled: boolean;
  entries: MoneyEntry[];
  onAdd: () => void;
  onAmountChange: (id: string, amount: number) => void;
  onNameChange: (id: string, name: string) => void;
  onReorder: ReorderHandler;
  onRemove: (id: string) => void;
  total: number;
}) {
  const { currency, locale, t } = useI18n();

  return (
    <section className="zone-panel income-panel">
      <SectionHeader
        eyebrow={t("Ingresos")}
        icon={
          <button
            className="icon-button action-add"
            type="button"
            onClick={onAdd}
            disabled={disabled}
            aria-label={t("Añadir ingreso")}
            title={t("Añadir ingreso")}
          >
            <AppIcon icon={faPlus} size={14} />
          </button>
        }
        title={formatPreciseCurrency(total, locale, currency)}
      />

      <div className="rows">
        {entries.length === 0 && (
          <div className="empty-row">
            <AppIcon icon={faArrowUp} size={16} />
            <span>{t("Sin ingresos introducidos")}</span>
          </div>
        )}

        {entries.map((entry) => (
          <SortableRow
            className="data-row"
            disabled={disabled}
            id={entry.id}
            key={entry.id}
            onReorder={onReorder}
          >
            <span className="row-icon" aria-hidden="true">
              <AppIcon icon={faArrowUp} size={15} />
            </span>
            <input
              aria-label={t("Concepto del ingreso")}
              value={entry.name}
              disabled={disabled}
              onChange={(event) => onNameChange(entry.id, event.target.value)}
            />
            <span className="money-input-wrap amount-input-wrap">
              <LocalizedMoneyInput
                ariaLabel={t("Importe de {name}", { name: entry.name })}
                className="amount-input"
                value={entry.amount}
                disabled={disabled}
                onValueChange={(amount) =>
                  onAmountChange(entry.id, amount)
                }
              />
            </span>
            <button
              className="icon-button muted danger-icon action-delete"
              type="button"
              onClick={() => onRemove(entry.id)}
              disabled={disabled}
              aria-label={t("Eliminar {name}", { name: entry.name })}
              title={t("Eliminar")}
            >
              <AppIcon icon={faTrash} size={14} />
            </button>
          </SortableRow>
        ))}
      </div>
    </section>
  );
}

function CashPanel({
  disabled,
  entries,
  onAdd,
  onAmountChange,
  onNameChange,
  onReorder,
  onRemove,
  total,
}: {
  disabled: boolean;
  entries: MoneyEntry[];
  onAdd: () => void;
  onAmountChange: (id: string, amount: number) => void;
  onNameChange: (id: string, name: string) => void;
  onReorder: ReorderHandler;
  onRemove: (id: string) => void;
  total: number;
}) {
  const { currency, locale, t } = useI18n();

  return (
    <section className="zone-panel cash-panel">
      <SectionHeader
        eyebrow={t("Efectivo")}
        icon={
          <button
            className="icon-button action-add"
            type="button"
            onClick={onAdd}
            disabled={disabled}
            aria-label={t("Añadir efectivo")}
            title={t("Añadir efectivo")}
          >
            <AppIcon icon={faPlus} size={14} />
          </button>
        }
        title={formatPreciseCurrency(total, locale, currency)}
      />

      <div className="rows">
        {entries.length === 0 && (
          <div className="empty-row">
            <AppIcon icon={faMoneyBills} size={16} />
            <span>{t("Sin efectivo introducido")}</span>
          </div>
        )}

        {entries.map((entry) => (
          <SortableRow
            className="data-row"
            disabled={disabled}
            id={entry.id}
            key={entry.id}
            onReorder={onReorder}
          >
            <span className="row-icon" aria-hidden="true">
              <AppIcon icon={faMoneyBills} size={15} />
            </span>
            <input
              aria-label={t("Concepto de efectivo")}
              value={entry.name}
              disabled={disabled}
              onChange={(event) => onNameChange(entry.id, event.target.value)}
            />
            <span className="money-input-wrap amount-input-wrap">
              <LocalizedMoneyInput
                ariaLabel={t("Importe de {name}", { name: entry.name })}
                className="amount-input"
                value={entry.amount}
                disabled={disabled}
                onValueChange={(amount) =>
                  onAmountChange(entry.id, amount)
                }
              />
            </span>
            <button
              className="icon-button muted danger-icon action-delete"
              type="button"
              onClick={() => onRemove(entry.id)}
              disabled={disabled}
              aria-label={t("Eliminar {name}", { name: entry.name })}
              title={t("Eliminar")}
            >
              <AppIcon icon={faTrash} size={14} />
            </button>
          </SortableRow>
        ))}
      </div>
    </section>
  );
}

function AdjustmentPanel({
  adjustments,
  disabled,
  onAdd,
  onAmountChange,
  onNameChange,
  onReorder,
  onRemove,
  total,
}: {
  adjustments: WealthAdjustment[];
  disabled: boolean;
  onAdd: () => void;
  onAmountChange: (id: string, amount: number) => void;
  onNameChange: (id: string, name: string) => void;
  onReorder: ReorderHandler;
  onRemove: (id: string) => void;
  total: number;
}) {
  const { currency, locale, t } = useI18n();

  return (
    <section className="zone-panel adjustment-panel">
      <SectionHeader
        eyebrow="Ajustes patrimoniales"
        icon={
          <button
            className="icon-button action-add"
            type="button"
            onClick={onAdd}
            disabled={disabled}
            aria-label={t("Añadir ajuste patrimonial")}
            title={t("Añadir ajuste")}
          >
            <AppIcon icon={faPlus} size={14} />
          </button>
        }
        title={formatPreciseCurrency(total, locale, currency)}
      />

      <p className="panel-hint">
        {t("Amortizaciones u otros movimientos que cambian el patrimonio sin ser gasto operativo.")}
      </p>

      <div className="rows">
        {adjustments.length === 0 && (
          <div className="empty-row">
            <AppIcon icon={faScaleBalanced} size={16} />
            <span>{t("Sin ajustes patrimoniales")}</span>
          </div>
        )}

        {adjustments.map((adjustment) => (
          <SortableRow
            className="data-row"
            disabled={disabled}
            id={adjustment.id}
            key={adjustment.id}
            onReorder={onReorder}
          >
            <span className="row-icon" aria-hidden="true">
              <AppIcon icon={faScaleBalanced} size={15} />
            </span>
            <input
              aria-label={t("Concepto del ajuste")}
              value={adjustment.name}
              disabled={disabled}
              onChange={(event) => onNameChange(adjustment.id, event.target.value)}
            />
            <span className="money-input-wrap amount-input-wrap">
              <LocalizedMoneyInput
                ariaLabel={t("Importe de {name}", { name: adjustment.name })}
                className="amount-input"
                value={adjustment.amount}
                disabled={disabled}
                onValueChange={(amount) =>
                  onAmountChange(adjustment.id, amount)
                }
              />
            </span>
            <button
              className="icon-button muted danger-icon action-delete"
              type="button"
              onClick={() => onRemove(adjustment.id)}
              disabled={disabled}
              aria-label={t("Eliminar {name}", { name: adjustment.name })}
              title={t("Eliminar")}
            >
              <AppIcon icon={faTrash} size={14} />
            </button>
          </SortableRow>
        ))}
      </div>
    </section>
  );
}

function DebtPanel({
  disabled,
  entries,
  group,
  icon,
  onAdd,
  onAmountChange,
  onNameChange,
  onReorder,
  onRemove,
  title,
  total,
}: {
  disabled: boolean;
  entries: MoneyEntry[];
  group: EntryGroup;
  icon: ReactNode;
  onAdd: (group: EntryGroup) => void;
  onAmountChange: (group: EntryGroup, id: string, amount: number) => void;
  onNameChange: (group: EntryGroup, id: string, name: string) => void;
  onReorder: ReorderHandler;
  onRemove: (group: EntryGroup, id: string) => void;
  title: string;
  total: number;
}) {
  const { currency, locale, t } = useI18n();

  return (
    <section className="zone-panel">
      <SectionHeader
        eyebrow={title}
        icon={
          <button
            className="icon-button action-add"
            type="button"
            onClick={() => onAdd(group)}
            disabled={disabled}
            aria-label={`${t("Añadir")} ${title.toLocaleLowerCase(locale)}`}
            title={t("Añadir")}
          >
            <AppIcon icon={faPlus} size={14} />
          </button>
        }
        title={formatPreciseCurrency(total, locale, currency)}
      />

      {group === "payables" && (
        <p className="panel-hint">
          {t("Incluye solo facturas u obligaciones reales pendientes al cierre. Se trasladarán al mes siguiente hasta que las elimines al pagarlas.")}
        </p>
      )}

      <div className="rows">
        {entries.length === 0 && (
          <div className="empty-row">
            {icon}
            <span>0,00 €</span>
          </div>
        )}

        {entries.map((entry) => (
          <SortableRow
            className="data-row"
            disabled={disabled}
            id={entry.id}
            key={entry.id}
            onReorder={onReorder}
          >
            <span className="row-icon" aria-hidden="true">
              {icon}
            </span>
            <input
              aria-label={t("Concepto")}
              value={entry.name}
              disabled={disabled}
              onChange={(event) => onNameChange(group, entry.id, event.target.value)}
            />
            <span className="money-input-wrap amount-input-wrap">
              <LocalizedMoneyInput
                ariaLabel={t("Importe de {name}", { name: entry.name })}
                className="amount-input"
                value={entry.amount}
                disabled={disabled}
                onValueChange={(amount) =>
                  onAmountChange(group, entry.id, amount)
                }
              />
            </span>
            <button
              className="icon-button muted danger-icon action-delete"
              type="button"
              onClick={() => onRemove(group, entry.id)}
              disabled={disabled}
              aria-label={t("Eliminar {name}", { name: entry.name })}
              title={t("Eliminar")}
            >
              <AppIcon icon={faTrash} size={14} />
            </button>
          </SortableRow>
        ))}
      </div>
    </section>
  );
}

function FutureCommitmentsPanel({
  commitments,
  disabled,
  liquidTotal,
  onAdd,
  onAmountChange,
  onConvert,
  onNameChange,
  onRemove,
  onReorder,
  onStatusChange,
  onTargetMonthChange,
  total,
  years,
}: {
  commitments: FutureCommitment[];
  disabled: boolean;
  liquidTotal: number;
  onAdd: () => void;
  onAmountChange: (id: string, amount: number) => void;
  onConvert: (id: string) => void;
  onNameChange: (id: string, name: string) => void;
  onRemove: (id: string) => void;
  onReorder: ReorderHandler;
  onStatusChange: (id: string, status: FutureCommitmentStatus) => void;
  onTargetMonthChange: (id: string, targetMonth: string) => void;
  total: number;
  years: number[];
}) {
  const { currency, locale, t } = useI18n();
  const availableAfterCommitments = liquidTotal - total;

  return (
    <section className="zone-panel future-commitments-panel">
      <SectionHeader
        eyebrow="Planificación"
        icon={
          <button
            className="icon-button action-add"
            type="button"
            onClick={onAdd}
            disabled={disabled}
            aria-label={t("Añadir compromiso futuro")}
            title={t("Añadir compromiso futuro")}
          >
            <AppIcon icon={faPlus} size={14} />
          </button>
        }
        title={t("Compromisos futuros")}
      />

      <p className="panel-hint commitment-hint">
        {t("Previsiones sin impacto hasta ser deuda real.")}
      </p>

      <div className="commitment-summary">
        <div>
          <span>{t("Total comprometido")}</span>
          <strong>{formatPreciseCurrency(total, locale, currency)}</strong>
        </div>
        <div>
          <span>{t("Liquidez tras compromisos")}</span>
          <strong className={getSavingsClass(availableAfterCommitments)}>
            {formatPreciseCurrency(availableAfterCommitments, locale, currency)}
          </strong>
        </div>
      </div>

      <div className="rows commitment-rows">
        {commitments.length === 0 && (
          <div className="empty-row">
            <AppIcon icon={faClock} size={16} />
            <span>{t("Sin compromisos futuros")}</span>
          </div>
        )}

        {commitments.map((commitment) => (
          <SortableRow
            className="commitment-row"
            disabled={disabled}
            id={commitment.id}
            key={commitment.id}
            onReorder={onReorder}
          >
            <span className="row-icon" aria-hidden="true">
              <AppIcon icon={faClock} size={15} />
            </span>

            <div className="commitment-fields">
              {disabled ? (
                <div className="commitment-readonly-summary">
                  <span className="commitment-readonly-copy">
                    <strong>{commitment.name}</strong>
                    <span aria-hidden="true">·</span>
                    <span>
                      {commitment.status === "committed"
                        ? t("Contratado")
                        : t("Previsto")}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>
                      {commitment.targetMonth
                        ? formatShortMonthYear(commitment.targetMonth, locale)
                        : t("Sin datos")}
                    </span>
                  </span>
                  <strong className="commitment-readonly-amount">
                    {formatPreciseCurrency(commitment.amount, locale, currency)}
                  </strong>
                </div>
              ) : (
                <>
                  <input
                    className="commitment-name"
                    aria-label={t("Concepto del compromiso")}
                    value={commitment.name}
                    onChange={(event) =>
                      onNameChange(commitment.id, event.target.value)
                    }
                  />
                  <div className="commitment-meta">
                    <select
                      aria-label={t("Estado de {name}", { name: commitment.name })}
                      value={commitment.status}
                      onChange={(event) =>
                        onStatusChange(
                          commitment.id,
                          event.target.value as FutureCommitmentStatus,
                        )
                      }
                    >
                      <option value="planned">{t("Previsto")}</option>
                      <option value="committed">{t("Contratado")}</option>
                    </select>
                    <MonthYearSelect
                      compact
                      label={t("Mes previsto de {name}", { name: commitment.name })}
                      value={commitment.targetMonth ?? ""}
                      years={years}
                      onChange={(value) =>
                        onTargetMonthChange(commitment.id, value)
                      }
                    />
                    <span className="money-input-wrap commitment-amount">
                      <LocalizedMoneyInput
                        ariaLabel={t("Importe estimado de {name}", { name: commitment.name })}
                        value={commitment.amount}
                        disabled={false}
                        onValueChange={(amount) =>
                          onAmountChange(commitment.id, amount)
                        }
                      />
                    </span>
                  </div>
                </>
              )}
            </div>

            <button
              className="icon-button commitment-convert action-convert"
              type="button"
              onClick={() => onConvert(commitment.id)}
              disabled={disabled}
              aria-label={t("Convertir {name} en deuda real", { name: commitment.name })}
              title={t("Convertir en deuda real")}
            >
              <AppIcon icon={faArrowRight} size={14} />
            </button>
            <button
              className="icon-button muted danger-icon action-delete"
              type="button"
              onClick={() => onRemove(commitment.id)}
              disabled={disabled}
              aria-label={t("Eliminar {name}", { name: commitment.name })}
              title={t("Eliminar")}
            >
              <AppIcon icon={faTrash} size={14} />
            </button>
          </SortableRow>
        ))}
      </div>
    </section>
  );
}

function ImportDataDialog({
  fileName,
  onCancel,
  onConfirm,
}: {
  fileName: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const { t } = useI18n();

  return (
    <div className="modal-backdrop" role="presentation">
      <section
        aria-label={t("Importar JSON")}
        aria-modal="true"
        className="confirm-modal import-confirm-modal"
        role="dialog"
      >
        <button
          className="icon-button muted modal-close action-cancel"
          type="button"
          onClick={onCancel}
          aria-label={t("Cerrar")}
          title={t("Cerrar")}
        >
          <AppIcon icon={faXmark} size={14} />
        </button>
        <div className="confirm-modal-heading">
          <span className="confirm-modal-icon" aria-hidden="true">
            <AppIcon icon={faDatabase} size={20} />
          </span>
          <div>
            <span className="confirm-modal-eyebrow">{t("Confirmación")}</span>
            <h2>{t("Importar JSON")}</h2>
          </div>
        </div>
        <p>
          {t("La importación reemplazará tus datos actuales. Se guardará una copia de seguridad antes de continuar. ¿Quieres continuar?")}
        </p>
        <strong className="import-file-name">{fileName}</strong>
        <div className="modal-actions">
          <button
            className="button secondary icon-only action-cancel"
            type="button"
            onClick={onCancel}
            aria-label={t("Cancelar")}
            title={t("Cancelar")}
          >
            <AppIcon icon={faArrowLeft} size={14} />
          </button>
          <button
            className="button icon-only action-import"
            type="button"
            onClick={onConfirm}
            aria-label={t("Importar JSON")}
            title={t("Importar JSON")}
          >
            <AppIcon icon={faUpload} size={14} />
          </button>
        </div>
      </section>
    </div>
  );
}

function DeleteItemDialog({
  item,
  onCancel,
  onConfirm,
}: {
  item: RegisterDeleteTarget;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const { t } = useI18n();

  return (
    <div className="modal-backdrop" role="presentation">
      <section
        aria-label={t("Confirmar eliminación")}
        aria-modal="true"
        className="confirm-modal"
        role="dialog"
      >
        <button
          className="icon-button muted modal-close action-cancel"
          type="button"
          onClick={onCancel}
          aria-label={t("Cerrar")}
          title={t("Cerrar")}
        >
          <AppIcon icon={faXmark} size={14} />
        </button>
        <div className="confirm-modal-heading">
          <span className="confirm-modal-icon" aria-hidden="true">
            <AppIcon icon={faTrash} size={22} />
          </span>
          <div>
            <span className="confirm-modal-eyebrow">{t("Confirmación")}</span>
            <h2>{t("Eliminar {name}", { name: item.name })}</h2>
          </div>
        </div>
        <p>{t("¿Seguro que quieres continuar?")}</p>
        <div className="modal-actions">
          <button
            className="button secondary icon-only action-cancel"
            type="button"
            onClick={onCancel}
            aria-label={t("Cancelar")}
            title={t("Cancelar")}
          >
            <AppIcon icon={faArrowLeft} size={14} />
          </button>
          <button
            className="button danger icon-only action-delete"
            type="button"
            onClick={onConfirm}
            aria-label={t("Confirmar eliminación")}
            title={t("Confirmar eliminación")}
          >
            <AppIcon icon={faTrash} size={14} />
          </button>
        </div>
      </section>
    </div>
  );
}

function DeleteMonthDialog({
  confirmation,
  isDeleting,
  month,
  onCancel,
  onChangeConfirmation,
  onConfirm,
}: {
  confirmation: string;
  isDeleting: boolean;
  month: HomeflowMonth;
  onCancel: () => void;
  onChangeConfirmation: (value: string) => void;
  onConfirm: () => void;
}) {
  const { locale, t } = useI18n();
  const canDelete = confirmation === month.month;

  return (
    <div className="modal-backdrop" role="presentation">
      <section
        aria-label={t("Confirmar borrado de mes")}
        aria-modal="true"
        className="confirm-modal"
        role="dialog"
      >
        <button
          className="icon-button muted modal-close action-cancel"
          type="button"
          onClick={onCancel}
          aria-label={t("Cerrar")}
          title={t("Cerrar")}
        >
          <AppIcon icon={faXmark} size={14} />
        </button>
        <div className="confirm-modal-heading">
          <span className="confirm-modal-icon" aria-hidden="true">
            <AppIcon icon={faTrash} size={22} />
          </span>
          <div>
            <span className="confirm-modal-eyebrow">{t("Confirmación")}</span>
            <h2>{t("Borrar {month}", { month: formatMonthName(month.month, locale) })}</h2>
          </div>
        </div>
        <p>
          {t("Escribe {month} para confirmar el borrado.", { month: month.month })}
        </p>
        <input
          autoFocus
          value={confirmation}
          onChange={(event) => onChangeConfirmation(event.target.value)}
          placeholder={month.month}
        />
        <div className="modal-actions">
          <button
            className="button secondary icon-only action-cancel"
            type="button"
            onClick={onCancel}
            aria-label={t("Cancelar")}
            title={t("Cancelar")}
          >
            <AppIcon icon={faArrowLeft} size={14} />
          </button>
          <button
            className="button danger icon-only action-delete"
            type="button"
            onClick={onConfirm}
            disabled={!canDelete || isDeleting}
            aria-label={isDeleting ? t("Borrando mes") : t("Borrar mes")}
            title={isDeleting ? t("Borrando mes") : t("Borrar mes")}
          >
            <AppIcon icon={faTrash} size={14} />
          </button>
        </div>
      </section>
    </div>
  );
}
