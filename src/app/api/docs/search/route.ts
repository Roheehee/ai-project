export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

/**
 * Keep the docs search endpoint build-safe for production deployments.
 * The product site does not rely on docs search, so returning an empty
 * result set is preferable to blocking the entire Vercel build.
 */
export async function GET() {
  return Response.json([]);
}
