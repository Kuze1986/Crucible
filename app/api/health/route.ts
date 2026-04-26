export async function GET() {
  return Response.json({
    ok: true,
    service: "crucible",
    timestamp: new Date().toISOString(),
  });
}
