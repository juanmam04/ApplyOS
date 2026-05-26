# ApplyOS

Sistema operativo para aplicaciones a startups — perfil, CV, trabajos, IA y preparación de entrevistas.

## Stack

- **Frontend:** React + Vite + TailwindCSS
- **Backend:** Node.js + Express
- **Base de datos:** [Supabase](https://supabase.com) (PostgreSQL + Storage)
- **IA:** OpenAI

## Setup

### 1. Supabase

1. Crea un proyecto en [supabase.com](https://supabase.com)
2. Ve a **SQL Editor** y ejecuta el contenido de [`supabase/schema.sql`](supabase/schema.sql)
3. En **Project Settings → API**, copia:
   - `Project URL`
   - `service_role` key (secreta, solo servidor)

### 2. Variables de entorno

```bash
cp server/.env.example server/.env.local
```

Edita `server/.env.local`:

```env
PORT=47291
SUPABASE_URL=https://jcprzfqrgeavbovbwkra.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...   # Settings → API → service_role (secret)
DATABASE_URL=postgresql://postgres.jcprzfqrgeavbovbwkra:TU_PASSWORD@aws-1-us-east-1.pooler.supabase.com:5432/postgres
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o-mini
```

> **Nota:** ApplyOS usa `SUPABASE_URL` + `SERVICE_ROLE_KEY` (API REST). El `DATABASE_URL` es opcional (pooler para SQL directo).

### 3. Instalar y arrancar

```bash
npm install
npm install --prefix server
npm install --prefix client
npm run dev
```

**PowerShell (Windows):** no uses `&&` en versiones viejas; usá `;` o un comando por línea. Login YC (una vez): `npm run playwright:install` y `npm run yc:login` desde la carpeta del proyecto.

- App: [http://localhost:5173](http://localhost:5173)
- API: [http://localhost:47291](http://localhost:47291)

## Flujo

1. **CV Manager** — sube PDF → Supabase Storage + perfil auto con IA
2. **Perfil** — revisa y edita datos extraídos
3. **Trabajos** — trackea oportunidades
4. **Aplicaciones / Entrevistas** — contenido generado con OpenAI

## Estructura

```
ApplyOS/
├── client/           # React
├── server/           # Express API
│   └── db/           # Supabase client + store
└── supabase/
    └── schema.sql    # Migración inicial
```
