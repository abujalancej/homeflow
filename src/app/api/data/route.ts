import {
  createHomeflowDataExport,
  readHomeflowStore,
  replaceHomeflowStore,
} from "@/lib/homeflow-store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function dataFileName(): string {
  return `homeflow_backup_${new Date().toISOString().slice(0, 10)}.json`;
}

export async function GET(): Promise<Response> {
  try {
    const store = await readHomeflowStore();
    const backup = createHomeflowDataExport(store);

    return new Response(JSON.stringify(backup, null, 2), {
      headers: {
        "Content-Disposition": `attachment; filename="${dataFileName()}"`,
        "Content-Type": "application/json; charset=utf-8",
      },
    });
  } catch {
    return Response.json(
      { message: "No se pudo exportar la base de datos." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request): Promise<Response> {
  try {
    const payload = await request.json();
    const store = await replaceHomeflowStore(payload);

    return Response.json({ store, backupCreated: true });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "No se pudo importar la base de datos.";

    return Response.json({ message }, { status: 400 });
  }
}
