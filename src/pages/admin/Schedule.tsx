import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import AdminLayout from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/use-toast";
import { useSession } from "@/context/SessionProvider";
import { Plus, Edit, Trash2, Calendar, Users, Copy, XCircle, RotateCcw } from "lucide-react";

interface ScheduleItem {
  id: string;
  class_id: string;
  day_of_week: string;
  start_time: string;
  end_time?: string;
  max_capacity?: number;
  instructor_id: string | null;
  is_cancelled: boolean;
  cancelled_at?: string;
  cancelled_by?: string;
  cancellation_reason?: string;
  created_at: string;
  updated_at: string;
  classes?: {
    name: string;
    description?: string;
  };
  instructors?: {
    name: string;
    email?: string;
  };
  booking_count?: number;
}

interface Class {
  id: string;
  name: string;
}

interface Instructor {
  id: string;
  name: string;
  email?: string;
  is_active: boolean;
}

export default function Schedule() {
  const { session } = useSession();
  const [scheduleItems, setScheduleItems] = useState<ScheduleItem[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [instructors, setInstructors] = useState<Instructor[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDuplicateDialogOpen, setIsDuplicateDialogOpen] = useState(false);
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ScheduleItem | null>(null);
  const [duplicatingItem, setDuplicatingItem] = useState<ScheduleItem | null>(null);
  const [cancellingItem, setCancellingItem] = useState<ScheduleItem | null>(null);
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [showCancelled, setShowCancelled] = useState(true);
  const [cancellationReason, setCancellationReason] = useState("");
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    class_id: "",
    day_of_week: "",
    start_time: "",
    end_time: "",
    max_capacity: "",
    instructor_id: "",
  });

  const daysOfWeek = [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday",
  ];

  useEffect(() => {
    fetchSchedule();
    fetchClasses();
    fetchInstructors();
  }, []);

  const fetchSchedule = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("schedule")
      .select(`
        *,
        classes (
          name,
          description
        ),
        instructors (
          name,
          email
        )
      `)
      .order("day_of_week", { ascending: true })
      .order("start_time", { ascending: true });

    if (error) {
      console.error("Error fetching schedule:", error);
      console.error("Error details:", JSON.stringify(error, null, 2));
      toast({
        title: "Error",
        description: `Failed to load schedule: ${error.message}`,
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    // Fetch booking counts for each schedule item
    if (data && data.length > 0) {
      const scheduleWithBookings = await Promise.all(
        data.map(async (schedule) => {
          const { count } = await supabase
            .from("bookings")
            .select("*", { count: "exact", head: true })
            .eq("schedule_id", schedule.id)
            .in("status", ["confirmed", "pending"]);

          return {
            ...schedule,
            booking_count: count || 0,
          };
        })
      );

      console.log("Schedule data with bookings:", scheduleWithBookings);
      setScheduleItems(scheduleWithBookings);
    } else {
      setScheduleItems([]);
    }

    setLoading(false);
  };

  const fetchClasses = async () => {
    const { data, error} = await supabase
      .from("classes")
      .select("id, name")
      .order("name", { ascending: true });

    if (error) {
      console.error("Error fetching classes:", error);
    } else {
      setClasses(data || []);
    }
  };

  const fetchInstructors = async () => {
    const { data, error } = await supabase
      .from("instructors")
      .select("id, name, email, is_active")
      .eq("is_active", true)
      .order("name", { ascending: true });

    if (error) {
      console.error("Error fetching instructors:", error);
    } else {
      setInstructors(data || []);
    }
  };

  const handleCreate = () => {
    setEditingItem(null);
    setFormData({
      class_id: "",
      day_of_week: "",
      start_time: "",
      end_time: "",
      max_capacity: "20",
      instructor_id: "",
    });
    setIsDialogOpen(true);
  };

  const handleEdit = (item: ScheduleItem) => {
    setEditingItem(item);
    setFormData({
      class_id: item.class_id,
      day_of_week: item.day_of_week,
      start_time: item.start_time,
      end_time: item.end_time || "",
      max_capacity: item.max_capacity?.toString() || "20",
      instructor_id: item.instructor_id || "",
    });
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    console.log("handleSave called");
    console.log("Form data:", formData);

    // Check if class is selected
    if (!formData.class_id) {
      toast({
        title: "Validation Error",
        description: "Please select a class",
        variant: "destructive",
      });
      return;
    }

    // Check if day is selected
    if (!formData.day_of_week) {
      toast({
        title: "Validation Error",
        description: "Please select a day of the week",
        variant: "destructive",
      });
      return;
    }

    // Check if start time is provided
    if (!formData.start_time) {
      toast({
        title: "Validation Error",
        description: "Please enter a start time",
        variant: "destructive",
      });
      return;
    }

    // Check if end time is provided
    if (!formData.end_time) {
      toast({
        title: "Validation Error",
        description: "Please enter an end time",
        variant: "destructive",
      });
      return;
    }

    // Validate max capacity
    if (!formData.max_capacity || isNaN(parseInt(formData.max_capacity)) || parseInt(formData.max_capacity) <= 0) {
      toast({
        title: "Validation Error",
        description: "Please enter a valid max capacity greater than 0",
        variant: "destructive",
      });
      return;
    }

    // Validate that end_time is after start_time
    console.log("Validating time range:", formData.start_time, "to", formData.end_time);
    const [startHour, startMin] = formData.start_time.split(':').map(Number);
    const [endHour, endMin] = formData.end_time.split(':').map(Number);

    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;

    console.log("Start minutes:", startMinutes, "End minutes:", endMinutes);

    if (endMinutes <= startMinutes) {
      toast({
        title: "Validation Error",
        description: "End time must be after start time",
        variant: "destructive",
      });
      return;
    }

    console.log("Validation passed, proceeding to save");

    const scheduleData = {
      class_id: formData.class_id,
      day_of_week: formData.day_of_week,
      start_time: formData.start_time,
      end_time: formData.end_time,
      max_capacity: parseInt(formData.max_capacity),
      instructor_id: formData.instructor_id || null,
    };

    console.log("Schedule data to save:", scheduleData);

    if (editingItem) {
      // Update existing schedule item
      console.log("Updating existing schedule, ID:", editingItem.id);
      const { data, error } = await supabase
        .from("schedule")
        .update(scheduleData)
        .eq("id", editingItem.id)
        .select();

      if (error) {
        console.error("Error updating schedule:", error);
        console.error("Error details:", JSON.stringify(error, null, 2));
        toast({
          title: "Error",
          description: `Failed to update schedule: ${error.message}`,
          variant: "destructive",
        });
      } else {
        console.log("Schedule updated successfully:", data);
        toast({
          title: "Success",
          description: "Schedule updated successfully",
        });
        setIsDialogOpen(false);
        fetchSchedule();
      }
    } else {
      // Create new schedule item
      console.log("Creating new schedule");
      const { data, error } = await supabase
        .from("schedule")
        .insert([scheduleData])
        .select();

      if (error) {
        console.error("Error creating schedule:", error);
        console.error("Error details:", JSON.stringify(error, null, 2));
        toast({
          title: "Error",
          description: `Failed to create schedule: ${error.message}`,
          variant: "destructive",
        });
      } else {
        console.log("Schedule created successfully:", data);
        toast({
          title: "Success",
          description: "Schedule created successfully",
        });
        setIsDialogOpen(false);
        fetchSchedule();
      }
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this schedule item?")) return;

    const { error} = await supabase.from("schedule").delete().eq("id", id);

    if (error) {
      console.error("Error deleting schedule:", error);
      toast({
        title: "Error",
        description: "Failed to delete schedule",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Schedule deleted successfully",
      });
      fetchSchedule();
    }
  };

  const handleDuplicate = (item: ScheduleItem) => {
    setDuplicatingItem(item);
    setSelectedDays([]);
    setIsDuplicateDialogOpen(true);
  };

  const handleDuplicateConfirm = async () => {
    if (!duplicatingItem || selectedDays.length === 0) {
      toast({
        title: "Validation Error",
        description: "Please select at least one day to duplicate to",
        variant: "destructive",
      });
      return;
    }

    const scheduleEntries = selectedDays.map((day) => ({
      class_id: duplicatingItem.class_id,
      day_of_week: day,
      start_time: duplicatingItem.start_time,
      end_time: duplicatingItem.end_time,
      max_capacity: duplicatingItem.max_capacity || 20,
      instructor_id: duplicatingItem.instructor_id || null,
    }));

    const { error } = await supabase.from("schedule").insert(scheduleEntries);

    if (error) {
      console.error("Error duplicating schedule:", error);
      toast({
        title: "Error",
        description: `Failed to duplicate schedule: ${error.message}`,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: `Schedule duplicated to ${selectedDays.length} day(s)`,
      });
      setIsDuplicateDialogOpen(false);
      setDuplicatingItem(null);
      setSelectedDays([]);
      fetchSchedule();
    }
  };

  const toggleDaySelection = (day: string) => {
    setSelectedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  const handleCancelClass = (item: ScheduleItem) => {
    setCancellingItem(item);
    setCancellationReason("");
    setIsCancelDialogOpen(true);
  };

  const handleCancelConfirm = async () => {
    if (!cancellingItem || !session) return;

    // Update schedule to mark as cancelled
    const { error } = await supabase
      .from("schedule")
      .update({
        is_cancelled: true,
        cancelled_at: new Date().toISOString(),
        cancelled_by: session.user.id,
        cancellation_reason: cancellationReason || null,
      })
      .eq("id", cancellingItem.id);

    if (error) {
      console.error("Error cancelling class:", error);
      toast({
        title: "Error",
        description: "Failed to cancel class",
        variant: "destructive",
      });
      return;
    }

    // Call edge function to notify affected members
    let notificationMessage = `${cancellingItem.classes?.name} on ${cancellingItem.day_of_week} has been cancelled.`;

    try {
      const { data: { session: authSession } } = await supabase.auth.getSession();

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/notify-class-cancellation`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authSession?.access_token}`,
        },
        body: JSON.stringify({
          schedule_id: cancellingItem.id,
          class_name: cancellingItem.classes?.name || "Class",
          day_of_week: cancellingItem.day_of_week,
          start_time: cancellingItem.start_time,
          end_time: cancellingItem.end_time || "",
          cancellation_reason: cancellationReason || undefined,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        if (result.notified_count > 0) {
          notificationMessage += ` ${result.notified_count} member(s) notified (${result.emails_sent} email(s) sent).`;
        }
      }
    } catch (notifyError) {
      console.error("Error notifying members:", notifyError);
      // Don't fail the cancellation if notification fails
    }

    toast({
      title: "Class Cancelled",
      description: notificationMessage,
    });
    setIsCancelDialogOpen(false);
    setCancellingItem(null);
    setCancellationReason("");
    fetchSchedule();
  };

  const handleRestoreClass = async (item: ScheduleItem) => {
    if (!confirm("Are you sure you want to restore this cancelled class?")) return;

    const { error } = await supabase
      .from("schedule")
      .update({
        is_cancelled: false,
        cancelled_at: null,
        cancelled_by: null,
        cancellation_reason: null,
      })
      .eq("id", item.id);

    if (error) {
      console.error("Error restoring class:", error);
      toast({
        title: "Error",
        description: "Failed to restore class",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Class Restored",
        description: `${item.classes?.name} on ${item.day_of_week} has been restored`,
      });
      fetchSchedule();
    }
  };

  const groupedByDay = daysOfWeek.map((day) => ({
    day,
    items: scheduleItems
      .filter((item) => item.day_of_week === day)
      .filter((item) => showCancelled || !item.is_cancelled),
  }));

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Schedule</h1>
            <p className="text-muted-foreground">
              Manage weekly class schedule
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 border border-border rounded-lg px-4 py-2">
              <Label htmlFor="show-cancelled" className="text-sm cursor-pointer">
                Show Cancelled
              </Label>
              <Switch
                id="show-cancelled"
                checked={showCancelled}
                onCheckedChange={setShowCancelled}
              />
            </div>
            <Button onClick={handleCreate}>
              <Plus className="h-4 w-4 mr-2" />
              Add Schedule
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="bg-card border border-border rounded-lg p-4">
            <p className="text-sm text-muted-foreground">Active Classes</p>
            <p className="text-2xl font-bold text-foreground">
              {scheduleItems.filter(item => !item.is_cancelled).length}
            </p>
          </div>
          <div className="bg-card border border-border rounded-lg p-4">
            <p className="text-sm text-muted-foreground">Cancelled Classes</p>
            <p className="text-2xl font-bold text-destructive">
              {scheduleItems.filter(item => item.is_cancelled).length}
            </p>
          </div>
          <div className="bg-card border border-border rounded-lg p-4">
            <p className="text-sm text-muted-foreground">Total Bookings</p>
            <p className="text-2xl font-bold text-primary">
              {scheduleItems.filter(item => !item.is_cancelled).reduce((sum, item) => sum + (item.booking_count || 0), 0)}
            </p>
          </div>
          <div className="bg-card border border-border rounded-lg p-4">
            <p className="text-sm text-muted-foreground">Busiest Day</p>
            <p className="text-2xl font-bold text-foreground capitalize">
              {groupedByDay.reduce((max, day) =>
                day.items.length > max.items.length ? day : max
              , groupedByDay[0])?.day || "-"}
            </p>
          </div>
          <div className="bg-card border border-border rounded-lg p-4">
            <p className="text-sm text-muted-foreground">Avg Utilization</p>
            <p className="text-2xl font-bold text-foreground">
              {scheduleItems.filter(item => !item.is_cancelled).length > 0
                ? Math.round(
                    (scheduleItems.filter(item => !item.is_cancelled).reduce((sum, item) =>
                      sum + ((item.booking_count || 0) / (item.max_capacity || 20)) * 100, 0
                    ) / scheduleItems.filter(item => !item.is_cancelled).length)
                  )
                : 0}%
            </p>
          </div>
        </div>

        {/* Schedule by Day */}
        <div className="space-y-6">
          {groupedByDay.map(({ day, items }) => (
            <div key={day} className="bg-card border border-border rounded-lg p-6">
              <h2 className="text-xl font-bold text-foreground capitalize mb-4">
                {day}
              </h2>
              {items.length === 0 ? (
                <p className="text-muted-foreground text-sm">No classes scheduled</p>
              ) : (
                <div className="space-y-3">
                  {items.map((item) => {
                    const bookingCount = item.booking_count || 0;
                    const maxCapacity = item.max_capacity || 20;
                    const utilizationPercent = (bookingCount / maxCapacity) * 100;
                    const isFull = bookingCount >= maxCapacity;
                    const isNearlyFull = utilizationPercent >= 80 && !isFull;

                    return (
                      <div
                        key={item.id}
                        className={`flex items-center justify-between p-4 bg-background rounded-lg border ${
                          item.is_cancelled
                            ? "border-destructive/50 bg-destructive/5"
                            : "border-border"
                        }`}
                      >
                        <div className="flex items-center gap-4 flex-1">
                          <div className={`text-lg font-semibold ${
                            item.is_cancelled ? "text-muted-foreground line-through" : "text-primary"
                          }`}>
                            {item.start_time}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <p className={`font-medium ${
                                item.is_cancelled ? "text-muted-foreground line-through" : "text-foreground"
                              }`}>
                                {item.classes?.name || "Unknown Class"}
                              </p>
                              {item.is_cancelled && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-destructive/10 text-destructive">
                                  Cancelled
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {item.end_time ? `${item.start_time} - ${item.end_time}` : item.start_time}
                              {item.instructors?.name && ` • with ${item.instructors.name}`}
                            </p>
                            {item.is_cancelled && item.cancellation_reason && (
                              <p className="text-xs text-destructive mt-1">
                                Reason: {item.cancellation_reason}
                              </p>
                            )}
                          </div>
                          {!item.is_cancelled && (
                            <div className="flex items-center gap-2">
                              <div className="flex items-center gap-1">
                                <Users className="h-4 w-4 text-muted-foreground" />
                                <span className={`text-sm font-medium ${
                                  isFull ? "text-destructive" :
                                  isNearlyFull ? "text-orange-500" :
                                  "text-foreground"
                                }`}>
                                  {bookingCount}/{maxCapacity}
                                </span>
                              </div>
                              {isFull && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-destructive/10 text-destructive">
                                  Full
                                </span>
                              )}
                              {isNearlyFull && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-700">
                                  Nearly Full
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                        <div className="flex gap-2 ml-4">
                          {item.is_cancelled ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRestoreClass(item)}
                              title="Restore cancelled class"
                              className="text-primary hover:text-primary"
                            >
                              <RotateCcw className="h-4 w-4" />
                            </Button>
                          ) : (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDuplicate(item)}
                                title="Duplicate to other days"
                              >
                                <Copy className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEdit(item)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleCancelClass(item)}
                                title="Cancel class"
                                className="text-orange-500 hover:text-orange-600"
                              >
                                <XCircle className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(item.id)}
                            className="text-destructive hover:text-destructive"
                            title="Delete permanently"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Create/Edit Schedule Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingItem ? "Edit Schedule" : "Add to Schedule"}
              </DialogTitle>
              <DialogDescription>
                {editingItem
                  ? "Update schedule information"
                  : "Add a new class to the weekly schedule"}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="class">Class *</Label>
                <Select
                  value={formData.class_id}
                  onValueChange={(value) => {
                    console.log("Class selected:", value);
                    setFormData({ ...formData, class_id: value });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a class" />
                  </SelectTrigger>
                  <SelectContent>
                    {classes.length === 0 ? (
                      <div className="p-2 text-sm text-muted-foreground">
                        No classes available. Please create a class first.
                      </div>
                    ) : (
                      classes.map((classItem) => (
                        <SelectItem
                          key={classItem.id}
                          value={classItem.id}
                        >
                          {classItem.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                {classes.length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    You need to create classes in the Classes page before scheduling them.
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="day">Day of Week *</Label>
                <Select
                  value={formData.day_of_week}
                  onValueChange={(value) =>
                    setFormData({ ...formData, day_of_week: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a day" />
                  </SelectTrigger>
                  <SelectContent>
                    {daysOfWeek.map((day) => (
                      <SelectItem key={day} value={day}>
                        {day.charAt(0).toUpperCase() + day.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="start_time">Start Time *</Label>
                <Input
                  id="start_time"
                  type="time"
                  value={formData.start_time}
                  onChange={(e) =>
                    setFormData({ ...formData, start_time: e.target.value })
                  }
                  className="[&::-webkit-calendar-picker-indicator]:opacity-100 [&::-webkit-calendar-picker-indicator]:brightness-0 [&::-webkit-calendar-picker-indicator]:invert [&::-webkit-calendar-picker-indicator]:cursor-pointer"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end_time">End Time *</Label>
                <Input
                  id="end_time"
                  type="time"
                  value={formData.end_time}
                  onChange={(e) =>
                    setFormData({ ...formData, end_time: e.target.value })
                  }
                  className="[&::-webkit-calendar-picker-indicator]:opacity-100 [&::-webkit-calendar-picker-indicator]:brightness-0 [&::-webkit-calendar-picker-indicator]:invert [&::-webkit-calendar-picker-indicator]:cursor-pointer"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="max_capacity">Max Capacity *</Label>
                <Input
                  id="max_capacity"
                  type="text"
                  inputMode="numeric"
                  placeholder="20"
                  value={formData.max_capacity}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === '' || /^\d+$/.test(value)) {
                      setFormData({ ...formData, max_capacity: value });
                    }
                  }}
                />
                <p className="text-xs text-muted-foreground">Maximum number of participants allowed</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="instructor">Instructor (Optional)</Label>
                <Select
                  value={formData.instructor_id || "none"}
                  onValueChange={(value) =>
                    setFormData({ ...formData, instructor_id: value === "none" ? "" : value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select an instructor" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {instructors.map((instructor) => (
                      <SelectItem
                        key={instructor.id}
                        value={instructor.id}
                      >
                        {instructor.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {instructors.length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    No active instructors. Create instructors first to assign them.
                  </p>
                )}
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave}>
                {editingItem ? "Save Changes" : "Add to Schedule"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Duplicate Schedule Dialog */}
        <Dialog open={isDuplicateDialogOpen} onOpenChange={setIsDuplicateDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Duplicate to Multiple Days</DialogTitle>
              <DialogDescription>
                Select the days you want to duplicate this class to
              </DialogDescription>
            </DialogHeader>
            {duplicatingItem && (
              <div className="py-4">
                <div className="mb-4 p-4 bg-muted rounded-lg">
                  <p className="font-medium text-foreground">
                    {duplicatingItem.classes?.name || "Class"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {duplicatingItem.start_time} - {duplicatingItem.end_time}
                    {duplicatingItem.max_capacity && ` • Max ${duplicatingItem.max_capacity} participants`}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Currently on: <span className="font-medium">{duplicatingItem.day_of_week}</span>
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Select Days</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {daysOfWeek
                      .filter((day) => day !== duplicatingItem.day_of_week)
                      .map((day) => (
                        <div
                          key={day}
                          onClick={() => toggleDaySelection(day)}
                          className={`
                            p-3 rounded-lg border-2 cursor-pointer transition-all
                            ${
                              selectedDays.includes(day)
                                ? "border-primary bg-primary/10"
                                : "border-border hover:border-primary/50"
                            }
                          `}
                        >
                          <div className="flex items-center gap-2">
                            <div
                              className={`
                                w-5 h-5 rounded border-2 flex items-center justify-center
                                ${
                                  selectedDays.includes(day)
                                    ? "border-primary bg-primary"
                                    : "border-border"
                                }
                              `}
                            >
                              {selectedDays.includes(day) && (
                                <svg
                                  className="w-3 h-3 text-primary-foreground"
                                  fill="none"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth="2"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                >
                                  <path d="M5 13l4 4L19 7"></path>
                                </svg>
                              )}
                            </div>
                            <span className="font-medium text-foreground">{day}</span>
                          </div>
                        </div>
                      ))}
                  </div>
                  {selectedDays.length > 0 && (
                    <p className="text-sm text-muted-foreground mt-2">
                      Selected {selectedDays.length} day(s)
                    </p>
                  )}
                </div>
              </div>
            )}
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setIsDuplicateDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button onClick={handleDuplicateConfirm}>
                Duplicate to {selectedDays.length} Day(s)
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Cancel Class Dialog */}
        <Dialog open={isCancelDialogOpen} onOpenChange={setIsCancelDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Cancel Class</DialogTitle>
              <DialogDescription>
                Are you sure you want to cancel this class? Members with bookings will need to be notified.
              </DialogDescription>
            </DialogHeader>
            {cancellingItem && (
              <div className="space-y-4 py-4">
                <div className="p-4 bg-muted rounded-lg">
                  <p className="font-medium text-foreground">
                    {cancellingItem.classes?.name || "Class"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {cancellingItem.day_of_week} • {cancellingItem.start_time} - {cancellingItem.end_time}
                  </p>
                  {cancellingItem.booking_count && cancellingItem.booking_count > 0 && (
                    <p className="text-sm text-orange-600 mt-2">
                      ⚠️ {cancellingItem.booking_count} member(s) have booked this class
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cancellation_reason">Reason for Cancellation (Optional)</Label>
                  <Textarea
                    id="cancellation_reason"
                    placeholder="e.g., Instructor unavailable, facility maintenance..."
                    value={cancellationReason}
                    onChange={(e) => setCancellationReason(e.target.value)}
                    rows={3}
                  />
                  <p className="text-xs text-muted-foreground">
                    This reason will be visible to members and staff
                  </p>
                </div>
              </div>
            )}
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setIsCancelDialogOpen(false)}
              >
                Keep Class
              </Button>
              <Button
                variant="destructive"
                onClick={handleCancelConfirm}
              >
                Cancel Class
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
