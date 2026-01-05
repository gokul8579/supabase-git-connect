/* ======================================================
   SHARED DATE RANGE
====================================================== */
export interface DateRange {
  startDate?: string;
  endDate?: string;
}

/* ======================================================
   OVERVIEW
====================================================== */
export interface OverviewAnalytics {
  summary: {
    totalLeads: number;
    convertedLeads: number;

    totalCustomers: number;

    totalDeals: number;
    wonDeals: number;
    lostDeals: number;
    activeDeals: number;

    dealRevenue: number;
    salesOrderRevenue: number;
    totalRevenue: number;

    serviceCharges: number;

    taxCollected: number;

    salesOrderProfit: number;
    dealProfit: number;
    totalProfit: number;

    totalExpenses: number;

    totalCalls: number;
    completedCalls: number;
  };

  leadsBySource: { name: string; value: number }[];
  dealsByStage: { name: string; value: number }[];
}

/* ======================================================
   SALES
====================================================== */
export interface SalesAnalytics {
  funnel: { name: string; value: number }[];

  monthlyPipeline: { month: string; value: number }[];

  productPerformance: {
    name: string;
    units: number;
    revenue: number;
    estProfit: number;
  }[];

  revenueBreakdown: {
    byMonth: { month: string; revenue: number }[];
    byCustomer: { name: string; revenue: number }[];
    byProductType: { type: string; revenue: number }[];
  };
}

/* ======================================================
   FINANCE
====================================================== */
export interface FinanceAnalytics {
  totalIncome: number;
  dealsIncome: number;
  soIncome: number;

  totalExpense: number;
  expenseFromLogs: number;
  expenseFromPO: number;

  grossProfit: number;
  profitMarginPercent: number;
  netCashFlow: number;

  gstSummary: {
    outward: {
      CGST: number;
      SGST: number;
      IGST: number;
      Total: number;
    };
    inward: {
      GST: number;
    };
    net_payable: number;
  };

  dailyProfit: { date: string; net: number }[];

  topPurchasedProducts: {
    name: string;
    total: number;
  }[];
}

/* ======================================================
   INVENTORY
====================================================== */
export interface InventoryAnalytics {
  totalValue: number;
  totalUnits: number;

  itemsInRange: number;
  itemsOutRange: number;

  reorderCount: number;

  stockTrend: {
    date: string;
    in: number;
    out: number;
  }[];

  topSold: {
    name: string;
    units: number;
  }[];

  slowMoving: {
    name: string;
    days: number;
  }[];
}

/* ======================================================
   PURCHASE ORDERS
====================================================== */
export interface PurchaseOrderAnalytics {
  summary: {
    totalPOs: number;
    totalSpend: number;
    avgPOValue: number;
    vendorCount: number;
  };

  statusSummary: {
    pending: number;
    received: number;
    cancelled: number;
  };

  vendorTotals: {
    name: string;
    total: number;
  }[];

  monthlyTrend: {
    month: string;
    total: number;
  }[];

  dailyTrend: {
    date: string;
    qty: number;
  }[];

  topProducts: {
    name: string;
    qty: number;
  }[];
}


/* ======================================================
   ACTIVITIES
====================================================== */
export interface ActivitiesAnalytics {
  summary: {
    totalActivities: number;
    completed: number;
    pending: number;
  };
  byType: {
    name: string;
    value: number;
  }[];
  dailyTrend: {
    date: string;
    count: number;
  }[];
}


/* ======================================================
   SHARED ANALYTICS PARAM TYPES
====================================================== */

export interface AnalyticsParams {
  userId: string;
  startDate?: string;
  endDate?: string;
}

export type DateFilterFn = <T>(
  query: T,
  column: string
) => T;



/* ======================================================
   REPORT RESULT MAP
====================================================== */
export interface ReportsDataMap {
  overview?: OverviewAnalytics;
  sales?: SalesAnalytics;
  finance?: FinanceAnalytics;
  inventory?: InventoryAnalytics;
  purchase_orders?: PurchaseOrderAnalytics;
  activities?: ActivitiesAnalytics;
}
