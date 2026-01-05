import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Plus, Calendar } from "lucide-react";
import { EduvancaLoader } from "@/components/EduvancaLoader";
import { formatTime12h } from "@/lib/timeUtils";

interface AttendanceRecord {
  id: string;
  employee_id: string;
  date: string;
  check_in: string | null;
  check_out: string | null;
  status: string;
  notes: string | null;
  department_id: string | null;
}

interface Employee {
  id: string;
  first_name: string;
  last_name: string;
  department_id: string | null;
}

const Attendance = () => {
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [editOpen, setEditOpen] = useState(false);
const [selectedRecord, setSelectedRecord] = useState<AttendanceRecord | null>(null);
const [editCheckOut, setEditCheckOut] = useState("");
const [editHalfDay, setEditHalfDay] = useState(false);
const [submitLoading, setSubmitLoading] = useState(false);
const [isHoliday, setIsHoliday] = useState(false);
const [todayIsHoliday, setTodayIsHoliday] = useState(false);



  const [formData, setFormData] = useState({
    employee_id: "",
    date: new Date().toISOString().split('T')[0],
    check_in: "",
    check_out: "",
    status: "present",
    notes: "",
  });

  useEffect(() => {
  fetchAttendance();
  fetchEmployees();
  fetchDepartments();
  checkHoliday(selectedDate);
}, [selectedDate, departmentFilter]);


  useEffect(() => {
  setFormData(prev => ({
    ...prev,
    date: selectedDate,
    employee_id: "", // reset employee when date changes
  }));
}, [selectedDate]);

useEffect(() => {
  checkTodayHoliday();
}, []);

const checkTodayHoliday = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const today = new Date().toISOString().split("T")[0];
  const [year, month] = today.split("-").map(Number);

  const { data } = await supabase
    .from("payroll_month_holidays")
    .select("date")
    .eq("user_id", user.id)
    .eq("year", year)
    .eq("month", month)
    .eq("date", today)
    .maybeSingle();

  setTodayIsHoliday(!!data);
};


  const fetchDepartments = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("departments")
        .select("id, name")
        .eq("user_id", user.id);

      if (error) throw error;
      setDepartments(data || []);
    } catch (error: any) {
      console.error("Error fetching departments");
    }
  };

  const fetchAttendance = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      let query = supabase
        .from("attendance")
        .select("*")
        .eq("user_id", user.id)
        .eq("date", selectedDate)
        .order("date", { ascending: false });

      if (departmentFilter !== "all") {
        query = query.eq("department_id", departmentFilter);
      }

      const { data, error } = await query;

      if (error) throw error;
      setAttendance(data || []);
    } catch (error: any) {
      toast.error("Error fetching attendance");
    } finally {
      setLoading(false);
    }
  };


  const checkHoliday = async (date: string) => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const [year, month] = date.split("-").map(Number);

  const { data } = await supabase
    .from("payroll_month_holidays")
    .select("date")
    .eq("user_id", user.id)
    .eq("year", year)
    .eq("month", month)
    .eq("date", date)
    .maybeSingle();

  setIsHoliday(!!data);
};



  const fetchEmployees = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("employees")
        .select("id, first_name, last_name, department_id")
        .eq("user_id", user.id)
        .eq("status", "active");

      if (error) throw error;
      setEmployees(data || []);
    } catch (error: any) {
      toast.error("Error fetching employees");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  if (submitLoading) return; // already submitting
  setSubmitLoading(true);

  if (isHoliday) {
  toast.error("Attendance cannot be marked on holidays");
  setSubmitLoading(false);
  return;
}



  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const employee = employees.find(e => e.id === formData.employee_id);

    const { error } = await supabase.from("attendance").insert([{
      employee_id: formData.employee_id,
      date: formData.date,
      check_in: formData.check_in || null,
      check_out: formData.check_out || null,
      status: formData.status,
      notes: formData.notes || null,
      department_id: employee?.department_id || null,
      user_id: user.id,
    }] as any);

    if (error) throw error;

    toast.success("Attendance recorded successfully!");
    setOpen(false);
    setFormData({
  employee_id: "",
  date: new Date().toISOString().split('T')[0],
  check_in: "",
  check_out: "", // keep in state, but user can’t enter it
  status: "present",
  notes: "",
});

    await fetchAttendance();
  } catch (error: any) {
    toast.error("Error recording attendance");
  } finally {
    setSubmitLoading(false);
  }
};


  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      present: "bg-green-100 text-green-800",
      absent: "bg-red-100 text-red-800",
      late: "bg-yellow-100 text-yellow-800",
      halfday: "bg-blue-100 text-blue-800",
    };
    return colors[status] || "bg-gray-100 text-gray-800";
  };

  const getEmployeeName = (empId: string) => {
    const emp = employees.find(e => e.id === empId);
    return emp ? `${emp.first_name} ${emp.last_name}` : "-";
  };

  // Employees already marked attendance for selected date
const markedEmployeeIds = new Set(
  attendance
    .filter(a => a.date === formData.date)
    .map(a => a.employee_id)
);

