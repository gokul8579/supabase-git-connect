import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Package } from "lucide-react";
import { formatIndianCurrency } from "@/lib/formatUtils";

type PBProduct = {
  id: string;
  name: string;
  unit_price: number;
  stock_quantity: number;
};

export const PriceBookProductsDialog = ({
  open,
  onOpenChange,
  priceBookId,
  priceBookName,
}) => {
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<PBProduct[]>([]);

  useEffect(() => {
    if (priceBookId && open) {
      fetchPriceBookProducts();
    }
  }, [priceBookId, open]);

  const fetchPriceBookProducts = async () => {
    try {
      setLoading(true);

      if (!priceBookId) return setProducts([]);

      const authRes = await supabase.auth.getUser();
const user = authRes.data.user;

      if (!user) return setProducts([]);

      // Fetch products linked to this price book
      const { data, error } = await supabase
  .from("products")
  // ⬇️ Force this query to return ANY
  .select<any>("id, name, unit_price, quantity_in_stock")
  .eq("price_book_id", priceBookId)
  .eq("user_id", user.id);

      if (error) throw error;

      setProducts(
        ((data as any[]) || []).map((p: any) => ({
          id: p.id,
          name: p.name,
          stock_quantity: p.quantity_in_stock || 0,
          unit_price: p.unit_price || 0,
        }))
      );
    } catch (err) {
      console.error(err);
      toast.error("Error fetching products");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Products in {priceBookName}</DialogTitle>
        </DialogHeader>

        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product Name</TableHead>
                <TableHead>Unit Price</TableHead>
                <TableHead>Stock Quantity</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : products.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center py-12 text-muted-foreground">
                    <div className="flex flex-col items-center gap-2">
                      <Package className="h-12 w-12 text-muted-foreground/50" />
                      <p>No products in this price book</p>
                      <p className="text-sm">Add products to see them here</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                products.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>{p.name}</TableCell>
                    <TableCell>{formatIndianCurrency(p.unit_price)}</TableCell>
                    <TableCell>{p.stock_quantity}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </DialogContent>
    </Dialog>
  );
};
