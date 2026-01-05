import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Plus, CalendarDays, Check, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EduvancaLoader } from "@/components/EduvancaLoader";
import { SearchFilter } from "@/components/SearchFilter";
import { AdvancedFilters } from "@/components/AdvancedFilters";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";


interface LeaveRequest {
  id: string;
  employee_id: string;
  leave_type: string;
  start_date: string;
  end_date: string;
  days: number;
  reason: string | null;
  status: string;
}

interface Employee {
  id: string;
  first_name: string;
  last_name: string;
}

const Leave = () => {
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [showRequests, setShowRequests] = useState(false);
  const [formData, setFormData] = useState({
    employee_id: "",
    leave_type: "casual",
    start_date: "",
    end_date: "",
    reason: "",
  });
  const [filterMonth, setFilterMonth] = useState("all");
const [filterYear, setFilterYear] = useState("all");
const [filterStatus, setFilterStatus] = useState("all");
const [searchTerm, setSearchTerm] = useState("");
const [dateFilter, setDateFilter] = useState<Date | undefined>(undefined);

const [filterEmployee, setFilterEmployee] = useState<string | null>(null);
const [filterLeaveType, setFilterLeaveType] = useState<string | null>(null);
const [leaveSubmitting, setLeaveSubmitting] = useState(false);
const [actionLoading, setActionLoading] = useState<string | null>(null);




  useEffect(() => {
    fetchLeaveRequests();
    fetchEmployees();
  }, []);

  const fetchLeaveRequests = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("leave_requests")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setLeaveRequests(data || []);
    } catch (error: any) {
      toast.error("Error fetching leave requests");
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployees = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("employees")
        .select("id, first_name, last_name")
        .eq("user_id", user.id);

      if (error) throw error;
      setEmployees(data || []);
    } catch (error: any) {
      toast.error("Error fetching employees");
    }
  };

  const calculateDays = async (start: string, end: string) => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return 0;

  const startDate = new Date(start);
  const endDate = new Date(end);

  const holidays: Set<string> = new Set();

  const { data: holidayData } = await supabase
    .from("payroll_month_holidays")
    .select("date")
    .eq("user_id", user.id)
    .gte("date", start)
    .lte("date", end);

  holidayData?.forEach(h => holidays.add(h.date));

  let count = 0;
  const current = new Date(startDate);

  while (current <= endDate) {
    const iso = current.toISOString().split("T")[0];
    const isSunday = current.getDay() === 0;
    const isHoliday = holidays.has(iso);

    if (!isSunday && !isHoliday) {
      count++;
    }

    current.setDate(current.getDate() + 1);
  }

  return count;
};


  const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  if (leaveSubmitting) return;
  setLeaveSubmitting(true);

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    //const days = calculateDays(formData.start_date, formData.end_date);
    const days = await calculateDays(formData.start_date, formData.end_date);

    const { error } = await supabase.from("leave_requests").insert([{
      employee_id: formData.employee_id,
      leave_type: formData.leave_type,
      start_date: formData.start_date,
      end_date: formData.end_date,
      days: days,
      reason: formData.reason || null,
      user_id: user.id,
    }] as any);

    if (error) throw error;

    toast.success("Leave request submitted successfully!");
    setOpen(false);
    setFormData({
      employee_id: "",
      leave_type: "casual",
      start_date: "",
      end_date: "",
      reason: "",
    });
    await fetchLeaveRequests();
  } catch (error: any) {
    toast.error("Error submitting leave request");
  } finally {
    setLeaveSubmitting(false);
  }
};


  const handleApprove = async (requestId: string) => {
  if (actionLoading) return; // PREVENT DOUBLE TAP
  setActionLoading(requestId);

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: leaveReq, error: fetchError } = await supabase
      .from("leave_requests")
      .select("*")
      .eq("id", requestId)
      .single();

    if (fetchError) throw fetchError;

    const { data: emp, error: empError } = await supabase
      .from("employees")
      .select("department_id")
      .eq("id", leaveReq.employee_id)
      .single();

    if (empError) throw empError;

    const { error: approveError } = await supabase
      .from("leave_requests")
      .update({
        status: "approved",
        approved_by: user.id,
        approved_at: new Date().toISOString(),
      })
      .eq("id", requestId);

    if (approveError) throw approveError;

    const start = new Date(leaveReq.start_date);
    const end = new Date(leaveReq.end_date);
    const datesToInsert = [];

    const { data: holidayRows } = await supabase
  .from("payroll_month_holidays")
  .select("date")
  .eq("user_id", user.id)
  .gte("date", leaveReq.start_date)
  .lte("date", leaveReq.end_date);

