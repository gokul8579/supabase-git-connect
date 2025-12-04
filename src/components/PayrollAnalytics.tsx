import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { formatIndianCurrency } from "@/lib/formatUtils";
import { toast } from "sonner";

interface PayrollRecord {
  id: string;
  employee_id: string;
  month: number;
  year: number;
  basic_salary: number;
  net_salary: number;
  payment_date: string | null;
  status: string;
}

interface PayrollAnalyticsProps {
  payroll: PayrollRecord[];
  getEmployeeName: (empId: string) => string;
}

interface WorkingDaysRow {
  id: string;
  user_id: string;
  month: number;
  year: number;
  working_days: number;
  holidays?: number | null;
  special_holidays?: number | null;
  notes?: string | null;
  created_at?: string;
}

export const PayrollAnalytics = ({ payroll, getEmployeeName }: PayrollAnalyticsProps) => {
  const [employees, setEmployees] = useState<{ id: string; first_name: string; last_name: string; salary: number | null }[]>([]);
  const [workingDaysRows, setWorkingDaysRows] = useState<WorkingDaysRow[]>([]);
  const [selectedMonthKey, setSelectedMonthKey] = useState<string | null>(null); // "month-year"
  const [attendanceSummary, setAttendanceSummary] = useState<Record<string, any>>({});
  const [loadingSummary, setLoadingSummary] = useState(false);

  // modal states for editing working days
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    month: (new Date().getMonth() + 1),
    year: new Date().getFullYear(),
    working_days: 0,
    holidays: 0,
    special_holidays: 0,
    notes: "",
  });

  useEffect(() => {
    fetchEmployees();
    fetchWorkingDays();
  }, []);

  // derive totals
  const totalSalaryPaid = useMemo(() => payroll.filter(r => r.status === "paid").reduce((s, r) => s + (r.net_salary || 0), 0), [payroll]);
  const totalSalaryPending = useMemo(() => payroll.filter(r => r.status === "pending").reduce((s, r) => s + (r.net_salary || 0), 0), [payroll]);

  // payments by month/date (same logic as before but quick derivation)
  const paymentsByMonth = useMemo(() => {
    return payroll.filter(r => r.status === "paid").reduce((acc: Record<string, { month: string; amount: number; count: number }>, rec) => {
      const key = `${rec.month}-${rec.year}`;
      const title = new Date(rec.year, rec.month - 1).toLocaleDateString('default', { month: 'long', year: 'numeric' });
      if (!acc[key]) acc[key] = { month: title, amount: 0, count: 0 };
      acc[key].amount += rec.net_salary || 0;
      acc[key].count += 1;
      return acc;
    }, {});
  }, [payroll]);

  useEffect(() => {
    // whenever selected month changes, fetch attendance summary for that month
    if (!selectedMonthKey) return;
    const [m, y] = selectedMonthKey.split("-").map(Number);
    fetchAttendanceSummary(m, y);
  }, [selectedMonthKey]);

  async function fetchEmployees() {
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
    } catch (err) {
      console.error(err);
      toast.error("Failed to load employees");
    }
  }

  async function fetchWorkingDays() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data, error } = await supabase
        .from("payroll_working_days")
        .select("*")
        .eq("user_id", user.id)
        .order("year", { ascending: false })
        .order("month", { ascending: false });
      if (error) throw error;
      setWorkingDaysRows(data || []);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load working days");
    }
  }

  // helper: find workingDays row by month/year
  const findWorkingRow = (month: number, year: number) => {
    return workingDaysRows.find(r => r.month === month && r.year === year) || null;
  };

  // fallback: compute count of weekdays (Mon-Fri) for month (used if working_days entry missing)
  const estimateWorkingDays = (month: number, year: number) => {
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0);
    let count = 0;
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const day = d.getDay();
      if (day !== 0 && day !== 6) count++; // exclude Sunday(0) and Saturday(6)
    }
    return count;
  };

  // Fetch attendance summary for the given month/year
  async function fetchAttendanceSummary(month: number, year: number) {
    setLoadingSummary(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoadingSummary(false);
        return;
      }

      // build date range
      const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
      const endDate = `${year}-${String(month).padStart(2, "0")}-${new Date(year, month, 0).getDate()}`;

      const { data, error } = await supabase
        .from("attendance")
        .select("employee_id,status,check_in,check_out,date")
        .eq("user_id", user.id)
        .gte("date", startDate)
        .lte("date", endDate);

      if (error) throw error;

      // reduce to summary per employee
      const summary: Record<string, any> = {};
      employees.forEach(emp => {
        summary[emp.id] = { present: 0, absent: 0, halfday: 0, late: 0, totalRecords: 0 };
      });

      (data || []).forEach((rec: any) => {
        if (!summary[rec.employee_id]) {
          summary[rec.employee_id] = { present: 0, absent: 0, halfday: 0, late: 0, totalRecords: 0 };
        }
        summary[rec.employee_id].totalRecords += 1;
        const st = rec.status;
        if (st === "present") summary[rec.employee_id].present += 1;
        else if (st === "absent") summary[rec.employee_id].absent += 1;
        else if (st === "halfday") summary[rec.employee_id].halfday += 1;
        else if (st === "late") summary[rec.employee_id].late += 1;
        else summary[rec.employee_id].present += 1; // fallback treat as present
      });

      setAttendanceSummary(summary);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load attendance summary");
    } finally {
      setLoadingSummary(false);
    }
  }

  // UPsert working days (insert or update)
  async function saveWorkingDays() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return toast.error("Not authenticated");

      // check existing entry
      const { data: existing } = await supabase
        .from("payroll_working_days")
        .select("*")
        .eq("user_id", user.id)
        .eq("month", editForm.month)
        .eq("year", editForm.year)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from("payroll_working_days")
          .update({
            working_days: Number(editForm.working_days),
            holidays: Number(editForm.holidays || 0),
            special_holidays: Number(editForm.special_holidays || 0),
            notes: editForm.notes || null,
          })
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("payroll_working_days")
          .insert([{
            user_id: user.id,
            month: editForm.month,
            year: editForm.year,
            working_days: Number(editForm.working_days),
            holidays: Number(editForm.holidays || 0),
            special_holidays: Number(editForm.special_holidays || 0),
            notes: editForm.notes || null,
          }]);
        if (error) throw error;
      }

      toast.success("Working days saved");
      setEditOpen(false);
      fetchWorkingDays();
    } catch (err) {
      console.error(err);
      toast.error("Failed to save working days");
    }
  }

  // calculate suggestion object for a particular employee in selected month
  const calcEmployeeSuggestion = (empId: string, month: number, year: number) => {
    const emp = employees.find(e => e.id === empId);
    const salary = emp?.salary || 0;
    const row = findWorkingRow(month, year);
    const workingDays = row ? Number(row.working_days) : estimateWorkingDays(month, year);

    const summary = attendanceSummary[empId] || { present: 0, absent: 0, halfday: 0, late: 0 };
    const present = Number(summary.present || 0);
    const half = Number(summary.halfday || 0);
    const late = Number(summary.late || 0);
    const absent = Number(summary.absent || 0);

    const perDay = workingDays > 0 ? (salary / workingDays) : 0;
    const payableDays = present + (half * 0.5) + 0; // late is considered full day as per requirements
    const payableAmount = payableDays * perDay;
    const deductionDays = workingDays - payableDays;
    const suggestedDeduction = deductionDays > 0 ? deductionDays * perDay : 0;

    return {
      salary,
      workingDays,
      present,
      half,
      late,
      absent,
      perDay,
      payableDays,
      payableAmount,
      suggestedDeduction
    };
  };

  // utility: month key list present from payroll data
  const monthsPresent = useMemo(() => {
    const keys = new Set<string>();
    payroll.forEach(p => keys.add(`${p.month}-${p.year}`));
    // also include rows from workingDaysRows
    workingDaysRows.forEach(r => keys.add(`${r.month}-${r.year}`));
    return Array.from(keys).sort((a, b) => {
      const [ma, ya] = a.split("-").map(Number);
      const [mb, yb] = b.split("-").map(Number);
      if (ya !== yb) return yb - ya;
      return mb - ma;
    });
  }, [payroll, workingDaysRows]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Total Salary Paid</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-green-600">{formatIndianCurrency(totalSalaryPaid)}</p>
            <p className="text-sm text-muted-foreground mt-1">{payroll.filter(r => r.status === "paid").length} payments completed</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Pending Payments</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-yellow-600">{formatIndianCurrency(totalSalaryPending)}</p>
            <p className="text-sm text-muted-foreground mt-1">{payroll.filter(r => r.status === "pending").length} payments pending</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Working Days (Company)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 mb-3">
            <Dialog open={editOpen} onOpenChange={setEditOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">Edit / Add Working Days</Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>Edit Working Days</DialogTitle>
                </DialogHeader>

                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label>Month</Label>
                      <Select value={String(editForm.month)} onValueChange={(v) => setEditForm(f => ({ ...f, month: parseInt(v) }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {[...Array(12)].map((_, i) => (
                            <SelectItem key={i} value={(i+1).toString()}>
                              {new Date(2000, i).toLocaleString('default', { month: 'long' })}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Year</Label>
                      <Input type="number" value={editForm.year} onChange={(e) => setEditForm(f => ({ ...f, year: parseInt(e.target.value || "0") }))} />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <Label>Working Days</Label>
                      <Input type="number" value={String(editForm.working_days)} onChange={(e) => setEditForm(f => ({ ...f, working_days: parseInt(e.target.value || "0") }))} />
                    </div>
                    <div>
                      <Label>Holidays</Label>
                      <Input type="number" value={String(editForm.holidays)} onChange={(e) => setEditForm(f => ({ ...f, holidays: parseInt(e.target.value || "0") }))} />
                    </div>
                    <div>
                      <Label>Special Holidays</Label>
                      <Input type="number" value={String(editForm.special_holidays)} onChange={(e) => setEditForm(f => ({ ...f, special_holidays: parseInt(e.target.value || "0") }))} />
                    </div>
                  </div>

                  <div>
                    <Label>Notes</Label>
                    <Textarea value={editForm.notes} onChange={(e) => setEditForm(f => ({ ...f, notes: e.target.value }))} rows={3} />
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
                    <Button onClick={saveWorkingDays}>Save</Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            <div className="ml-auto text-sm text-muted-foreground">
              Tip: Select a month below to view employee attendance suggestions.
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 max-h-40 overflow-y-auto pr-2">
            {workingDaysRows.length === 0 ? (
              <div className="p-3 rounded bg-muted/30 text-sm">No working-days configured yet.</div>
            ) : workingDaysRows.map(row => (
              <div key={row.id} className="p-3 border rounded hover:bg-accent/20 cursor-pointer flex flex-col">
                <div className="flex items-center justify-between">
                  <div className="font-medium">{new Date(row.year, row.month - 1).toLocaleDateString('default', { month: 'long', year: 'numeric' })}</div>
                  <div className="text-sm text-muted-foreground">{row.working_days} days</div>
                </div>
                <div className="text-xs text-muted-foreground mt-2">{row.holidays || 0} holidays • {row.special_holidays || 0} special</div>
                <div className="mt-2 flex gap-2">
                  <Button variant="ghost" size="sm" onClick={() => {
                    setEditForm({
                      month: row.month,
                      year: row.year,
                      working_days: row.working_days,
                      holidays: row.holidays || 0,
                      special_holidays: row.special_holidays || 0,
                      notes: row.notes || "",
                    });
                    setEditOpen(true);
                  }}>Edit</Button>
                  <Button variant="outline" size="sm" onClick={() => setSelectedMonthKey(`${row.month}-${row.year}`)}>View Month</Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Payments by Month</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-64 overflow-y-auto pr-2">
            {Object.values(paymentsByMonth).length === 0 ? (
              <div className="text-center text-muted-foreground py-6">No payment data available</div>
            ) : (
              Object.values(paymentsByMonth)
                .sort((a, b) => b.amount - a.amount)
                .map(m => (
                  <div key={m.month} className="flex justify-between items-center border-b py-2">
                    <div>
                      <div className="font-medium">{m.month}</div>
                      <div className="text-sm text-muted-foreground">{m.count} employees</div>
                    </div>
                    <div className="font-bold text-green-600">{formatIndianCurrency(m.amount)}</div>
                  </div>
                ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Selected month detail: scrollable, employee list and suggestions */}
      {selectedMonthKey && (
        <Card>
          <CardHeader>
            <CardTitle>Month Details: {(() => {
              const [m, y] = selectedMonthKey.split("-").map(Number);
              return new Date(y, m - 1).toLocaleDateString('default', { month: 'long', year: 'numeric' });
            })()}</CardTitle>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => setSelectedMonthKey(null)}>Close</Button>
            </div>
          </CardHeader>

          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Left: month-level summary */}
              <div className="col-span-1 space-y-2">
                {(() => {
                  const [m, y] = selectedMonthKey.split("-").map(Number);
                  const row = findWorkingRow(m, y);
                  const wd = row ? row.working_days : estimateWorkingDays(m, y);
                  return (
                    <div className="p-3 border rounded">
                      <div className="text-sm text-muted-foreground">Working Days</div>
                      <div className="text-2xl font-bold">{wd}</div>
                      <div className="text-sm mt-2 text-muted-foreground">{row ? `${row.holidays || 0} holidays • ${row.special_holidays || 0} special` : "Estimated from weekdays"}</div>
                      {row?.notes && <div className="mt-2 text-xs text-muted-foreground">Note: {row.notes}</div>}
                    </div>
                  );
                })()}
              </div>

              {/* Middle: employee list (scrollable) */}
              <div className="col-span-1 md:col-span-2">
                <div className="max-h-60 overflow-y-auto pr-2 space-y-2">
                  {loadingSummary ? (
                    <div className="p-4 text-center text-muted-foreground">Loading attendance...</div>
                  ) : employees.length === 0 ? (
                    <div className="p-4 text-muted-foreground">No employees</div>
                  ) : (
                    employees.map(emp => {
                      const [m, y] = selectedMonthKey.split("-").map(Number);
                      const s = calcEmployeeSuggestion(emp.id, m, y);
                      return (
                        <div key={emp.id} className="p-3 border rounded flex justify-between items-start">
                          <div>
                            <div className="font-medium">{emp.first_name} {emp.last_name}</div>
                            <div className="text-sm text-muted-foreground">
                              Salary: {formatIndianCurrency(s.salary)} • Per day: {formatIndianCurrency(s.perDay)}
                            </div>

                            <div className="mt-2 text-sm flex gap-3 text-muted-foreground">
                              <div>Present: <span className="font-medium text-foreground">{s.present}</span></div>
                              <div>Half: <span className="font-medium">{s.half}</span></div>
                              <div>Late: <span className="font-medium">{s.late}</span></div>
                              <div>Absent: <span className="font-medium">{s.absent}</span></div>
                            </div>
                          </div>

                          <div className="text-right">
                            <div className="text-sm text-muted-foreground">Payable days</div>
                            <div className="text-lg font-semibold">{s.payableDays}</div>
                            <div className="text-sm text-muted-foreground mt-2">Suggested deduction</div>
                            <div className="text-sm text-red-600 font-medium">{formatIndianCurrency(s.suggestedDeduction)}</div>
                            <div className="mt-2">
                              <Button size="sm" variant="outline" onClick={() => {
                                // quick action: open payroll modal in parent would be ideal
                                toast.message("Use 'Process Payroll' and pick this employee + month to auto-fill.");
                              }}>Use in Payroll</Button>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default PayrollAnalytics;
