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
import { Plus, Ticket, Clock, AlertCircle, CheckCircle, XCircle, MessageSquare, Paperclip, Send } from "lucide-react";
import { formatLocalDate, formatLocalDateTime } from "@/lib/dateUtils";
import { SearchFilter } from "@/components/SearchFilter";
import { AdvancedFilters } from "@/components/AdvancedFilters";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EduvancaLoader } from "@/components/EduvancaLoader";

interface Ticket {
  id: string;
  ticket_number: string;
  customer_id: string | null;
  subject: string;
  description: string;
  issue_type: string;
  priority: string;
  status: string;
  deadline: string | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
   sales_order_number?: string | null;   // ✅ ADD THIS
  customer?: {
    name: string;
    email: string;
  };
}

interface TicketNote {
  id: string;
  note: string;
  is_internal: boolean;
  created_at: string;
}

interface TicketReply {
  id: string;
  reply_text: string;
  sent_to_customer: boolean;
  created_at: string;
}

const Tickets = () => {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [deliveredOrders, setDeliveredOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [notes, setNotes] = useState<TicketNote[]>([]);
  const [replies, setReplies] = useState<TicketReply[]>([]);
  const [newNote, setNewNote] = useState("");
  const [newReply, setNewReply] = useState("");
  const [isInternalNote, setIsInternalNote] = useState(true);
  const [formData, setFormData] = useState({
    customer_id: "",
    sales_order_id: "",
    subject: "",
    description: "",
    issue_type: "other",
    priority: "medium",
    deadline: "",
  });

  useEffect(() => {
    fetchTickets();
    fetchCustomers();
    fetchDeliveredOrders();
  }, []);

  useEffect(() => {
    if (selectedTicket) {
      fetchTicketDetails();
    }
  }, [selectedTicket]);

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

  const fetchDeliveredOrders = async () => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("sales_orders")
      .select("id, order_number")
      .eq("user_id", user.id)
      .eq("status", "delivered")
      .order("created_at", { ascending: false });

    if (error) throw error;
    setDeliveredOrders(data || []);
  } catch (error) {
    console.error("Error fetching delivered orders", error);
  }
};


  const fetchTickets = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
  .from("tickets")
  .select(`
    *,
    customer:customers(id, name, email),
    sales_order:sales_orders(id, order_number)
  `)
  .eq("user_id", user.id)
  .order("created_at", { ascending: false });

      if (error) throw error;

      const ticketsWithCustomer = (data || []).map((t: any) => ({
  ...t,
  customer: t.customer || null,
  sales_order_number: t.sales_order?.order_number || null,
}));

      setTickets(ticketsWithCustomer);
    } catch (error: any) {
      toast.error("Error fetching tickets");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTicketDetails = async () => {
    if (!selectedTicket) return;

    try {
      // Fetch notes
      const { data: notesData } = await supabase
        .from("ticket_notes")
        .select("*")
        .eq("ticket_id", selectedTicket.id)
        .order("created_at", { ascending: false });

      if (notesData) setNotes(notesData);

      // Fetch replies
      const { data: repliesData } = await supabase
        .from("ticket_replies")
        .select("*")
        .eq("ticket_id", selectedTicket.id)
        .order("created_at", { ascending: false });

      if (repliesData) setReplies(repliesData);
    } catch (error) {
      console.error("Error fetching ticket details", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Validate that a delivered sales order is selected
      if (!formData.sales_order_id) {
        toast.error("Please select a delivered sales order to create a ticket");
        return;
      }

      // Get the selected order to extract customer_id
      const selectedOrder = deliveredOrders.find(o => o.id === formData.sales_order_id);
      if (!selectedOrder) {
        toast.error("Selected sales order not found");
        return;
      }

      const { data: ticket, error } = await supabase
        .from("tickets")
        .insert({
          customer_id: null,
          sales_order_id: formData.sales_order_id,
          subject: formData.subject,
          description: formData.description,
          issue_type: formData.issue_type,
          priority: formData.priority,
          deadline: formData.deadline || null,
          user_id: user.id,
        } as any)
        .select()
        .single();

      if (error) throw error;

      // Log activity
      await supabase.from("activities").insert({
        user_id: user.id,
        activity_type: "ticket_created",
        subject: `Ticket ${ticket.ticket_number} created`,
        description: `New ticket: ${formData.subject}`,
        related_to_type: "ticket",
        related_to_id: ticket.id,
      } as any);

      toast.success("Ticket created successfully!");
      setOpen(false);
      setFormData({
        customer_id: "",
        sales_order_id: "",
        subject: "",
        description: "",
        issue_type: "other",
        priority: "medium",
        deadline: "",
      });
      fetchTickets();
    } catch (error: any) {
      toast.error(error.message || "Error creating ticket");
      console.error(error);
    }
  };

  const handleStatusChange = async (ticketId: string, newStatus: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const ticket = tickets.find(t => t.id === ticketId);
      if (!ticket) return;

      const updateData: any = { status: newStatus };
      if (newStatus === "resolved" || newStatus === "closed") {
        updateData.resolved_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from("tickets")
        .update(updateData)
        .eq("id", ticketId);

      if (error) throw error;

      // Log history
      await supabase.from("ticket_history").insert({
        ticket_id: ticketId,
        user_id: user.id,
        action_type: "status_change",
        old_value: ticket.status,
        new_value: newStatus,
      } as any);

      // Log activity
      await supabase.from("activities").insert({
        user_id: user.id,
        activity_type: "ticket_status_changed",
        subject: `Ticket ${ticket.ticket_number} status changed`,
        description: `Status changed from ${ticket.status} to ${newStatus}`,
        related_to_type: "ticket",
        related_to_id: ticketId,
      } as any);

      toast.success("Status updated successfully!");
      fetchTickets();
      if (selectedTicket?.id === ticketId) {
        setSelectedTicket({ ...selectedTicket, status: newStatus });
      }
    } catch (error: any) {
      toast.error("Error updating status");
      console.error(error);
    }
  };

  const handleAddNote = async () => {
    if (!selectedTicket || !newNote.trim()) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase.from("ticket_notes").insert({
        ticket_id: selectedTicket.id,
        user_id: user.id,
        note: newNote,
        is_internal: isInternalNote,
      } as any);

      if (error) throw error;

      toast.success(isInternalNote ? "Note added" : "Reply added");
      setNewNote("");
      fetchTicketDetails();
    } catch (error) {
      toast.error("Error adding note");
      console.error(error);
    }
  };

  const handleAddReply = async () => {
    if (!selectedTicket || !newReply.trim()) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const customerEmail = selectedTicket.customer?.email;

      const { error } = await supabase.from("ticket_replies").insert({
        ticket_id: selectedTicket.id,
        user_id: user.id,
        reply_text: newReply,
        sent_to_customer: true,
        customer_email: customerEmail || null,
        sent_at: new Date().toISOString(),
      } as any);

      if (error) throw error;

      // TODO: Send email to customer
      // You can integrate with email service here

      toast.success("Reply sent to customer!");
      setNewReply("");
      fetchTicketDetails();
    } catch (error) {
      toast.error("Error sending reply");
      console.error(error);
    }
  };

  // ---------- NOTE: Format created_at for notes (local time) ----------
