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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Plus, DollarSign } from "lucide-react";
import { IndianNumberInput } from "@/components/ui/indian-number-input";
import { formatIndianCurrency } from "@/lib/formatUtils";
import { SearchFilter } from "@/components/SearchFilter";
import { PayrollAnalytics } from "@/components/PayrollAnalytics";

interface PayrollRecord {
  id: string;
  employee_id: string;
  month: number;
  year: number;
  basic_salary: number;
  allowances: number;
  deductions: number;
  net_salary: number;
  payment_date: string | null;
  status: string;
  notes: string | null;
}

interface Employee {
  id: string;
  first_name: string;
  last_name: string;
  salary: number | null;
}

const Payroll = () => {
  const [payroll, setPayroll] = useState<PayrollRecord[]>([]);
  const [filteredPayroll, setFilteredPayroll] = useState<PayrollRecord[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterField, setFilterField] = useState("employee_id");
  const [summary, setSummary] = useState<any>(null);
  const [formData, setFormData] = useState({
    employee_id: "",
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    basic_salary: "",
    allowances: "",
    deductions: "",
    payment_date: "",
    notes: "",
    payment_frequency: "monthly",
  });

  useEffect(() => {
    fetchPayroll();
    fetchEmployees();
  }, []);

  useEffect(() => {
    if (searchTerm) {
      const filtered = payroll.filter((record) => {
        const value = filterField === "employee_id"
          ? getEmployeeName(record.employee_id).toLowerCase()
          : filterField === "status"
          ? record.status.toLowerCase()
          : String(record[filterField as keyof PayrollRecord] || "").toLowerCase();
        return value.includes(searchTerm.toLowerCase());
      });
      setFilteredPayroll(filtered);
    } else {
      setFilteredPayroll(payroll);
    }
  }, [searchTerm, filterField, payroll]);

  const fetchPayroll = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("payroll")
        .select("*")
        .eq("user_id", user.id)
        .order("year", { ascending: false });

      if (error) throw error;
      setPayroll(data || []);
      setFilteredPayroll(data || []);
    } catch (error: any) {
      toast.error("Error fetching payroll");
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
        .select("id, first_name, last_name, salary")
        .eq("user_id", user.id)
        .eq("status", "active");

      if (error) throw error;
      setEmployees(data || []);
    } catch (error: any) {
      toast.error("Error fetching employees");
    }
  };
  

  const handleEmployeeChange = async (empId: string) => {
  const emp = employees.find(e => e.id === empId);

  setFormData(prev => ({
    ...prev,
    employee_id: empId,
    basic_salary: emp?.salary?.toString() || "",
  }));

  await fetchSummary(empId);
};


  const calculateSalary = () => {
    const basicSalary = parseFloat(formData.basic_salary) || 0;
    if (formData.payment_frequency === "daily") {
      return basicSalary / 30;
    } else if (formData.payment_frequency === "weekly") {
      return basicSalary / 4;
    }
    return basicSalary;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const calculatedSalary = calculateSalary();
      const allowances = parseFloat(formData.allowances) || 0;
      const deductions = parseFloat(formData.deductions) || 0;
      const netSalary = calculatedSalary + allowances - deductions;

      const { error } = await supabase.from("payroll").insert([{
        employee_id: formData.employee_id,
        month: formData.month,
        year: formData.year,
        basic_salary: calculatedSalary,
        allowances,
        deductions,
        net_salary: netSalary,
        payment_date: formData.payment_date || null,
        notes: formData.notes || null,
        status: "pending",
        user_id: user.id,
      }] as any);

      if (error) throw error;

      toast.success("Payroll processed successfully!");
      setOpen(false);
      setFormData({
        employee_id: "",
        month: new Date().getMonth() + 1,
        year: new Date().getFullYear(),
        basic_salary: "",
        allowances: "",
        deductions: "",
        payment_date: "",
        notes: "",
        payment_frequency: "monthly",
      });
      fetchPayroll();
    } catch (error: any) {
      toast.error("Error creating payroll");
    }
  };

  const getStatusColor = (status: string) => {
    return status === "paid" ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800";
  };

  const getEmployeeName = (empId: string) => {
    const emp = employees.find(e => e.id === empId);
    return emp ? `${emp.first_name} ${emp.last_name}` : "-";
  };

const fetchSummary = async (employee_id: string, monthArg?: number, yearArg?: number) => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const month = monthArg ?? formData.month;
  const year = yearArg ?? formData.year;

  // 1. Fetch working-days config
  const { data: wd } = await supabase
    .from("payroll_working_days")
    .select("*")
    .eq("user_id", user.id)
    .eq("month", month)
    .eq("year", year)
    .maybeSingle();

  // 2. Fetch attendance summary
