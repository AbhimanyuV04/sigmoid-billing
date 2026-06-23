import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from "react";
import type { SOW, PurchaseOrder, Invoice, AuditLog } from "./types";

function formatCurrency(n: number) {
  return "$" + n.toLocaleString("en-US", { minimumFractionDigits: 0 });
}

interface AddInvoiceInput {
  sowId: string;
  projectId: string;
  skuName: string;
  amount: number;
  invoiceNumber: string;
}

interface ReclassifyInput {
  sourcePoId: string;
  sourceSkuName: string;
  targetPoId: string;
  targetSkuName: string;
  amountToMove: number;
}

export interface FIFOStep {
  poId: string;
  poNumber: string;
  lineItemId: string;
  deduction: number;
  remainingAfter: number;
}

interface BillingState {
  sows: SOW[];
  purchaseOrders: PurchaseOrder[];
  invoices: Invoice[];
  auditLogs: AuditLog[];
  addSOW: (clientName: string, sowName: string, projectIds: string[]) => void;
  addPO: (sowId: string, poNumber: string) => void;
  addSKUToPO: (poId: string, skuName: string, allocatedBudget: number) => void;
  addInvoice: (input: AddInvoiceInput) => void;
  reclassifyBudget: (input: ReclassifyInput) => void;
  previewFIFO: (sowId: string, skuName: string, amount: number) => FIFOStep[];
  deleteSOW: (sowId: string) => void;
  deletePO: (poId: string) => void;
  voidInvoice: (invoiceId: string) => void;
}

const BillingContext = createContext<BillingState | null>(null);

const MOCK_SOWS: SOW[] = [
  {
    id: "SOW-REC-01",
    name: "Reckitt Digital Transformation",
    clientId: "CLIENT-REC",
    clientName: "Reckitt",
    projectIds: ["PROJ-REC-01", "PROJ-REC-02"],
    status: "active",
  },
  {
    id: "SOW-ACM-01",
    name: "Acme Analytics Platform",
    clientId: "CLIENT-ACM",
    clientName: "Acme Corp",
    projectIds: ["PROJ-ACM-01"],
    status: "active",
  },
];

const MOCK_POS: PurchaseOrder[] = [
  // Two POs for SOW-REC-01 with identical "Data Eng" SKU — tests FIFO
  {
    id: "PO-REC-01",
    poNumber: "PO-2025-1001",
    sowId: "SOW-REC-01",
    lineItems: [
      { id: "LI-REC-01-A", skuName: "Data Eng", allocatedBudget: 10000, consumedBudget: 10000 }, // fully consumed — tests billing lock
      { id: "LI-REC-01-B", skuName: "Cloud Infra", allocatedBudget: 8000, consumedBudget: 3200 },
    ],
    createdAt: "2025-01-15",
  },
  {
    id: "PO-REC-02",
    poNumber: "PO-2025-1042",
    sowId: "SOW-REC-01",
    lineItems: [
      { id: "LI-REC-02-A", skuName: "Data Eng", allocatedBudget: 15000, consumedBudget: 4500 },
      { id: "LI-REC-02-B", skuName: "QA Services", allocatedBudget: 5000, consumedBudget: 0 },
    ],
    createdAt: "2025-04-01",
  },
  {
    id: "PO-ACM-01",
    poNumber: "PO-2025-2001",
    sowId: "SOW-ACM-01",
    lineItems: [
      { id: "LI-ACM-01-A", skuName: "ML Ops", allocatedBudget: 20000, consumedBudget: 7500 },
    ],
    createdAt: "2025-03-10",
  },
];

const MOCK_INVOICES: Invoice[] = [
  {
    id: "INV-001",
    invoiceNumber: "INV-2025-0001",
    sowId: "SOW-REC-01",
    projectId: "PROJ-REC-01",
    skuName: "Data Eng",
    amount: 5000,
    date: "2025-02-28",
  },
  {
    id: "INV-002",
    invoiceNumber: "INV-2025-0002",
    sowId: "SOW-REC-01",
    projectId: "PROJ-REC-02",
    skuName: "Cloud Infra",
    amount: 3200,
    date: "2025-03-15",
  },
];

const STORAGE_KEY = "sigmoid-billing-state";

