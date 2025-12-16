// Calendar month view component - displays entire month in grid format

import { format, startOfMonth, getDay } from 'date-fns';
import { DayBookingSummary } from '@/types/calendar';
import { CalendarDayCell } from './CalendarDayCell';
import { Skeleton } from '@/components/ui/skeleton';

interface CalendarMonthViewProps {
  currentDate: Date;
  monthDates: Date[];
  daySummaries: DayBookingSummary[];
  onDayClick: (date: Date) => void;
  isLoading?: boolean;
}

export function CalendarMonthView({
  currentDate,
  monthDates,
  daySummaries,
  onDayClick,
  isLoading = false,
}: CalendarMonthViewProps) {
  // Get the day of week for the first day of the month (0 = Sunday, 1 = Monday, etc.)
  const firstDayOfMonth = startOfMonth(currentDate);
  const startDayOfWeek = getDay(firstDayOfMonth);

  // Adjust for Monday as first day of week (1 = Monday in our calendar)
  const emptyDays = startDayOfWeek === 0 ? 6 : startDayOfWeek - 1;

  const daysOfWeek = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-7 gap-2">
          {daysOfWeek.map((day) => (
            <div
              key={day}
              className="text-center text-sm font-medium text-muted-foreground py-2"
            >
              {day}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-2">
          {Array.from({ length: 35 }).map((_, index) => (
            <Skeleton key={index} className="h-[80px] rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Month header */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-foreground">
          {format(currentDate, 'MMMM yyyy')}
        </h2>
      </div>

      {/* Days of week header */}
      <div className="grid grid-cols-7 gap-2">
        {daysOfWeek.map((day) => (
          <div
            key={day}
            className="text-center text-sm font-semibold text-muted-foreground py-2 bg-muted/50 rounded-md"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-2">
        {/* Empty cells for days before month starts */}
        {Array.from({ length: emptyDays }).map((_, index) => (
          <div key={`empty-${index}`} className="h-[80px]" />
        ))}

        {/* Actual month days */}
        {monthDates.map((date, index) => {
          const summary = daySummaries[index];
          return (
            <CalendarDayCell
              key={date.toISOString()}
              date={date}
              summary={summary}
              onClick={onDayClick}
              compact={true}
            />
          );
        })}
      </div>
    </div>
  );
}
