// src/pages/Calendar.tsx
import React, { useEffect, useRef, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import listPlugin from "@fullcalendar/list";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  Clock,
  Users,
  Target,
  Ticket,
  DollarSign,
} from "lucide-react";
import { formatLocalDateTime } from "@/lib/dateUtils";

type CalendarView = "dayGridMonth" | "timeGridWeek" | "timeGridDay" | "listWeek";

type EventType =
  | "task"
  | "meeting"
  | "call"
  | "ticket"
  | "sales_order"
  | "purchase_order"
  | "receiving"
  | "reminder";

interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end?: string;
  allDay?: boolean;
  extendedProps?: {
    type?: EventType;
    sourceId?: string;
    status?: string;
    priority?: string;
    details?: string;
    amount?: number;
  };
  backgroundColor?: string;
  borderColor?: string;
  textColor?: string;
}

const COLORS: Record<EventType, string> = {
  task: "#10B981",
  meeting: "#3B82F6",
  call: "#6366F1",
  ticket: "#F97316",
  sales_order: "#EF4444",
  purchase_order: "#8B5CF6",
  receiving: "#059669",
  reminder: "#F9423A",
};

export default function CalendarPage() {
  const calendarRef = useRef<FullCalendar | null>(null);

  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(false);

  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedDateEvents, setSelectedDateEvents] = useState<
    CalendarEvent[]
  >([]);

  const [openCreate, setOpenCreate] = useState(false);
  const [openDetail, setOpenDetail] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(
    null
  );
  const [visibleRange, setVisibleRange] = useState<{
    start: string;
    end: string;
  } | null>(null);
  const [currentView, setCurrentView] =
    useState<CalendarView>("dayGridMonth");

  const [form, setForm] = useState({
    type: "meeting" as EventType,
    title: "",
    date: new Date().toISOString().slice(0, 10),
    time: "",
    endTime: "",
    allDay: false,
    description: "",
    amount: "",
    priority: "medium",
  });

  // Realtime channel subscription ref
  const channelRef = useRef<any>(null);

  useEffect(() => {
    // Subscribe to changes on important tables, refresh visible range on changes
    channelRef.current = supabase
      .channel("calendar-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tasks" },
        () => visibleRange && fetchForRange(visibleRange.start, visibleRange.end)
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "calls" },
        () => visibleRange && fetchForRange(visibleRange.start, visibleRange.end)
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tickets" },
        () => visibleRange && fetchForRange(visibleRange.start, visibleRange.end)
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "sales_orders" },
        () => visibleRange && fetchForRange(visibleRange.start, visibleRange.end)
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "purchase_orders" },
        () => visibleRange && fetchForRange(visibleRange.start, visibleRange.end)
      )
      .subscribe();

    return () => {
      if (channelRef.current) supabase.removeChannel(channelRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visibleRange]);

  // ---------- Helpers ----------
  function isoWithTime(dateStr: string, time?: string) {
    if (!time) return new Date(dateStr).toISOString();
    const [hh, mm] = time.split(":");
    const d = new Date(dateStr);
    d.setHours(Number(hh), Number(mm), 0, 0);
    return d.toISOString();
  }

  function mapSourceToEventList(
    tasks: any[] = [],
    calls: any[] = [],
    tickets: any[] = [],
    salesOrders: any[] = [],
    purchaseOrders: any[] = []
  ): CalendarEvent[] {
    const out: CalendarEvent[] = [];

    (tasks || []).forEach((t) => {
      if (!t.due_date) return;
      const dateOnly =
        typeof t.due_date === "string" && t.due_date.includes("T")
          ? t.due_date.split("T")[0]
          : t.due_date;
      out.push({
        id: `task-${t.id}`,
        title: t.title || "Task",
        start: dateOnly,
        allDay: true,
        extendedProps: {
          type: "task",
          sourceId: t.id,
          status: t.status,
          priority: t.priority,
          details: t.description,
        },
        backgroundColor: COLORS.task,
        borderColor: COLORS.task,
        textColor: "#fff",
      });
    });

    (calls || []).forEach((c) => {
      if (!c.scheduled_at) return;
      const dt = new Date(c.scheduled_at).toISOString();
      out.push({
        id: `call-${c.id}`,
        title: c.title || (c.call_type === "meeting" ? "Meeting" : "Call"),
        start: dt,
        allDay: false,
        extendedProps: {
          type: c.call_type === "meeting" ? "meeting" : "call",
          sourceId: c.id,
          details: c.notes,
          status: c.status,
        },
        backgroundColor: COLORS.call,
        borderColor: COLORS.call,
        textColor: "#fff",
      });
    });

    (tickets || []).forEach((tk) => {
      if (!tk.deadline) return;
      const deadline = tk.deadline;
      const hasTime = typeof deadline === "string" && deadline.includes("T");
      out.push({
        id: `ticket-${tk.id}`,
        title: tk.subject ? `Ticket: ${tk.subject}` : "Ticket",
        start: hasTime ? deadline : deadline,
        allDay: !hasTime,
        extendedProps: {
          type: "ticket",
          sourceId: tk.id,
          details: tk.description || tk.subject,
          priority: tk.priority,
          status: tk.status,
        },
        backgroundColor: COLORS.ticket,
        borderColor: COLORS.ticket,
        textColor: "#fff",
      });
    });

    (salesOrders || []).forEach((so) => {
      const dateKey = so.expected_delivery_date || so.order_date || so.created_at;
      if (!dateKey) return;
      const hasTime = typeof dateKey === "string" && dateKey.includes("T");
      out.push({
        id: `so-${so.id}`,
        title: so.order_number ? `SO: ${so.order_number}` : "Sales Order",
        start: dateKey,
        allDay: !hasTime,
        extendedProps: {
          type: "sales_order",
          sourceId: so.id,
          status: so.status,
          amount: so.total_amount,
        },
        backgroundColor: COLORS.sales_order,
        borderColor: COLORS.sales_order,
        textColor: "#fff",
      });
    });

    (purchaseOrders || []).forEach((po) => {
      const dateKey =
        po.expected_receiving_date || po.order_date || po.created_at;
      if (!dateKey) return;
      const hasTime = typeof dateKey === "string" && dateKey.includes("T");
      out.push({
        id: `po-${po.id}`,
        title: po.po_number ? `PO: ${po.po_number}` : "Purchase Order",
        start: dateKey,
        allDay: !hasTime,
        extendedProps: {
          type: "purchase_order",
          sourceId: po.id,
          status: po.status,
          amount: po.total_amount,
        },
        backgroundColor: COLORS.purchase_order,
        borderColor: COLORS.purchase_order,
        textColor: "#fff",
      });
    });

    return out;
  }

  // ---------- Server fetch for visible window ----------
  async function fetchForRange(startISO: string, endISO: string) {
    setLoading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setEvents([]);
        setLoading(false);
        return;
      }

      // Query each table for records overlapping the visible range
      // NOTE: If your schema uses date-only fields, those queries still work with >=/<= comparisons using date strings
      const [tasksRes, callsRes, ticketsRes, salesRes, poRes] =
        await Promise.all([
          supabase
            .from("tasks")
            .select("id, title, due_date, description, status, priority")
            .eq("user_id", user.id)
            .gte("due_date", startISO)
            .lte("due_date", endISO),
          supabase
            .from("calls")
            .select("id, title, scheduled_at, notes, call_type, status")
            .eq("user_id", user.id)
            .gte("scheduled_at", startISO)
            .lte("scheduled_at", endISO),
          supabase
            .from("tickets")
            .select(
              "id, ticket_number, subject, deadline, priority, status, description"
            )
            .eq("user_id", user.id)
            .gte("deadline", startISO)
            .lte("deadline", endISO),
          supabase
            .from("sales_orders")
            .select(
              "id, order_number, expected_delivery_date, order_date, created_at, status, total_amount"
            )
            .eq("user_id", user.id)
            .or(
              `expected_delivery_date.gte.${startISO},order_date.gte.${startISO},created_at.gte.${startISO}`
            )
            .lte("expected_delivery_date", endISO)
            .lte("order_date", endISO)
            .lte("created_at", endISO),
          supabase
            .from("purchase_orders")
            .select(
              "id, po_number, expected_receiving_date, order_date, created_at, status, total_amount"
            )
            .eq("user_id", user.id)
            .or(
              `expected_receiving_date.gte.${startISO},order_date.gte.${startISO},created_at.gte.${startISO}`
            )
            .lte("expected_receiving_date", endISO)
            .lte("order_date", endISO)
            .lte("created_at", endISO),
        ]);

      const tasks = tasksRes.data || [];
      const calls = callsRes.data || [];
      const tickets = ticketsRes.data || [];
      const sales = salesRes.data || [];
      const pos = poRes.data || [];

      const mapped = mapSourceToEventList(tasks, calls, tickets, sales, pos);
      setEvents(mapped);

      // if a day is selected, update its list too
      if (selectedDate) {
        const filtered = mapped.filter((ev) =>
          ev.start.startsWith(selectedDate)
        );
        setSelectedDateEvents(filtered);
      }
    } catch (err) {
      console.error("Calendar fetch error", err);
      toast.error("Error loading calendar events");
    } finally {
      setLoading(false);
    }
  }

  // ---------- FullCalendar Handlers ----------
  const handleDatesSet = (arg: any) => {
    // arg.startStr / arg.endStr
    setVisibleRange({ start: arg.startStr, end: arg.endStr });
    fetchForRange(arg.startStr, arg.endStr);
  };

  // CRM-style: clicking a date shows events on that date in sidebar
  const handleDateClick = (info: any) => {
    const clicked = info.dateStr;
    setSelectedDate(clicked);
    const filtered = events.filter((ev) => ev.start.startsWith(clicked));
    setSelectedDateEvents(filtered);
    // do not open add modal — CRM style
  };

  // Add button opens create modal prefilled with selectedDate (or today)
  function openCreateForDate(dateIso?: string) {
    const date = dateIso || selectedDate || new Date().toISOString().slice(0, 10);
    setForm({
      ...form,
      date: date.split("T")[0],
      time: "",
      title: "",
      description: "",
      amount: "",
      type: "meeting",
      allDay: false,
      priority: "medium",
    });
    setOpenCreate(true);
  }

  function renderEventContent(arg: any) {
  return (
    <div className="flex items-center gap-1 overflow-hidden">
      {arg.timeText && (
        <span className="text-[10px] font-semibold shrink-0">
          {arg.timeText}
        </span>
      )}
      <span className="truncate text-[11px] leading-tight">
        ● {arg.event.title}
      </span>
    </div>
  );
}


  const handleEventClick = (clickInfo: any) => {
    const e = clickInfo.event;
    setSelectedEvent({
      id: e.id,
      title: e.title,
      start: e.start?.toISOString() ?? e.startStr,
      end: e.end?.toISOString() ?? undefined,
      allDay: e.allDay,
      extendedProps: e.extendedProps as any,
      backgroundColor: e.backgroundColor || "",
      borderColor: e.borderColor || "",
    });
    setOpenDetail(true);
  };

  // ---------- Create event — writes to proper table ----------
  async function createEventHandler(e: React.FormEvent) {
    e.preventDefault();
    setOpenCreate(false);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const baseDate = form.date;
      const startISO = isoWithTime(baseDate, form.time || undefined);

      if (form.type === "task") {
        await supabase.from("tasks").insert({
          title: form.title,
          description: form.description,
          due_date: baseDate,
          user_id: user.id,
          status: "pending",
          priority: form.priority,
        });
      } else if (form.type === "meeting" || form.type === "call") {
        await supabase.from("calls").insert({
          title: form.title,
          call_type: form.type,
          scheduled_at: startISO,
          notes: form.description,
          status: "scheduled",
          user_id: user.id,
        });
      } else if (form.type === "ticket") {
        await supabase.from("tickets").insert({
          subject: form.title,
          description: form.description,
          deadline: startISO,
          priority: form.priority,
          user_id: user.id,
        });
      } else if (form.type === "sales_order") {
        await supabase.from("sales_orders").insert({
          order_number: `SO-${Date.now()}`,
          expected_delivery_date: startISO,
          total_amount: Number(form.amount || 0),
          status: "pending",
          user_id: user.id,
        });
      } else if (form.type === "purchase_order") {
        await supabase.from("purchase_orders").insert({
          po_number: `PO-${Date.now()}`,
          expected_receiving_date: startISO,
          total_amount: Number(form.amount || 0),
          status: "pending",
          user_id: user.id,
        });
      } else {
        // reminder fallback -> task
        await supabase.from("tasks").insert({
          title: form.title,
          description: form.description,
          due_date: baseDate,
          user_id: user.id,
          status: "pending",
          priority: form.priority,
        });
      }

      toast.success("Event created");
      if (visibleRange) await fetchForRange(visibleRange.start, visibleRange.end);
    } catch (err: any) {
      console.error("createEvent error", err);
      toast.error(err.message || "Error creating event");
    }
  }

  // ---------- Update / Delete from detail modal ----------
  async function updateSelectedEvent(changes: { title?: string; description?: string; status?: string }) {
    if (!selectedEvent) return toast.error("No event selected");
    setOpenDetail(false);
    const ext = selectedEvent.extendedProps;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const { type, sourceId } = ext || {};
      if (!sourceId) return toast.error("No source id for event");

      if (type === "task") {
        await supabase.from("tasks").update({
          title: changes.title ?? selectedEvent.title,
          description: changes.description ?? ext.details,
          status: changes.status ?? ext.status,
        }).eq("id", sourceId);
      } else if (type === "meeting" || type === "call") {
        await supabase.from("calls").update({
          title: changes.title ?? selectedEvent.title,
          notes: changes.description ?? ext.details,
          status: changes.status ?? ext.status,
        }).eq("id", sourceId);
      } else if (type === "ticket") {
        await supabase.from("tickets").update({
          subject: changes.title ?? selectedEvent.title,
          description: changes.description ?? ext.details,
          status: changes.status ?? ext.status,
        }).eq("id", sourceId);
      } else if (type === "sales_order") {
        await supabase.from("sales_orders").update({
          status: changes.status ?? ext.status,
        }).eq("id", sourceId);
      } else if (type === "purchase_order") {
        await supabase.from("purchase_orders").update({
          status: changes.status ?? ext.status,
        }).eq("id", sourceId);
      }
      toast.success("Event updated");
      if (visibleRange) await fetchForRange(visibleRange.start, visibleRange.end);
    } catch (err: any) {
      console.error("updateSelectedEvent err", err);
      toast.error(err.message || "Error updating event");
    }
  }

  async function deleteSelectedEvent() {
    if (!selectedEvent) return toast.error("No event selected");
    setOpenDetail(false);
    const ext = selectedEvent.extendedProps;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const { type, sourceId } = ext || {};
      if (!sourceId) return toast.error("No source id");

      if (type === "task") {
        await supabase.from("tasks").delete().eq("id", sourceId);
      } else if (type === "meeting" || type === "call") {
        await supabase.from("calls").delete().eq("id", sourceId);
      } else if (type === "ticket") {
        await supabase.from("tickets").delete().eq("id", sourceId);
      } else if (type === "sales_order") {
        await supabase.from("sales_orders").delete().eq("id", sourceId);
      } else if (type === "purchase_order") {
        await supabase.from("purchase_orders").delete().eq("id", sourceId);
      } else {
        await supabase.from("tasks").delete().eq("id", sourceId);
      }

      toast.success("Event deleted");
      if (visibleRange) await fetchForRange(visibleRange.start, visibleRange.end);
    } catch (err: any) {
      console.error("delete err", err);
      toast.error(err.message || "Error deleting event");
    }
  }

  const getIconForType = (t?: string) => {
    switch (t) {
      case "meeting":
        return <Users className="h-4 w-4" />;
      case "task":
        return <Target className="h-4 w-4" />;
      case "ticket":
        return <Ticket className="h-4 w-4" />;
      case "sales_order":
        return <DollarSign className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-4 md:space-y-6 p-2 md:p-0">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
  <div>
    <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-3">
      Calendar
      <Badge
        className="bg-blue-600 text-white px-2 py-0.5 text-xs rounded-md"
        variant="secondary"
      >
        *Under Development
      </Badge>
    </h1>

    <p className="text-sm text-muted-foreground">
      All events, tasks, deliveries, calls and PO receipts
    </p>
  </div>
</div>

        <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center w-full sm:w-auto">
          <Select value={currentView} onValueChange={(v: any) => {
            setCurrentView(v);
            // instruct calendar to change view
            const api = calendarRef.current?.getApi();
            if (api) api.changeView(v);
          }}>
            <SelectTrigger className="w-full sm:w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="dayGridMonth">Month</SelectItem>
              <SelectItem value="timeGridWeek">Week</SelectItem>
              <SelectItem value="timeGridDay">Day</SelectItem>
              <SelectItem value="listWeek">List</SelectItem>
            </SelectContent>
          </Select>

          <Dialog open={openCreate} onOpenChange={setOpenCreate}>
            <DialogTrigger asChild>
              <Button
  variant="default"
  className="w-full sm:w-auto sm:ml-2"
  onClick={() => openCreateForDate()}
>
                <Plus className="h-4 w-4 mr-2" />
                Add Event
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create Event</DialogTitle>
              </DialogHeader>

              <form onSubmit={createEventHandler} className="space-y-4">
                <div>
                  <Label>Type</Label>
                  <Select value={form.type} onValueChange={(v: any) => setForm({ ...form, type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="meeting">Meeting</SelectItem>
                      <SelectItem value="call">Call</SelectItem>
                      <SelectItem value="task">Task</SelectItem>
                      <SelectItem value="ticket">Ticket</SelectItem>
                      <SelectItem value="sales_order">Sales Order</SelectItem>
                      <SelectItem value="purchase_order">Purchase Order</SelectItem>
                      <SelectItem value="reminder">Reminder</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Title</Label>
                  <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label>Date</Label>
                    <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required />
                  </div>
                  <div>
                    <Label>Time (optional)</Label>
                    <Input type="time" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} />
                  </div>
                </div>

                <div>
                  <Label>Amount (optional)</Label>
                  <Input value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="₹ amount for PO / SO" />
                </div>

                <div>
                  <Label>Description</Label>
                  <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} />
                </div>

                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setOpenCreate(false)}>Cancel</Button>
                  <Button type="submit">Create</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="md:col-span-3">
          <div className="border rounded-md bg-white shadow-sm overflow-x-hidden max-w-full">
            <FullCalendar
              ref={(cal) => (calendarRef.current = cal)}
              plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin]}
              contentHeight="auto"