interface PersistedState {
  sows: SOW[];
  purchaseOrders: PurchaseOrder[];
  invoices: Invoice[];
  auditLogs: AuditLog[];
  counters: { invoice: number; lineItem: number; audit: number; sow: number; po: number };
}

function loadState(): PersistedState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveState(state: PersistedState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

const saved = loadState();

let nextInvoiceId = saved?.counters.invoice ?? 3;
let nextLineItemId = saved?.counters.lineItem ?? 1;
let nextAuditId = saved?.counters.audit ?? 1;
let nextSowId = saved?.counters.sow ?? 3;
let nextPoId = saved?.counters.po ?? 4;

export function BillingProvider({ children }: { children: ReactNode }) {
  const [sows, setSows] = useState<SOW[]>(saved?.sows ?? MOCK_SOWS);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>(saved?.purchaseOrders ?? MOCK_POS);
  const [invoices, setInvoices] = useState<Invoice[]>(saved?.invoices ?? MOCK_INVOICES);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(saved?.auditLogs ?? []);

  useEffect(() => {
    saveState({
      sows,
      purchaseOrders,
      invoices,
      auditLogs,
      counters: { invoice: nextInvoiceId, lineItem: nextLineItemId, audit: nextAuditId, sow: nextSowId, po: nextPoId },
    });
  }, [sows, purchaseOrders, invoices, auditLogs]);

  const appendAudit = useCallback((message: string) => {
    setAuditLogs((prev) => [
      ...prev,
      {
        id: `AUDIT-${String(nextAuditId++).padStart(3, "0")}`,
        timestamp: new Date().toISOString(),
        message,
      },
    ]);
  }, []);

  const addSOW = useCallback(
    (clientName: string, sowName: string, projectIds: string[]) => {
      const clientId = `CLIENT-${clientName.toUpperCase().replace(/\s+/g, "-").slice(0, 10)}`;
      const id = `SOW-${String(nextSowId++).padStart(3, "0")}`;
      setSows((prev) => [
        ...prev,
        { id, name: sowName, clientId, clientName, projectIds, status: "active" },
      ]);
      appendAudit(`Created SOW "${sowName}" (${id}) for ${clientName} with projects: ${projectIds.join(", ")}`);
    },
    [appendAudit],
  );

  const addPO = useCallback(
    (sowId: string, poNumber: string) => {
      const id = `PO-${String(nextPoId++).padStart(3, "0")}`;
      setPurchaseOrders((prev) => [
        ...prev,
        { id, poNumber, sowId, lineItems: [], createdAt: new Date().toISOString().slice(0, 10) },
      ]);
      appendAudit(`Created PO "${poNumber}" (${id}) under ${sowId}`);
    },
    [appendAudit],
  );

  const addSKUToPO = useCallback(
    (poId: string, skuName: string, allocatedBudget: number) => {
      setPurchaseOrders((prev) =>
        prev.map((po) => {
          if (po.id !== poId) return po;
          return {
            ...po,
            lineItems: [
              ...po.lineItems,
              {
                id: `LI-GEN-${String(nextLineItemId++).padStart(3, "0")}`,
                skuName,
                allocatedBudget,
                consumedBudget: 0,
              },
            ],
          };
        }),
      );
      appendAudit(`Added SKU "${skuName}" (${formatCurrency(allocatedBudget)}) to ${poId}`);
    },
    [appendAudit],
  );

  const addInvoice = useCallback(
    ({ sowId, projectId, skuName, amount, invoiceNumber }: AddInvoiceInput) => {
      // 1. Find all POs under this SOW that carry the requested SKU
      const matchingPOs = purchaseOrders
        .filter(
          (po) =>
            po.sowId === sowId &&
            po.lineItems.some((li) => li.skuName === skuName),
        )
        .sort(
          (a, b) =>
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
        );

      // 2. Aggregate capacity check
      const totalAvailable = matchingPOs.reduce((sum, po) => {
        const li = po.lineItems.find((li) => li.skuName === skuName)!;
        return sum + (li.allocatedBudget - li.consumedBudget);
      }, 0);

      if (amount > totalAvailable) {
        throw new Error(
          `Invoice amount ($${amount}) exceeds total available budget ($${totalAvailable}) for SKU "${skuName}" under SOW "${sowId}"`,
        );
      }

      // 3. FIFO allocation — build a map of consumed-budget increases per line item ID
      const budgetIncreases = new Map<string, number>();
      let remaining = amount;

      for (const po of matchingPOs) {
        if (remaining <= 0) break;

        const li = po.lineItems.find((li) => li.skuName === skuName)!;
        const available = li.allocatedBudget - li.consumedBudget;
        if (available <= 0) continue;

        const deduction = Math.min(available, remaining);
        budgetIncreases.set(li.id, deduction);
        remaining -= deduction;
      }

      // 4. Immutably update PO state
      setPurchaseOrders((prev) =>
        prev.map((po) => {
          const increase = po.lineItems.some((li) => budgetIncreases.has(li.id));
          if (!increase) return po;
          return {
            ...po,
            lineItems: po.lineItems.map((li) => {
              const delta = budgetIncreases.get(li.id);
              if (delta === undefined) return li;
              return { ...li, consumedBudget: li.consumedBudget + delta };
            }),
          };
        }),
      );

      // 5. Append the new invoice
      const id = `INV-${String(nextInvoiceId++).padStart(3, "0")}`;
      const newInvoice: Invoice = {
        id,
        invoiceNumber,
        sowId,
        projectId,
        skuName,
        amount,
        date: new Date().toISOString().slice(0, 10),
      };
      setInvoices((prev) => [...prev, newInvoice]);

      // 6. Audit log
      appendAudit(`Invoice ${invoiceNumber} recorded: ${formatCurrency(amount)} for SKU "${skuName}" under ${sowId}`);
    },
    [purchaseOrders, appendAudit],
  );

  const reclassifyBudget = useCallback(
    ({ sourcePoId, sourceSkuName, targetPoId, targetSkuName, amountToMove }: ReclassifyInput) => {
      // 1. Validate source
      const sourcePO = purchaseOrders.find((po) => po.id === sourcePoId);
      if (!sourcePO) throw new Error(`Source PO "${sourcePoId}" not found`);

      const sourceLI = sourcePO.lineItems.find((li) => li.skuName === sourceSkuName);
      if (!sourceLI) throw new Error(`SKU "${sourceSkuName}" not found in PO "${sourcePoId}"`);

      const availableSourceBalance = sourceLI.allocatedBudget - sourceLI.consumedBudget;
      if (amountToMove > availableSourceBalance) {
        throw new Error(
          `Insufficient available balance in source SKU line item to perform reclassification. ` +
          `Requested: $${amountToMove}, Available: $${availableSourceBalance}`,
        );
      }

      // 2. Validate target PO exists
      const targetPO = purchaseOrders.find((po) => po.id === targetPoId);
      if (!targetPO) throw new Error(`Target PO "${targetPoId}" not found`);

      // 3. Immutably update POs
      setPurchaseOrders((prev) =>
        prev.map((po) => {
          if (po.id === sourcePoId) {
            return {
              ...po,
              lineItems: po.lineItems.map((li) =>
                li.id === sourceLI.id
                  ? { ...li, allocatedBudget: li.allocatedBudget - amountToMove }
                  : li,
              ),
            };
          }

          if (po.id === targetPoId) {
            const existingLI = po.lineItems.find((li) => li.skuName === targetSkuName);
            if (existingLI) {
              return {
                ...po,
                lineItems: po.lineItems.map((li) =>
                  li.id === existingLI.id
                    ? { ...li, allocatedBudget: li.allocatedBudget + amountToMove }
                    : li,
                ),
              };
            }
            return {
              ...po,
              lineItems: [
                ...po.lineItems,
                {
                  id: `LI-GEN-${String(nextLineItemId++).padStart(3, "0")}`,
                  skuName: targetSkuName,
                  allocatedBudget: amountToMove,
                  consumedBudget: 0,
                },
              ],
            };
          }

          return po;
        }),
      );

      // 4. Audit log
      appendAudit(`Shifted $${amountToMove} from ${sourcePoId} (${sourceSkuName}) to ${targetPoId} (${targetSkuName})`);
    },
    [purchaseOrders, appendAudit],
  );

  const previewFIFO = useCallback(
    (sowId: string, skuName: string, amount: number): FIFOStep[] => {
      const matchingPOs = purchaseOrders
        .filter((po) => po.sowId === sowId && po.lineItems.some((li) => li.skuName === skuName))
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

      const steps: FIFOStep[] = [];
      let remaining = amount;

      for (const po of matchingPOs) {
        if (remaining <= 0) break;
        const li = po.lineItems.find((li) => li.skuName === skuName)!;
        const available = li.allocatedBudget - li.consumedBudget;
        if (available <= 0) continue;
        const deduction = Math.min(available, remaining);
        steps.push({
          poId: po.id,
          poNumber: po.poNumber,
          lineItemId: li.id,
          deduction,
          remainingAfter: available - deduction,
        });
        remaining -= deduction;
      }
      return steps;
    },
    [purchaseOrders],
  );

  const deleteSOW = useCallback(
    (sowId: string) => {
      const sow = sows.find((s) => s.id === sowId);
      if (!sow) return;
      const linkedPOs = purchaseOrders.filter((po) => po.sowId === sowId);
      const hasConsumed = linkedPOs.some((po) => po.lineItems.some((li) => li.consumedBudget > 0));
      if (hasConsumed) throw new Error(`Cannot delete SOW "${sowId}" — it has POs with consumed budget. Void related invoices first.`);
      setSows((prev) => prev.filter((s) => s.id !== sowId));
      setPurchaseOrders((prev) => prev.filter((po) => po.sowId !== sowId));
      setInvoices((prev) => prev.filter((inv) => inv.sowId !== sowId));
      appendAudit(`Deleted SOW "${sow.name}" (${sowId}) and ${linkedPOs.length} linked PO(s)`);
    },
    [sows, purchaseOrders, appendAudit],
  );

  const deletePO = useCallback(
    (poId: string) => {
      const po = purchaseOrders.find((p) => p.id === poId);
      if (!po) return;
      const hasConsumed = po.lineItems.some((li) => li.consumedBudget > 0);
      if (hasConsumed) throw new Error(`Cannot delete PO "${poId}" — it has consumed budget. Void related invoices first.`);
      setPurchaseOrders((prev) => prev.filter((p) => p.id !== poId));
      appendAudit(`Deleted PO "${po.poNumber}" (${poId})`);
    },
    [purchaseOrders, appendAudit],
  );

  const voidInvoice = useCallback(
    (invoiceId: string) => {
      const invoice = invoices.find((inv) => inv.id === invoiceId);
      if (!invoice) throw new Error(`Invoice "${invoiceId}" not found`);

      // Reverse the FIFO consumption — walk POs newest-first and return budget
      const matchingPOs = purchaseOrders
        .filter((po) => po.sowId === invoice.sowId && po.lineItems.some((li) => li.skuName === invoice.skuName))
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      const decreases = new Map<string, number>();
      let remaining = invoice.amount;

      for (const po of matchingPOs) {
        if (remaining <= 0) break;
        const li = po.lineItems.find((li) => li.skuName === invoice.skuName)!;
        const canReturn = Math.min(li.consumedBudget, remaining);
        if (canReturn <= 0) continue;
        decreases.set(li.id, canReturn);
        remaining -= canReturn;
      }

      setPurchaseOrders((prev) =>
        prev.map((po) => {
          if (!po.lineItems.some((li) => decreases.has(li.id))) return po;
          return {
            ...po,
            lineItems: po.lineItems.map((li) => {
              const delta = decreases.get(li.id);
              if (delta === undefined) return li;
              return { ...li, consumedBudget: li.consumedBudget - delta };
            }),
          };
        }),
      );

      setInvoices((prev) => prev.filter((inv) => inv.id !== invoiceId));
      appendAudit(`Voided invoice ${invoice.invoiceNumber} (${formatCurrency(invoice.amount)}) — budget returned for SKU "${invoice.skuName}" under ${invoice.sowId}`);
    },
    [invoices, purchaseOrders, appendAudit],
  );

  return (
    <BillingContext.Provider value={{ sows, purchaseOrders, invoices, auditLogs, addSOW, addPO, addSKUToPO, addInvoice, reclassifyBudget, previewFIFO, deleteSOW, deletePO, voidInvoice }}>
      {children}
    </BillingContext.Provider>
  );
}

export function useBilling() {
  const ctx = useContext(BillingContext);
  if (!ctx) throw new Error("useBilling must be used within BillingProvider");
  return ctx;
}
