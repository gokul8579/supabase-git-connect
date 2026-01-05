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
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "sonner";
import { Plus, Phone, Mail, Building, UserPlus, Download, Calendar as CalendarIcon, Star, User, FileText, Clock } from "lucide-react";
import { EnhancedDetailDialog, EnhancedDetailField } from "@/components/EnhancedDetailDialog";
import { SearchFilter } from "@/components/SearchFilter";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { exportToCSV } from "@/lib/csvExport";
import { formatLocalDate } from "@/lib/dateUtils";
import { format } from "date-fns";
import ImportContactsDialog from "@/components/ImportContactsDialog";
import { EduvancaLoader } from "@/components/EduvancaLoader";

interface Lead {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  source: string;
  status: string;
  interest_level: number | null;
  notes: string | null;
  created_at: string;
  alreadyCustomer?: boolean;
}

const Leads = () => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [interestFilter, setInterestFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<Date | undefined>();
  const [showCalendar, setShowCalendar] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [leadToDelete, setLeadToDelete] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    company: "",
    source: "other",
    status: "new",
    interest_level: 3,
    notes: "",
  });

  useEffect(() => {
    fetchLeads();
  }, []);

  const fetchLeads = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("leads")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setLeads(data || []);
    } catch (error: any) {
      toast.error("Error fetching leads");
    } finally {
      setLoading(false);
    }
  };

  const filteredLeads = leads.filter(lead => {
    const matchesSearch = lead.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.company?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesSource = sourceFilter === "all" || lead.source === sourceFilter;
    const matchesInterest = interestFilter === "all" || lead.interest_level?.toString() === interestFilter;
    const matchesDate = !dateFilter || new Date(lead.created_at).toDateString() === dateFilter.toDateString();
    
    return matchesSearch && matchesSource && matchesInterest && matchesDate;
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase.from("leads").insert([{
        ...formData,
        user_id: user.id,
      }] as any);

      if (error) throw error;

      toast.success("Lead created successfully!");
      setOpen(false);
      setFormData({
        name: "",
        email: "",
        phone: "",
        company: "",
        source: "other",
        status: "new",
        interest_level: 3,
        notes: "",
      });
      fetchLeads();
    } catch (error: any) {
      toast.error("Error creating lead");
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      new: "bg-info/10 text-info border-info/20",
      contacted: "bg-warning/10 text-warning border-warning/20",
      qualified: "bg-success/10 text-success border-success/20",
      lost: "bg-destructive/10 text-destructive border-destructive/20",
      converted: "bg-primary/10 text-primary border-primary/20",
    };
    return colors[status] || "bg-muted text-muted-foreground";
  };

  const checkIfCustomerExists = async (lead: Lead) => {
    const { data, error } = await supabase
      .from("customers")
      .select("id")
      .eq("name", lead.name)
      .eq("phone", lead.phone)
      .eq("email", lead.email);

    if (error) {
      console.error("Customer check error:", error);
      return false;
    }

    return data && data.length > 0;
  };

  const handleLeadClick = async (lead: Lead) => {
    const alreadyCustomer = await checkIfCustomerExists(lead);
    setSelectedLead({ ...lead, alreadyCustomer });
    setDetailOpen(true);
  };

  const handleConvertToCustomer = async (leadId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const lead = leads.find(l => l.id === leadId);
      if (!lead) return;

      const { error: customerError } = await supabase.from("customers").insert({
        name: lead.name,
        email: lead.email,
        phone: lead.phone,
        company: lead.company,
        notes: lead.notes,
        user_id: user.id,
      });

      if (customerError) throw customerError;

      const { error: leadError } = await supabase
        .from("leads")
        .update({ status: "qualified" })
        .eq("id", leadId);

      if (leadError) throw leadError;

      toast.success("Lead converted to customer and marked as qualified!");
      setDetailOpen(false);
      fetchLeads();
    } catch (error: any) {
      toast.error("Error converting lead");
    }
  };

  const handleDetailEdit = async (data: Record<string, any>) => {
    if (!selectedLead) return;

    try {
      const { error } = await supabase
        .from("leads")
        .update({
          name: data.name,
          email: data.email,
          phone: data.phone,
          company: data.company,
          source: data.source,
          status: data.status,
          interest_level: data.interest_level ? parseInt(data.interest_level) : null,
          notes: data.notes,
        })
        .eq("id", selectedLead.id);

      if (error) throw error;

      toast.success("Lead updated successfully!");
      fetchLeads();
      setDetailOpen(false);
    } catch (error: any) {
      toast.error("Error updating lead");
    }
  };

  const handleDeleteClick = (leadId: string) => {
    setLeadToDelete(leadId);
    setDeleteDialogOpen(true);
  };

  const handleDetailDelete = async () => {
    if (!selectedLead) return;
    handleDeleteClick(selectedLead.id);
  };

  const confirmDelete = async () => {
    if (!leadToDelete) return;

    try {
      const { error } = await supabase
        .from("leads")
        .delete()
        .eq("id", leadToDelete);

      if (error) throw error;

      toast.success("Lead deleted successfully!");
      fetchLeads();
      setDetailOpen(false);
      setDeleteDialogOpen(false);
      setLeadToDelete(null);
    } catch (error: any) {
      toast.error("Error deleting lead");
    }
  };

  const handleExportCSV = () => {
    const exportData = filteredLeads.map(lead => ({
      Name: lead.name,
      Email: lead.email || "",
      Phone: lead.phone || "",
      Company: lead.company || "",
      Source: lead.source,
      Status: lead.status,
      Interest: lead.interest_level || "",
      Created: formatLocalDate(lead.created_at),
    }));

    exportToCSV(exportData, `leads-${format(new Date(), "yyyy-MM-dd")}`);
    toast.success("Leads exported successfully!");
  };

  const detailFields: EnhancedDetailField[] = selectedLead ? [
    { label: "Name", value: selectedLead.name, type: "text", fieldName: "name", icon: <User className="h-4 w-4" />, section: "contact" },
    { label: "Email", value: selectedLead.email, type: "text", fieldName: "email", icon: <Mail className="h-4 w-4" />, section: "contact" },
    { label: "Phone", value: selectedLead.phone, type: "text", fieldName: "phone", icon: <Phone className="h-4 w-4" />, section: "contact" },
    { label: "Company", value: selectedLead.company, type: "text", fieldName: "company", icon: <Building className="h-4 w-4" />, section: "contact" },
    { 
      label: "Source", 
      value: selectedLead.source, 
      type: "select", 
      fieldName: "source",
      section: "status",
      selectOptions: [
        { value: "call", label: "Call" },
        { value: "walk_in", label: "Walk-in" },
        { value: "website", label: "Website" },
        { value: "referral", label: "Referral" },
        { value: "campaign", label: "Campaign" },
        { value: "other", label: "Other" },
      ]
    },
    { 
      label: "Status", 
      value: selectedLead.status, 
      type: "select", 
      fieldName: "status",
      section: "status",
      selectOptions: [
        { value: "new", label: "New" },
        { value: "contacted", label: "Contacted" },
        { value: "qualified", label: "Qualified" },
        { value: "lost", label: "Lost" },
        { value: "converted", label: "Converted" },
      ]
    },
    { label: "Interest Level", value: selectedLead.interest_level, type: "rating", fieldName: "interest_level", icon: <Star className="h-4 w-4" />, section: "status" },
    { label: "Notes", value: selectedLead.notes, type: "textarea", fieldName: "notes", icon: <FileText className="h-4 w-4" />, section: "other", fullWidth: true },
    { label: "Created", value: selectedLead.created_at, type: "date", icon: <Clock className="h-4 w-4" />, section: "other" },
  ] : [];

  const detailSections = [
    { id: "contact", label: "Contact Information", icon: <User className="h-4 w-4" /> },
    { id: "status", label: "Lead Status", icon: <Star className="h-4 w-4" /> },
    { id: "other", label: "Additional Info", icon: <FileText className="h-4 w-4" /> },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Leads</h1>
          <p className="text-muted-foreground">Manage and track your sales leads</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={handleExportCSV} disabled={filteredLeads.length === 0}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          <ImportContactsDialog fixedTable="leads" onImported={fetchLeads} />
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Lead
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Add New Lead</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Name *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="company">Company</Label>
                    <Input
                      id="company"
                      value={formData.company}
                      onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="source">Source</Label>
                    <Select value={formData.source} onValueChange={(value) => setFormData({ ...formData, source: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="call">Call</SelectItem>
                        <SelectItem value="walk_in">Walk-in</SelectItem>
                        <SelectItem value="website">Website</SelectItem>
                        <SelectItem value="referral">Referral</SelectItem>
                        <SelectItem value="campaign">Campaign</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="status">Status</Label>
                    <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="new">New</SelectItem>
                        <SelectItem value="contacted">Contacted</SelectItem>
                        <SelectItem value="qualified">Qualified</SelectItem>
                        <SelectItem value="lost">Lost</SelectItem>
                        <SelectItem value="converted">Converted</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="interest">Interest Level (1-5)</Label>
                  <Input
                    id="interest"
                    type="number"
                    min="1"
                    max="5"
                    value={formData.interest_level}
                    onChange={(e) => setFormData({ ...formData, interest_level: parseInt(e.target.value) })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={3}
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">Create Lead</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <SearchFilter value={searchTerm} onChange={setSearchTerm} placeholder="Search leads..." />

      <div className="flex gap-2 flex-wrap">
        <Select value={sourceFilter} onValueChange={setSourceFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by source" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sources</SelectItem>
            <SelectItem value="call">Call</SelectItem>
            <SelectItem value="walk_in">Walk-in</SelectItem>
            <SelectItem value="website">Website</SelectItem>
            <SelectItem value="referral">Referral</SelectItem>
            <SelectItem value="campaign">Campaign</SelectItem>
            <SelectItem value="other">Other</SelectItem>
          </SelectContent>
        </Select>

        <Select value={interestFilter} onValueChange={setInterestFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by interest" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Interest Levels</SelectItem>
            <SelectItem value="1">⭐ (1)</SelectItem>
            <SelectItem value="2">⭐⭐ (2)</SelectItem>
            <SelectItem value="3">⭐⭐⭐ (3)</SelectItem>
            <SelectItem value="4">⭐⭐⭐⭐ (4)</SelectItem>
            <SelectItem value="5">⭐⭐⭐⭐⭐ (5)</SelectItem>
          </SelectContent>
        </Select>

        <Popover open={showCalendar} onOpenChange={setShowCalendar}>
          <PopoverTrigger asChild>
            <Button variant="outline">
              <CalendarIcon className="h-4 w-4 mr-2" />
              {dateFilter ? format(dateFilter, "PPP") : "Pick a date"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={dateFilter}
              onSelect={(date) => {
                setDateFilter(date);
                setShowCalendar(false);
              }}
              initialFocus
            />
          </PopoverContent>
        </Popover>

        {dateFilter && (
          <Button variant="ghost" onClick={() => setDateFilter(undefined)}>
            Clear Date
          </Button>
        )}
      </div>

      <div className="border rounded-lg overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Company</TableHead>
              <TableHead>Source</TableHead>
              <TableHead>Interest</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center">
                  <EduvancaLoader size={32} />
                </TableCell>
              </TableRow>
            ) : filteredLeads.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-12">
                  <div className="flex flex-col items-center gap-2">
                    <UserPlus className="h-12 w-12 text-muted-foreground/50" />
                    <p>No leads found</p>
                    <p className="text-sm">Add your first lead to get started</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filteredLeads.map((lead) => (
                <TableRow 
                  key={lead.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => handleLeadClick(lead)}
                >
                  <TableCell className="font-medium">{lead.name}</TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      {lead.email && (
                        <div className="flex items-center gap-1 text-sm">
                          <Mail className="h-3 w-3" />
                          {lead.email}
                        </div>
                      )}
                      {lead.phone && (
                        <div className="flex items-center gap-1 text-sm">
                          <Phone className="h-3 w-3" />
                          {lead.phone}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {lead.company && (
                      <div className="flex items-center gap-1">
                        <Building className="h-3 w-3" />
                        {lead.company}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="capitalize">{lead.source.replace("_", " ")}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-0.5">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={`h-3 w-3 ${
                            star <= (lead.interest_level || 0)
                              ? "fill-warning text-warning"
                              : "text-muted-foreground/30"
                          }`}
                        />
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={getStatusColor(lead.status)}>
                      {lead.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {selectedLead && (
        <EnhancedDetailDialog
          open={detailOpen}
          onOpenChange={setDetailOpen}
          title={selectedLead.name}
          subtitle={selectedLead.company || undefined}
          icon={<UserPlus className="h-5 w-5" />}
          headerBadge={{
            label: selectedLead.status,
            className: getStatusColor(selectedLead.status),
          }}
          fields={detailFields}
          sections={detailSections}
          onEdit={handleDetailEdit}
          onDelete={handleDetailDelete}
          actions={
            !selectedLead.alreadyCustomer && selectedLead.status !== "converted" ? (
              <Button onClick={() => handleConvertToCustomer(selectedLead.id)}>
                <UserPlus className="h-4 w-4 mr-2" />
                Convert to Customer
              </Button>
            ) : selectedLead.alreadyCustomer ? (
              <Badge className="bg-success/10 text-success border-success/20">
                Already a Customer
              </Badge>
            ) : null
          }
        />
      )}

      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={confirmDelete}
        title="Delete Lead"
        description="Are you sure you want to delete this lead? This action cannot be undone."
        variant="destructive"
        confirmText="Delete"
      />
    </div>
  );
};

export default Leads;