import { readHomeflowStore, upsertAnnualGoal } from "@/lib/homeflow-store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(): Promise<Response> {
  try {
    const store = await readHomeflowStore();
    return Response.json({ annualGoals: store.annualGoals });
  } catch {
    return Response.json(
      { message: "No se pudieron cargar las metas." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request): Promise<Response> {
  try {
    const payload = await request.json();
    const store = await upsertAnnualGoal(payload);
    return Response.json(store, { status: 201 });
  } catch {
    return Response.json(
      { message: "No se pudo guardar la meta anual." },
      { status: 400 },
    );
  }
}