const formatNoteTime = (ts: string | null | undefined) => {
  if (!ts) return "";
  const d = new Date(ts);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${dd}-${mm}-${yyyy} ${hh}:${min}`;
};

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      open: "bg-blue-100 text-blue-800",
      in_progress: "bg-yellow-100 text-yellow-800",
      waiting_for_customer: "bg-orange-100 text-orange-800",
      resolved: "bg-green-100 text-green-800",
      closed: "bg-red-100 text-red-800",
    };
    return colors[status] || "bg-gray-100 text-gray-800";
  };

  const getPriorityColor = (priority: string) => {
    const colors: Record<string, string> = {
      low: "bg-gray-100 text-gray-800",
      medium: "bg-blue-100 text-blue-800",
      high: "bg-orange-100 text-orange-800",
      urgent: "bg-red-100 text-red-800",
    };
    return colors[priority] || "bg-gray-100 text-gray-800";
  };

  const isOverdue = (deadline: string | null) => {
    if (!deadline) return false;
    return new Date(deadline) < new Date();
  };

  const filteredTickets = tickets.filter(ticket => {
    const matchesSearch = ticket.ticket_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ticket.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ticket.customer?.name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || ticket.status === statusFilter;
    const matchesPriority = priorityFilter === "all" || ticket.priority === priorityFilter;
    return matchesSearch && matchesStatus && matchesPriority;
  });

  const openTickets = filteredTickets.filter(t => t.status !== "resolved" && t.status !== "closed").length;
  const resolvedTickets = filteredTickets.filter(t => t.status === "resolved" || t.status === "closed").length;
  const overdueTickets = filteredTickets.filter(t => isOverdue(t.deadline) && t.status !== "resolved" && t.status !== "closed").length;
  const highPriorityPending = filteredTickets.filter(t => 
    (t.priority === "high" || t.priority === "urgent") && 
    t.status !== "resolved" && 
    t.status !== "closed"
  ).length;

  return (
    <div className="space-y-4 md:space-y-6 p-2 md:p-0">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Tickets</h1>
          <p className="text-sm md:text-base text-muted-foreground">Manage customer support tickets</p>
        </div>
        <Button onClick={() => setOpen(true)} className="w-full sm:w-auto">
          <Plus className="h-4 w-4 mr-2" />
          <span className="text-xs md:text-sm">Create Ticket</span>
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-3 md:gap-4 grid-cols-2 md:grid-cols-4">
        <div className="bg-card border rounded-lg p-3 md:p-4">
          <div className="text-xs md:text-sm text-muted-foreground">Open Tickets</div>
          <div className="text-xl md:text-2xl font-bold">{openTickets}</div>
        </div>
        <div className="bg-card border rounded-lg p-3 md:p-4">
          <div className="text-xs md:text-sm text-muted-foreground">Resolved</div>
          <div className="text-xl md:text-2xl font-bold text-green-600">{resolvedTickets}</div>
        </div>
        <div className="bg-card border rounded-lg p-3 md:p-4">
          <div className="text-xs md:text-sm text-muted-foreground">Overdue</div>
          <div className="text-xl md:text-2xl font-bold text-red-600">{overdueTickets}</div>
        </div>
        <div className="bg-card border rounded-lg p-3 md:p-4">
          <div className="text-xs md:text-sm text-muted-foreground">High Priority</div>
          <div className="text-xl md:text-2xl font-bold text-orange-600">{highPriorityPending}</div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
        <SearchFilter value={searchTerm} onChange={setSearchTerm} placeholder="Search tickets..." />
        <AdvancedFilters
          filters={[
            {
              key: "status",
              label: "Status",
              type: "select",
              options: [
                { value: "open", label: "Open" },
                { value: "in_progress", label: "In Progress" },
                { value: "waiting_for_customer", label: "Waiting" },
                { value: "resolved", label: "Resolved" },
                { value: "closed", label: "Closed" },
              ],
            },
            {
              key: "priority",
              label: "Priority",
              type: "select",
              options: [
                { value: "low", label: "Low" },
                { value: "medium", label: "Medium" },
                { value: "high", label: "High" },
                { value: "urgent", label: "Urgent" },
              ],
            },
          ]}
          appliedFilters={{ status: statusFilter === "all" ? null : statusFilter, priority: priorityFilter === "all" ? null : priorityFilter }}
          onFilterChange={(key, value) => {
            if (key === "status") setStatusFilter(value || "all");
            if (key === "priority") setPriorityFilter(value || "all");
          }}
          onClearAll={() => {
            setStatusFilter("all");
            setPriorityFilter("all");
          }}
        />
      </div>

      {/* Tickets Table */}
      <div className="border rounded-lg overflow-x-auto -mx-2 md:mx-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs md:text-sm">Ticket #</TableHead>
              <TableHead className="text-xs md:text-sm">Subject</TableHead>
              
              <TableHead className="text-xs md:text-sm">SO Number</TableHead>
              <TableHead className="text-xs md:text-sm">Priority</TableHead>
              <TableHead className="text-xs md:text-sm">Status</TableHead>
              <TableHead className="text-xs md:text-sm hidden md:table-cell">Deadline</TableHead>
              <TableHead className="text-xs md:text-sm">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center"><EduvancaLoader size={32} /></TableCell>
              </TableRow>
            ) : filteredTickets.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-12">
                  <div className="flex flex-col items-center gap-2">
                    <Ticket className="h-12 w-12 text-muted-foreground/50" />
                    <p>No tickets found</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filteredTickets.map((ticket) => (
                <TableRow key={ticket.id} className="hover:bg-muted/50">
                  <TableCell className="font-medium text-xs md:text-sm">{ticket.ticket_number}</TableCell>
                  <TableCell className="text-xs md:text-sm">
                    <div className="flex flex-col">
                      <span className="font-medium">{ticket.subject}</span>
                      <span className="md:hidden text-xs text-muted-foreground mt-1">
                        {ticket.customer?.name || "No customer"}
                      </span>
                    </div>
                  </TableCell>
                  
                  <TableCell className="text-xs md:text-sm">
  {ticket.sales_order_number || "-"}
</TableCell>
                  <TableCell className="text-xs md:text-sm">
                    <Badge className={getPriorityColor(ticket.priority)}>
                      {ticket.priority}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs md:text-sm">
                    <Select
  value={ticket.status}
  disabled={ticket.status === "resolved"}
  onValueChange={(value) => handleStatusChange(ticket.id, value)}
>
                      <SelectTrigger className={`h-7 md:h-8 text-xs md:text-sm ${getStatusColor(ticket.status)}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="open">Open</SelectItem>
                        <SelectItem value="in_progress">In Progress</SelectItem>
                        <SelectItem value="waiting_for_customer">Waiting for Customer</SelectItem>
                        <SelectItem value="resolved">Resolved</SelectItem>
                        <SelectItem value="closed">Closed</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="text-xs md:text-sm hidden md:table-cell">
                    {ticket.deadline ? (
                      <div className="flex items-center gap-1">
                        {isOverdue(ticket.deadline) && (
                          <AlertCircle className="h-3 w-3 text-red-500" />
                        )}
                        <span className={isOverdue(ticket.deadline) ? "text-red-600" : ""}>
                          {formatLocalDate(ticket.deadline)}
                        </span>
                      </div>
                    ) : (
                      "-"
                    )}
                  </TableCell>
                  <TableCell className="text-xs md:text-sm">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedTicket(ticket);
                        setDetailOpen(true);
                      }}
                      className="h-7 w-7 md:h-8 md:w-8 p-0"
                    >
                      <MessageSquare className="h-3.5 w-3.5 md:h-4 md:w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Create Ticket Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Ticket</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Sales Order (Delivered Only) *</Label>
              <Select 
                value={formData.sales_order_id || "none"} 
                onValueChange={(v) => {
                  const order = deliveredOrders.find(o => o.id === v);
                  setFormData({ 
                    ...formData, 
                    sales_order_id: v === "none" ? "" : v,
                    customer_id: ""
                  });
                }}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select delivered sales order" />
                </SelectTrigger>
                <SelectContent>
                  {deliveredOrders.length === 0 ? (
                    <SelectItem value="none" disabled>No delivered orders available</SelectItem>
                  ) : (
                    deliveredOrders.map((order) => (
                      <SelectItem key={order.id} value={order.id}>
  {order.order_number}
</SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              {deliveredOrders.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  No delivered sales orders found. Tickets can only be created for delivered orders.
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Subject *</Label>
              <Input
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
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
                <Label>Issue Type</Label>
                <Select value={formData.issue_type} onValueChange={(v) => setFormData({ ...formData, issue_type: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="technical">Technical</SelectItem>
                    <SelectItem value="billing">Billing</SelectItem>
                    <SelectItem value="sales">Sales</SelectItem>
                    <SelectItem value="support">Support</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Priority</Label>
                <Select value={formData.priority} onValueChange={(v) => setFormData({ ...formData, priority: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Deadline (Optional)</Label>
              <Input
                type="datetime-local"
                value={formData.deadline}
                onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit">Create Ticket</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Ticket Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          {selectedTicket && (
            <>
              <DialogHeader>
                <DialogTitle>{selectedTicket.ticket_number} - {selectedTicket.subject}</DialogTitle>
              </DialogHeader>
              <Tabs defaultValue="details" className="w-full">
                <TabsList className="grid w-full grid-cols-2 rounded-md border bg-muted">
  <TabsTrigger value="details">Details</TabsTrigger>
  <TabsTrigger value="notes">Notes & Replies</TabsTrigger>
</TabsList>
                <TabsContent value="details" className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-muted-foreground">Status</Label>
                      <div className="mt-1">
                        <Badge className={getStatusColor(selectedTicket.status)}>
                          {selectedTicket.status.replace('_', ' ')}
                        </Badge>
                      </div>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Priority</Label>
                      <div className="mt-1">
                        <Badge className={getPriorityColor(selectedTicket.priority)}>
                          {selectedTicket.priority}
                        </Badge>
                      </div>
                    </div>
                    <div>
  <Label className="text-muted-foreground">Sales Order</Label>
  <div className="mt-1 font-medium">{selectedTicket.sales_order_number || "-"}</div>
</div>

                    <div>
                      <Label className="text-muted-foreground">Customer</Label>
                      <div className="mt-1">{selectedTicket.customer?.name || "-"}</div>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Issue Type</Label>
                      <div className="mt-1">{selectedTicket.issue_type}</div>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Deadline</Label>
                      <div className="mt-1">
                        {selectedTicket.deadline ? (
                          <div className="flex items-center gap-1">
                            {isOverdue(selectedTicket.deadline) && (
                              <AlertCircle className="h-4 w-4 text-red-500" />
                            )}
                            <span className={isOverdue(selectedTicket.deadline) ? "text-red-600 font-medium" : ""}>
                              {formatLocalDateTime(selectedTicket.deadline)}
                            </span>
                          </div>
                        ) : (
                          "-"
                        )}
                      </div>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Created</Label>
                      <div className="mt-1">{formatLocalDateTime(selectedTicket.created_at)}</div>
                    </div>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Description</Label>
                    <div className="mt-1 p-3 bg-muted rounded-md">{selectedTicket.description}</div>
                  </div>
                </TabsContent>
                <TabsContent value="notes" className="space-y-4">
                  <div className="space-y-4">
                    <div>
                      <Label>Add Internal Note</Label>
                      <div className="flex gap-2 mt-2">
                        <Textarea
                          value={newNote}
                          onChange={(e) => setNewNote(e.target.value)}
                          placeholder="Add a note for yourself..."
                          rows={2}
                          className="flex-1"
                        />
                        <Button onClick={handleAddNote} disabled={!newNote.trim()}>
                          <Send className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    
                    <ScrollArea className="h-[300px] border rounded-md p-4">
                      <div className="space-y-4">
                        {notes.map((note) => (
                          <div key={note.id} className="border-l-2 border-blue-500 pl-3">
                            <div className="text-xs text-muted-foreground">
                              {formatNoteTime(note.created_at)} - {note.is_internal ? "Internal Note" : "Public"}
                            </div>
                            <div className="mt-1">{note.note}</div>
                          </div>
                        ))}
                        {replies.map((reply) => (
                          <div key={reply.id} className="border-l-2 border-green-500 pl-3">
                            <div className="text-xs text-muted-foreground">
                              {formatLocalDateTime(reply.created_at)} - Customer Reply
                            </div>
                            <div className="mt-1">{reply.reply_text}</div>
                          </div>
                        ))}
                        {notes.length === 0 && replies.length === 0 && (
                          <div className="text-center text-muted-foreground py-8">
                            No notes or replies yet
                          </div>
                        )}
                      </div>
                    </ScrollArea>
                  </div>
                </TabsContent>
                
              </Tabs>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Tickets;