const holidaySet = new Set(holidayRows?.map(h => h.date));

while (start <= end) {
  const iso = start.toISOString().split("T")[0];
  const isSunday = start.getDay() === 0;
  const isHoliday = holidaySet.has(iso);

  if (!isSunday && !isHoliday) {
    datesToInsert.push({
      employee_id: leaveReq.employee_id,
      date: iso,
      check_in: null,
      check_out: null,
      status: "absent",
      notes: "Leave Approved",
      department_id: emp?.department_id || null,
      user_id: user.id,
    });
  }

  start.setDate(start.getDate() + 1);
}


    if (datesToInsert.length > 0) {
      const { error: insertError } = await supabase
        .from("attendance")
        .insert(datesToInsert);

      if (insertError) throw insertError;
    }

    toast.success("Leave approved & attendance updated!");
    fetchLeaveRequests();
  } catch (error: any) {
    toast.error("Error approving leave");
  } finally {
    setActionLoading(null); // UNLOCK BUTTON
  }
};



  const handleReject = async (requestId: string) => {
  if (actionLoading) return;
  setActionLoading(requestId);

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from("leave_requests")
      .update({
        status: "rejected",
        approved_by: user.id,
        approved_at: new Date().toISOString(),
      })
      .eq("id", requestId);

    if (error) throw error;

    toast.success("Leave request rejected!");
    fetchLeaveRequests();
  } catch (error: any) {
    toast.error("Error rejecting request");
  } finally {
    setActionLoading(null);
  }
};


  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: "bg-yellow-100 text-yellow-800",
      approved: "bg-green-100 text-green-800",
      rejected: "bg-red-100 text-red-800",
      cancelled: "bg-gray-100 text-gray-800",
    };
    return colors[status] || "bg-gray-100 text-gray-800";
  };

  const getEmployeeName = (empId: string) => {
    const emp = employees.find(e => e.id === empId);
    return emp ? `${emp.first_name} ${emp.last_name}` : "-";
  };

  const pendingRequests = leaveRequests.filter(r => r.status === "pending");
  //const displayedRequests = showRequests ? pendingRequests : leaveRequests;
  const filteredRequests = leaveRequests.filter((r) => {
  const reqDate = new Date(r.start_date);

  // Search filter
  if (searchTerm) {
    const s = searchTerm.toLowerCase();
    if (
      !getEmployeeName(r.employee_id).toLowerCase().includes(s) &&
      !r.leave_type.toLowerCase().includes(s)
    ) {
      return false;
    }
  }

  // Date filter
  if (dateFilter) {
    if (new Date(r.start_date).toDateString() !== dateFilter.toDateString()) {
      return false;
    }
  }

  // Month filter
  if (filterMonth !== "all" && reqDate.getMonth() + 1 !== Number(filterMonth)) {
    return false;
  }

  // Year filter
  if (filterYear !== "all" && reqDate.getFullYear() !== Number(filterYear)) {
    return false;
  }

  // Status filter
  if (filterStatus !== "all" && r.status !== filterStatus) return false;

  // Employee filter
  if (filterEmployee && r.employee_id !== filterEmployee) return false;

  // Leave type filter
  if (filterLeaveType && r.leave_type !== filterLeaveType) return false;

  return true;
});


const displayedRequests = showRequests
  ? filteredRequests.filter(r => r.status === "pending")
  : filteredRequests;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 w-full">
        <div>
          <h1 className="text-3xl font-bold">Leave Management</h1>
          <p className="text-muted-foreground">Manage employee leave requests</p>
        </div>
        <div className="flex flex-wrap gap-3 items-center w-full sm:w-auto">
          <div className="flex items-center space-x-2">
            <Switch
              id="show-requests"
              checked={showRequests}
              onCheckedChange={setShowRequests}
            />
            <Label htmlFor="show-requests">Show Pending Only</Label>
          </div>
          {/* FILTER BAR — same style as Sales Orders */}
