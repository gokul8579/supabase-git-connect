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
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { DetailViewDialog, DetailField } from "@/components/DetailViewDialog";
import { EduvancaLoader } from "@/components/EduvancaLoader";

interface Task {
  id: string;
  title: string;
  description: string | null;
  priority: string;
  status: string;
  due_date: string | null;
  created_at: string;
}

const Tasks = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [dueDateFilter, setDueDateFilter] = useState("");
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    priority: "medium",
    status: "pending",
    due_date: "",
  });

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .eq("user_id", user.id);

      if (error) throw error;
      
      // Sort by priority (high first) then by due date (nearest first)
      // FINAL SORTING: 
// 1. Pending + In Progress tasks first
// 2. Completed tasks LAST
// 3. Within pending, sort by priority then due date

const sorted = (data || []).sort((a, b) => {
  // STATUS ORDER: pending/in_progress → cancelled → completed
  const statusOrder: Record<string, number> = {
    pending: 3,
    in_progress: 3,
    cancelled: 2,
    completed: 1,
  };

  const statusDiff = statusOrder[b.status] - statusOrder[a.status];
  if (statusDiff !== 0) return statusDiff;

  // PRIORITY ORDER inside pending/in_progress
  const priorityOrder: Record<string, number> = { high: 3, medium: 2, low: 1 };
  const priorityDiff = (priorityOrder[b.priority] || 0) - (priorityOrder[a.priority] || 0);
  if (priorityDiff !== 0) return priorityDiff;

  // DUE DATE ORDER inside pending/in_progress
  if (!a.due_date) return 1;
  if (!b.due_date) return -1;
  return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
});

