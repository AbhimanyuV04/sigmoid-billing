# Sigmoid

Contract-to-revenue tracking platform for managing SOWs, purchase orders, invoicing, and budget allocation.

**Live:** [sigmoid-billing.vercel.app](https://sigmoid-billing.vercel.app/)

## What it does

Sigmoid models the full billing lifecycle — from signed SOWs through PO budget allocation to invoice submission and variance reporting.

- **Explorer Desk** — Interactive SOW/PO tree with real-time budget progress per SKU line item
- **Entity Creator** — Create SOWs (with client and project IDs), attach POs, and define SKU line items with allocated budgets
- **Invoicing Terminal** — Submit invoices against SKUs with automatic budget allocation across POs, overbill prevention, and allocation preview
- **Reclassification Console** — Transfer budget between POs and SKU line items with full audit trail
- **Reports & Variance Matrix** — Per-client budget breakdown with burn rates, variance analysis, and visual comparisons
- **Audit Log** — Chronological ledger of every system event

## Tech stack

React + TypeScript + Tailwind CSS, built with Vite. No external chart libraries — all visualizations are pure CSS/SVG. State is managed via React Context with localStorage persistence.

## Running locally

```
npm install
npm run dev
```

Opens at `http://localhost:5173`.

## Deployment

Connected to Vercel with automatic deploys on push to `main`.