<div className="flex flex-wrap gap-2 items-center w-full sm:w-auto">


  {/* SEARCH BAR */}
  <SearchFilter
    value={searchTerm}
    onChange={setSearchTerm}
    placeholder="Search leave requests..."
  />

  {/* DATE FILTER */}
  <Popover>
    <PopoverTrigger asChild>
      <Button variant="outline" className="w-full sm:w-[200px] justify-start text-left font-normal text-sm">
        <CalendarDays className="mr-2 h-4 w-4" />
        {dateFilter ? new Date(dateFilter).toLocaleDateString() : "Filter by date"}
      </Button>
    </PopoverTrigger>
    <PopoverContent className="w-auto p-0">
      <Calendar
        mode="single"
        selected={dateFilter}
        onSelect={setDateFilter}
        initialFocus
      />
      {dateFilter && (
        <div className="p-2 border-t">
          <Button variant="ghost" className="w-full" onClick={() => setDateFilter(undefined)}>
            Clear Filter
          </Button>
        </div>
      )}
    </PopoverContent>
  </Popover>

  {/* ADVANCED FILTERS */}
  <AdvancedFilters
  filters={[
    {
      key: "status",
      label: "Status",
      type: "select",
      options: [
        { value: "pending", label: "Pending" },
        { value: "approved", label: "Approved" },
        { value: "rejected", label: "Rejected" },
        { value: "cancelled", label: "Cancelled" },
      ],
    },
    {
      key: "employee",
      label: "Employee",
      type: "select",
      options: employees.map(e => ({
        value: e.id,
        label: `${e.first_name} ${e.last_name}`,
      })),
    },
    {
      key: "leaveType",
      label: "Leave Type",
      type: "select",
      options: [
        { value: "casual", label: "Casual" },
        { value: "sick", label: "Sick" },
        { value: "vacation", label: "Vacation" },
        { value: "unpaid", label: "Unpaid" },
      ],
    },
    {
      key: "month",
      label: "Month",
      type: "select",
      options: [
        { value: "1", label: "January" },
        { value: "2", label: "February" },
        { value: "3", label: "March" },
        { value: "4", label: "April" },
        { value: "5", label: "May" },
        { value: "6", label: "June" },
        { value: "7", label: "July" },
        { value: "8", label: "August" },
        { value: "9", label: "September" },
        { value: "10", label: "October" },
        { value: "11", label: "November" },
        { value: "12", label: "December" },
      ],
    },
    {
      key: "year",
      label: "Year",
      type: "select",
      options: [
        { value: "2023", label: "2023" },
        { value: "2024", label: "2024" },
        { value: "2025", label: "2025" },
        { value: "2026", label: "2026" },
      ],
    },
  ]}
    appliedFilters={{
      status: filterStatus === "all" ? null : filterStatus,
      employee: filterEmployee,
      leaveType: filterLeaveType,
      month: filterMonth,
      year: filterYear,
    }}
    onFilterChange={(key, value) => {
      if (key === "status") setFilterStatus(value);
      if (key === "employee") setFilterEmployee(value);
      if (key === "leaveType") setFilterLeaveType(value);
      if (key === "month") setFilterMonth(value || "all");
      if (key === "year") setFilterYear(value || "all");
    }}
    onClearAll={() => {
      setFilterStatus("all");
      setFilterEmployee(null);
      setFilterLeaveType(null);
      setSearchTerm("");
      setDateFilter(undefined);
    }}
  />

