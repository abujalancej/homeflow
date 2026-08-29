import { calculateMonthSummary, sortMonthsAscending } from "@/lib/homeflow-math";
import { createDemoStore } from "@/lib/homeflow-demo";
import { readHomeflowStore } from "@/lib/homeflow-store";
import { createXlsx, type XlsxSheet } from "@/lib/xlsx-export";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function inRange(month: string, from: string | null, to: string | null): boolean {
  return (!from || month >= from) && (!to || month <= to);
}

function fileMonthRange(from: string | null, to: string | null): string {
  if (from && to) return `${from}_${to}`;
  if (from) return `${from}_actual`;
  if (to) return `inicio_${to}`;
  return "historico";
}

export async function GET(request: Request): Promise<Response> {
  try {
    const url = new URL(request.url);
    const from = url.searchParams.get("from");
    const to = url.searchParams.get("to");
    const store =
      url.searchParams.get("mode") === "demo"
        ? createDemoStore()
        : await readHomeflowStore();
    const ordered = sortMonthsAscending(store.months);
    const filtered = ordered.filter((month) => inRange(month.month, from, to));

    const summaries = filtered.map((month) => {
      const index = ordered.findIndex((item) => item.id === month.id);
      const previousMonth = index > 0 ? ordered[index - 1] : null;

      return {
        month,
        summary: calculateMonthSummary(month, previousMonth),
      };
    });

    const sheets: XlsxSheet[] = [
      {
        name: "Resumen mensual",
        rows: [
          [
            "Mes",
            "Patrimonio",
            "Ahorro real",
            "Ajustes",
            "Ahorro operativo",
            "Ingresos",
            "Gasto estimado",
            "Liquidez",
            "Cuentas",
            "A cobrar",
            "A pagar",
          ],
          ...summaries.map(({ month, summary }) => [
            month.month,
            summary.netWorth,
            summary.realSavings,
            summary.adjustmentTotal,
            summary.operationalSavings,
            month.income,
            summary.estimatedSpending,
            summary.liquidTotal,
            summary.accountTotal,
            summary.receivableTotal,
            summary.payableTotal,
          ]),
        ],
      },
      {
        name: "Ingresos",
        rows: [
          ["Mes", "Concepto", "Importe"],
          ...filtered.flatMap((month) =>
            month.incomeEntries.map((entry) => [
              month.month,
              entry.name,
              entry.amount,
            ]),
          ),
        ],
      },
      {
        name: "Cuentas",
        rows: [
          ["Mes", "Cuenta", "Saldo"],
          ...filtered.flatMap((month) =>
            month.accounts.map((account) => [
              month.month,
              account.name,
              account.balance,
            ]),
          ),
        ],
      },
      {
        name: "Efectivo",
        rows: [
          ["Mes", "Concepto", "Importe"],
          ...filtered.flatMap((month) =>
            month.cashEntries.map((entry) => [
              month.month,
              entry.name,
              entry.amount,
            ]),
          ),
        ],
      },
      {
        name: "Pendientes",
        rows: [
          ["Mes", "Tipo", "Concepto", "Importe"],
          ...filtered.flatMap((month) => [
            ...month.receivables.map((entry) => [
              month.month,
              "Me deben",
              entry.name,
              entry.amount,
            ]),
            ...month.payables.map((entry) => [
              month.month,
              "Debo",
              entry.name,
              entry.amount,
            ]),
          ]),
        ],
      },
      {
        name: "Ajustes",
        rows: [
          ["Mes", "Concepto", "Importe"],
          ...filtered.flatMap((month) =>
            month.adjustments.map((adjustment) => [
              month.month,
              adjustment.name,
              adjustment.amount,
            ]),
          ),
        ],
      },
      {
        name: "Compromisos futuros",
        rows: [
          ["Concepto", "Importe estimado", "Estado", "Mes previsto", "Notas"],
          ...store.futureCommitments.map((commitment) => [
            commitment.name,
            commitment.amount,
            commitment.status === "committed" ? "Contratado" : "Previsto",
            commitment.targetMonth ?? "",
            commitment.note ?? "",
          ]),
        ],
      },
      {
        name: "Metas anuales",
        rows: [
          ["Año", "Propósito", "Objetivo", "Acumulable", "No acumulable"],
          ...store.annualGoals.map((goal) => {
            const accumulable = goal.allocations.reduce(
              (total, allocation) =>
                allocation.accumulates ? total + allocation.amount : total,
              0,
            );
            const nonAccumulable = goal.allocations.reduce(
              (total, allocation) =>
                allocation.accumulates ? total : total + allocation.amount,
              0,
            );

            return [
              goal.year,
              goal.purpose,
              goal.allocations.reduce(
                (total, allocation) => total + allocation.amount,
                0,
              ),
              accumulable,
              nonAccumulable,
            ];
          }),
        ],
      },
    ];
    const workbook = createXlsx(sheets);
    const workbookBody = workbook.buffer.slice(
      workbook.byteOffset,
      workbook.byteOffset + workbook.byteLength,
    ) as ArrayBuffer;

    return new Response(workbookBody, {
      headers: {
        "Content-Disposition": `attachment; filename="homeflow_${fileMonthRange(from, to)}.xlsx"`,
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      },
    });
  } catch {
    return Response.json(
      { message: "No se pudo generar el Excel." },
      { status: 500 },
    );
  }
}
