# SLIIT Parking

QR-based vehicle pass and parking fee system for SLIIT, built with **Next.js** and **Tailwind CSS** and deployed on **Vercel**. The **backend is included**: API routes under `/api`, backed by a **Postgres** database. All three portals share that one database, so they're connected:

- A student registers with a payment slip, and the admin sees the slip in **Pending Payments**.
- The admin approves the slip, and the student's **QR pass** appears.
- An enforcer adds a parking fee, and the student sees it under **Pay Unregistered Fee**.
- The student pays the fee, the admin approves it, and the enforcer sees it as **Paid**.
- Enforcers scan QR codes and add fees, and the admin sees all of it on that enforcer's **Activity** page.

| Portal | URL | Who | What they can do |
|---|---|---|---|
| Student | `/`, `/login`, `/register`, `/student/*` | Students | Register a vehicle (the payment slip is optional), see the QR vehicle pass, pay parking fees and the pass fee by uploading a slip, see payment history |
| Enforcer | `/enforcer/*` (phone layout) | Parking enforcers | Scan a pass QR (or search by ID or vehicle number), see student details, add parking fees for students without a valid pass, view the fees they issued |
| Admin | `/admin/*` | Parking office | Approve or reject slips (Pending Payments), look up students, see payment history, create enforcer logins and see each enforcer's activity |

---

## Deploy on Vercel (one-time setup)

1. **Import the repo:** in Vercel, go to **Add New → Project** and import this repo.
2. **Add a database:** open the project, go to **Storage → Create Database**, choose **Neon** (Postgres, free plan), and connect it to this project. Vercel adds `DATABASE_URL` for you.
3. **Set the admin password:** go to **Settings → Environment Variables** and add `ADMIN_PASSWORD`, set to the password the admin will log in with. Use a long one.
4. **Redeploy:** go to **Deployments**, open the menu (⋯) on the latest deployment, and choose **Redeploy**.

The tables are created automatically on the first request. To check the setup, open `https://<your-site>/api/health`. It should show `"database": true, "adminPassword": true`.

Optional: set `AUTH_SECRET` to a long random string to choose your own key for login tokens. Without it, the key is derived from the database URL.

After this, every push to `main` redeploys automatically.

---

## Run it locally

```bash
npm install
cp .env.example .env.local   # then fill it in, see below
npm run dev
```

Open http://localhost:3000. In `.env.local`, choose **one** of these:

- **With the real backend:** set `DATABASE_URL` (you can use the same Neon database; copy it from Vercel → Storage) and `ADMIN_PASSWORD`.
- **Demo mode (no database):** set `NEXT_PUBLIC_DEMO_MODE=1`. Sample data is kept in your browser only, so the portals are connected only within the same browser. Demo logins:

| Role | Login | Password |
|---|---|---|
| Student (active pass) | `IT26123567` | `password123` |
| Student (slip waiting for admin) | `IT26543867` | `password123` |
| Student (registered without a slip) | `IT26777001` | `password123` |
| Student (pass expired) | `IT26112233` | `password123` |
| Enforcer | `EN0106` | `password123` |
| Admin (password only) | — | `admin123` |

> Testing the QR camera on your phone needs **HTTPS**. Use the Vercel site, or run `npx next dev --experimental-https` and open it from your phone on the same Wi-Fi.

### Using a separate backend instead

If someone else hosts the backend, set `NEXT_PUBLIC_API_URL=https://their-backend.example.com/api`. All frontend calls are in `src/lib/api.ts`. The backend must follow the API contract below and allow CORS from the site.

---

## How the backend works

