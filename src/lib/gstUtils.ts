export type BillingType = "inclusive_gst" | "exclusive_gst";

export interface GSTComponents {
  taxableValue: number;
  cgstAmount: number;
  sgstAmount: number;
  totalTax: number;
  totalAmount: number;
}

/**
 * Main GST calculation used everywhere in the system.
 * Does NOT handle hide/show UI behavior.
 */
export function calculateGST(
  amount: number,
  gstRate: number,
  billingType: BillingType
): GSTComponents {
  let taxableValue = 0;
  let totalTax = 0;

  if (gstRate === 0) {
    // No GST rate for this item
    return {
      taxableValue: amount,
      cgstAmount: 0,
      sgstAmount: 0,
      totalTax: 0,
      totalAmount: amount,
    };
  }

  if (billingType === "inclusive_gst") {
    // amount = MRP (includes GST)
    taxableValue = amount * (100 / (100 + gstRate));
    totalTax = amount - taxableValue;
  } else {
    // Exclusive GST: amount is base price
    taxableValue = amount;
    totalTax = (taxableValue * gstRate) / 100;
  }

  const cgstAmount = parseFloat((totalTax / 2).toFixed(2));
  const sgstAmount = parseFloat((totalTax / 2).toFixed(2));

  return {
    taxableValue: round(taxableValue),
    cgstAmount,
    sgstAmount,
    totalTax: round(totalTax),
    totalAmount: round(taxableValue + totalTax),
  };
}

/**
 * Used for line items (quantity-based)
 */
export function calculateLineItem(
  unitPrice: number,
  quantity: number,
  gstRate: number,
  billingType: BillingType
) {
  const amount = unitPrice * quantity;
  const gst = calculateGST(amount, gstRate, billingType);

  return {
    quantity,
    unitPrice,
    taxableValue: gst.taxableValue,
    cgstAmount: gst.cgstAmount,
    sgstAmount: gst.sgstAmount,
    totalTax: gst.totalTax,
    totalAmount: gst.totalAmount,
  };
}

/** Utility */
function round(v: number) {
  return parseFloat(v.toFixed(2));
}
