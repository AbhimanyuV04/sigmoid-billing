export interface SOW {
  id: string;
  name: string;
  clientId: string;
  clientName: string;
  projectIds: string[];
  status: "active" | "closed" | "draft";
}

export interface LineItem {
  id: string;
  skuName: string;
  allocatedBudget: number;
  consumedBudget: number;
}

export interface PurchaseOrder {
  id: string;
  poNumber: string;
  sowId: string;
  lineItems: LineItem[];
  createdAt: string;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  sowId: string;
  projectId: string;
  skuName: string;
  amount: number;
  date: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  message: string;
}
