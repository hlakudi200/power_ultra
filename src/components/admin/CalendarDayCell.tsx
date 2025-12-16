// Calendar day cell component - shows summary of bookings for a single day

import { format } from 'date-fns';
import { DayBookingSummary } from '@/types/calendar';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Users, Calendar as CalendarIcon } from 'lucide-react';
import { getUtilizationColor, checkIsToday } from '@/utils/calendarHelpers';
import { cn } from '@/lib/utils';

interface CalendarDayCellProps {
  date: Date;
  summary: DayBookingSummary;
  onClick: (date: Date) => void;
  compact?: boolean;
}

export function CalendarDayCell({
  date,
  summary,
  onClick,
  compact = false,
}: CalendarDayCellProps) {
  const isToday = checkIsToday(date);
  const utilizationColors = getUtilizationColor(summary.utilization_percent);

  // Limit classes shown in non-compact view
  const displayedClasses = compact ? [] : summary.classes.slice(0, 4);
  const hiddenCount = summary.classes.length - displayedClasses.length;

  if (compact) {
    // Compact view for month calendar
    return (
      <div
        onClick={() => onClick(date)}
        className={cn(
          'min-h-[80px] p-2 border rounded-lg cursor-pointer transition-all hover:shadow-md hover:scale-[1.02]',
          isToday
            ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
            : 'border-border bg-card',
          summary.total_classes === 0 && 'opacity-60'
        )}
      >
        <div className="flex justify-between items-start mb-1">
          <span
            className={cn(
              'text-sm font-medium',
              isToday ? 'text-primary' : 'text-foreground'
            )}
          >
            {format(date, 'd')}
          </span>
          {isToday && (
            <Badge variant="default" className="text-xs h-5 px-1.5">
              Today
            </Badge>
          )}
        </div>

        {summary.total_classes > 0 ? (
          <div className="space-y-1.5">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <CalendarIcon className="h-3 w-3" />
              <span>{summary.total_classes} classes</span>
            </div>

            <div className="flex items-center gap-1">
              <div
                className={cn(
                  'h-1.5 flex-1 rounded-full',
                  summary.utilization_percent >= 90
                    ? 'bg-red-500'
                    : summary.utilization_percent >= 70
                    ? 'bg-orange-500'
                    : 'bg-green-500'
                )}
                style={{ width: `${Math.min(summary.utilization_percent, 100)}%` }}
              />
            </div>

            <div className="text-xs text-center font-medium">
              {summary.utilization_percent}%
            </div>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground text-center mt-2">No classes</p>
        )}
      </div>
    );
  }

  // Full view for week calendar
  return (
    <Card
      onClick={() => onClick(date)}
      className={cn(
        'cursor-pointer transition-all hover:shadow-lg hover:scale-[1.01]',
        isToday && 'ring-2 ring-primary border-primary',
        summary.total_classes === 0 && 'opacity-70'
      )}
    >
      <CardHeader className="pb-3">
        <div className="flex justify-between items-center">
          <div>
            <h3
              className={cn(
                'text-lg font-bold',
                isToday ? 'text-primary' : 'text-foreground'
              )}
            >
              {format(date, 'EEE')}
            </h3>
            <p className="text-2xl font-bold text-muted-foreground">
              {format(date, 'd')}
            </p>
          </div>

          {isToday && (
            <Badge variant="default">Today</Badge>
          )}
        </div>

        {summary.total_classes > 0 && (
          <div className="space-y-2 mt-3">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-1 text-muted-foreground">
                <CalendarIcon className="h-4 w-4" />
                <span>{summary.total_classes} classes</span>
              </div>
              <div className={cn('font-semibold', utilizationColors.text)}>
                {summary.utilization_percent}%
              </div>
            </div>

            <Progress
              value={summary.utilization_percent}
              className="h-2"
              indicatorClassName={
                summary.utilization_percent >= 90
                  ? 'bg-red-500'
                  : summary.utilization_percent >= 70
                  ? 'bg-orange-500'
                  : 'bg-green-500'
              }
            />

            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <Users className="h-3 w-3" />
                <span>
                  {summary.confirmed_bookings + summary.pending_bookings}/{summary.total_capacity}
                </span>
              </div>
              <div>
                {summary.total_capacity -
                  (summary.confirmed_bookings + summary.pending_bookings)}{' '}
                spots left
              </div>
            </div>
          </div>
        )}
      </CardHeader>

      <CardContent className="pt-0">
        {summary.total_classes === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No classes scheduled
          </p>
        ) : (
          <div className="space-y-2">
            {displayedClasses.map((classItem) => (
              <div
                key={classItem.schedule_id}
                className={cn(
                  'p-2 rounded-md border text-sm',
                  classItem.is_full
                    ? 'bg-red-50 border-red-200'
                    : classItem.is_nearly_full
                    ? 'bg-orange-50 border-orange-200'
                    : 'bg-green-50 border-green-200'
                )}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground truncate">
                      {classItem.class_name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {classItem.start_time}
                      {classItem.instructor_name && ` • ${classItem.instructor_name}`}
                    </p>
                  </div>
                  <div className="flex flex-col items-end ml-2">
                    <span
                      className={cn(
                        'text-xs font-semibold whitespace-nowrap',
                        classItem.is_full
                          ? 'text-red-700'
                          : classItem.is_nearly_full
                          ? 'text-orange-700'
                          : 'text-green-700'
                      )}
                    >
                      {classItem.booking_count}/{classItem.max_capacity}
                    </span>
                    {classItem.is_full && (
                      <Badge variant="destructive" className="text-xs h-5 mt-1">
                        Full
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {hiddenCount > 0 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onClick(date);
                }}
                className="w-full text-xs text-primary hover:text-primary/80 font-medium py-1 text-center"
              >
                View all {summary.total_classes} classes →
              </button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