</div>

          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                New Leave Request
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>New Leave Request</DialogTitle>
              </DialogHeader>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="employee_id">Employee *</Label>
                  <Select value={formData.employee_id} onValueChange={(value) => setFormData({ ...formData, employee_id: value })} required>
                    <SelectTrigger>
                      <SelectValue placeholder="Select employee" />
                    </SelectTrigger>
                    <SelectContent>
                      {employees.map((emp) => (
                        <SelectItem key={emp.id} value={emp.id}>
                          {`${emp.first_name} ${emp.last_name}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="leave_type">Leave Type *</Label>
                  <Select value={formData.leave_type} onValueChange={(value) => setFormData({ ...formData, leave_type: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sick">Sick Leave</SelectItem>
                      <SelectItem value="casual">Casual Leave</SelectItem>
                      <SelectItem value="vacation">Vacation</SelectItem>
                      <SelectItem value="unpaid">Unpaid Leave</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="start_date">Start Date *</Label>
                    <Input
                      id="start_date"
                      type="date"
                      value={formData.start_date}
                      onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="end_date">End Date *</Label>
                    <Input
                      id="end_date"
                      type="date"
                      value={formData.end_date}
                      onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reason">Reason</Label>
                  <Textarea
                    id="reason"
                    value={formData.reason}
                    onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                    rows={3}
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                    Cancel
                  </Button>
                  <Button
  type="submit"
  disabled={leaveSubmitting}
  className={leaveSubmitting ? "opacity-50 cursor-not-allowed" : ""}
>
  {leaveSubmitting ? "Submitting..." : "Submit Request"}
</Button>

                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {showRequests && pendingRequests.length > 0 && (
        <Card className="border-yellow-200 bg-yellow-50/50">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <CalendarDays className="h-5 w-5" />
              Pending Leave Requests ({pendingRequests.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {pendingRequests.map((request) => (
              <div key={request.id} className="p-4 border rounded-lg bg-background space-y-2">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-semibold">{getEmployeeName(request.employee_id)}</p>
                    <p className="text-sm text-muted-foreground capitalize">
                      {request.leave_type.replace("_", " ")} Leave
                    </p>
                  </div>
                  <Badge className={getStatusColor(request.status)}>
                    {request.status}
                  </Badge>
                </div>
                <div className="text-sm">
                  <p><strong>Period:</strong> {new Date(request.start_date).toLocaleDateString()} to {new Date(request.end_date).toLocaleDateString()}</p>
                  <p><strong>Days:</strong> {request.days}</p>
                  {request.reason && <p><strong>Reason:</strong> {request.reason}</p>}
                </div>
                <div className="flex gap-2 pt-2">
                  <Button
  size="sm"
  className={`flex-1 bg-green-600 hover:bg-green-700 ${
    actionLoading === request.id ? "opacity-50 cursor-not-allowed" : ""
  }`}
  disabled={actionLoading === request.id}
  onClick={() => handleApprove(request.id)}
>
  {actionLoading === request.id ? "Approving..." : (
    <>
      <Check className="h-4 w-4 mr-2" />
      Approve
    </>
  )}
</Button>

<Button
  size="sm"
  variant="destructive"
  className={`flex-1 ${
    actionLoading === request.id ? "opacity-50 cursor-not-allowed" : ""
  }`}
  disabled={actionLoading === request.id}
  onClick={() => handleReject(request.id)}
>
  {actionLoading === request.id ? "Rejecting..." : (
    <>
      <X className="h-4 w-4 mr-2" />
      Reject
    </>
  )}
</Button>

                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="border rounded-lg overflow-x-auto w-full max-w-full">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Employee</TableHead>
              <TableHead>Leave Type</TableHead>
              <TableHead>Start Date</TableHead>
              <TableHead>End Date</TableHead>
              <TableHead>Days</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center"><EduvancaLoader size={32} /></TableCell>
              </TableRow>
            ) : displayedRequests.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-12">
                  <div className="flex flex-col items-center gap-2">
                    <CalendarDays className="h-12 w-12 text-muted-foreground/50" />
                    <p>No leave requests found</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              displayedRequests.map((request) => (
                <TableRow key={request.id}>
                  <TableCell className="font-medium">{getEmployeeName(request.employee_id)}</TableCell>
                  <TableCell className="capitalize">{request.leave_type.replace("_", " ")}</TableCell>
                  <TableCell>{new Date(request.start_date).toLocaleDateString()}</TableCell>
                  <TableCell>{new Date(request.end_date).toLocaleDateString()}</TableCell>
                  <TableCell>{request.days}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={getStatusColor(request.status)}>
                      {request.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default Leave;