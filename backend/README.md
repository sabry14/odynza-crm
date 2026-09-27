# Odynza CRM Backend

Node.js + Express + PostgreSQL backend for Odynza CRM.

## Included now
- PostgreSQL connection
- `.env` configuration for the current CRM Docker database
- Health check
- Database test
- Sign up
- Login
- JWT authentication
- Current-user endpoint

## Run

```cmd
npm install
npm run dev
```

## Test

- http://localhost:5000/api/health
- http://localhost:5000/api/db-test

## Auth

### POST /api/auth/signup
```json
{
  "full_name": "Mohamed Sabry",
  "email": "mohamed@example.com",
  "password": "12345678"
}
```

Public signup does not expose role selection. New accounts default to the `sales` role.

### POST /api/auth/login
```json
{
  "email": "mohamed@example.com",
  "password": "12345678"
}
```

### GET /api/auth/me
Send:
`Authorization: Bearer YOUR_TOKEN`

`.env` is intentionally ignored by Git via `.gitignore`.
