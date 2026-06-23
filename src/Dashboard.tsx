import { useState, useMemo } from "react";
import { useBilling } from "./BillingContext";
import type { FIFOStep } from "./BillingContext";
import type { PurchaseOrder } from "./types";

type View = "explorer" | "creator" | "invoicing" | "reclassify" | "reports" | "audit";

function formatCurrency(n: number) {
  return "$" + n.toLocaleString("en-US", { minimumFractionDigits: 0 });
}

function formatTimestamp(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

const INPUT = "w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none";
const BTN_PRIMARY = "w-full bg-indigo-600 text-white text-sm font-medium py-2.5 rounded-md hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors";
const BTN_AMBER = "w-full bg-amber-600 text-white text-sm font-medium py-2.5 rounded-md hover:bg-amber-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors";
const BTN_DANGER_SM = "text-red-400 hover:text-red-600 hover:bg-red-50 p-1.5 rounded transition-colors";

function TrashIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
    </svg>
  );
}

function ConfirmAction({ onConfirm, label, children }: { onConfirm: () => void; label: string; children: React.ReactNode }) {
  const [pending, setPending] = useState(false);
  if (pending) {
    return (
      <span className="inline-flex items-center gap-1">
        <button onClick={(e) => { e.stopPropagation(); onConfirm(); setPending(false); }} className="text-[11px] font-medium text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded hover:bg-red-100 transition-colors">{label}</button>
        <button onClick={(e) => { e.stopPropagation(); setPending(false); }} className="text-[11px] text-gray-400 hover:text-gray-600 px-1">Cancel</button>
      </span>
    );
  }
  return <span onClick={(e) => { e.stopPropagation(); setPending(true); }}>{children}</span>;
}

function StatusBanner({ message }: { message: { type: "success" | "error"; text: string } }) {
  return (
    <div className={`text-sm rounded-md px-3 py-2 ${message.type === "success" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-red-50 text-red-700 border border-red-200"}`}>
      {message.text}
    </div>
  );
}

// ─── View 1: Explorer ─────────────────────────────────────────────────

