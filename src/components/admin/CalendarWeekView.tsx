// Calendar week view component - displays 7 days in a row

import { DayBookingSummary } from '@/types/calendar';
import { CalendarDayCell } from './CalendarDayCell';
import { Skeleton } from '@/components/ui/skeleton';

interface CalendarWeekViewProps {
  weekDates: Date[];
  daySummaries: DayBookingSummary[];
  onDayClick: (date: Date) => void;
  isLoading?: boolean;
}

export function CalendarWeekView({
  weekDates,
  daySummaries,
  onDayClick,
  isLoading = false,
}: CalendarWeekViewProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-7 gap-4">
        {Array.from({ length: 7 }).map((_, index) => (
          <Skeleton key={index} className="h-[300px] rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-7 gap-4">
      {weekDates.map((date, index) => {
        const summary = daySummaries[index];
        return (
          <CalendarDayCell
            key={date.toISOString()}
            date={date}
            summary={summary}
            onClick={onDayClick}
            compact={false}
          />
        );
      })}
    </div>
  );
}
