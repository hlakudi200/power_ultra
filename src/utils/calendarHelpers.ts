// Calendar helper utilities for date calculations and formatting

import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, eachDayOfInterval, format, addDays, subDays, isSameDay, isToday } from 'date-fns';
import { BookingWithDetails, DayBookingSummary, ClassWithBookings, CalendarStats } from '@/types/calendar';

/**
 * Get array of dates for a week (Monday to Sunday)
 */
export function getWeekDates(date: Date): Date[] {
  const start = startOfWeek(date, { weekStartsOn: 1 }); // Monday
  const end = endOfWeek(date, { weekStartsOn: 1 }); // Sunday
  return eachDayOfInterval({ start, end });
}

/**
 * Get array of all dates in a month
 */
export function getMonthDates(year: number, month: number): Date[] {
  const date = new Date(year, month, 1);
  const start = startOfMonth(date);
  const end = endOfMonth(date);
  return eachDayOfInterval({ start, end });
}

/**
 * Get start and end dates for week view
 */
export function getWeekRange(date: Date): { startDate: Date; endDate: Date } {
  const startDate = startOfWeek(date, { weekStartsOn: 1 });
  const endDate = endOfWeek(date, { weekStartsOn: 1 });
  return { startDate, endDate };
}

/**
 * Get start and end dates for month view
 */
export function getMonthRange(date: Date): { startDate: Date; endDate: Date } {
  const startDate = startOfMonth(date);
  const endDate = endOfMonth(date);
  return { startDate, endDate };
}

/**
 * Format date range for display
 */
export function formatDateRange(startDate: Date, endDate: Date): string {
  const start = format(startDate, 'MMM dd');
  const end = format(endDate, 'MMM dd, yyyy');
  return `${start} - ${end}`;
}

/**
 * Calculate capacity utilization percentage
 */
export function calculateUtilization(bookingCount: number, maxCapacity: number): number {
  if (maxCapacity === 0) return 0;
  return Math.round((bookingCount / maxCapacity) * 100);
}

/**
 * Get utilization color class based on percentage
 */
export function getUtilizationColor(utilizationPercent: number): {
  bg: string;
  text: string;
  border: string;
} {
  if (utilizationPercent >= 90) {
    return {
      bg: 'bg-red-100',
      text: 'text-red-800',
      border: 'border-red-300',
    };
  } else if (utilizationPercent >= 70) {
    return {
      bg: 'bg-orange-100',
      text: 'text-orange-800',
      border: 'border-orange-300',
    };
  } else {
    return {
      bg: 'bg-green-100',
      text: 'text-green-800',
      border: 'border-green-300',
    };
  }
}

/**
 * Group bookings by date
 */
export function groupBookingsByDate(bookings: BookingWithDetails[]): Map<string, BookingWithDetails[]> {
  const grouped = new Map<string, BookingWithDetails[]>();

  bookings.forEach((booking) => {
    const date = booking.class_date;
    if (!grouped.has(date)) {
      grouped.set(date, []);
    }
    grouped.get(date)!.push(booking);
  });

  return grouped;
}

/**
 * Group bookings by schedule (class) for a specific date
 */
export function groupBookingsBySchedule(bookings: BookingWithDetails[]): ClassWithBookings[] {
  const scheduleMap = new Map<string, ClassWithBookings>();

  bookings.forEach((booking) => {
    if (!booking.schedule) return;

    const scheduleId = booking.schedule_id;

    if (!scheduleMap.has(scheduleId)) {
      const activeBookings = bookings.filter(
        (b) => b.schedule_id === scheduleId && (b.status === 'confirmed' || b.status === 'pending')
      );
      const bookingCount = activeBookings.length;
      const maxCapacity = booking.schedule.max_capacity || 20;
      const utilizationPercent = calculateUtilization(bookingCount, maxCapacity);

      scheduleMap.set(scheduleId, {
        schedule_id: scheduleId,
        class_name: booking.schedule.classes?.name || 'Unknown',
        class_date: booking.class_date,
        day_of_week: booking.schedule.day_of_week,
        start_time: booking.schedule.start_time,
        end_time: booking.schedule.end_time,
        max_capacity: maxCapacity,
        instructor_name: booking.schedule.instructors?.name,
        bookings: bookings.filter((b) => b.schedule_id === scheduleId),
        booking_count: bookingCount,
        utilization_percent: utilizationPercent,
        is_full: bookingCount >= maxCapacity,
        is_nearly_full: utilizationPercent >= 80 && bookingCount < maxCapacity,
      });
    }
  });

  // Sort by start time
  return Array.from(scheduleMap.values()).sort((a, b) => {
    return a.start_time.localeCompare(b.start_time);
  });
}