const monthPadded = String(month).padStart(2, "0");

// Correct from-date
const from = `${year}-${monthPadded}-01`;

// Auto-calc last day of month
const lastDay = new Date(year, month, 0).getDate();
const to = `${year}-${monthPadded}-${String(lastDay).padStart(2, "0")}`;

const { data: attRaw, error: attErr } = await supabase
  .from("attendance")
  .select("*")
  .eq("employee_id", employee_id)
  .gte("date", from)
  .lte("date", to)
  .eq("user_id", user.id);

// 👇 Prevent crash when no records found
const att = attRaw ?? [];

if (attErr) console.warn("Attendance fetch error:", attErr);

// Now att is always a list → no crash
const present = att.filter(a => a.status === "present" || a.status === "late").length;
const late = att.filter(a => a.status === "late").length;
const halfday = att.filter(a => a.status === "halfday").length;
const absent = att.filter(a => a.status === "absent").length;


  setSummary({
    working_days: wd?.working_days ?? 0,
    holidays: wd?.holidays ?? 0,
    special_holidays: wd?.special_holidays ?? 0,
    present,
    late,
    halfday,
    absent,
  });
};


  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Payroll</h1>
          <p className="text-muted-foreground">Manage employee salaries and payments</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Process Payroll
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Process Payroll</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="employee_id">Employee *</Label>
                <Select value={formData.employee_id} onValueChange={handleEmployeeChange} required>
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
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="month">Month *</Label>
                  <Select
  value={formData.month.toString()}
  onValueChange={async (v) => {
    const newMonth = parseInt(v);

    // Update formData first
    setFormData(prev => ({ ...prev, month: newMonth }));

    // Now refresh summary correctly
    if (formData.employee_id) {
      await fetchSummary(formData.employee_id, newMonth, formData.year);
    }
  }}
>
  <SelectTrigger>
    <SelectValue />
  </SelectTrigger>
  <SelectContent>
    {[...Array(12)].map((_, i) => (
      <SelectItem key={i+1} value={(i+1).toString()}>
        {new Date(2000, i).toLocaleString('default', { month: 'long' })}
      </SelectItem>
    ))}
  </SelectContent>
</Select>

                </div>
                <div className="space-y-2">
                  <Label htmlFor="year">Year *</Label>
                  <Input
  id="year"
  type="number"
  value={formData.year}
  onChange={async (e) => {
    const newYear = parseInt(e.target.value);

    setFormData(prev => ({ ...prev, year: newYear }));

    if (formData.employee_id) {
      await fetchSummary(formData.employee_id, formData.month, newYear);
    }
  }}
  required
