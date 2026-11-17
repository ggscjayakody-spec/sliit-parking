# SLIIT Parking: Frontend

Frontend for the QR-based vehicle pass and parking fee system. It is built with **Next.js** and **Tailwind CSS** and deploys to **Vercel**.

There are three portals, based on the team's Canva board:

| Portal | URL | Who | What they can do |
|---|---|---|---|
| Student | `/`, `/login`, `/register`, `/student/*` | Students | Register a vehicle with a payment slip, see the QR vehicle pass, pay fees by uploading a slip, see payment history |
| Enforcer | `/enforcer/*` (phone layout) | Parking enforcers | Scan a pass QR (or search by ID or vehicle number), see student details, add fees, view the fees they issued |
| Admin | `/admin/*` | Parking office | Approve or reject pending slips (passes and fees), see payment history, look up students |

---

## Run it locally

```bash
npm install
npm run dev
```

Open http://localhost:3000.

### Demo mode (no backend needed)

If `NEXT_PUBLIC_API_URL` is **not** set, the app uses built-in sample data (`src/lib/mock.ts`). This data is stored in the browser's localStorage, so the full flow works: register, have an admin approve the slip, see the QR, and have an enforcer scan it.

| Role | Login | Password |
|---|---|---|
| Student | `IT26123567` | `password123` |
| Enforcer | `EN0106` | `password123` |
| Admin | `ADMIN01` | `admin123` |

To reset the demo data, clear the site's localStorage in your browser.

### Connect the real backend

Copy `.env.example` to `.env.local` and set the backend URL:

```
NEXT_PUBLIC_API_URL=https://your-backend.example.com/api
```

**All backend calls are in one file: `src/lib/api.ts`.** If the backend uses different paths or field names, change them there and nowhere else. The data shapes are in `src/lib/types.ts`.

> Testing the QR camera on your phone needs **HTTPS**. Use the Vercel deployment, or run `npx next dev --experimental-https` and open it from your phone on the same Wi-Fi.

---

## Deploy to Vercel

1. Push this folder to a GitHub repo.
2. On https://vercel.com, click **Add New → Project**, import the repo, and keep the default settings (Vercel detects Next.js).
3. Under **Settings → Environment Variables**, add `NEXT_PUBLIC_API_URL` with the backend URL. Leave it out to deploy the demo version.
4. Deploy. Each push to `main` redeploys automatically, and each pull request gets its own preview URL.

**Tell the backend teammate:** allow CORS from your Vercel domain (for example `https://sliit-parking.vercel.app`) and from `http://localhost:3000`. Allow the `Authorization` and `Content-Type` headers and the methods `GET, POST, PATCH`.

---

## API contract (for the backend teammate)

- Every request after login sends `Authorization: Bearer <token>`.
- Errors return a non-2xx status and a body like `{ "message": "Human readable error" }`. The UI shows `message` to the user.
- A `401` response logs the user out.
- Dates use the `YYYY-MM-DD` format. Amounts are numbers in LKR.

### Objects

```ts
Student  { id, fullName, contact, vehicleNumber, vehicleType, passStatus: "active"|"pending"|"rejected"|"expired", passValidUntil: string|null, qrToken: string|null }
Payment  { id, studentId, kind: "pass"|"fee", amount, date, status: "pending"|"approved"|"rejected", slipUrl: string|null, feeId?: string|null }
Fee      { id, studentId, vehicleNumber, amount, reason, date, status: "unpaid"|"pending"|"paid", issuedBy }
Enforcer { id, fullName }
Admin    { id, fullName }
LoginResult   { token, userId }
StudentLookup { student: Student, overdueFees: Fee[] }
```

`vehicleType` is one of `Car`, `Motorbike`, `Van`, `Three-wheeler`, `Other`.

### Endpoints

| Method | Path | Body / query | Returns |
|---|---|---|---|
| POST | `/auth/student/login` | `{ id, password }` | `LoginResult` |
| POST | `/auth/student/register` | **multipart**: `id, fullName, contact, vehicleNumber, vehicleType, password, paymentSlip (file)` | `{ ok: true }`. This also creates a pending `pass` payment. |
| POST | `/auth/enforcer/login` | `{ id, password }` | `LoginResult` |
| POST | `/auth/admin/login` | `{ id, password }` | `LoginResult` |
| GET | `/students/me` | — | `Student` |
| GET | `/students/me/payments` | — | `Payment[]` |
| GET | `/students/me/fees` | — | `Fee[]` |
| POST | `/payments` | **multipart**: `kind, amount, feeId?, slip (file)` | `Payment`. If `feeId` is sent, set that fee to `pending`. |
| GET | `/enforcers/me` | — | `Enforcer` |
| GET | `/students/lookup?q=` | `q` = scanned QR text, IT number, or vehicle number | `StudentLookup` |
| POST | `/fees` | `{ studentId, amount, reason }` | `Fee` (status `unpaid`, `issuedBy` = the logged-in enforcer) |
| GET | `/enforcers/me/fees?status=` | optional `status` | `Fee[]` issued by this enforcer |
| GET | `/admins/me` | — | `Admin` |
| GET | `/admin/payments?status=&kind=&studentId=` | all optional | `Payment[]` |
| PATCH | `/admin/payments/:id` | `{ status: "approved" \| "rejected" }` | `Payment` |
| GET | `/admin/students/:idOrVehicle` | — | `StudentLookup` |

### What the backend should do when an admin approves

- **Pass payment approved:** set the student's `passStatus` to `active`, set `passValidUntil` (for example one year from now), and create a `qrToken`.
- **Fee payment approved:** set the linked fee to `paid`. If it is rejected, set the fee back to `unpaid`.

### About the QR code

The student's pass shows `qrToken` as a QR code. The enforcer app scans it and sends the scanned text to `/students/lookup?q=...`. The demo uses `SLIITPARK:<IT number>`. A real backend should use a random or signed token, so that nobody can make a valid pass just by knowing someone's IT number.

---

## Project structure

```
src/
  app/                 pages (one folder per URL)
    student/           student portal (sidebar layout)
    enforcer/          enforcer portal (phone layout)
    admin/             admin portal
  components/          shared UI: buttons, fields, QR scanner, rows
  lib/
    api.ts             ← every backend call (edit this to match the backend)
    mock.ts            sample-data backend for demo mode
    types.ts           data shapes
    session.ts         login token storage
    hooks.ts           useApi, route guards
```
