# bootdotdev-http-servers

A TypeScript HTTP API server built with Express, Drizzle ORM, and PostgreSQL. It includes JWT auth, refresh tokens, webhook handling, static file serving, and admin utilities.

Supported by [Boot.dev](https://boot.dev). If you are learning backend API fundamentals, this project is a practical reference for route organization, auth flows, and database-backed endpoints.

## Motivation

The goal of this project is to practice building a real HTTP server with production-style patterns:

- Modular route and middleware structure
- Typed request/response handling in TypeScript
- Token-based authentication and refresh workflows
- Database persistence via Drizzle + Postgres
- Clear error handling and consistent HTTP statuses

## Goal

Keep the server easy to extend while remaining simple to reason about:

- Centralized app composition in `src/app.ts`
- Feature-oriented routes in `src/routes/*`
- Shared middleware in `src/middleware/*`
- Query-only data layer in `src/db/queries/*`
- Strong typing with `strict` TypeScript mode

## Tech Stack

- [TypeScript](https://www.typescriptlang.org/)
- [Express](https://expressjs.com/)
- [Drizzle ORM](https://orm.drizzle.team/)
- [PostgreSQL](https://www.postgresql.org/)
- [Vitest](https://vitest.dev/)
- [jsonwebtoken](https://github.com/auth0/node-jsonwebtoken)
- [argon2](https://github.com/ranisalt/node-argon2)

## Installation

```bash
npm install
```

## Environment Variables

Create a `.env` file in the project root with:

```env
DB_URL=postgres://<user>:<password>@<host>:<port>/<database>
PLATFORM=dev
SECRET=your-jwt-secret
POLKA_KEY=your-polka-webhook-api-key
```

## Scripts

```bash
# generate migrations
npm run db:generate

# run migrations
npm run db:migrate

# compile TypeScript
npm run build

# run server from dist
npm start

# compile and run in watch mode
npm run dev

# run tests
npm test
```

## Quick Start

1. Install dependencies and configure `.env`
2. Run migrations
3. Build and start the server

```bash
npm install
npm run db:migrate
npm run build
npm start
```

Server default:

- `http://localhost:8080`

## API Overview

### Health

- `GET /api/healthz`

### Auth

- `POST /api/login`
- `POST /api/refresh`
- `POST /api/revoke`

### Users

- `POST /api/users`
- `PUT /api/users` (requires Bearer token)

### Chirps

- `GET /api/chirps` (supports `authorId` and `sort=asc|desc`)
- `GET /api/chirps/:id`
- `POST /api/chirps` (requires Bearer token)
- `DELETE /api/chirps/:id` (requires Bearer token and ownership)

### Webhooks

- `POST /api/polka/webhooks` (requires `ApiKey <POLKA_KEY>` header)

Expected webhook body:

```json
{
  "event": "user.upgraded",
  "data": {
    "userId": "3311741c-680c-4546-99f3-fc9efac2036c"
  }
}
```

### Admin / Static

- `GET /app`
- `GET /app/assets/*`
- `GET /admin/metrics`
- `POST /admin/reset` (dev platform only)

## Example Requests

### Create User

```bash
curl -X POST http://localhost:8080/api/users \
  -H "Content-Type: application/json" \
  -d '{"email":"walt@breakingbad.com","password":"supersecret"}'
```

### Login

```bash
curl -X POST http://localhost:8080/api/login \
  -H "Content-Type: application/json" \
  -d '{"email":"walt@breakingbad.com","password":"supersecret"}'
```

### Create Chirp

```bash
curl -X POST http://localhost:8080/api/chirps \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -d '{"body":"hello world"}'
```

### Polka Webhook

```bash
curl -X POST http://localhost:8080/api/polka/webhooks \
  -H "Content-Type: application/json" \
  -H "Authorization: ApiKey <POLKA_KEY>" \
  -d '{"event":"user.upgraded","data":{"userId":"3311741c-680c-4546-99f3-fc9efac2036c"}}'
```

## Project Structure

```txt
src/
  app.ts
  index.ts
  auth.ts
  config.ts
  constants/
  errors/
  middleware/
  routes/
  db/
    schema.ts
    queries/
    migrations/
```

## Testing

Run all tests:

```bash
npm test
```

For fast type feedback while developing:

```bash
npx tsc --noEmit --watch
```

## Contributing

Contributions are welcome. If you open a PR:

- Keep changes focused and small
- Follow existing module boundaries and naming conventions
- Run `npm run build` and `npm test` before submitting
