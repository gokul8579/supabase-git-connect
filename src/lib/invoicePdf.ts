import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { formatIndianCurrency } from "@/lib/formatUtils";

export const downloadInvoicePdf = (invoice: any) => {
  const pdf = new jsPDF("p", "mm", "a4");

  // ---------- HEADER ----------
  pdf.setFontSize(16);
  pdf.text("INVOICE", 105, 15, { align: "center" });

  pdf.setFontSize(10);
  pdf.text(`Invoice No: ${invoice.invoice_number}`, 14, 30);
  pdf.text(`Date: ${invoice.date}`, 14, 36);

  // ---------- CUSTOMER ----------
  pdf.text("Bill To:", 14, 46);
  pdf.text(invoice.customer_name, 14, 52);
  if (invoice.customer_phone) {
    pdf.text(`Phone: ${invoice.customer_phone}`, 14, 58);
  }

  // ---------- ITEMS TABLE ----------
  autoTable(pdf, {
    startY: 66,
    head: [["Description", "Qty", "Price", "Total"]],
    body: invoice.items.map((i: any) => [
      i.description,
      i.quantity,
      formatIndianCurrency(i.unit_price),
      formatIndianCurrency(i.amount),
    ]),
  });

  const finalY = (pdf as any).lastAutoTable.finalY + 10;

  // ---------- TOTALS ----------
  pdf.text(`Subtotal: ${formatIndianCurrency(invoice.subtotal)}`, 140, finalY);
  pdf.text(`Tax: ${formatIndianCurrency(invoice.tax_amount)}`, 140, finalY + 6);
  pdf.text(`Discount: ${formatIndianCurrency(invoice.discount_amount)}`, 140, finalY + 12);

  pdf.setFontSize(12);
  pdf.text(
    `Total: ${formatIndianCurrency(invoice.total_amount)}`,
    140,
    finalY + 22
  );

  // ---------- SAVE ----------
  pdf.save(`${invoice.invoice_number}.pdf`);
};
