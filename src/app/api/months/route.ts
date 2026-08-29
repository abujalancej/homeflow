import {
  deleteHomeflowMonth,
  readHomeflowStore,
  upsertHomeflowMonth,
} from "@/lib/homeflow-store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(): Promise<Response> {
  try {
    const store = await readHomeflowStore();
    return Response.json(store);
  } catch {
    return Response.json(
      { message: "No se pudieron cargar los datos." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request): Promise<Response> {
  try {
    const payload = await request.json();
    const store = await upsertHomeflowMonth(payload);
    return Response.json(store, { status: 201 });
  } catch {
    return Response.json(
      { message: "No se pudo guardar el mes." },
      { status: 400 },
    );
  }
}

export async function DELETE(request: Request): Promise<Response> {
  const id = new URL(request.url).searchParams.get("id");

  if (!id) {
    return Response.json(
      { message: "Falta el identificador del mes." },
      { status: 400 },
    );
  }

  try {
    const store = await deleteHomeflowMonth(id);
    return Response.json(store);
  } catch {
    return Response.json(
      { message: "No se pudo borrar el mes." },
      { status: 500 },
    );
  }
}
