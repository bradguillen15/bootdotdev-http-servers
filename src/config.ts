import type { MigrationConfig } from 'drizzle-orm/migrator';

process.loadEnvFile('.env');

function envOrThrow(key: string): string {
  const value = process.env[key];
  if (value === undefined || value === '') {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

const migrationConfig: MigrationConfig = {
  migrationsFolder: './src/db/migrations',
};

export type APIConfig = {
  fileserverHits: number;
  platform: string;
  secret: string;
  polkaKey: string;
};

export type DBConfig = {
  url: string;
  migrationConfig: MigrationConfig;
};

export const config: {
  api: APIConfig;
  db: DBConfig;
} = {
  api: {
    fileserverHits: 0,
    platform: envOrThrow('PLATFORM'),
    secret: envOrThrow('SECRET'),
    polkaKey: envOrThrow('POLKA_KEY'),
  },
  db: {
    url: envOrThrow('DB_URL'),
    migrationConfig,
  },
};
