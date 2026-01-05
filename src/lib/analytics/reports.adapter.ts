import { getOverviewAnalytics } from "./overview.analytics";
import { getSalesAnalytics } from "./sales.analytics";
import { getFinanceAnalytics } from "./finance.analytics";
import { getInventoryAnalytics } from "./inventory.analytics";
import { getPurchaseOrderAnalytics } from "./purchaseOrders.analytics";
import { getActivityAnalytics } from "./activities.analytics";

export type ReportTab =
  | "overview"
  | "sales"
  | "finance"
  | "inventory"
  | "purchase_orders"
  | "activities";

export async function getReportsData({
  userId,
  startDate,
  endDate,
  tab,
}: {
  userId: string;
  startDate?: string;
  endDate?: string;
  tab: ReportTab;
}) {
  switch (tab) {
    case "overview":
      return { overview: await getOverviewAnalytics(userId, startDate, endDate) };
    case "sales":
      return { sales: await getSalesAnalytics(userId, startDate, endDate) };
    case "finance":
      return { finance: await getFinanceAnalytics(userId, startDate, endDate) };
    case "inventory":
      return { inventory: await getInventoryAnalytics(userId) };
    case "purchase_orders":
      return { purchaseOrders: await getPurchaseOrderAnalytics(userId, startDate, endDate) };
    case "activities":
      return { activities: await getActivityAnalytics(userId, startDate, endDate) };
    default:
      return {};
  }
}