| | |
|---|---|
| Code | `src/app/api/[...path]/route.ts` passes every request to `src/server/handlers.ts` |
| Database | Postgres (Neon). Tables: `students`, `enforcers`, `admins`, `payments`, `fees`, `slips`, `enforcer_activity`. Created automatically on the first request (`src/server/db.ts`) |
| Logins | Passwords hashed with bcrypt. Login returns a token (JWT, valid 7 days) that includes the role. Every endpoint checks the role: a student can't call admin endpoints, and so on |
| Admin | Logs in with `ADMIN_PASSWORD` only, as in the design. There is no admin sign-up |
| Payment slips | Stored in the database (image or PDF, max 4 MB; large phone photos are shrunk in the browser before upload). Slips open through signed links that expire after 1 hour |
| QR codes | Random, unguessable token per student, replaced each time a pass is approved or renewed |
| Amounts | The server sets the pass price (1,500/=) and fee amounts itself, rather than trusting the browser |
| Time zone | "Today" (fee dates, pass expiry) uses Sri Lanka time |

---

## API contract

All paths below are under `/api`.

- Every request after login sends `Authorization: Bearer <token>`.
- Errors return a non-2xx status and a body like `{ "message": "Human readable error" }`. The UI shows `message` to the user.
- A `401` response logs the user out.
- Dates use the `YYYY-MM-DD` format. Amounts are numbers in LKR.

### Objects

```ts
Student  { id, fullName, contact, vehicleNumber, vehicleType, passStatus: "active"|"pending"|"rejected"|"expired", passValidUntil: string|null, qrToken: string|null }
Payment  { id, studentId, kind: "pass"|"fee", amount, date, status: "pending"|"approved"|"rejected", slipUrl: string|null, feeId?: string|null }
Fee      { id, studentId, vehicleNumber, hours, amount, date, status: "unpaid"|"pending"|"paid", issuedBy }
Enforcer { id, fullName }
EnforcerSummary  Enforcer + { feesIssued, feeTotal, lastActive }
EnforcerActivity { enforcer, summary: { scans, searches, fees, feeTotal, today, lastActive }, items: ActivityItem[] }
ActivityItem     { id, action: "scan"|"search"|"fee", at, query, studentId, studentName, vehicleNumber, amount, hours, feeStatus }
Admin    { id, fullName }
LoginResult   { token, userId }
StudentLookup { student: Student, overdueFees: Fee[] }
```

`vehicleType` is one of `Car`, `Motorbike`, `Van`, `Three-wheeler`, `Other`.

### Endpoints

| Method | Path | Body / query | Returns |
|---|---|---|---|
| POST | `/auth/student/login` | `{ id, password }` | `LoginResult` |
| POST | `/auth/student/register` | **multipart**: `id, fullName, contact, vehicleNumber, vehicleType, password, paymentSlip (file, optional)` | `{ ok: true }`. See "Vehicle pass rules" below. |
| POST | `/auth/enforcer/login` | `{ id, password }` | `LoginResult` |
| POST | `/auth/admin/login` | `{ password }` (**password only**, as in the design) | `LoginResult` |
| GET | `/students/me` | — | `Student` |
| GET | `/students/me/payments` | — | `Payment[]` |
| GET | `/students/me/fees` | — | `Fee[]` |
| POST | `/payments` | **multipart**: `kind, amount, feeId?, slip (file)` | `Payment` (status `pending`). If `feeId` is sent, set that fee to `pending`. |
| GET | `/enforcers/me` | — | `Enforcer` |
| GET | `/students/lookup?q=&via=` | `q` = scanned QR text, IT number, or vehicle number. `via` = `scan` or `search` records it in the enforcer's activity | `StudentLookup` |
| POST | `/fees` | `{ studentId, hours, amount }` | `Fee` (status `unpaid`, `issuedBy` = the logged-in enforcer). Return `409` if the student has a valid pass. |
| GET | `/enforcers/me/fees?status=` | optional `status` | `Fee[]` issued by this enforcer |
| GET | `/admins/me` | — | `Admin` |
| GET | `/admin/payments?status=&kind=&studentId=` | all optional | `Payment[]` |
| PATCH | `/admin/payments/:id` | `{ status: "approved" \| "rejected" }` | `Payment` |
| GET | `/admin/students/:idOrVehicle` | — | `StudentLookup` |
| GET | `/admin/enforcers` | — | `EnforcerSummary[]` |
| POST | `/admin/enforcers` | `{ id, fullName, password }` | `Enforcer`. `409` if the ID is taken. **Admin token only.** |
| GET | `/admin/enforcers/:id/activity` | — | `EnforcerActivity` (latest 200 items) |
| GET | `/slips/:id?exp=&sig=` | signed link from `slipUrl` | the slip file |
| GET | `/health` | — | `{ ok, database, adminPassword }`, for checking the setup |