// Employees available for marking attendance
const availableEmployees = employees.filter(
  emp => !markedEmployeeIds.has(emp.id)
);


  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 w-full">
        <div>
          <h1 className="text-3xl font-bold">Attendance</h1>
          <p className="text-muted-foreground">Track employee attendance</p>
        </div>
         {isHoliday && (
    <div className="p-3 rounded-lg bg-red-100 text-red-700 font-medium">
      🎉 Today is a Holiday. Attendance is disabled.
    </div>
  )}
        <div className="flex flex-wrap gap-3 items-center w-full md:w-auto">
          <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Departments</SelectItem>
              {departments.map((dept) => (
                <SelectItem key={dept.id} value={dept.id}>
                  {dept.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex items-center gap-2">
            <Label htmlFor="date-filter">Date:</Label>
            <Input
              id="date-filter"
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-40"
            />
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
          {isHoliday ? (
  <Button disabled className="opacity-50 cursor-not-allowed">
    Holiday – Attendance Disabled
  </Button>
) : (
  <DialogTrigger asChild>
    <Button>
      <Plus className="h-4 w-4 mr-2" />
      Mark Attendance
    </Button>
  </DialogTrigger>
)}

          <DialogContent>
            <DialogHeader>
              <DialogTitle>Mark Attendance</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="employee_id">Employee *</Label>
                <Select value={formData.employee_id} onValueChange={(value) => setFormData({ ...formData, employee_id: value })} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select employee" />
                  </SelectTrigger>
                  <SelectContent>
  {availableEmployees.length === 0 ? (
    <div className="px-3 py-2 text-sm text-muted-foreground">
      All employees already marked for this date
    </div>
  ) : (
    availableEmployees.map((emp) => (
      <SelectItem key={emp.id} value={emp.id}>
        {`${emp.first_name} ${emp.last_name}`}
      </SelectItem>
    ))
  )}
</SelectContent>

                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="date">Date *</Label>
                  <Input
                    id="date"
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="status">Status *</Label>
<Select
  value={formData.status}
  onValueChange={(value) => setFormData({ ...formData, status: value })}
>
  <SelectTrigger>
    <SelectValue />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="present">Present</SelectItem>
    <SelectItem value="halfday">Half Day</SelectItem>
  </SelectContent>
</Select>

                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="check_in">Check In</Label>
                  <Input
                    id="check_in"
                    type="time"
                    value={formData.check_in}
                    onChange={(e) => setFormData({ ...formData, check_in: e.target.value })}
                  />
                </div>
                
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={2}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button
  type="submit"
  disabled={submitLoading}
  className={submitLoading ? "opacity-50 cursor-not-allowed" : ""}
>
  {submitLoading ? "Saving..." : "Mark Attendance"}
</Button>

              </div>
            </form>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      <div className="border rounded-lg overflow-x-auto w-full max-w-full">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Employee</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Check In</TableHead>
              <TableHead>Check Out</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Edit</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center"><EduvancaLoader size={32} /></TableCell>
              </TableRow>
            ) : attendance.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-12">
                  <div className="flex flex-col items-center gap-2">
                    <Calendar className="h-12 w-12 text-muted-foreground/50" />
                    <p>No attendance records yet</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              attendance.map((record) => (
                <TableRow key={record.id}>
                  <TableCell className="font-medium">{getEmployeeName(record.employee_id)}</TableCell>
                  <TableCell>{new Date(record.date).toLocaleDateString()}</TableCell>
                  <TableCell>{formatTime12h(record.check_in)}</TableCell>
<TableCell>{formatTime12h(record.check_out)}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={getStatusColor(record.status)}>
                      {record.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
  <Button
  variant="ghost"
  size="sm"
  disabled={!!record.check_out}
  className={record.check_out ? "opacity-40 cursor-not-allowed" : ""}
  onClick={() => {
    if (record.check_out) return;

    setSelectedRecord(record);
    setEditCheckOut(record.check_out || "");
    setEditHalfDay(record.status === "halfday");
    setEditOpen(true);
  }}
>
  Edit
</Button>

</TableCell>

                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Edit Check-Out Time</DialogTitle>
    </DialogHeader>

    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Check Out Time</Label>
        <Input
  type="time"
  value={editCheckOut}
  disabled={!!selectedRecord?.check_out}
  className={selectedRecord?.check_out ? "opacity-50 cursor-not-allowed" : ""}
  onChange={(e) => setEditCheckOut(e.target.value)}
/>

      </div>

      <div className="flex items-center gap-3">
  <input
    type="checkbox"
    id="halfday"
    checked={editHalfDay}
    onChange={(e) => setEditHalfDay(e.target.checked)}
    className="h-4 w-4"
  />
  <Label htmlFor="halfday">Mark as Half Day</Label>
</div>


      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={() => setEditOpen(false)}>
          Cancel
        </Button>
        <Button
  onClick={async () => {
    if (!selectedRecord) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error("Not authenticated");
      return;
    }

    const { error } = await supabase
      .from("attendance")
      .update({
  check_out: editCheckOut || null,
  status: editHalfDay ? "halfday" : "present",
})

      .eq("id", selectedRecord.id)
      .eq("user_id", user.id);   // REQUIRED FOR RLS

    if (error) {
      console.error(error);
      toast.error("Failed to update check-out time");
    } else {
      toast.success("Check-out updated!");
      setEditOpen(false);
      fetchAttendance();
    }
  }}
>
  Save
</Button>

      </div>
    </div>
  </DialogContent>
</Dialog>
    </div>
  );
};

export default Attendance;