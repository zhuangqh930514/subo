import { PrismaMariaDb } from '@prisma/adapter-mariadb';

export const FALLBACK_DATABASE_URL =
  'mysql://root:password@example.invalid:3306/subo_platform';

function parseOptionalNumber(value: string | null) {
  if (value === null) {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function resolveDatabaseUrl() {
  return process.env.DATABASE_URL ?? FALLBACK_DATABASE_URL;
}

export function createPrismaAdapter(databaseUrl = resolveDatabaseUrl()) {
  const url = new URL(databaseUrl);
  const database = url.pathname.replace(/^\//, '') || 'subo_platform';
  const sslaccept = url.searchParams.get('sslaccept');
  const useSSL = url.searchParams.get('useSSL');

  return new PrismaMariaDb({
    host: url.hostname,
    port: Number(url.port || 3306),
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database,
    connectionLimit: parseOptionalNumber(url.searchParams.get('connection_limit')),
    ssl:
      useSSL === 'true' || sslaccept !== null
        ? sslaccept === 'strict'
          ? true
          : { rejectUnauthorized: false }
        : undefined,
  });
}
