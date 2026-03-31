export async function register() {
  // Remap WEM_ prefixed vars (Vercel Neon integration naming) to what @vercel/postgres expects
  if (!process.env.POSTGRES_URL && process.env.WEM_POSTGRES_URL)
    process.env.POSTGRES_URL = process.env.WEM_POSTGRES_URL;
  if (!process.env.POSTGRES_PRISMA_URL && process.env.WEM_POSTGRES_PRISMA_URL)
    process.env.POSTGRES_PRISMA_URL = process.env.WEM_POSTGRES_PRISMA_URL;
  if (!process.env.POSTGRES_URL_NON_POOLING && process.env.WEM_POSTGRES_URL_NON_POOLING)
    process.env.POSTGRES_URL_NON_POOLING = process.env.WEM_POSTGRES_URL_NON_POOLING;
}
