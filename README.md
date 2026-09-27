# HomeFlow

**English** · [Español](README.es.md) · [Català](README.ca.md)

<p align="center">
  <img src="public/homeflow-logo-rounded.png" alt="HomeFlow logo" width="220">
</p>

HomeFlow is a private household finance application for recording monthly account balances, cash, income, receivables, payables, wealth adjustments, and annual savings goals.

It presents the household position as a monthly closing rather than as a transaction ledger. From those closings, HomeFlow calculates net worth, real and operational savings, estimated spending, savings rate, historical evolution, and year-end forecast scenarios.

The interface supports Spanish, Catalan, and English, with dates formatted for the selected language and amounts displayed in euros or US dollars.

## Features

- Monthly household balance-sheet snapshots.
- Multiple bank accounts, income sources, and cash entries.
- Receivables and payables tracking.
- Future commitments that remain outside monthly calculations until converted into a real payable.
- Wealth adjustments for events such as mortgage amortisation or other non-operational changes.
- Net worth, liquidity, savings, estimated spending, and savings-rate calculations.
- Historical charts with custom date ranges and selectable metrics.
- Year-end forecasts based on the savings recorded in previous years.
- Annual savings goals with accumulable and non-accumulable allocations.
- Multi-sheet Excel reports for a selected month range.
- Full database export and import in JSON format, with an automatic backup before imports.
- Branded splash screen during the initial application load.
- Editable demo data stored only for the current browser-tab session, isolated from real records.
- Persistent light and dark appearance modes.
- Persistent EUR or USD display preference.
- Spanish, Catalan, and English interface localisation.
- Local JSON persistence with no external database or Python backend.

## Application routes

| Route | Purpose |
| --- | --- |
| `/` | Dashboard for the active month. |
| `/evolution` | Historical evolution of net worth, savings, income, or estimated spending. |
| `/forecast` | Year-end scenarios based on previous years. |
| `/analysis` | Detailed analysis of the selected month. |
| `/annual-goal` | Annual savings goal, purpose, progress, and allocation breakdown. |
| `/data` | Data management: Excel reports and complete JSON database backups. |
| `/register` | Create, edit, save, and delete monthly closings. |

## Technology stack

- Next.js with the App Router and Route Handlers.
- React.
- Electron and Electron Forge for the installable desktop application.
- TypeScript with strict type checking.
- Tailwind CSS and global CSS through PostCSS.
- Font Awesome and Lucide icons.
- A small in-repository XLSX writer; no spreadsheet library is required.

## Requirements

- Node.js compatible with the current Electron toolchain.
- npm, using the included `package-lock.json`.
- A writable local filesystem for `data/homeflow.json`.

No environment variables or external services are required for local use.

## Installation

Clone the repository, enter its directory, and install the locked dependencies:

```bash
git clone https://github.com/abujalancej/homeflow.git
cd homeflow
npm ci
```

If you are working from an existing checkout and intentionally want npm to update the lockfile, use `npm install` instead.

## Development

Start the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Changes to the application are applied by the Next.js development server.

## Production build

Create and run an optimised production build:

```bash
npm run build
npm start
```

`npm start` uses Next.js's default production port, `3000`.

## Desktop application

Run HomeFlow in an Electron window during development:

```bash
npm run desktop:dev
```

Create an unpacked application bundle or a distributable for the current operating system and architecture:

```bash
npm run desktop:package
npm run desktop:make
```

Electron Forge writes generated applications and installers to `out/`. The configured targets are DMG and ZIP on macOS, Squirrel and ZIP on Windows, and DEB, RPM, and ZIP on Linux. Packaging another operating system normally requires building on that operating system. Code signing and notarisation are not configured yet.

The installed application starts the Next.js standalone server internally on an available loopback port. Its renderer uses context isolation, process sandboxing, no Node.js integration, denied permission requests, and restricted navigation. No external server is required.

## Usage

1. Open **Registro** and select an existing month or create a new one.
2. Add income sources, account balances, cash, amounts to receive, real amounts to pay, and any wealth adjustments.
3. Record estimated purchases in **Future commitments**. They do not affect monthly figures until **Convert to real payable** is used.
4. Save the monthly closing. The web build writes it and the future commitments to `data/homeflow.json`; the desktop build uses its private application-data directory.
5. Use **Resumen** and **Análisis** to inspect the active month. **Resumen** also shows the active year's planned commitments and the resulting available liquidity without counting them as current expenses.
6. Use **Evolución** to compare historical metrics over a recent, custom, or complete range.
7. Use **Previsión** to compare possible year-end results against previous years.
8. Open **Meta anual**, choose a year, and use **Editar** to unlock its purpose and allocation breakdown. Save or cancel the changes from the editor toolbar.
9. From **Data**, download a multi-sheet workbook or export/import the complete database as JSON to move it between installations.