function ExplorerView() {
  const { sows, purchaseOrders, deleteSOW, deletePO } = useBilling();
  const [expandedSow, setExpandedSow] = useState<string | null>(sows[0]?.id ?? null);
  const [expandedPo, setExpandedPo] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Explorer Desk</h2>
        <p className="text-sm text-gray-500 mt-1">Interactive SOW / PO tree with real-time budget progress.</p>
        {message && <div className="mt-2"><StatusBanner message={message} /></div>}
      </div>
      {sows.map((sow) => {
        const isOpen = expandedSow === sow.id;
        const pos = purchaseOrders.filter((po) => po.sowId === sow.id);
        return (
          <div key={sow.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
            <button
              onClick={() => setExpandedSow(isOpen ? null : sow.id)}
              className="w-full flex items-center justify-between px-5 py-4 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
            >
              <div>
                <span className="font-semibold text-gray-900">{sow.name}</span>
                <span className="ml-2 text-xs font-mono text-gray-400">{sow.id}</span>
                <span className="ml-2 text-xs text-gray-400">({sow.clientName})</span>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {sow.projectIds.map((pid) => (
                  <span key={pid} className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-mono">{pid}</span>
                ))}
                <ConfirmAction label="Delete SOW?" onConfirm={() => { try { deleteSOW(sow.id); setMessage({ type: "success", text: `Deleted SOW "${sow.name}".` }); } catch (err) { setMessage({ type: "error", text: (err as Error).message }); } }}>
                  <button className={BTN_DANGER_SM} title="Delete SOW"><TrashIcon /></button>
                </ConfirmAction>
                <svg className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </button>

            {isOpen && (
              <div className="px-5 py-4 space-y-3">
                {pos.length === 0 && <p className="text-sm text-gray-400 italic">No purchase orders attached to this SOW.</p>}
                {pos.map((po) => {
                  const poOpen = expandedPo === po.id;
                  return (
                    <div key={po.id} className="border border-gray-100 rounded-lg">
                      <button
                        onClick={() => setExpandedPo(poOpen ? null : po.id)}
                        className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-gray-50 transition-colors text-left"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-gray-800">{po.poNumber}</span>
                          <span className="text-xs text-gray-400 font-mono">{po.id}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-400">{po.createdAt}</span>
                          <span className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">{po.lineItems.length} SKU{po.lineItems.length !== 1 ? "s" : ""}</span>
                          <ConfirmAction label="Delete PO?" onConfirm={() => { try { deletePO(po.id); setMessage({ type: "success", text: `Deleted PO "${po.poNumber}".` }); } catch (err) { setMessage({ type: "error", text: (err as Error).message }); } }}>
                            <button className={BTN_DANGER_SM} title="Delete PO"><TrashIcon /></button>
                          </ConfirmAction>
                        </div>
                      </button>
                      {poOpen && (
                        <div className="px-4 pb-4 space-y-3">
                          {po.lineItems.length === 0 && <p className="text-xs text-gray-400 italic">No SKUs assigned yet.</p>}
                          {po.lineItems.map((li) => {
                            const pct = li.allocatedBudget > 0 ? (li.consumedBudget / li.allocatedBudget) * 100 : 0;
                            const remaining = li.allocatedBudget - li.consumedBudget;
                            const exhausted = remaining <= 0;
                            return (
                              <div key={li.id} className="text-sm">
                                <div className="flex items-center justify-between mb-1">
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium text-gray-700">{li.skuName}</span>
                                    {exhausted && <span className="text-[10px] font-semibold uppercase tracking-wide bg-red-100 text-red-600 px-1.5 py-0.5 rounded">Exhausted</span>}
                                  </div>
                                  <span className="text-xs text-gray-500 font-mono">{formatCurrency(li.consumedBudget)} / {formatCurrency(li.allocatedBudget)}</span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-2">
                                  <div
                                    className={`h-2 rounded-full transition-all ${exhausted ? "bg-red-400" : pct > 75 ? "bg-amber-400" : "bg-emerald-500"}`}
                                    style={{ width: `${Math.min(pct, 100)}%` }}
                                  />
                                </div>
                                <p className="text-xs text-gray-400 mt-0.5">Remaining: {formatCurrency(Math.max(remaining, 0))}</p>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── View 2: Entity Creator ───────────────────────────────────────────

type CreatorTab = "sow" | "po" | "sku";

function EntityCreatorView() {
  const { sows, purchaseOrders, addSOW, addPO, addSKUToPO } = useBilling();
  const [tab, setTab] = useState<CreatorTab>("sow");
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // SOW form state
  const [sowClient, setSowClient] = useState("");
  const [sowName, setSowName] = useState("");
  const [sowProjects, setSowProjects] = useState("");

  // PO form state
  const [poSowId, setPoSowId] = useState("");
  const [poNumber, setPoNumber] = useState("");

  // SKU form state
  const [skuPoId, setSkuPoId] = useState("");
  const [skuName, setSkuName] = useState("");
  const [skuBudget, setSkuBudget] = useState("");

  function handleAddSOW(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    const ids = sowProjects.split(",").map((s) => s.trim()).filter(Boolean);
    if (ids.length === 0) { setMessage({ type: "error", text: "At least one Project ID is required." }); return; }
    addSOW(sowClient, sowName, ids);
    setMessage({ type: "success", text: `SOW "${sowName}" created for ${sowClient}.` });
    setSowClient(""); setSowName(""); setSowProjects("");
  }

  function handleAddPO(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    addPO(poSowId, poNumber);
    setMessage({ type: "success", text: `PO "${poNumber}" created under ${poSowId}.` });
    setPoNumber("");
  }

  function handleAddSKU(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    addSKUToPO(skuPoId, skuName, Number(skuBudget));
    setMessage({ type: "success", text: `SKU "${skuName}" (${formatCurrency(Number(skuBudget))}) added to ${skuPoId}.` });
    setSkuName(""); setSkuBudget("");
  }

  const tabs: { key: CreatorTab; label: string }[] = [
    { key: "sow", label: "New SOW" },
    { key: "po", label: "Attach PO" },
    { key: "sku", label: "Add SKU to PO" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Entity Creator</h2>
        <p className="text-sm text-gray-500 mt-1">Build new SOWs, attach Purchase Orders, and inject SKU line items.</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {/* Tabs */}
        <div className="flex border-b border-gray-200">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => { setTab(t.key); setMessage(null); }}
              className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${tab === t.key ? "text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50/50" : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"}`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="p-6">
          {tab === "sow" && (
            <form onSubmit={handleAddSOW} className="space-y-4 max-w-lg">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Client Name</label>
                <input type="text" value={sowClient} onChange={(e) => setSowClient(e.target.value)} placeholder="e.g. Reckitt" className={INPUT} required />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">SOW Name</label>
                <input type="text" value={sowName} onChange={(e) => setSowName(e.target.value)} placeholder="e.g. Digital Transformation Phase 2" className={INPUT} required />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Project IDs (comma-separated)</label>
                <input type="text" value={sowProjects} onChange={(e) => setSowProjects(e.target.value)} placeholder="e.g. PROJ-REC-03, PROJ-REC-04" className={INPUT} required />
                <p className="text-xs text-gray-400 mt-1">Separate multiple IDs with commas.</p>
              </div>
              <button type="submit" className={BTN_PRIMARY}>Create SOW</button>
              {message && <StatusBanner message={message} />}
            </form>
          )}

          {tab === "po" && (
            <form onSubmit={handleAddPO} className="space-y-4 max-w-lg">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Parent SOW</label>
                <select value={poSowId} onChange={(e) => setPoSowId(e.target.value)} className={INPUT} required>
                  <option value="">Select SOW...</option>
                  {sows.map((s) => <option key={s.id} value={s.id}>{s.clientName} — {s.name} ({s.id})</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">PO Number</label>
                <input type="text" value={poNumber} onChange={(e) => setPoNumber(e.target.value)} placeholder="e.g. PO-2025-3001" className={INPUT} required />
              </div>
              <button type="submit" className={BTN_PRIMARY}>Create Purchase Order</button>
              {message && <StatusBanner message={message} />}
            </form>
          )}

          {tab === "sku" && (
            <form onSubmit={handleAddSKU} className="space-y-4 max-w-lg">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Target Purchase Order</label>
                <select value={skuPoId} onChange={(e) => setSkuPoId(e.target.value)} className={INPUT} required>
                  <option value="">Select PO...</option>
                  {purchaseOrders.map((po) => <option key={po.id} value={po.id}>{po.poNumber} ({po.id})</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">SKU Name</label>
                <input type="text" value={skuName} onChange={(e) => setSkuName(e.target.value)} placeholder="e.g. Data Science" className={INPUT} required />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Allocated Budget</label>
                <input type="number" value={skuBudget} onChange={(e) => setSkuBudget(e.target.value)} min={1} placeholder="0" className={INPUT} required />
              </div>
              <button type="submit" className={BTN_PRIMARY}>Add SKU Line Item</button>
              {message && <StatusBanner message={message} />}
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── View 3: Invoicing Terminal ───────────────────────────────────────

function InvoicingView() {
  const { sows, purchaseOrders, invoices, addInvoice, previewFIFO, voidInvoice } = useBilling();

  const [sowId, setSowId] = useState("");
  const [projectId, setProjectId] = useState("");
  const [skuName, setSkuName] = useState("");
  const [amount, setAmount] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const selectedSow = sows.find((s) => s.id === sowId);

  const availableSkus = useMemo(() => {
    if (!sowId) return [];
    const skuSet = new Set<string>();
    purchaseOrders.filter((po) => po.sowId === sowId).forEach((po) => po.lineItems.forEach((li) => skuSet.add(li.skuName)));
    return Array.from(skuSet);
  }, [sowId, purchaseOrders]);

  const aggregateRemaining = useMemo(() => {
    if (!sowId || !skuName) return null;
    return purchaseOrders
      .filter((po) => po.sowId === sowId)
      .reduce((sum, po) => {
        const li = po.lineItems.find((l) => l.skuName === skuName);
        return li ? sum + (li.allocatedBudget - li.consumedBudget) : sum;
      }, 0);
  }, [sowId, skuName, purchaseOrders]);

  const maxAmount = Math.max(aggregateRemaining ?? 0, 0);

  const fifoPreview: FIFOStep[] = useMemo(() => {
    const amt = Number(amount);
    if (!sowId || !skuName || !amt || amt <= 0) return [];
    return previewFIFO(sowId, skuName, amt);
  }, [sowId, skuName, amount, previewFIFO]);

  const recentInvoices = useMemo(() => [...invoices].reverse().slice(0, 8), [invoices]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    try {
      addInvoice({ sowId, projectId, skuName, amount: Number(amount), invoiceNumber });
      setMessage({ type: "success", text: `Invoice ${invoiceNumber} submitted — ${formatCurrency(Number(amount))} allocated across POs.` });
      setAmount(""); setInvoiceNumber("");
    } catch (err) {
      setMessage({ type: "error", text: (err as Error).message });
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Invoicing Terminal</h2>
        <p className="text-sm text-gray-500 mt-1">Generate invoices with automatic budget allocation and overbill protection.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Form */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">New Invoice</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">SOW</label>
              <select value={sowId} onChange={(e) => { setSowId(e.target.value); setProjectId(""); setSkuName(""); }} className={INPUT} required>
                <option value="">Select SOW...</option>
                {sows.map((s) => <option key={s.id} value={s.id}>{s.clientName} — {s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Project ID</label>
              <select value={projectId} onChange={(e) => setProjectId(e.target.value)} className={INPUT} required disabled={!selectedSow}>
                <option value="">Select Project...</option>
                {selectedSow?.projectIds.map((pid) => <option key={pid} value={pid}>{pid}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">SKU</label>
              <select value={skuName} onChange={(e) => setSkuName(e.target.value)} className={INPUT} required disabled={!sowId}>
                <option value="">Select SKU...</option>
                {availableSkus.map((sku) => <option key={sku} value={sku}>{sku}</option>)}
              </select>
              {aggregateRemaining !== null && (
                <div className={`mt-2 text-sm font-medium px-3 py-2 rounded-md ${maxAmount <= 0 ? "bg-red-50 text-red-600" : "bg-emerald-50 text-emerald-700"}`}>
                  Available Budget: {formatCurrency(maxAmount)}
                </div>
              )}
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Invoice Number</label>
              <input type="text" value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} placeholder="INV-2025-XXXX" className={INPUT} required />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Amount</label>
              <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} min={1} max={maxAmount} placeholder="0" className={INPUT} required disabled={maxAmount <= 0 && skuName !== ""} />
            </div>
            {fifoPreview.length > 0 && (
              <div className="border border-indigo-200 bg-indigo-50/50 rounded-lg p-3 space-y-2">
                <p className="text-xs font-semibold text-indigo-700 uppercase tracking-wide">Allocation Preview</p>
                {fifoPreview.map((step, i) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-600 text-[10px] font-bold flex items-center justify-center">{i + 1}</span>
                      <span className="font-mono text-gray-700">{step.poNumber}</span>
                    </div>
                    <div className="text-right">
                      <span className="font-mono text-indigo-700">{formatCurrency(step.deduction)}</span>
                      <span className="text-xs text-gray-400 ml-2">({formatCurrency(step.remainingAfter)} left)</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <button type="submit" disabled={maxAmount <= 0 && skuName !== ""} className={BTN_PRIMARY}>Submit Invoice</button>
            {message && <StatusBanner message={message} />}
          </form>
        </div>

        {/* Recent invoices ledger */}
        <div className="lg:col-span-3 bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">Recent Invoices</h3>
          {invoices.length === 0 ? (
            <p className="text-sm text-gray-400 italic">No invoices recorded yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 pr-3 text-xs font-semibold text-gray-500 uppercase">Invoice #</th>
                    <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500 uppercase">SOW</th>
                    <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500 uppercase">Project</th>
                    <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500 uppercase">SKU</th>
                    <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500 uppercase">Amount</th>
                    <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500 uppercase">Date</th>
                    <th className="text-right py-2 pl-3 text-xs font-semibold text-gray-500 uppercase"></th>
                  </tr>
                </thead>
                <tbody>
                  {recentInvoices.map((inv) => (
                    <tr key={inv.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                      <td className="py-2.5 pr-3 font-medium text-gray-800 font-mono text-xs">{inv.invoiceNumber}</td>
                      <td className="py-2.5 px-3 text-gray-600 font-mono text-xs">{inv.sowId}</td>
                      <td className="py-2.5 px-3 text-gray-600 font-mono text-xs">{inv.projectId}</td>
                      <td className="py-2.5 px-3 text-gray-700">{inv.skuName}</td>
                      <td className="py-2.5 px-3 text-right font-mono text-emerald-600">{formatCurrency(inv.amount)}</td>
                      <td className="py-2.5 px-3 text-right text-gray-400 text-xs">{inv.date}</td>
                      <td className="py-2.5 pl-3 text-right">
                        <ConfirmAction label="Void?" onConfirm={() => { try { voidInvoice(inv.id); setMessage({ type: "success", text: `Voided ${inv.invoiceNumber} — budget returned.` }); } catch (err) { setMessage({ type: "error", text: (err as Error).message }); } }}>
                          <button className="text-xs text-red-500 hover:text-red-700 hover:bg-red-50 px-2 py-1 rounded transition-colors">Void</button>
                        </ConfirmAction>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── View 4: Reclassification Console ─────────────────────────────────

function ReclassifyView() {
  const { purchaseOrders, reclassifyBudget } = useBilling();

  const [sourcePoId, setSourcePoId] = useState("");
  const [sourceSkuName, setSourceSkuName] = useState("");
  const [targetPoId, setTargetPoId] = useState("");
  const [targetSkuName, setTargetSkuName] = useState("");
  const [amountToMove, setAmountToMove] = useState("");
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const sourcePO = purchaseOrders.find((po) => po.id === sourcePoId);
  const targetPO = purchaseOrders.find((po) => po.id === targetPoId);
  const sourceLI = sourcePO?.lineItems.find((li) => li.skuName === sourceSkuName);
  const sourceAvailable = sourceLI ? sourceLI.allocatedBudget - sourceLI.consumedBudget : 0;

  const allSkuNames = useMemo(() => {
    const s = new Set<string>();
    purchaseOrders.forEach((po) => po.lineItems.forEach((li) => s.add(li.skuName)));
    return Array.from(s);
  }, [purchaseOrders]);

  function poLabel(po: PurchaseOrder) { return `${po.poNumber} (${po.id})`; }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    try {
      reclassifyBudget({ sourcePoId, sourceSkuName, targetPoId, targetSkuName, amountToMove: Number(amountToMove) });
      setMessage({ type: "success", text: `Shifted ${formatCurrency(Number(amountToMove))} from ${sourcePoId} to ${targetPoId}.` });
      setAmountToMove("");
    } catch (err) {
      setMessage({ type: "error", text: (err as Error).message });
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Reclassification Console</h2>
        <p className="text-sm text-gray-500 mt-1">Shift allocated budget between POs and SKU line items.</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 max-w-2xl">
        <form onSubmit={handleSubmit} className="space-y-5">
          <fieldset className="border border-gray-200 rounded-lg p-4 space-y-3">
            <legend className="text-xs font-semibold text-gray-500 uppercase tracking-wide px-2">Source</legend>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Purchase Order</label>
              <select value={sourcePoId} onChange={(e) => { setSourcePoId(e.target.value); setSourceSkuName(""); }} className={INPUT} required>
                <option value="">Select PO...</option>
                {purchaseOrders.map((po) => <option key={po.id} value={po.id}>{poLabel(po)}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Line Item (SKU)</label>
              <select value={sourceSkuName} onChange={(e) => setSourceSkuName(e.target.value)} className={INPUT} required disabled={!sourcePO}>
                <option value="">Select SKU...</option>
                {sourcePO?.lineItems.map((li) => (
                  <option key={li.id} value={li.skuName}>{li.skuName} — avail: {formatCurrency(li.allocatedBudget - li.consumedBudget)}</option>
                ))}
              </select>
            </div>
          </fieldset>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Amount to Transfer</label>
            <input type="number" value={amountToMove} onChange={(e) => setAmountToMove(e.target.value)} min={1} max={Math.max(sourceAvailable, 0)} className={INPUT} required />
            {sourceLI && <p className="text-xs mt-1 text-gray-500">Max transferable: {formatCurrency(Math.max(sourceAvailable, 0))}</p>}
          </div>

          <fieldset className="border border-gray-200 rounded-lg p-4 space-y-3">
            <legend className="text-xs font-semibold text-gray-500 uppercase tracking-wide px-2">Target</legend>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Purchase Order</label>
              <select value={targetPoId} onChange={(e) => setTargetPoId(e.target.value)} className={INPUT} required>
                <option value="">Select PO...</option>
                {purchaseOrders.map((po) => <option key={po.id} value={po.id}>{poLabel(po)}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Target SKU Name</label>
              <select value={targetSkuName} onChange={(e) => setTargetSkuName(e.target.value)} className={INPUT} required>
                <option value="">Select or match SKU...</option>
                {allSkuNames.map((sku) => <option key={sku} value={sku}>{sku}{targetPO?.lineItems.some((li) => li.skuName === sku) ? " (exists)" : " (new)"}</option>)}
              </select>
            </div>
          </fieldset>

          <button type="submit" className={BTN_AMBER}>Reclassify Budget</button>
          {message && <StatusBanner message={message} />}
        </form>
      </div>
    </div>
  );
}

// ─── View 5: Reports ──────────────────────────────────────────────────

interface ClientReport { clientId: string; clientName: string; sowBreakdowns: SowBreakdown[]; totalAllocated: number; totalInvoiced: number; totalUnbilled: number; }
interface SowBreakdown { sowId: string; sowName: string; projectIds: string[]; poRows: PoRow[]; totalAllocated: number; totalConsumed: number; totalInvoiced: number; }
interface PoRow { poNumber: string; poId: string; allocated: number; consumed: number; invoiced: number; variance: number; }

function useClientReports(): ClientReport[] {
  const { sows, purchaseOrders, invoices } = useBilling();
  return useMemo(() => {
    const clientMap = new Map<string, ClientReport>();
    for (const sow of sows) {
      if (!clientMap.has(sow.clientId)) {
        clientMap.set(sow.clientId, { clientId: sow.clientId, clientName: sow.clientName, sowBreakdowns: [], totalAllocated: 0, totalInvoiced: 0, totalUnbilled: 0 });
      }
      const client = clientMap.get(sow.clientId)!;
      const sowPOs = purchaseOrders.filter((po) => po.sowId === sow.id);
      const sowInvoices = invoices.filter((inv) => inv.sowId === sow.id);
      const sowTotalInvoiced = sowInvoices.reduce((s, inv) => s + inv.amount, 0);
      const poRows: PoRow[] = sowPOs.map((po) => {
        const allocated = po.lineItems.reduce((s, li) => s + li.allocatedBudget, 0);
        const consumed = po.lineItems.reduce((s, li) => s + li.consumedBudget, 0);
        const poInvoiced = invoices.filter((inv) => inv.sowId === sow.id).reduce((s, inv) => {
          const liMatch = po.lineItems.find((li) => li.skuName === inv.skuName);
          return liMatch ? s + inv.amount : s;
        }, 0);
        return { poNumber: po.poNumber, poId: po.id, allocated, consumed, invoiced: poInvoiced, variance: allocated - consumed };
      });
      const sowTotalAllocated = poRows.reduce((s, r) => s + r.allocated, 0);
      const sowTotalConsumed = poRows.reduce((s, r) => s + r.consumed, 0);
      client.sowBreakdowns.push({ sowId: sow.id, sowName: sow.name, projectIds: sow.projectIds, poRows, totalAllocated: sowTotalAllocated, totalConsumed: sowTotalConsumed, totalInvoiced: sowTotalInvoiced });
      client.totalAllocated += sowTotalAllocated;
      client.totalInvoiced += sowTotalInvoiced;
      client.totalUnbilled += sowTotalAllocated - sowTotalConsumed;
    }
    return Array.from(clientMap.values());
  }, [sows, purchaseOrders, invoices]);
}

function ReportsView() {
  const reports = useClientReports();
  const totAlloc = reports.reduce((s, c) => s + c.totalAllocated, 0);
  const totInv = reports.reduce((s, c) => s + c.totalInvoiced, 0);
  const totUnbilled = reports.reduce((s, c) => s + c.totalUnbilled, 0);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Reports &amp; Variance Matrix</h2>
        <p className="text-sm text-gray-500 mt-1">Client SOW vs PO vs Invoice breakdown with burn analytics.</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Total PO Budget</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{formatCurrency(totAlloc)}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Total Invoiced</p>
          <p className="text-2xl font-bold text-emerald-600 mt-1">{formatCurrency(totInv)}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Unbilled PO Pipeline</p>
          <p className="text-2xl font-bold text-amber-600 mt-1">{formatCurrency(totUnbilled)}</p>
        </div>
      </div>

      {/* Per-client */}
      {reports.map((client) => (
        <div key={client.clientId} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">{client.clientName}</h3>
              <p className="text-xs text-gray-500 mt-0.5">
                {client.sowBreakdowns.length} SOW{client.sowBreakdowns.length !== 1 ? "s" : ""} &middot; Burn Rate: {client.totalAllocated > 0 ? ((client.totalInvoiced / client.totalAllocated) * 100).toFixed(1) : "0"}%
              </p>
            </div>
            <span className="text-xs font-medium bg-amber-100 text-amber-700 px-2.5 py-1 rounded-full">Unbilled: {formatCurrency(client.totalUnbilled)}</span>
          </div>

          {client.sowBreakdowns.map((sow) => {
            const burnPct = sow.totalAllocated > 0 ? (sow.totalInvoiced / sow.totalAllocated) * 100 : 0;
            const consumedPct = sow.totalAllocated > 0 ? (sow.totalConsumed / sow.totalAllocated) * 100 : 0;
            return (
              <div key={sow.sowId} className="border-b border-gray-100 last:border-b-0">
                <div className="px-6 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-gray-800">{sow.sowName}</span>
                    <span className="text-xs font-mono text-gray-400">{sow.sowId}</span>
                    {sow.projectIds.map((pid) => <span key={pid} className="text-[10px] bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded font-mono">{pid}</span>)}
                  </div>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${burnPct >= 90 ? "bg-red-100 text-red-700" : burnPct >= 60 ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"}`}>
                    {burnPct.toFixed(1)}% burned
                  </span>
                </div>

                {/* Stacked bar */}
                <div className="px-6 pb-2">
                  <div className="flex items-center gap-3 text-[11px] text-gray-500 mb-1">
                    <span>PO Capacity vs Consumed</span>
                    <span className="ml-auto font-mono">{formatCurrency(sow.totalConsumed)} / {formatCurrency(sow.totalAllocated)}</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-4 relative overflow-hidden">
                    <div className="absolute inset-y-0 left-0 bg-indigo-200 rounded-full" style={{ width: `${Math.min(consumedPct, 100)}%` }} />
                    <div className="absolute inset-y-0 left-0 bg-indigo-500 rounded-full" style={{ width: `${Math.min(burnPct, 100)}%` }} />
                    <div className="absolute inset-0 flex items-center px-2">
                      <span className="text-[10px] font-semibold text-white drop-shadow-sm">{burnPct > 8 ? `Invoiced ${burnPct.toFixed(0)}%` : ""}</span>
                    </div>
                  </div>
                  <div className="flex gap-4 mt-1 text-[10px] text-gray-400">
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-indigo-500 inline-block" /> Invoiced</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-indigo-200 inline-block" /> Consumed</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-gray-100 inline-block border border-gray-300" /> Remaining</span>
                  </div>
                </div>

                {/* Table */}
                <div className="px-6 pb-4 pt-2 overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-2 pr-3 text-xs font-semibold text-gray-500 uppercase">PO Number</th>
                        <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500 uppercase">Allocated</th>
                        <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500 uppercase">Consumed</th>
                        <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500 uppercase">Invoiced</th>
                        <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500 uppercase">Variance</th>
                        <th className="text-right py-2 pl-3 text-xs font-semibold text-gray-500 uppercase">Burn %</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sow.poRows.map((row) => {
                        const rb = row.allocated > 0 ? (row.consumed / row.allocated) * 100 : 0;
                        return (
                          <tr key={row.poId} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                            <td className="py-2.5 pr-3"><span className="font-medium text-gray-800">{row.poNumber}</span> <span className="text-xs text-gray-400 font-mono">{row.poId}</span></td>
                            <td className="py-2.5 px-3 text-right font-mono text-gray-700">{formatCurrency(row.allocated)}</td>
                            <td className="py-2.5 px-3 text-right font-mono text-gray-700">{formatCurrency(row.consumed)}</td>
                            <td className="py-2.5 px-3 text-right font-mono text-emerald-600">{formatCurrency(row.invoiced)}</td>
                            <td className="py-2.5 px-3 text-right">
                              <span className={`font-mono ${row.variance <= 0 ? "text-red-500" : "text-gray-600"}`}>{formatCurrency(row.variance)}</span>
                              {row.variance <= 0 && <span className="ml-1.5 text-[9px] font-semibold uppercase bg-red-100 text-red-600 px-1 py-0.5 rounded">Fully Used</span>}
                            </td>
                            <td className="py-2.5 pl-3 text-right">
                              <span className={`inline-block min-w-[3rem] text-center text-xs font-semibold px-2 py-0.5 rounded-full ${rb >= 90 ? "bg-red-100 text-red-700" : rb >= 60 ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"}`}>{rb.toFixed(1)}%</span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="border-t border-gray-200 font-semibold">
                        <td className="py-2.5 pr-3 text-gray-600">SOW Total</td>
                        <td className="py-2.5 px-3 text-right font-mono text-gray-800">{formatCurrency(sow.totalAllocated)}</td>
                        <td className="py-2.5 px-3 text-right font-mono text-gray-800">{formatCurrency(sow.totalConsumed)}</td>
                        <td className="py-2.5 px-3 text-right font-mono text-emerald-700">{formatCurrency(sow.totalInvoiced)}</td>
                        <td className="py-2.5 px-3 text-right font-mono text-gray-800">{formatCurrency(sow.totalAllocated - sow.totalConsumed)}</td>
                        <td className="py-2.5 pl-3 text-right text-xs font-semibold text-gray-600">{burnPct.toFixed(1)}%</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

// ─── View 6: Audit Log ────────────────────────────────────────────────

function AuditLogView() {
  const { auditLogs } = useBilling();
  const sorted = [...auditLogs].reverse();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Audit Log Stream</h2>
        <p className="text-sm text-gray-500 mt-1">Complete historical ledger of all system events.</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        {sorted.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-sm text-gray-400 italic">No activity recorded yet. Create entities, submit invoices, or reclassify budgets to see events here.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {sorted.map((log, i) => (
              <div key={log.id} className="flex items-start gap-4 px-6 py-4 hover:bg-gray-50 transition-colors">
                <div className="flex-shrink-0 mt-0.5">
                  <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-indigo-100 text-indigo-600 text-xs font-bold">
                    {sorted.length - i}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-800">{log.message}</p>
                  <p className="text-xs text-gray-400 mt-1 font-mono">{log.id} &middot; {formatTimestamp(log.timestamp)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Sidebar + Shell ──────────────────────────────────────────────────

const NAV_ITEMS: { key: View; label: string; icon: string }[] = [
  { key: "explorer",    label: "Explorer Desk",     icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0h4" },
  { key: "creator",     label: "Entity Creator",    icon: "M12 4v16m8-8H4" },
  { key: "invoicing",   label: "Invoicing Terminal", icon: "M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" },
  { key: "reclassify",  label: "Reclassification",  icon: "M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" },
  { key: "reports",     label: "Reports & Variance", icon: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" },
  { key: "audit",       label: "Audit Log",          icon: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" },
];

export default function Dashboard() {
  const [view, setView] = useState<View>("explorer");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="min-h-screen bg-gray-100 flex">
      {/* Sidebar */}
      <aside className={`flex-shrink-0 bg-white border-r border-gray-200 flex flex-col transition-all duration-200 ${sidebarCollapsed ? "w-16" : "w-60"}`}>
        {/* Logo */}
        <div className="flex items-center gap-3 px-4 py-5 border-b border-gray-100">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center flex-shrink-0">
            <span className="text-white font-bold text-sm">S</span>
          </div>
          {!sidebarCollapsed && (
            <div className="overflow-hidden">
              <h1 className="text-lg font-bold text-gray-900 leading-tight">Sigmoid</h1>
              <p className="text-[10px] text-gray-400 leading-tight">Contract-to-Revenue</p>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 py-3 px-2 space-y-1">
          {NAV_ITEMS.map((item) => {
            const active = view === item.key;
            return (
              <button
                key={item.key}
                onClick={() => setView(item.key)}
                title={item.label}
                className={`w-full flex items-center gap-3 rounded-lg transition-colors text-left ${sidebarCollapsed ? "justify-center px-2 py-2.5" : "px-3 py-2.5"} ${active ? "bg-indigo-50 text-indigo-700" : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"}`}
              >
                <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 2 : 1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d={item.icon} />
                </svg>
                {!sidebarCollapsed && <span className="text-sm font-medium truncate">{item.label}</span>}
              </button>
            );
          })}
        </nav>

        {/* Collapse toggle */}
        <div className="border-t border-gray-100 p-2">
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="w-full flex items-center justify-center py-2 text-gray-400 hover:text-gray-600 transition-colors rounded-md hover:bg-gray-50"
          >
            <svg className={`w-4 h-4 transition-transform ${sidebarCollapsed ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
            </svg>
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-6xl mx-auto px-8 py-8">
          {view === "explorer" && <ExplorerView />}
          {view === "creator" && <EntityCreatorView />}
          {view === "invoicing" && <InvoicingView />}
          {view === "reclassify" && <ReclassifyView />}
          {view === "reports" && <ReportsView />}
          {view === "audit" && <AuditLogView />}
        </div>
      </main>
    </div>
  );
}