### Vehicle pass rules

**The QR pass is only issued after an admin approves the payment slip.**

- **Registered with a payment slip:** set `passStatus` to `pending` with no `qrToken`. Create a `pass` payment with status `pending` and the slip's `slipUrl`. It then shows up in the admin's Pending Payments.
- **Registered without a slip:** set `passStatus` to `pending` with no `qrToken` and no payment. The student uploads a slip later through `POST /payments` with `kind: "pass"`, which creates the same pending payment.
- **Admin approves a pass payment:** set `passStatus` to `active`, set `passValidUntil` (for example one year from now), and generate a `qrToken`. The QR appears for the student.
- **Admin rejects a pass payment:** set `passStatus` to `rejected`. The student sees "payment rejected" and can upload a new slip.
- The student's screen can tell "slip sent, waiting for the admin" apart from "no slip yet", because it checks `/students/me/payments` for a `pass` payment with status `pending`.

### Enforcer accounts

Only an admin can create enforcer accounts, through `POST /admin/enforcers` from the admin portal's **Enforcers** page. There is **no** enforcer sign-up endpoint, so the backend must reject that route for anyone who isn't logged in as an admin. Enforcer IDs look like `EN0107`.

### Fee rules

- **What a fee is:** a parking charge for a period of time (`hours`), issued by an enforcer. There are no fines for other reasons.
- **Who can get a fee:** only students **without a valid pass**, meaning `passStatus` is `pending` or `rejected` (no QR yet, for example because they registered without a slip), or the pass has **expired**. Refuse with `409` if the student's pass is valid.
- **Amount:** the frontend suggests `hours × 50/=` (the `PRICES.hourly` setting in `src/lib/api.ts`), and the enforcer can change it. Store the amount that was sent.
- **Paying:** students pay fees under **Pay Unregistered Fee**. Students without a valid pass can also pay the 1,500/= pass fee under **Vehicle Pass Fee**, which renews an expired pass once an admin approves it.
- **Expiry:** if `passValidUntil` is before today, return `passStatus: "expired"`.

- **Fee payment approved:** set the linked fee to `paid`.
- **Fee payment rejected:** set the linked fee back to `unpaid`.

### About the QR code

The student's pass shows `qrToken` as a QR code. The enforcer app scans it and sends the scanned text to `/students/lookup?q=...&via=scan`. The backend uses a random token, so nobody can make a valid pass just by knowing someone's IT number. Demo mode uses `SLIITPARK:<IT number>`.

---

## Project structure

```
src/
  app/                 pages (one folder per URL)
    student/           student portal (sidebar layout)
    enforcer/          enforcer portal (phone layout)
    admin/             admin portal (incl. enforcers/activity)
    api/[...path]/     the backend's single entry point
  server/              backend code (runs on the server only)
    handlers.ts        every endpoint + business rules
    db.ts              database connection and tables
    auth.ts            passwords, login tokens, signed slip links
  components/          shared UI: buttons, fields, QR scanner, rows
  lib/
    api.ts             every call the frontend makes to the backend
    mock.ts            in-browser fake backend for demo mode
    types.ts           data shapes shared by both sides
    image.ts           shrinks big slip photos before upload
```