Only confirmed invoices or obligations still unpaid at month-end belong in **Payables**. Outstanding receivables and payables are copied into a newly created month and remain there until removed. Expenses paid during the month are already reflected by the closing account balances and must not also be added as an outstanding payable.

The last active month is remembered in browser local storage under `homeflow.activeMonth`, the selected appearance under `homeflow.theme`, and the display currency under `homeflow.currency`. Temporary demo edits use browser session storage under `homeflow.demoStore`. Financial records themselves are stored on the server filesystem, not in the browser.

Changing between EUR and USD changes the displayed symbol and number formatting; it does not convert stored amounts using an exchange rate.

## Data storage

HomeFlow does **not** use PostgreSQL, SQLite, MySQL, or another database server. Its persistent store is the following JSON file:

```text
data/homeflow.json
```

In the installed Electron application, the equivalent file is stored under Electron's per-user `userData` directory as `data/homeflow.json` (for example, `~/Library/Application Support/HomeFlow/data/homeflow.json` on macOS). This keeps real records outside the application bundle and outside the repository. The desktop process uses that location automatically unless `HOMEFLOW_DATA_DIR` explicitly selects another directory.

The server-side storage layer is implemented in `src/lib/homeflow-store.ts` and uses Node.js filesystem APIs.

- The whole file is read when the application loads data.
- Incoming records are normalised before use.
- Saving or deleting a record rewrites the complete JSON document.
- If the file does not exist, HomeFlow creates a valid empty store automatically.
- All money values are stored as JSON numbers.
- Month identifiers use the `YYYY-MM` format.
- Timestamps use ISO 8601 strings.

### Important storage considerations

- Back up `data/homeflow.json` before bulk edits, migrations, or upgrades.
- The complete `data/` directory is excluded from Git so real financial records and automatic backups are never committed.
- Importing a JSON backup replaces the current store after validation and saves the previous store to `data/homeflow.backup.json`.
- The file may contain private financial information. Review it before publishing or sharing the repository.
- The current storage implementation is designed for a private, single-process installation. It does not provide file locking or transactional concurrent writes.
- Production hosting must provide a writable, persistent filesystem. Ephemeral or read-only serverless filesystems will lose changes; migrate the store to a durable database before using such a platform.
- The application has no authentication or user separation. Do not expose it publicly without adding an access-control layer.

## Data model

The store has three top-level collections:

```json
{
  "months": [],
  "annualGoals": [],
  "futureCommitments": []
}
```

A monthly closing follows this shape:

```json
{
  "id": "2026-08",
  "month": "2026-08",
  "income": 0,
  "incomeEntries": [
    { "id": "income-1", "name": "Salary", "amount": 0 }
  ],
  "cash": 0,
  "cashEntries": [
    { "id": "cash-1", "name": "Cash", "amount": 0 }
  ],
  "accounts": [
    { "id": "account-1", "name": "Current account", "balance": 0 }
  ],
  "receivables": [],
  "payables": [],
  "adjustments": [],
  "notes": "Optional monthly note",
  "updatedAt": "2026-08-25T10:00:00.000Z"
}
```

A future commitment is independent from monthly closings:

```json
{
  "id": "commitment-1",
  "name": "Window blinds",
  "amount": 3000,
  "status": "planned",
  "targetMonth": "2026-11",
  "note": "Estimated amount",
  "updatedAt": "2026-08-27T10:00:00.000Z"
}
```

Its status is either `planned` or `committed`. The target month and note are optional. Future commitments are informational and do not enter net worth, savings, spending, or saving-rate calculations.

An annual goal contains a purpose and allocation breakdown:

```json
{
  "id": "goal-2026",
  "year": 2026,
  "targetSavings": 12000,
  "purpose": "Annual savings",
  "allocations": [
    {
      "id": "allocation-1",
      "name": "Emergency fund",
      "amount": 12000,
      "accumulates": true
    }
  ],
  "updatedAt": "2026-08-25T10:00:00.000Z"
}
```

`income` and `cash` are recalculated from their entry arrays. An annual goal's `targetSavings` is recalculated from its allocations when the store is normalised.

## Financial calculations

For each monthly closing, HomeFlow calculates:

```text
account total       = sum of account balances
liquidity           = account total + cash
net worth           = liquidity + receivables - payables
real savings        = current net worth - previous net worth
operational savings = real savings + wealth adjustments
estimated spending  = income - operational savings
savings rate        = operational savings / income
```

Estimated spending and savings rate are only calculated when income is greater than zero. Savings values are unavailable for the first recorded month because there is no previous closing for comparison.

