export const dynamic = "force-dynamic";
export const runtime = "edge";

/** Minimal control route: no imports that could crash at module load. */
export async function GET() {
  return new Response("ok");
}
