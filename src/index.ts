import { config } from './config.js';
import postgres from 'postgres';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { drizzle } from 'drizzle-orm/postgres-js';
import { API_HOST, API_PORT } from './constants/api.js';
import { createApp } from './app.js';

const migrationClient = postgres(config.db.url, { max: 1 });
await migrate(drizzle(migrationClient), config.db.migrationConfig);

const app = createApp();

app.listen(API_PORT, API_HOST, () => {
  console.log(`Server is running at http://localhost:${API_PORT}`);
});