Future commitments are excluded from these formulas. The interface shows their total and an informational `liquidity - future commitments` figure separately. Converting a commitment moves it to the active month's payables, where it starts affecting the financial calculations.

The forecast takes the active month's net worth and applies the operational savings recorded in the remaining months of each previous year. Those historical scenarios produce minimum, average, and maximum year-end estimates. Each summary also shows the accumulable amount and the amount remaining after subtracting future commitments whose target month belongs to the forecast year. Undated commitments are not assigned automatically to any year. These estimates are not predictive financial advice.

## API

All API routes use the Node.js runtime and are dynamically rendered.

| Method | Endpoint | Description |
| --- | --- | --- |
| `GET` | `/api/months` | Return the complete store. |
| `POST` | `/api/months` | Create or replace a monthly closing and return the updated store. |
| `DELETE` | `/api/months?id=YYYY-MM` | Delete a monthly closing and return the updated store. |
| `GET` | `/api/goals` | Return the annual goals collection. |
| `POST` | `/api/goals` | Create or replace an annual goal and return the updated store. |
| `GET` | `/api/commitments` | Return the future commitments collection. |
| `PUT` | `/api/commitments` | Replace the future commitments collection and return the updated store. |
| `GET` | `/api/export?from=YYYY-MM&to=YYYY-MM` | Download an Excel workbook for the inclusive month range. |
| `GET` | `/api/data` | Download the complete database backup as JSON. |
| `POST` | `/api/data` | Validate and import a database backup, saving the current store as a backup first. |

The export endpoint accepts either, both, or neither range parameter. Without parameters, it exports the complete history.

The generated workbook contains these sheets:

- Monthly summary.
- Income.
- Accounts.
- Cash.
- Receivables and payables.
- Wealth adjustments.
- Future commitments.
- Annual goals.

## Project structure

```text
homeflow/
├── assets/                    # Generated desktop icons
├── electron/
│   ├── main.cjs              # Secure Electron main process and embedded server
│   └── preload.cjs           # Minimal isolated renderer bridge
├── README.md                  # English documentation
├── README.es.md               # Spanish documentation
├── README.ca.md               # Catalan documentation
├── data/
│   └── homeflow.json          # Persistent financial store
├── public/
│   ├── homeflow-logo.png      # HomeFlow transparent brand asset
│   └── homeflow-logo-bg.png   # HomeFlow logo with gray background
│   └── homeflow-logo-rounded.png # Rounded HomeFlow icon source
├── scripts/
│   ├── generate-desktop-icons.cjs
│   └── prepare-electron.cjs   # Copies static files into the standalone build
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── commitments/route.ts
│   │   │   ├── data/route.ts
│   │   │   ├── export/route.ts
│   │   │   ├── goals/route.ts
│   │   │   └── months/route.ts
│   │   ├── analysis/page.tsx
│   │   ├── annual-goal/page.tsx
│   │   ├── data/page.tsx
│   │   ├── evolution/page.tsx
│   │   ├── forecast/page.tsx
│   │   ├── register/page.tsx
│   │   ├── favicon.ico
│   │   ├── globals.css
│   │   ├── homeflow-app.tsx   # Shared client application and views
│   │   ├── layout.tsx
│   │   └── page.tsx           # Dashboard route
│   └── lib/
│       ├── homeflow-math.ts   # Financial calculations and date formatting
│       ├── homeflow-store.ts  # JSON persistence and input normalisation
│       ├── homeflow-types.ts  # Domain types
│       └── xlsx-export.ts     # Dependency-free XLSX generation
├── eslint.config.mjs
├── forge.config.cjs           # Cross-platform Electron Forge targets
├── next.config.ts             # Next.js standalone output
├── package.json
├── postcss.config.mjs
└── tsconfig.json
```

Each page route renders the shared client application with a different view. Data access remains in server-side Route Handlers, while calculations and domain types are kept in `src/lib`.

## Available scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the local development server on Next.js's default port, `3000`. |
| `npm run lint` | Run ESLint with the Next.js and TypeScript rules. |
| `npm run build` | Create a production build using webpack. |
| `npm start` | Start the compiled production server. |
| `npm run desktop:dev` | Start Next.js and Electron together for desktop development. |
| `npm run desktop:icons` | Regenerate desktop icon assets on macOS. |
| `npm run desktop:build` | Create and prepare the Next.js standalone build used by Electron. |
| `npm run desktop:package` | Create an unpacked Electron application for the current platform. |
| `npm run desktop:make` | Create installers or distributable archives for the current platform. |

## Validation

Before committing changes, run:

```bash
npm run lint
npm run build
npm run desktop:package
```

There is currently no automated unit or end-to-end test suite in the repository.
