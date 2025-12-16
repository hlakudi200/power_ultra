// Booking day detail modal - shows all bookings for a specific date

import { format } from 'date-fns';
import { DayBookingSummary, BookingWithDetails } from '@/types/calendar';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Users, Clock, User, Mail, Phone, Download, Calendar as CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';

interface BookingDayDetailModalProps {
  date: Date | null;
  summary: DayBookingSummary | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BookingDayDetailModal({
  date,
  summary,
  open,
  onOpenChange,
}: BookingDayDetailModalProps) {
  const [expandedClass, setExpandedClass] = useState<string | undefined>(undefined);

  if (!date || !summary) return null;

  const getStatusBadge = (status: string) => {
    const styles = {
      confirmed: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800',
      pending: 'bg-yellow-100 text-yellow-800',
      completed: 'bg-blue-100 text-blue-800',
    };

    return (
      <Badge
        className={cn(
          'text-xs',
          styles[status as keyof typeof styles] || 'bg-gray-100 text-gray-800'
        )}
      >
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const handleExportDay = () => {
    // Create CSV content
    const headers = ['Class', 'Time', 'Member Name', 'Email', 'Phone', 'Status', 'Booking Date'];
    const rows = summary.classes.flatMap((classItem) =>
      classItem.bookings.map((booking) => [
        classItem.class_name,
        classItem.start_time,
        `${booking.profiles?.first_name || ''} ${booking.profiles?.last_name || ''}`.trim(),
        booking.profiles?.email || '',
        booking.profiles?.phone || '',
        booking.status,
        format(new Date(booking.created_at), 'yyyy-MM-dd HH:mm'),
      ])
    );

    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
    ].join('\n');

    // Download CSV
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bookings-${format(date, 'yyyy-MM-dd')}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5" />
            {format(date, 'EEEE, MMMM dd, yyyy')}
          </DialogTitle>
          <DialogDescription>
            View all bookings and class details for this date
          </DialogDescription>
        </DialogHeader>

        {/* Day summary stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 py-4">
          <div className="bg-muted rounded-lg p-3">
            <p className="text-xs text-muted-foreground">Total Classes</p>
            <p className="text-2xl font-bold text-foreground">{summary.total_classes}</p>
          </div>
          <div className="bg-muted rounded-lg p-3">
            <p className="text-xs text-muted-foreground">Total Bookings</p>
            <p className="text-2xl font-bold text-foreground">{summary.total_bookings}</p>
          </div>
          <div className="bg-muted rounded-lg p-3">
            <p className="text-xs text-muted-foreground">Utilization</p>
            <p className="text-2xl font-bold text-foreground">{summary.utilization_percent}%</p>
          </div>
          <div className="bg-muted rounded-lg p-3">
            <p className="text-xs text-muted-foreground">Spots Left</p>
            <p className="text-2xl font-bold text-foreground">
              {summary.total_capacity - (summary.confirmed_bookings + summary.pending_bookings)}
            </p>
          </div>
        </div>

        {/* Export button */}
        <div className="flex justify-end">
          <Button onClick={handleExportDay} variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export as CSV
          </Button>
        </div>

        {/* Classes list */}
        {summary.classes.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <CalendarIcon className="h-12 w-12 mx-auto mb-4 opacity-30" />
            <p>No classes scheduled for this date</p>
          </div>
        ) : (
          <Accordion
            type="single"
            collapsible
            value={expandedClass}
            onValueChange={setExpandedClass}
            className="space-y-4"
          >
            {summary.classes.map((classItem) => (
              <AccordionItem
                key={classItem.schedule_id}
                value={classItem.schedule_id}
                className={cn(
                  'border rounded-lg px-4',
                  classItem.is_full
                    ? 'bg-red-50 border-red-200'
                    : classItem.is_nearly_full
                    ? 'bg-orange-50 border-orange-200'
                    : 'bg-green-50 border-green-200'
                )}
              >
                <AccordionTrigger className="hover:no-underline py-4">
                  <div className="flex items-center justify-between w-full pr-4">
                    <div className="flex items-center gap-4">
                      <div className="text-left">
                        <p className="font-semibold text-foreground text-base">
                          {classItem.class_name}
                        </p>
                        <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {classItem.start_time}
                            {classItem.end_time && ` - ${classItem.end_time}`}
                          </span>
                          {classItem.instructor_name && (
                            <span className="flex items-center gap-1">
                              <User className="h-3 w-3" />
                              {classItem.instructor_name}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-muted-foreground" />
                          <span
                            className={cn(
                              'font-semibold',
                              classItem.is_full
                                ? 'text-red-700'
                                : classItem.is_nearly_full
                                ? 'text-orange-700'
                                : 'text-green-700'
                            )}
                          >
                            {classItem.booking_count}/{classItem.max_capacity}
                          </span>
                        </div>
                        <Progress
                          value={classItem.utilization_percent}
                          className="h-2 w-24 mt-1"
                          indicatorClassName={
                            classItem.utilization_percent >= 90
                              ? 'bg-red-500'
                              : classItem.utilization_percent >= 70
                              ? 'bg-orange-500'
                              : 'bg-green-500'
                          }
                        />
                      </div>
                      {classItem.is_full && (
                        <Badge variant="destructive" className="ml-2">
                          Full
                        </Badge>
                      )}
                    </div>
                  </div>
                </AccordionTrigger>

                <AccordionContent>
                  <div className="pt-4 pb-2 space-y-2">
                    {classItem.bookings.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        No bookings yet
                      </p>
                    ) : (
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-muted-foreground mb-3">
                          Booked Members ({classItem.bookings.length}):
                        </p>
                        <div className="grid gap-2">
                          {classItem.bookings.map((booking) => (
                            <div
                              key={booking.id}
                              className="flex items-center justify-between p-3 bg-background rounded-md border border-border"
                            >
                              <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                                  <User className="h-5 w-5 text-primary" />
                                </div>
                                <div>
                                  <p className="font-medium text-foreground">
                                    {booking.profiles?.first_name} {booking.profiles?.last_name}
                                  </p>
                                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                    <span className="flex items-center gap-1">
                                      <Mail className="h-3 w-3" />
                                      {booking.profiles?.email}
                                    </span>
                                    {booking.profiles?.phone && (
                                      <span className="flex items-center gap-1">
                                        <Phone className="h-3 w-3" />
                                        {booking.profiles?.phone}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                {getStatusBadge(booking.status)}
                                <span className="text-xs text-muted-foreground">
                                  Booked {format(new Date(booking.created_at), 'MMM dd')}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        )}
      </DialogContent>
    </Dialog>
  );
}
