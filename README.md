# ReturnDesk — Online Store Returns & Support Management Portal

A full-stack returns desk and customer support management portal built for online retail operations. Support agents can raise, track, review, and resolve product return/replacement requests while adhering to strict server-enforced lifecycle rules, audit logging, and relational data persistence in PostgreSQL.

---

## Tech Stack

- **Framework**: Next.js 16 (App Router) + React 19
- **Database**: PostgreSQL 16 (relational schema with enums & indexes)
- **ORM**: Prisma v6
- **Validation**: Zod
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **Testing**: Vitest

---

## Getting Started

### 1. Prerequisites
- Node.js 18+ or 20+ (tested on Node v20/v24)
- npm 9+
- PostgreSQL database instance (local PostgreSQL, Docker container, Supabase, Neon, or Render)

### 2. Installation
```bash
git clone <repository-url>
cd Frido_Vikas_Assignment
npm install
```

### 3. Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

Configure your `DATABASE_URL` in `.env`:
```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/returndesk?schema=public"
```

*(If using Docker locally: `docker run --name returndesk-pg -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=returndesk -p 5432:5432 -d postgres:16-alpine`)*

### 4. Database Setup & Seeding
Push the schema to PostgreSQL and generate the Prisma Client:
```bash
npx prisma db push
```

Populate the database with realistic seed data (33 return requests spanning all statuses and reasons, along with audit notes):
```bash
npm run db:seed
```

### 5. Run the Application
Start the local development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Running Automated Tests

Run the Vitest test suite covering all business rules, API schemas, and query filters:
```bash
npm run test
```

Watch mode:
```bash
npm run test:watch
```

---

## Business Rules (Server-Enforced)

All business rules are enforced server-side in `src/lib/services/returnService.js` and validated with automated tests:

1. **Strict Status Lifecycle**:
   - `OPEN` $\rightarrow$ `IN_REVIEW`
   - `IN_REVIEW` $\rightarrow$ `APPROVED` or `REJECTED`
   - `APPROVED` $\rightarrow$ `COMPLETED`
   - `REJECTED` and `COMPLETED` are terminal states. Illegal transitions return HTTP `422`.
2. **Approval Resolution**:
   - Moving to `APPROVED` requires selecting a resolution: `REFUND`, `REPLACEMENT`, or `STORE_CREDIT`.
   - If `REFUND`, a positive `refundAmount > 0` is required.
   - If `REPLACEMENT` or `STORE_CREDIT`, `refundAmount` must remain null.
3. **One Live Request per Order + SKU**:
   - A customer cannot have multiple simultaneous active requests (`OPEN`, `IN_REVIEW`, `APPROVED`) for the same order and product SKU. Attempting to create one returns HTTP `409 Conflict`.
4. **Lock on Decision**:
   - Once a request reaches `APPROVED`, `REJECTED`, or `COMPLETED`, customer and item details cannot be edited (HTTP `422`).
   - Audit notes can still be appended at any stage for record-keeping.
5. **Soft Removal Constraints**:
   - Only `OPEN` or `REJECTED` requests can be removed from the active desk.
   - Removal sets `deletedAt` in PostgreSQL; records are excluded from list queries without losing data integrity.

---

## Project Structure

```
├── prisma/
│   ├── schema.prisma         # Relational schema (requests, notes, enums, indexes)
│   └── seed.js               # Seed script with 33 realistic requests & notes
├── src/
│   ├── app/
│   │   ├── layout.js         # Root layout & meta tags
│   │   ├── page.js           # Main dashboard UI (search, filter, pagination, stats)
│   │   ├── globals.css       # Styling & theme definitions
│   │   └── api/requests/     # REST API route handlers
│   │       ├── route.js              # GET (list/filter), POST (create)
│   │       ├── stats/route.js        # GET (metric counters)
│   │       └── [id]/
│   │           ├── route.js          # GET (detail), PATCH (edit), DELETE (soft remove)
│   │           ├── transition/route.js # POST (lifecycle transition)
│   │           └── notes/route.js    # GET / POST (chronological notes)
│   ├── lib/
│   │   ├── db.js             # Prisma singleton client
│   │   ├── errors.js         # ApiError class & standard error envelopes
│   │   ├── validators.js     # Zod validation schemas
│   │   ├── reference.js      # Reference code generator (RET-YYYY-XXXXX)
│   │   ├── utils.js          # Formatters, badges, and status configurations
│   │   └── services/
│   │       └── returnService.js # Centralized business rules & query service
│   └── components/           # React dashboard components & UI modals
└── tests/
    ├── business-rules.test.js # Rule 1 to 5 lifecycle tests (25 tests)
    ├── api-validation.test.js # Zod schemas & input validation (10 tests)
    └── search-filter.test.js  # Search, filter, and pagination logic (3 tests)
```

---

## API Endpoints

| Method | Endpoint | Description | Status Codes |
|---|---|---|---|
| `GET` | `/api/requests` | List requests (search, filter, sort, paginate) | `200`, `400` |
| `POST` | `/api/requests` | Create a new return request | `201`, `400`, `409` |
| `GET` | `/api/requests/stats` | Dashboard KPI summary counts | `200` |
| `GET` | `/api/requests/:id` | Get single request details and notes | `200`, `404` |
| `PATCH` | `/api/requests/:id` | Edit customer/item info (before decision) | `200`, `400`, `404`, `422` |
| `POST` | `/api/requests/:id/transition` | Transition status with resolution | `200`, `400`, `404`, `422` |
| `DELETE` | `/api/requests/:id` | Soft-remove request from desk | `200`, `404`, `422` |
| `GET` | `/api/requests/:id/notes` | Get chronological notes | `200`, `404` |
| `POST` | `/api/requests/:id/notes` | Append an audit note | `201`, `400`, `404` |

---

## Key Architecture & Design Decisions

1. **Domain Service Layer (`returnService.js`)**: Separates database access and business logic from Next.js route handlers. This keeps route handlers thin and makes the core logic easily unit-testable without mocking HTTP requests.
2. **PostgreSQL Relational Storage**: Stored with native enums and composite indexes on `[customerName, customerEmail]`, `[orderId]`, and `[reference]` for efficient server-side filtering and sorting.
3. **Zod Validation at Boundaries**: Incoming query parameters and request bodies are validated at the HTTP boundary before hitting domain services.
4. **Collision-Resistant Reference Generation**: Unique `RET-YYYY-XXXXX` codes generated using an unambiguous alphanumeric character set (`23456789ABCDEFGHJKLMNPQRSTUVWXYZ`) with automatic collision retry logic.
5. **Debounced UI Search**: 350ms input debouncing in the frontend search bar prevents unnecessary round-trips while keeping results dynamic.