/>


                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="payment_frequency">Payment Frequency *</Label>
                <Select value={formData.payment_frequency} onValueChange={(value) => setFormData({ ...formData, payment_frequency: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Daily (Salary / 30)</SelectItem>
                    <SelectItem value="weekly">Weekly (Salary / 4)</SelectItem>
                    <SelectItem value="monthly">Monthly (Full Salary)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="basic_salary">Monthly Base Salary (₹) *</Label>
                <IndianNumberInput
                  id="basic_salary"
                  value={formData.basic_salary}
                  onChange={(value) => setFormData({ ...formData, basic_salary: value })}
                  placeholder="0"
                  required
                />
                {formData.basic_salary && formData.payment_frequency !== "monthly" && (
                  <p className="text-sm text-green-600">
                    Calculated: {formatIndianCurrency(calculateSalary())}
                  </p>
                )}
              </div>



              {summary && (
  <div className="p-4 border rounded-xl bg-white shadow-sm space-y-4 max-h-[260px] overflow-y-auto">

    <h4 className="text-base font-semibold">Monthly Summary</h4>

    {/* Working Days */}
    <div className="grid grid-cols-2 gap-3">
      <div className="flex items-center justify-between p-2 rounded-lg bg-blue-50">
        <span className="text-sm text-blue-800">Working Days</span>
        <span className="font-semibold text-blue-900">{summary.working_days}</span>
      </div>

      <div className="flex items-center justify-between p-2 rounded-lg bg-yellow-50">
        <span className="text-sm text-yellow-800">Holidays</span>
        <span className="font-semibold text-yellow-900">{summary.holidays}</span>
      </div>

      <div className="flex items-center justify-between p-2 rounded-lg bg-purple-50">
        <span className="text-sm text-purple-800">Special Holidays</span>
        <span className="font-semibold text-purple-900">{summary.special_holidays}</span>
      </div>
    </div>

    <hr className="my-2" />

    <h4 className="text-base font-semibold">Attendance Breakdown</h4>

    <div className="grid grid-cols-2 gap-3 text-sm">

      <div className="flex items-center justify-between p-2 rounded-lg bg-green-50">
        <span className="text-green-700">Present</span>
        <span className="font-semibold text-green-800">{summary.present}</span>
      </div>

      <div className="flex items-center justify-between p-2 rounded-lg bg-orange-50">
        <span className="text-orange-700">Late</span>
        <span className="font-semibold text-orange-800">{summary.late}</span>
      </div>

      <div className="flex items-center justify-between p-2 rounded-lg bg-blue-50">
        <span className="text-blue-700">Half Day</span>
        <span className="font-semibold text-blue-800">{summary.halfday}</span>
      </div>

      <div className="flex items-center justify-between p-2 rounded-lg bg-red-50">
        <span className="text-red-700">Absent</span>
        <span className="font-semibold text-red-800">{summary.absent}</span>
      </div>
    </div>

    <hr className="my-2" />

    {/* Salary suggestion */}
    {formData.basic_salary && (() => {
      const basic = Number(formData.basic_salary);
      const perDay = basic / summary.working_days;
      const fullPay = summary.present * perDay;
      const halfPay = summary.halfday * perDay * 0.5;
      const absentCut = summary.absent * perDay;
      const suggested = fullPay + halfPay - absentCut;

      return (
        <div className="space-y-2">
          <h4 className="text-base font-semibold">Salary Suggestion</h4>

          <div className="text-sm space-y-1">
            <p>Per Day Salary: ₹{perDay.toFixed(2)}</p>
            <p>Full-Day Earnings: ₹{fullPay.toFixed(2)}</p>
            <p>Half-Day Earnings: ₹{halfPay.toFixed(2)}</p>
            <p>Absent Deduction: −₹{absentCut.toFixed(2)}</p>
          </div>

          <div className="p-3 bg-green-100 border border-green-300 rounded-lg text-center">
            <p className="text-lg font-bold text-green-800">
              Suggested Net Salary: ₹{suggested.toFixed(2)}
            </p>
          </div>
        </div>
      );
    })()}
  </div>
)}








              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="allowances">Allowances (₹)</Label>
                  <IndianNumberInput
                    id="allowances"
                    value={formData.allowances}
                    onChange={(value) => setFormData({ ...formData, allowances: value })}
                    placeholder="0"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="deductions">Deductions (₹)</Label>
                  <IndianNumberInput
                    id="deductions"
                    value={formData.deductions}
                    onChange={(value) => setFormData({ ...formData, deductions: value })}
                    placeholder="0"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="payment_date">Payment Date</Label>
                <Input
                  id="payment_date"
                  type="date"
                  value={formData.payment_date}
                  onChange={(e) => setFormData({ ...formData, payment_date: e.target.value })}
                />
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
                <Button type="submit">Process Payroll</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="records" className="space-y-4">
        <TabsList>
          <TabsTrigger value="records">Payroll Records</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="records" className="space-y-4">
          <SearchFilter
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            filterField={filterField}
            onFilterFieldChange={setFilterField}
            filterOptions={[
              { value: "employee_id", label: "Employee" },
              { value: "status", label: "Status" },
            ]}
            placeholder="Search payroll..."
          />

          <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Employee</TableHead>
              <TableHead>Period</TableHead>
              <TableHead>Basic Salary</TableHead>
              <TableHead>Net Salary</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center">Loading...</TableCell>
              </TableRow>
            ) : filteredPayroll.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-12">
                  <div className="flex flex-col items-center gap-2">
                    <DollarSign className="h-12 w-12 text-muted-foreground/50" />
                    <p>No payroll records found</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filteredPayroll.map((record) => (
                <TableRow key={record.id}>
                  <TableCell className="font-medium">{getEmployeeName(record.employee_id)}</TableCell>
                  <TableCell className="text-sm">
                    {new Date(record.year, record.month - 1).toLocaleDateString('default', { month: 'long', year: 'numeric' })}
                  </TableCell>
                  <TableCell>{formatIndianCurrency(record.basic_salary)}</TableCell>
                  <TableCell className="font-semibold">{formatIndianCurrency(record.net_salary)}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={getStatusColor(record.status)}>
                      {record.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Select
                      value={record.status}
                      onValueChange={async (value) => {
                        try {
                          const { error } = await supabase
                            .from("payroll")
                            .update({ status: value as any })
                            .eq("id", record.id);
                          
                          if (error) throw error;
                          toast.success("Status updated!");
                          fetchPayroll();
                        } catch (error: any) {
                          toast.error("Error updating status");
                        }
                      }}
                    >
                      <SelectTrigger className="w-24">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="paid">Paid</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
        </TabsContent>

        <TabsContent value="analytics">
          <PayrollAnalytics payroll={payroll} getEmployeeName={getEmployeeName} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Payroll;
