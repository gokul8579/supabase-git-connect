import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Plus, FileText, Calendar, DollarSign, AlertCircle, CheckCircle, XCircle, Eye, Trash2, Download } from "lucide-react";
import { formatLocalDate } from "@/lib/dateUtils";
import { SearchFilter } from "@/components/SearchFilter";
import { AdvancedFilters, FilterOption } from "@/components/AdvancedFilters";
import { ConfirmDialog } from "@/components/ConfirmDialog";

interface Contract {
  id: string;
  contract_number: string;
  customer_id: string | null;
  title: string;
  description: string;
  contract_type: string;
  start_date: string;
  end_date: string | null;
  value: number;
  status: string;
  renewal_date: string | null;
  created_at: string;
  customer?: {
    name: string;
    email: string;
  };
}

const Contracts = () => {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [contractToDelete, setContractToDelete] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState<Record<string, any>>({
    status: null,
    contract_type: null,
    customer_id: null,
  });
  const [formData, setFormData] = useState({
    customer_id: "",
    title: "",
    description: "",
    contract_type: "service",
    start_date: "",
    end_date: "",
    value: "",
    renewal_date: "",
  });

  useEffect(() => {
    fetchContracts();
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("customers")
        .select("id, name, email")
        .eq("user_id", user.id);

      if (error) throw error;
      setCustomers(data || []);
    } catch (error) {
      console.error("Error fetching customers", error);
    }
  };

  const fetchContracts = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      let query = supabase
        .from("contracts")
        .select(`
          *,
          customer:customers(id, name, email)
        `)
        .eq("user_id", user.id);

      // Apply filters
      if (filters.status) {
        query = query.eq("status", filters.status);
      }
      if (filters.contract_type) {
        query = query.eq("contract_type", filters.contract_type);
      }
      if (filters.customer_id) {
        query = query.eq("customer_id", filters.customer_id);
      }

      const { data, error } = await query.order("created_at", { ascending: false });

      if (error) throw error;

      const contractsWithCustomer = (data || []).map((contract: any) => ({
        ...contract,
        customer: contract.customer || null,
      }));

      setContracts(contractsWithCustomer);
    } catch (error: any) {
      toast.error("Error fetching contracts");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContracts();
  }, [filters]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: contract, error } = await supabase
        .from("contracts")
        .insert({
          customer_id: formData.customer_id || null,
          title: formData.title,
          description: formData.description,
          contract_type: formData.contract_type,
          start_date: formData.start_date,
          end_date: formData.end_date || null,
          value: Number(formData.value) || 0,
          renewal_date: formData.renewal_date || null,
          status: "active",
          user_id: user.id,
        } as any)
        .select()
        .single();

      if (error) throw error;

      // Log activity
      await supabase.from("activities").insert({
        user_id: user.id,
        activity_type: "contract_created",
        subject: `Contract ${contract.contract_number} created`,
        description: `New contract: ${formData.title}`,
        related_to_type: "contract",
        related_to_id: contract.id,
      } as any);

      toast.success("Contract created successfully!");
      setOpen(false);
      setFormData({
        customer_id: "",
        title: "",
        description: "",
        contract_type: "service",
        start_date: "",
        end_date: "",
        value: "",
        renewal_date: "",
      });
      fetchContracts();
    } catch (error: any) {
      toast.error(error.message || "Error creating contract");
      console.error(error);
    }
  };

  const handleStatusChange = async (contractId: string, newStatus: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from("contracts")
        .update({ status: newStatus as "pending" | "active" | "expired" | "cancelled" })
        .eq("id", contractId);

      if (error) throw error;

      toast.success("Status updated successfully!");
      fetchContracts();
    } catch (error: any) {
      toast.error("Error updating status");
      console.error(error);
    }
  };

  const handleDelete = async () => {
    if (!contractToDelete) return;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from("contracts")
        .delete()
        .eq("id", contractToDelete)
        .eq("user_id", user.id);

      if (error) throw error;

      toast.success("Contract deleted successfully!");
      setDeleteDialogOpen(false);
      setContractToDelete(null);
      fetchContracts();
    } catch (error: any) {
      toast.error("Error deleting contract");
      console.error(error);
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      active: "bg-green-100 text-green-800",
      expired: "bg-red-100 text-red-800",
      pending: "bg-yellow-100 text-yellow-800",
      cancelled: "bg-gray-100 text-gray-800",
    };
    return colors[status] || "bg-gray-100 text-gray-800";
  };

  const isExpiringSoon = (endDate: string | null) => {
    if (!endDate) return false;
    const end = new Date(endDate);
    const today = new Date();
    const daysUntilExpiry = Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return daysUntilExpiry <= 30 && daysUntilExpiry > 0;
  };

  const isExpired = (endDate: string | null) => {
    if (!endDate) return false;
    return new Date(endDate) < new Date();
  };

  const filterOptions: FilterOption[] = [
    {
      key: "status",
      label: "Status",
      type: "select",
      options: [
        { value: "active", label: "Active" },
        { value: "expired", label: "Expired" },
        { value: "pending", label: "Pending" },
        { value: "cancelled", label: "Cancelled" },
      ],
    },
    {
      key: "contract_type",
      label: "Contract Type",
      type: "select",
      options: [
        { value: "service", label: "Service" },
        { value: "maintenance", label: "Maintenance" },
        { value: "support", label: "Support" },
        { value: "license", label: "License" },
        { value: "other", label: "Other" },
      ],
    },
    {
      key: "customer_id",
      label: "Customer",
      type: "select",
      options: customers.map(c => ({ value: c.id, label: c.name })),
    },
  ];

  const filteredContracts = contracts.filter(contract => {
    const matchesSearch = contract.contract_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contract.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contract.customer?.name?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const activeContracts = filteredContracts.filter(c => c.status === "active").length;
  const expiringSoon = filteredContracts.filter(c => isExpiringSoon(c.end_date)).length;
  const expiredContracts = filteredContracts.filter(c => isExpired(c.end_date) || c.status === "expired").length;
  const totalValue = filteredContracts.reduce((sum, c) => sum + (c.value || 0), 0);

  return (
    <div className="space-y-4 md:space-y-6 p-2 md:p-0">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Contracts</h1>
          <p className="text-sm md:text-base text-muted-foreground">Manage customer contracts and agreements</p>
        </div>
        <Button onClick={() => setOpen(true)} className="w-full sm:w-auto">
          <Plus className="h-4 w-4 mr-2" />
          <span className="text-xs md:text-sm">Create Contract</span>
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-3 md:gap-4 grid-cols-2 md:grid-cols-4">
        <div className="bg-card border rounded-lg p-3 md:p-4">
          <div className="text-xs md:text-sm text-muted-foreground">Active Contracts</div>
          <div className="text-xl md:text-2xl font-bold">{activeContracts}</div>
        </div>
        <div className="bg-card border rounded-lg p-3 md:p-4">
          <div className="text-xs md:text-sm text-muted-foreground">Expiring Soon</div>
          <div className="text-xl md:text-2xl font-bold text-orange-600">{expiringSoon}</div>
        </div>
        <div className="bg-card border rounded-lg p-3 md:p-4">
          <div className="text-xs md:text-sm text-muted-foreground">Expired</div>
          <div className="text-xl md:text-2xl font-bold text-red-600">{expiredContracts}</div>
        </div>
        <div className="bg-card border rounded-lg p-3 md:p-4">
          <div className="text-xs md:text-sm text-muted-foreground">Total Value</div>
          <div className="text-xl md:text-2xl font-bold text-green-600">₹{totalValue.toLocaleString()}</div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
        <SearchFilter value={searchTerm} onChange={setSearchTerm} placeholder="Search contracts..." />
        <AdvancedFilters
          filters={filterOptions}
          appliedFilters={filters}
          onFilterChange={(key, value) => setFilters({ ...filters, [key]: value })}
          onClearAll={() => setFilters({ status: null, contract_type: null, customer_id: null })}
        />
      </div>

      {/* Contracts Table */}
      <div className="border rounded-lg overflow-x-auto -mx-2 md:mx-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs md:text-sm">Contract #</TableHead>
              <TableHead className="text-xs md:text-sm">Title</TableHead>
              <TableHead className="text-xs md:text-sm">Customer</TableHead>
              <TableHead className="text-xs md:text-sm">Type</TableHead>
              <TableHead className="text-xs md:text-sm">Value</TableHead>
              <TableHead className="text-xs md:text-sm">Status</TableHead>
              <TableHead className="text-xs md:text-sm hidden md:table-cell">End Date</TableHead>
              <TableHead className="text-xs md:text-sm">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center">Loading...</TableCell>
              </TableRow>
            ) : filteredContracts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground py-12">
                  <div className="flex flex-col items-center gap-2">
                    <FileText className="h-12 w-12 text-muted-foreground/50" />
                    <p>No contracts found</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filteredContracts.map((contract) => (
                <TableRow key={contract.id} className="hover:bg-muted/50">
                  <TableCell className="font-medium text-xs md:text-sm">{contract.contract_number}</TableCell>
                  <TableCell className="text-xs md:text-sm">{contract.title}</TableCell>
                  <TableCell className="text-xs md:text-sm hidden md:table-cell">
                    {contract.customer?.name || "-"}
                  </TableCell>
                  <TableCell className="text-xs md:text-sm">{contract.contract_type}</TableCell>
                  <TableCell className="text-xs md:text-sm">₹{contract.value.toLocaleString()}</TableCell>
                  <TableCell className="text-xs md:text-sm">
                    <Select
                      value={contract.status}
                      onValueChange={(value) => handleStatusChange(contract.id, value)}
                    >
                      <SelectTrigger className={`h-7 md:h-8 text-xs md:text-sm ${getStatusColor(contract.status)}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="expired">Expired</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="text-xs md:text-sm hidden md:table-cell">
                    {contract.end_date ? (
                      <div className="flex items-center gap-1">
                        {isExpiringSoon(contract.end_date) && (
                          <AlertCircle className="h-3 w-3 text-orange-500" />
                        )}
                        {isExpired(contract.end_date) && (
                          <XCircle className="h-3 w-3 text-red-500" />
                        )}
                        <span className={isExpired(contract.end_date) ? "text-red-600" : ""}>
                          {formatLocalDate(contract.end_date)}
                        </span>
                      </div>
                    ) : (
                      "-"
                    )}
                  </TableCell>
                  <TableCell className="text-xs md:text-sm">
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedContract(contract);
                          setDetailOpen(true);
                        }}
                        className="h-7 w-7 md:h-8 md:w-8 p-0"
                      >
                        <Eye className="h-3.5 w-3.5 md:h-4 md:w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setContractToDelete(contract.id);
                          setDeleteDialogOpen(true);
                        }}
                        className="h-7 w-7 md:h-8 md:w-8 p-0"
                      >
                        <Trash2 className="h-3.5 w-3.5 md:h-4 md:w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Create Contract Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Contract</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Customer (Optional)</Label>
              <Select value={formData.customer_id || "none"} onValueChange={(v) => setFormData({ ...formData, customer_id: v === "none" ? "" : v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select customer" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Customer</SelectItem>
                  {customers.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Title *</Label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Description *</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={4}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Contract Type</Label>
                <Select value={formData.contract_type} onValueChange={(v) => setFormData({ ...formData, contract_type: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="service">Service</SelectItem>
                    <SelectItem value="maintenance">Maintenance</SelectItem>
                    <SelectItem value="support">Support</SelectItem>
                    <SelectItem value="license">License</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Contract Value (₹)</Label>
                <Input
                  type="number"
                  value={formData.value}
                  onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start Date *</Label>
                <Input
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>End Date (Optional)</Label>
                <Input
                  type="date"
                  value={formData.end_date}
                  onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Renewal Date (Optional)</Label>
              <Input
                type="date"
                value={formData.renewal_date}
                onChange={(e) => setFormData({ ...formData, renewal_date: e.target.value })}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit">Create Contract</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Contract Detail Dialog */}
      {selectedContract && (
        <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{selectedContract.contract_number} - {selectedContract.title}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Status</Label>
                  <div className="mt-1">
                    <Badge className={getStatusColor(selectedContract.status)}>
                      {selectedContract.status}
                    </Badge>
                  </div>
                </div>
                <div>
                  <Label className="text-muted-foreground">Type</Label>
                  <div className="mt-1">{selectedContract.contract_type}</div>
                </div>
                <div>
                  <Label className="text-muted-foreground">Customer</Label>
                  <div className="mt-1">{selectedContract.customer?.name || "-"}</div>
                </div>
                <div>
                  <Label className="text-muted-foreground">Value</Label>
                  <div className="mt-1">₹{selectedContract.value.toLocaleString()}</div>
                </div>
                <div>
                  <Label className="text-muted-foreground">Start Date</Label>
                  <div className="mt-1">{formatLocalDate(selectedContract.start_date)}</div>
                </div>
                <div>
                  <Label className="text-muted-foreground">End Date</Label>
                  <div className="mt-1">
                    {selectedContract.end_date ? (
                      <div className="flex items-center gap-1">
                        {isExpired(selectedContract.end_date) && (
                          <XCircle className="h-4 w-4 text-red-500" />
                        )}
                        {isExpiringSoon(selectedContract.end_date) && !isExpired(selectedContract.end_date) && (
                          <AlertCircle className="h-4 w-4 text-orange-500" />
                        )}
                        <span className={isExpired(selectedContract.end_date) ? "text-red-600 font-medium" : ""}>
                          {formatLocalDate(selectedContract.end_date)}
                        </span>
                      </div>
                    ) : (
                      "-"
                    )}
                  </div>
                </div>
              </div>
              <div>
                <Label className="text-muted-foreground">Description</Label>
                <div className="mt-1 p-3 bg-muted rounded-md">{selectedContract.description}</div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDelete}
        title="Delete Contract"
        description="Are you sure you want to delete this contract? This action cannot be undone."
        variant="destructive"
        confirmText="Delete"
      />
    </div>
  );
};

export default Contracts;

