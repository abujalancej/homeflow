import {
  readHomeflowStore,
  replaceFutureCommitments,
} from "@/lib/homeflow-store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(): Promise<Response> {
  try {
    const store = await readHomeflowStore();
    return Response.json({ futureCommitments: store.futureCommitments });
  } catch {
    return Response.json(
      { message: "No se pudieron cargar los compromisos futuros." },
      { status: 500 },
    );
  }
}

export async function PUT(request: Request): Promise<Response> {
  try {
    const payload = await request.json();
    const store = await replaceFutureCommitments(payload);
    return Response.json(store);
  } catch {
    return Response.json(
      { message: "No se pudieron guardar los compromisos futuros." },
      { status: 400 },
    );
  }
}