aspectRatio={1}
handleWindowResize={true}
              initialView={currentView}
              dayCellClassNames={() => "overflow-hidden"}
              viewDidMount={() => {
  const el = document.querySelector(".fc");
  if (el) {
    (el as HTMLElement).style.maxWidth = "100vw";
    (el as HTMLElement).style.overflowX = "hidden";
  }
}}

              headerToolbar={{
                left: "prev,next today",
                center: "title",
                right: "",
              }}
              selectable={false} // CRM style: selection not used to auto-create
              dateClick={handleDateClick}
              datesSet={handleDatesSet}
              events={events as any}
              eventClick={handleEventClick}
              eventContent={renderEventContent}
              nowIndicator={true}
              height="auto"
              dayMaxEvents={3}
              allDaySlot={true}
              editable={false}
            />
          </div>
        </div>

        <div>
          <div className="p-4 border rounded-md bg-white">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold mb-2">Upcoming Events</h3>
              <div>
                <Button size="sm" variant="ghost" onClick={() => {
                  // clear selected date and show all
                  setSelectedDate(null);
                  setSelectedDateEvents([]);
                }}>Clear</Button>
              </div>
            </div>

            <div className="space-y-2 max-h-[380px] overflow-y-auto">
              {(!events || events.length === 0) && <div className="text-sm text-muted-foreground">No events</div>}

              {(selectedDateEvents.length > 0 ? selectedDateEvents : events)
                .slice()
                .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())
                .slice(0, 12)
                .map((ev) => (
                <div key={ev.id} className="flex items-start gap-3 p-2 rounded border hover:bg-muted cursor-pointer" onClick={() => {
                  // open detail dialog for this event
                  setSelectedEvent(ev);
                  setOpenDetail(true);
                }}>
                  <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ backgroundColor: ev.backgroundColor }}>
                    <span className="text-white text-sm">{(ev.extendedProps?.type || "E").slice(0, 1).toUpperCase()}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <div className="font-medium truncate">{ev.title}</div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(ev.start).toLocaleDateString()} {ev.allDay ? "" : `• ${new Date(ev.start).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`}
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">{ev.extendedProps?.details || (ev.extendedProps?.amount ? `₹${ev.extendedProps.amount}` : "")}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 p-4 border rounded-md bg-white">
            <h4 className="font-semibold mb-2">Legend</h4>
            <div className="flex flex-col gap-2 text-sm">
              {Object.keys(COLORS).map((k) => (
                <div key={k} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded" style={{ backgroundColor: COLORS[k as EventType] }} />
                  <div className="capitalize">{k.replace("_", " ")}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <Dialog open={openDetail} onOpenChange={setOpenDetail}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Event Details</DialogTitle>
          </DialogHeader>
          {selectedEvent ? (
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 rounded-md flex items-center justify-center" style={{ background: selectedEvent.backgroundColor }}>
                  {getIconForType(selectedEvent.extendedProps?.type)}
                </div>
                <div className="flex-1">
                  <div className="font-semibold">{selectedEvent.title}</div>
                  <div className="text-sm text-muted-foreground">
                    {formatLocalDateTime(selectedEvent.start)} {selectedEvent.end ? ` - ${formatLocalDateTime(selectedEvent.end)}` : ""}
                  </div>
                  <div className="mt-2 text-sm">{selectedEvent.extendedProps?.details}</div>
                </div>
              </div>

              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => {
                  if (selectedEvent.extendedProps?.type === "task") {
                    updateSelectedEvent({ status: selectedEvent.extendedProps.status === "completed" ? "pending" : "completed" });
                  } else {
                    toast("Use Edit to change status");
                  }
                }}>
                  {selectedEvent.extendedProps?.status === "completed" ? "Mark Pending" : "Toggle Complete"}
                </Button>

                <Button variant="destructive" onClick={() => {
                  deleteSelectedEvent();
                }}>
                  Delete
                </Button>
                <Button onClick={() => setOpenDetail(false)}>Close</Button>
              </div>
            </div>
          ) : (
            <div>No event selected</div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
