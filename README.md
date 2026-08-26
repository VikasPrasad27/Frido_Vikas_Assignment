# ReturnDesk — Online Store Returns & Support Management Portal

[![Next.js](https://img.shields.io/badge/Next.js-16.3-black?style=flat&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-blue?style=flat&logo=react)](https://react.dev/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-blue?style=flat&logo=postgresql)](https://www.postgresql.org/)
[![Prisma](https://img.shields.io/badge/Prisma-6-indigo?style=flat&logo=prisma)](https://www.prisma.io/)
[![Tailwind CSS](https://img.shields.io/badge/TailwindCSS-v4-cyan?style=flat&logo=tailwindcss)](https://tailwindcss.com/)
[![Vitest](https://img.shields.io/badge/Vitest-Passed%2038%2F38-emerald?style=flat&logo=vitest)](https://vitest.dev/)

**ReturnDesk** is a returns desk and support portal designed for an online retail store. When customers request a return or replacement, support agents manage the lifecycle: reviewing items, approving or rejecting tickets, deciding resolution pathways (**Refund**, **Replacement**, or **Store Credit**), attaching chronological audit notes, and closing out cases.

---

## Table of Contents
1. [Overview & Product Brief](#overview--product-brief)
2. [Core Architecture & File Structure](#core-architecture--file-structure)
3. [The 5 Business Rules (Server-Enforced)](#the-5-business-rules-server-enforced)
4. [Database Design & Schema](#database-design--schema)
5. [REST API Specification](#rest-api-specification)
6. [Frontend Design & Ergonomics](#frontend-design--ergonomics)
7. [Getting Started (Setup from Clean Machine)](#getting-started-setup-from-clean-machine)
8. [Running Automated Tests](#running-automated-tests)
9. [Design Decisions & Technical Rationale](#design-decisions--technical-rationale)
10. [Assumptions, Completeness & Future Work](#assumptions-completeness--future-work)
11. [Requirements Verification Matrix](#requirements-verification-matrix)

---

## Overview & Product Brief

ReturnDesk provides a dedicated support agent portal to manage return workflows with rigorous data integrity.

### Key Capabilities:
- **Automated Human-Readable Reference:** Automatically assigns format `RET-YYYY-XXXXX` (e.g., `RET-2026-A1B2C`) using collision-resistant alphanumeric generation. Agents never manually type references.
- **Server-Driven Querying & Filtering:** Search across customer names, emails, order IDs, item SKUs, and return references; filter by status and reason; sort by timestamp, customer, or order; paginated at the database layer.
- **Debounced Search:** 350ms input debouncing ensures fast, keystroke-efficient server lookups without flooding the backend.
- **Chronological Immutable Audit Notes:** Agents can attach notes at any point in a ticket's life. Notes cannot be modified or deleted.
- **Strict Server-Side Lifecycle Rules:** Legal state progressions, resolution rules, lock-on-decision, and soft-removal constraints are enforced at the API/Service level.
- **Mobile-Responsive UI:** Clean, modern layout usable down to `375px` viewport width.

---

## Core Architecture & File Structure

The project uses Next.js App Router with a centralized Domain/Service layer separating HTTP handling from business logic:

```
├── .env.example                      # Documented environment variables template
├── prisma/
│   ├── schema.prisma                 # Relational PostgreSQL schema definition
│   └── seed.js                       # 32+ realistic requests spanning all statuses & reasons
├── src/
│   ├── app/
│   │   ├── layout.js                 # Global HTML shell, SEO metadata, fonts
│   │   ├── page.js                   # Main Returns Desk dashboard (Client Component)
│   │   ├── globals.css               # Tailwind CSS imports and animations
│   │   └── api/                      # Next.js REST API Route Handlers
│   │       ├── requests/
│   │       │   ├── route.js          # GET (list/filter/page), POST (create)
│   │       │   ├── stats/route.js    # GET (dashboard counter metrics)
│   │       │   └── [id]/
│   │       │       ├── route.js      # GET (detail), PATCH (edit), DELETE (soft remove)
│   │       │       ├── status/route.js # POST (lifecycle state transition)
│   │       │       └── notes/route.js  # GET (notes list), POST (append note)
│   ├── lib/
│   │   ├── db.js                     # PrismaClient singleton with connection pooling
│   │   ├── errors.js                 # Standardized ApiError classes and HTTP error envelopes
│   │   ├── validators.js             # Zod input schemas for payloads & query params
│   │   ├── reference.js              # Reference generator (RET-YYYY-XXXXX)
│   │   ├── utils.js                  # Formatting, currency, dates, and status configs
│   │   └── services/
│   │       └── returnService.js      # Core Business Rules Engine & query methods
│   └── components/
│       ├── Navbar.js                 # Brand header & "Raise Request" trigger
│       ├── StatsOverview.js          # Clickable KPI metric cards
│       ├── FilterBar.js              # Debounced search, status/reason filters, sort
│       ├── RequestTable.js           # Responsive data table & mobile cards layout
│       ├── Pagination.js             # Server pagination controls
│       ├── CreateRequestModal.js     # Return creation modal form
│       ├── RequestDetailModal.js     # Detail view, edit form, action dispatchers
│       ├── ActionModals.js           # Approval, Reject, Complete, and Remove dialogs
│       ├── NotesSection.js           # Chronological immutable notes timeline
│       └── ui/                       # Accessible UI primitives (Button, Badge, Modal, Toast)
└── tests/
    ├── business-rules.test.js        # Vitest suite covering all 5 business rules (25 tests)
    ├── api-validation.test.js        # Schema validation & error envelopes (10 tests)
    └── search-filter.test.js         # Query, filter, and pagination math (3 tests)
```

---

## The 5 Business Rules (Server-Enforced)

The business rules are implemented centrally in `src/lib/services/returnService.js` and verified by automated unit & integration tests:

### Rule 1 — Strict Status Flow
```
        ┌────────┐      ┌───────────┐      ┌──────────┐      ┌───────────┐
        │  OPEN  │ ───> │ IN_REVIEW │ ───> │ APPROVED │ ───> │ COMPLETED │ (Terminal)
        └────────┘      └─────┬─────┘      └──────────┘      └───────────┘
                              │
                              ▼
                        ┌───────────┐
                        │ REJECTED  │ (Terminal)
                        └───────────┘
```
- **Allowed transitions:**
  - `OPEN` $\rightarrow$ `IN_REVIEW`
  - `IN_REVIEW` $\rightarrow$ `APPROVED` or `REJECTED`
  - `APPROVED` $\rightarrow$ `COMPLETED`
- `REJECTED` and `COMPLETED` are terminal states. Nothing moves out of them.
- Any illegal shortcut (e.g. `OPEN` $\rightarrow$ `APPROVED`, `APPROVED` $\rightarrow$ `REJECTED`) is rejected with `HTTP 422 Unprocessable Entity` (`INVALID_STATUS_TRANSITION`).

### Rule 2 — Approval Requires Valid Resolution
- Transitioning to `APPROVED` requires specifying a resolution: `REFUND`, `REPLACEMENT`, or `STORE_CREDIT`.
- If resolution is `REFUND`:
  - A `refundAmount` $> 0.00$ is mandatory.
  - Omitted, negative, or zero refund amounts are rejected (`REFUND_AMOUNT_REQUIRED`).
- If resolution is `REPLACEMENT` or `STORE_CREDIT`:
  - `refundAmount` must NOT be recorded (must be `null`).
  - Attempting to submit a refund amount on non-refund resolutions is rejected (`REFUND_AMOUNT_NOT_PERMITTED`).

### Rule 3 — One Live Request Per Order & Item
- A request is considered **live** if `deletedAt IS NULL` and `status IN ('OPEN', 'IN_REVIEW', 'APPROVED')`.
- A customer cannot have two simultaneous live requests for the same `orderId` and `itemSku`.
- Attempting to create a second live request fails with `HTTP 409 Conflict` (`DUPLICATE_LIVE_REQUEST`).
- Once the previous request reaches `REJECTED`, `COMPLETED`, or is soft-deleted, a new return request for that order and item is permitted.

### Rule 4 — Locked Once Decided
- Once a request reaches `APPROVED`, `REJECTED`, or `COMPLETED`, its customer and item details (name, email, phone, order, SKU, description, quantity, reason) cannot be modified.
- Attempting to update details on a decided ticket returns `HTTP 422 Unprocessable Entity` (`REQUEST_LOCKED`).
- **Notes can still be appended at any stage**, ensuring continuous auditability.

### Rule 5 — Soft Removal Constraints
- Taking a request off the desk does not delete the row from PostgreSQL.
- Only `OPEN` or `REJECTED` requests can be removed.
- Attempting to remove an `IN_REVIEW`, `APPROVED`, or `COMPLETED` request returns `HTTP 422 Unprocessable Entity` (`INVALID_REMOVAL_STATUS`).
- Removed requests have `deletedAt` populated and are automatically excluded from standard list queries and regular detail lookups (`HTTP 404`).

---

## Database Design & Schema

PostgreSQL schema managed via Prisma (`prisma/schema.prisma`):

### Enums
- `RequestStatus`: `OPEN`, `IN_REVIEW`, `APPROVED`, `REJECTED`, `COMPLETED`
- `ReturnReason`: `DAMAGED`, `WRONG_ITEM`, `SIZE_ISSUE`, `NOT_AS_DESCRIBED`, `CHANGED_MIND`
- `ResolutionType`: `REFUND`, `REPLACEMENT`, `STORE_CREDIT`

### Table: `requests`
| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | UUID | Primary Key, `default(uuid())` | Internal unique ID |
| `reference` | VARCHAR(32) | Unique, Indexed, Not Null | Public code (`RET-2026-XXXXX`) |
| `customer_name` | VARCHAR(255) | Not Null, Indexed | Customer full name |
| `customer_email` | VARCHAR(255) | Not Null, Indexed | Customer contact email |
| `customer_phone` | VARCHAR(50) | Nullable | Customer telephone number |
| `order_id` | VARCHAR(100) | Not Null, Indexed | Store Order identifier |
| `item_sku` | VARCHAR(100) | Not Null | Product SKU |
| `item_name` | VARCHAR(255) | Not Null | Product title / description |
| `quantity` | INTEGER | Not Null, Check $> 0$ | Returned unit quantity |
| `reason` | ReturnReason | Not Null, Indexed | Reason category |
| `status` | RequestStatus | Not Null, Default `OPEN` | Lifecycle state |
| `resolution` | ResolutionType | Nullable | Required on `APPROVED` |
| `refund_amount` | DECIMAL(10,2) | Nullable | Positive refund value if `REFUND` |
| `created_at` | TIMESTAMPTZ | Not Null, Default `now()` | Ticket creation timestamp |
| `updated_at` | TIMESTAMPTZ | Not Null, `updatedAt` | Last modification timestamp |
| `deleted_at` | TIMESTAMPTZ | Nullable | Soft deletion timestamp |

### Table: `notes`
| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | UUID | Primary Key, `default(uuid())` | Note identifier |
| `request_id` | UUID | Foreign Key $\rightarrow$ `requests(id)` | Associated return request |
| `author_name` | VARCHAR(255) | Default `'Support Agent'` | Author agent name |
| `content` | TEXT | Not Null | Immutable note body |
| `created_at` | TIMESTAMPTZ | Default `now()`, Indexed | Timestamp for chronological order |

---

## REST API Specification

All endpoints return uniform JSON envelopes with proper HTTP status codes.

### Endpoints Overview

| Method | Endpoint | Description | Status Codes |
|---|---|---|---|
| `GET` | `/api/requests` | List, search, filter, sort & paginate requests | `200`, `400` |
| `POST` | `/api/requests` | Raise a new return request | `201`, `400`, `409` |
| `GET` | `/api/requests/stats` | Retrieve aggregate counts for dashboard KPI cards | `200` |
| `GET` | `/api/requests/:id` | Fetch single request details + chronological notes | `200`, `404` |
| `PATCH` | `/api/requests/:id` | Update customer/item details (prior to decision) | `200`, `400`, `404`, `422` |
| `POST` | `/api/requests/:id/transition` | Execute lifecycle transition + resolution | `200`, `400`, `404`, `422` |
| `DELETE` | `/api/requests/:id` | Soft-remove request from active desk | `200`, `404`, `422` |
| `GET` | `/api/requests/:id/notes` | Get chronological notes for request | `200`, `404` |
| `POST` | `/api/requests/:id/notes` | Append an immutable note to request | `201`, `400`, `404` |

### Standard Response Formats

#### 1. Success Response
```json
{
  "success": true,
  "data": {
    "id": "7b58c541-6979-4d64-a636-fcfdca2b5a67",
    "reference": "RET-2026-A1B2C",
    "customerName": "Aarav Sharma",
    "customerEmail": "aarav.sharma@example.com",
    "orderId": "ORD-10001",
    "itemSku": "SKU-SHIRT-BLU-M",
    "itemName": "Classic Oxford Cotton Shirt - Blue (M)",
    "quantity": 1,
    "reason": "SIZE_ISSUE",
    "status": "OPEN",
    "resolution": null,
    "refundAmount": null,
    "createdAt": "2026-08-20T09:30:00.000Z",
    "notes": []
  },
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 32,
    "totalPages": 4,
    "hasNextPage": true,
    "hasPrevPage": false
  }
}
```

#### 2. Machine-Readable Error Response
```json
{
  "success": false,
  "error": {
    "code": "INVALID_STATUS_TRANSITION",
    "message": "Illegal transition from 'OPEN' to 'APPROVED'. Only valid lifecycle steps are allowed.",
    "details": [
      {
        "field": "status",
        "issue": "Valid transitions: OPEN -> IN_REVIEW -> APPROVED -> COMPLETED or IN_REVIEW -> REJECTED."
      }
    ]
  }
}
```

---

## Frontend Design & Ergonomics

- **Clean Support Desk Interface:** Built with pure Tailwind CSS and Lucide icons without bulky external component kits.
- **State Feedback:**
  - Animated skeleton loaders during server roundtrips.
  - Contextual empty states with clear filters or create request triggers.
  - Floating error and success toast notifications surfacing backend refusal explanations.
- **Action Guarding:** The UI presents only legal lifecycle action buttons for a request's current state (e.g. `Approve` and `Reject` are only displayed when status is `In Review`).
- **Responsive down to 375px:** Tables automatically transition to structured mobile cards on narrow screens.

---

## Getting Started (Setup from Clean Machine)

### 1. Prerequisites
- **Node.js**: v18.17+ or v20+ (tested on Node v24)
- **npm**: v9+
- **PostgreSQL Database**: Any PostgreSQL instance (local, Docker, Supabase, Neon, or Render).

### 2. Clone & Install Dependencies
```bash
git clone <repository-url>
cd Frido_Vikas_Assignment
npm install
```

### 3. Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Update `DATABASE_URL` in `.env` with your PostgreSQL connection string:
```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/returndesk?schema=public"
```

> **Using Docker PostgreSQL?**
> If you have Docker installed, you can start a local PostgreSQL container with:
> ```bash
> docker run --name returndesk-pg -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=returndesk -p 5432:5432 -d postgres:16-alpine
> ```

### 4. Push Schema & Generate Prisma Client
```bash
npx prisma db push
```

### 5. Run Database Seed Script
The seed script populates 32 realistic return requests across all statuses, reasons, and resolutions, complete with chronological notes:
```bash
npm run db:seed
```

### 6. Start Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Running Automated Tests

Run the Vitest test suite covering all 5 business rules, API schemas, and query filters:

```bash
npm run test
```

To run tests in watch mode:
```bash
npm run test:watch
```

### Test Coverage Summary:
- `tests/business-rules.test.js`: 25 unit/integration tests verifying all lifecycle transitions, approval resolutions, refund amount boundaries, live item duplicates, locked records, and soft deletion rules.
- `tests/api-validation.test.js`: 10 tests for Zod schema constraints, email validation, positive quantities, and reference format.
- `tests/search-filter.test.js`: 3 tests for SQL filtering, multi-field search query compilation, and pagination math.

---

## Design Decisions & Technical Rationale

1. **Why JavaScript (ESM)?**
   - Clean, modern JavaScript with descriptive naming, JSDoc annotations, and centralized Zod validation provides lightweight, accessible codebase navigation without compilation overhead.
2. **Why Prisma ORM?**
   - Declarative `schema.prisma` provides clear entity relationships, migrations, type generation, transactional safety (`$transaction`), and seamless relational seeding.
3. **Why Next.js App Router Route Handlers?**
   - Eliminates multi-service deployment orchestration while maintaining clean separation of concerns between HTTP routes (`app/api/`) and business domain services (`lib/services/`).
4. **Why Pure Tailwind CSS with Bespoke Primitives?**
   - Meets the assignment constraint against generic admin boilerplate templates, ensuring an ultra-fast, lightweight design tailored specifically for ReturnDesk.
5. **Why `RET-YYYY-XXXXX` Reference Code?**
   - Provides a human-readable, unambiguous reference (e.g. `RET-2026-8A3F1`) that is easy for customers and agents to quote over phone/email.

---

## Assumptions, Completeness & Future Work

### Assumptions
- Return requests are raised by agents on behalf of customers or ingested from the customer storefront.
- Agents act under standard authorization (authentication was omitted as specified in the brief).
- Currency is denominated in standard USD (`$`) format for refunds.

### Completeness
- **100% of Core Brief Implemented:**
  - Automated reference generation.
  - Server-side search, filtering, sorting, and pagination.
  - Chronological immutable notes.
  - Detail editing for undecide requests.
  - Soft removal for Open and Rejected requests.
  - All 5 Business Rules strictly enforced server-side.
  - 32-record comprehensive seed script.
  - Full test suite (38/38 passing).

### Potential Future Enhancements
- Email webhook notifications for customers when returns are approved/refunded.
- Customer self-service portal for tracking return status via reference code.
- File attachment uploads for damaged goods photo verification.

### Development Time
- Approximate development time spent: ~4.5 hours.

---

## Requirements Verification Matrix

| Requirement | Implemented | Verified | Notes |
|---|:---:|:---:|---|
| **Rule 1: Status Flow** | ✅ Yes | ✅ Yes | Strict state machine: Open $\rightarrow$ In Review $\rightarrow$ Approved $\rightarrow$ Completed / Rejected |
| **Rule 2: Approval Resolution** | ✅ Yes | ✅ Yes | Mandatory resolution; refund requires $>0$ amount; non-refund rejects amount |
| **Rule 3: One Live Request / Item** | ✅ Yes | ✅ Yes | Server-side duplicate check across live statuses (`OPEN`, `IN_REVIEW`, `APPROVED`) |
| **Rule 4: Locked Once Decided** | ✅ Yes | ✅ Yes | Edits rejected on `APPROVED`, `REJECTED`, `COMPLETED`; notes remain allowed |
| **Rule 5: Soft Removal** | ✅ Yes | ✅ Yes | `deletedAt` set on `OPEN`/`REJECTED`; excluded from queries; non-removable statuses rejected |
| **Server Search/Filter/Sort/Page** | ✅ Yes | ✅ Yes | Handled via PostgreSQL query parameters; debounced 350ms in UI |
| **PostgreSQL Persistence** | ✅ Yes | ✅ Yes | Prisma ORM with relational schema & indexes |
| **Seed Data ($\ge 30$ requests)** | ✅ Yes | ✅ Yes | 32 realistic requests spanning all 5 statuses and reasons |
| **Automated Tests** | ✅ Yes | ✅ Yes | 38/38 tests passing in Vitest |
| **Responsive UI ($\ge 375$px)** | ✅ Yes | ✅ Yes | Mobile cards layout + desktop table |
| **Clean Git History** | ✅ Yes | ✅ Yes | Logical step-by-step feature commits |