/**
 * Create day booking summary for a specific date
 */
export function createDayBookingSummary(date: Date, bookings: BookingWithDetails[]): DayBookingSummary {
  const dateStr = format(date, 'yyyy-MM-dd');
  const dayBookings = bookings.filter((b) => b.class_date === dateStr);

  const classes = groupBookingsBySchedule(dayBookings);

  const totalBookings = dayBookings.length;
  const confirmedBookings = dayBookings.filter((b) => b.status === 'confirmed').length;
  const pendingBookings = dayBookings.filter((b) => b.status === 'pending').length;
  const cancelledBookings = dayBookings.filter((b) => b.status === 'cancelled').length;

  const totalCapacity = classes.reduce((sum, cls) => sum + cls.max_capacity, 0);
  const activeBookings = classes.reduce((sum, cls) => sum + cls.booking_count, 0);
  const utilizationPercent = calculateUtilization(activeBookings, totalCapacity);

  return {
    date: dateStr,
    total_classes: classes.length,
    total_bookings: totalBookings,
    confirmed_bookings: confirmedBookings,
    pending_bookings: pendingBookings,
    cancelled_bookings: cancelledBookings,
    total_capacity: totalCapacity,
    utilization_percent: utilizationPercent,
    classes,
  };
}

/**
 * Calculate overall calendar statistics
 */
export function calculateCalendarStats(
  daySummaries: DayBookingSummary[]
): CalendarStats {
  const totalBookings = daySummaries.reduce((sum, day) => sum + day.total_bookings, 0);
  const totalCapacity = daySummaries.reduce((sum, day) => sum + day.total_capacity, 0);
  const avgUtilization = totalCapacity > 0 ? calculateUtilization(totalBookings, totalCapacity) : 0;

  let fullClasses = 0;
  let availableSpots = 0;
  const classCountMap = new Map<string, number>();

  daySummaries.forEach((day) => {
    day.classes.forEach((cls) => {
      if (cls.is_full) fullClasses++;
      availableSpots += (cls.max_capacity - cls.booking_count);

      // Track most popular class
      const count = classCountMap.get(cls.class_name) || 0;
      classCountMap.set(cls.class_name, count + cls.booking_count);
    });
  });

  // Find busiest day
  const busiestDay = daySummaries.reduce((max, day) => {
    return day.total_bookings > max.total_bookings ? day : max;
  }, daySummaries[0]);

  // Find most popular class
  let mostPopularClass = '';
  let maxBookings = 0;
  classCountMap.forEach((count, className) => {
    if (count > maxBookings) {
      maxBookings = count;
      mostPopularClass = className;
    }
  });

  return {
    total_bookings: totalBookings,
    total_capacity: totalCapacity,
    avg_utilization: avgUtilization,
    full_classes: fullClasses,
    available_spots: availableSpots,
    busiest_day: busiestDay ? format(new Date(busiestDay.date), 'EEEE, MMM dd') : undefined,
    most_popular_class: mostPopularClass || undefined,
  };
}

/**
 * Navigate to previous period (week or month)
 */
export function navigatePrevious(currentDate: Date, viewMode: 'week' | 'month'): Date {
  if (viewMode === 'week') {
    return subDays(currentDate, 7);
  } else {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() - 1);
    return newDate;
  }
}

/**
 * Navigate to next period (week or month)
 */
export function navigateNext(currentDate: Date, viewMode: 'week' | 'month'): Date {
  if (viewMode === 'week') {
    return addDays(currentDate, 7);
  } else {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() + 1);
    return newDate;
  }
}

/**
 * Check if a date is within a range
 */
export function isDateInRange(date: Date, startDate: Date, endDate: Date): boolean {
  return date >= startDate && date <= endDate;
}

/**
 * Get day abbreviation
 */
export function getDayAbbr(date: Date): string {
  return format(date, 'EEE');
}

/**
 * Get day number
 */
export function getDayNumber(date: Date): string {
  return format(date, 'd');
}

/**
 * Check if date is today
 */
export function checkIsToday(date: Date): boolean {
  return isToday(date);
}
