export type BillingType = "inclusive_gst" | "exclusive_gst" | "no_gst";

export function calculateLineItemAmounts(
  unitPrice: number,
  quantity: number,
  gstRate: number,
  billingType: BillingType
) {
  const amount = unitPrice * quantity;

  if (gstRate === 0 || billingType === "no_gst") {
    return {
      taxableValue: parseFloat(amount.toFixed(2)),
      cgstAmount: 0,
      sgstAmount: 0,
      totalTax: 0,
      totalAmount: parseFloat(amount.toFixed(2)),
    };
  }

  let taxableValue: number;
  let totalTax: number;

  if (billingType === "inclusive_gst") {
    taxableValue = (amount * 100) / (100 + gstRate);
    totalTax = amount - taxableValue;
  } else {
    // exclusive
    taxableValue = amount;
    totalTax = (amount * gstRate) / 100;
  }

  // Proper even split (fixes 7.63 vs 7.62 issue)
let cgst = totalTax / 2;
let sgst = totalTax / 2;

// ALWAYS round both equally
const cgstAmount = parseFloat(cgst.toFixed(2));
const sgstAmount = parseFloat(sgst.toFixed(2));


  return {
    taxableValue: parseFloat(taxableValue.toFixed(2)),
    cgstAmount,
    sgstAmount,
    totalTax,
    totalAmount: parseFloat((taxableValue + totalTax).toFixed(2)),
  };
}