setTasks(sorted);



      if (error) throw error;
      setTasks(data || []);
    } catch (error: any) {
      toast.error("Error fetching tasks");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase.from("tasks").insert([{
        ...formData,
        user_id: user.id,
        due_date: formData.due_date || null,
      }] as any);

      if (error) throw error;

      toast.success("Task created successfully!");
      setOpen(false);
      setFormData({
        title: "",
        description: "",
        priority: "medium",
        status: "pending",
        due_date: "",
      });
      fetchTasks();
    } catch (error: any) {
      toast.error("Error creating task");
    }
  };

  const handleStatusToggle = async (taskId: string, currentStatus: string) => {
    const newStatus = currentStatus === "completed" ? "pending" : "completed";
    try {
      const { error } = await supabase
        .from("tasks")
        .update({ status: newStatus })
        .eq("id", taskId);

      if (error) throw error;
      fetchTasks();
      toast.success(`Task marked as ${newStatus}`);
    } catch (error: any) {
      toast.error("Error updating task");
    }
  };

  const handleStatusInlineUpdate = async (taskId: string, newStatus: string) => {
  try {
    const { error } = await supabase
      .from("tasks")
      .update({ status: newStatus })
      .eq("id", taskId);

    if (error) throw error;

    toast.success("Task status updated");

    fetchTasks();
  } catch (error) {
    toast.error("Error updating status");
  }
};


  const getPriorityColor = (priority: string) => {
    const colors: Record<string, string> = {
      low: "bg-blue-100 text-blue-800",
      medium: "bg-yellow-100 text-yellow-800",
      high: "bg-red-100 text-red-800",
    };
    return colors[priority] || "bg-gray-100 text-gray-800";
  };

  const getStatusColor = (status: string) => {
  const colors: Record<string, string> = {
    pending: "bg-orange-100 text-orange-700 border-orange-200",
    in_progress: "bg-blue-100 text-blue-700 border-blue-200",
    completed: "bg-green-100 text-green-700 border-green-200",
    cancelled: "bg-red-100 text-red-700 border-red-200",
  };

  return colors[status] || "bg-gray-100 text-gray-700 border-gray-200";
};

  const handleTaskClick = (task: Task) => {
    setSelectedTask(task);
    setDetailOpen(true);
  };

  const handleDetailEdit = async (data: Record<string, any>) => {
    if (!selectedTask) return;

    try {
      const { error } = await supabase
        .from("tasks")
        .update({
          title: data.title,
          description: data.description,
          priority: data.priority,
          status: data.status,
          due_date: data.due_date || null,
        })
        .eq("id", selectedTask.id);

      if (error) throw error;

      toast.success("Task updated successfully!");
      fetchTasks();
      setDetailOpen(false);
    } catch (error: any) {
      toast.error("Error updating task");
    }
  };

  const handleDetailDelete = async () => {
    if (!selectedTask) return;

    try {
      const { error } = await supabase
        .from("tasks")
        .delete()
        .eq("id", selectedTask.id);

      if (error) throw error;

      toast.success("Task deleted successfully!");
      fetchTasks();
      setDetailOpen(false);
    } catch (error: any) {
      toast.error("Error deleting task");
    }
  };

  const detailFields: DetailField[] = selectedTask ? [
    { label: "Title", value: selectedTask.title, type: "text", fieldName: "title" },
    { label: "Description", value: selectedTask.description || "", type: "textarea", fieldName: "description" },
    { 
      label: "Priority", 
      value: selectedTask.priority, 
      type: "select",
      fieldName: "priority",
      selectOptions: [
        { value: "low", label: "Low" },
        { value: "medium", label: "Medium" },
        { value: "high", label: "High" },
      ]
    },
    { 
      label: "Status", 
      value: selectedTask.status, 
      type: "select",
      fieldName: "status",
      selectOptions: [
        { value: "pending", label: "Pending" },
        { value: "in_progress", label: "In Progress" },
        { value: "completed", label: "Completed" },
        { value: "cancelled", label: "Cancelled" },
      ]
    },
    {
  label: "Due Date",
  value: selectedTask.due_date
  ? selectedTask.due_date.slice(0, 16) // keeps exact original time
  : "",
  type: "datetime",
  fieldName: "due_date",
},

  ] : [];

  const filteredTasks = tasks.filter(task => {
    if (!dueDateFilter) return true;
    if (!task.due_date) return false;
    const taskDate = new Date(task.due_date).toISOString().split('T')[0];
    return taskDate === dueDateFilter;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 w-full">
        <div>
          <h1 className="text-3xl font-bold">Tasks & Follow-ups</h1>
          <p className="text-muted-foreground">Manage your to-do list and follow-ups</p>
        </div>
        <div className="flex flex-wrap gap-2 items-center w-full md:w-auto">
          <Input 
            type="date" 
            value={dueDateFilter} 
            onChange={(e) => setDueDateFilter(e.target.value)}
            placeholder="Filter by due date"
            className="w-48"
          />
          <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Task
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Add New Task</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Task Title *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="priority">Priority</Label>
                  <Select value={formData.priority} onValueChange={(value) => setFormData({ ...formData, priority: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
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
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="due_date">Due Date</Label>
                <Input
                  id="due_date"
                  type="datetime-local"
                  value={formData.due_date}
                  onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">Create Task</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
            
              <TableHead>Task</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Due Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center">
                  <EduvancaLoader size={32} />
                </TableCell>
              </TableRow>
            ) : tasks.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  No tasks yet. Click "Add Task" to create your first task.
                </TableCell>
              </TableRow>
            ) : (
              filteredTasks.map((task) => (
                <TableRow 
                  key={task.id} 
                  className={`cursor-pointer hover:bg-muted/50 ${task.status === "completed" ? "opacity-50" : ""}`}
                  onClick={() => handleTaskClick(task)}
                >
                  
                  <TableCell>
                    <div>
                      <div className={`font-medium ${task.status === "completed" ? "line-through" : ""}`}>
                        {task.title}
                      </div>
                      {task.description && (
                        <div className="text-sm text-muted-foreground">{task.description}</div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={getPriorityColor(task.priority)} variant="outline">
                      {task.priority}
                    </Badge>
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
  <Select
    value={task.status}
    onValueChange={(value) => handleStatusInlineUpdate(task.id, value)}
  >
    <SelectTrigger
  className={`h-8 text-xs w-32 justify-center rounded-md border ${getStatusColor(
    task.status
  )}`}
>
  <SelectValue />
</SelectTrigger>

    <SelectContent>
      <SelectItem value="pending">Pending</SelectItem>
      <SelectItem value="in_progress">In Progress</SelectItem>
      <SelectItem value="completed">Completed</SelectItem>
      <SelectItem value="cancelled">Cancelled</SelectItem>
    </SelectContent>
  </Select>
</TableCell>
                  <TableCell>
                    {task.due_date
                      ? new Date(task.due_date).toLocaleDateString()
                      : "-"}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <DetailViewDialog
        open={detailOpen}
        onOpenChange={setDetailOpen}
        title="Task Details"
        fields={detailFields}
        onEdit={handleDetailEdit}
        onDelete={handleDetailDelete}
      />
    </div>
  );
};

export default Tasks;