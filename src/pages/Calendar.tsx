import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Calendar as CalendarIcon, Plus, ChevronLeft, ChevronRight, Clock, Users, Target, Ticket, DollarSign } from "lucide-react";
import { formatLocalDate, formatLocalDateTime } from "@/lib/dateUtils";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";

interface CalendarEvent {
  id: string;
  title: string;
  type: "meeting" | "task" | "ticket" | "payment" | "milestone" | "reminder";
  date: string;
  time?: string;
  description?: string;
  related_id?: string;
  color: string;
}

const CalendarPage = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<"month" | "week" | "day">("month");
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    type: "meeting",
    date: new Date().toISOString().slice(0, 10),
    time: "",
    description: "",
  });

  useEffect(() => {
    fetchEvents();
  }, [currentDate]);

  const fetchEvents = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

      // Fetch tasks (due dates)
      const { data: tasks } = await supabase
        .from("tasks")
        .select("id, title, due_date, description, status, priority")
        .eq("user_id", user.id)
        .not("due_date", "is", null)
        .gte("due_date", startOfMonth.toISOString().slice(0, 10))
        .lte("due_date", endOfMonth.toISOString().slice(0, 10));

      // Fetch sales orders (delivery dates)
      const { data: salesOrders } = await supabase
        .from("sales_orders")
        .select("id, order_number, expected_delivery_date, status, total_amount")
        .eq("user_id", user.id)
        .not("expected_delivery_date", "is", null)
        .gte("expected_delivery_date", startOfMonth.toISOString().slice(0, 10))
        .lte("expected_delivery_date", endOfMonth.toISOString().slice(0, 10));

      // Fetch tickets (deadlines)
      const { data: tickets } = await supabase
        .from("tickets")
        .select("id, ticket_number, subject, deadline, priority, status")
        .eq("user_id", user.id)
        .not("deadline", "is", null)
        .gte("deadline", startOfMonth.toISOString())
        .lte("deadline", endOfMonth.toISOString());

      // Fetch calls/meetings
      const { data: calls } = await supabase
        .from("calls")
        .select("id, title, scheduled_at, notes, call_type, status")
        .eq("user_id", user.id)
        .not("scheduled_at", "is", null)
        .gte("scheduled_at", startOfMonth.toISOString())
        .lte("scheduled_at", endOfMonth.toISOString());

      const allEvents: CalendarEvent[] = [];

      tasks?.forEach(task => {
        if (task.due_date) {
          const priorityColor = task.priority === "high" || task.priority === "urgent" 
            ? "bg-red-500" 
            : task.priority === "medium" 
            ? "bg-yellow-500" 
            : "bg-green-500";
          allEvents.push({
            id: `task-${task.id}`,
            title: task.title,
            type: "task",
            date: task.due_date,
            description: task.description || undefined,
            related_id: task.id,
            color: priorityColor,
          });
        }
      });

      salesOrders?.forEach(order => {
        if (order.expected_delivery_date) {
          const statusColor = order.status === "delivered" 
            ? "bg-gray-500" 
            : order.status === "shipped" 
            ? "bg-purple-500" 
            : "bg-yellow-500";
          allEvents.push({
            id: `order-${order.id}`,
            title: `Order: ${order.order_number}`,
            type: "payment",
            date: order.expected_delivery_date,
            description: `Delivery - ₹${Number(order.total_amount).toLocaleString()}`,
            related_id: order.id,
            color: statusColor,
          });
        }
      });

      tickets?.forEach(ticket => {
        if (ticket.deadline) {
          const priorityColor = ticket.priority === "urgent" 
            ? "bg-red-500" 
            : ticket.priority === "high" 
            ? "bg-orange-500" 
            : "bg-yellow-500";
          allEvents.push({
            id: `ticket-${ticket.id}`,
            title: `Ticket: ${ticket.subject}`,
            type: "ticket",
            date: ticket.deadline.split('T')[0],
            time: ticket.deadline.split('T')[1]?.slice(0, 5),
            related_id: ticket.id,
            color: priorityColor,
          });
        }
      });

      calls?.forEach(call => {
        if (call.scheduled_at) {
          const callDate = new Date(call.scheduled_at);
          const callTypeColor = call.call_type === "meeting" 
            ? "bg-blue-500" 
            : call.call_type === "call" 
            ? "bg-indigo-500" 
            : "bg-cyan-500";
          allEvents.push({
            id: `call-${call.id}`,
            title: call.title,
            type: "meeting",
            date: callDate.toISOString().slice(0, 10),
            time: callDate.toTimeString().slice(0, 5),
            description: call.notes || undefined,
            related_id: call.id,
            color: callTypeColor,
          });
        }
      });

      setEvents(allEvents);
    } catch (error) {
      console.error("Error fetching events", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      if (formData.type === "task") {
        await supabase.from("tasks").insert({
          title: formData.title,
          description: formData.description,
          due_date: formData.date,
          user_id: user.id,
          status: "pending",
          priority: "medium",
        } as any);
      } else if (formData.type === "meeting") {
        const scheduledAt = formData.time 
          ? new Date(`${formData.date}T${formData.time}`).toISOString()
          : new Date(formData.date).toISOString();
        
        await supabase.from("calls").insert({
          title: formData.title,
          call_type: "meeting",
          scheduled_at: scheduledAt,
          notes: formData.description,
          status: "scheduled",
          user_id: user.id,
        } as any);
      }

      toast.success("Event created successfully!");
      setOpen(false);
      setFormData({
        title: "",
        type: "meeting",
        date: new Date().toISOString().slice(0, 10),
        time: "",
        description: "",
      });
      fetchEvents();
    } catch (error: any) {
      toast.error(error.message || "Error creating event");
    }
  };

  const getEventsForDate = (date: Date) => {
    const dateStr = date.toISOString().slice(0, 10);
    return events.filter(e => e.date === dateStr);
  };

  const navigateMonth = (direction: "prev" | "next") => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() + (direction === "next" ? 1 : -1));
    setCurrentDate(newDate);
  };

  const getEventIcon = (type: string) => {
    switch (type) {
      case "meeting": return Users;
      case "task": return Target;
      case "ticket": return Ticket;
      case "payment": return DollarSign;
      default: return Clock;
    }
  };

  return (
    <div className="space-y-4 md:space-y-6 p-2 md:p-0">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Calendar</h1>
          <p className="text-sm md:text-base text-muted-foreground">Manage all your business events</p>
        </div>
        <div className="flex gap-2">
          <Select value={viewMode} onValueChange={(v: "month" | "week" | "day") => setViewMode(v)}>
            <SelectTrigger className="w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="month">Month</SelectItem>
              <SelectItem value="week">Week</SelectItem>
              <SelectItem value="day">Day</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            <span className="text-xs md:text-sm">Add Event</span>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="md:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>
                {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </CardTitle>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => navigateMonth("prev")}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={() => setCurrentDate(new Date())}>
                  Today
                </Button>
                <Button variant="outline" size="sm" onClick={() => navigateMonth("next")}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <CalendarComponent
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              month={currentDate}
              onMonthChange={setCurrentDate}
              className="rounded-md border"
              modifiers={{
                hasEvents: (date) => getEventsForDate(date).length > 0,
                hasTasks: (date) => getEventsForDate(date).some(e => e.type === "task"),
                hasMeetings: (date) => getEventsForDate(date).some(e => e.type === "meeting"),
                hasTickets: (date) => getEventsForDate(date).some(e => e.type === "ticket"),
                hasPayments: (date) => getEventsForDate(date).some(e => e.type === "payment"),
              }}
              modifiersClassNames={{
                hasEvents: "bg-blue-100",
                hasTasks: "bg-green-100",
                hasMeetings: "bg-blue-100",
                hasTickets: "bg-orange-100",
                hasPayments: "bg-yellow-100",
              }}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Upcoming Events</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-[500px] overflow-y-auto">
              {events
                .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                .slice(0, 10)
                .map((event) => {
                  const EventIcon = getEventIcon(event.type);
                  return (
                    <div key={event.id} className="flex items-start gap-2 p-2 border rounded-lg hover:bg-muted">
                      <div className={`p-1.5 rounded ${event.color} text-white`}>
                        <EventIcon className="h-3 w-3" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">{event.title}</div>
                        <div className="text-xs text-muted-foreground">
                          {formatLocalDate(event.date)} {event.time && `• ${event.time}`}
                        </div>
                      </div>
                    </div>
                  );
                })}
              {events.length === 0 && (
                <div className="text-center text-muted-foreground py-8 text-sm">
                  No upcoming events
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {selectedDate && (
        <Card>
          <CardHeader>
            <CardTitle>Events on {formatLocalDate(selectedDate)}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {getEventsForDate(selectedDate).map((event) => {
                const EventIcon = getEventIcon(event.type);
                return (
                  <div key={event.id} className="flex items-center gap-3 p-3 border rounded-lg">
                    <div className={`p-2 rounded ${event.color} text-white`}>
                      <EventIcon className="h-4 w-4" />
                    </div>
                    <div className="flex-1">
                      <div className="font-medium">{event.title}</div>
                      {event.description && (
                        <div className="text-sm text-muted-foreground">{event.description}</div>
                      )}
                      {event.time && (
                        <div className="text-xs text-muted-foreground mt-1">
                          <Clock className="h-3 w-3 inline mr-1" />
                          {event.time}
                        </div>
                      )}
                    </div>
                    <Badge variant="outline">{event.type}</Badge>
                  </div>
                );
              })}
              {getEventsForDate(selectedDate).length === 0 && (
                <div className="text-center text-muted-foreground py-8">
                  No events on this date
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Event</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Event Type</Label>
              <Select value={formData.type} onValueChange={(v) => setFormData({ ...formData, type: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="meeting">Meeting</SelectItem>
                  <SelectItem value="task">Task</SelectItem>
                  <SelectItem value="reminder">Reminder</SelectItem>
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
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Date *</Label>
                <Input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Time (Optional)</Label>
                <Input
                  type="time"
                  value={formData.time}
                  onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit">Create Event</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CalendarPage;

