// Custom hook for fetching and managing booking calendar data

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import { format } from 'date-fns';
import {
  BookingWithDetails,
  DayBookingSummary,
  CalendarStats,
  CalendarFilters,
} from '@/types/calendar';
import {
  createDayBookingSummary,
  calculateCalendarStats,
  getWeekDates,
  getMonthDates,
} from '@/utils/calendarHelpers';
import { useMemo } from 'react';

/**
 * Fetch bookings for a date range
 */
const fetchBookingsByDateRange = async (
  startDate: Date,
  endDate: Date
): Promise<BookingWithDetails[]> => {
  const startDateStr = format(startDate, 'yyyy-MM-dd');
  const endDateStr = format(endDate, 'yyyy-MM-dd');

  const { data, error } = await supabase
    .from('bookings')
    .select(
      `
      id,
      user_id,
      schedule_id,
      class_date,
      status,
      booking_date,
      created_at,
      profiles (
        first_name,
        last_name,
        email,
        phone
      ),
      schedule (
        id,
        day_of_week,
        start_time,
        end_time,
        max_capacity,
        classes (
          id,
          name,
          description
        ),
        instructors (
          id,
          name,
          email
        )
      )
    `
    )
    .gte('class_date', startDateStr)
    .lte('class_date', endDateStr)
    .order('class_date', { ascending: true })
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching bookings:', error);
    throw new Error(error.message);
  }

  // Transform arrays to single objects
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data || []).map((booking: any) => ({
    ...booking,
    profiles: Array.isArray(booking.profiles) ? booking.profiles[0] : booking.profiles,
    schedule: booking.schedule
      ? {
          ...booking.schedule,
          classes: Array.isArray(booking.schedule.classes)
            ? booking.schedule.classes[0]
            : booking.schedule.classes,
          instructors: Array.isArray(booking.schedule.instructors)
            ? booking.schedule.instructors[0]
            : booking.schedule.instructors,
        }
      : undefined,
  }));
};

/**
 * Apply filters to bookings
 */
function applyFilters(
  bookings: BookingWithDetails[],
  filters: CalendarFilters
): BookingWithDetails[] {
  let filtered = bookings;

  // Filter by class IDs
  if (filters.classIds.length > 0) {
    filtered = filtered.filter((booking) => {
      return filters.classIds.includes(booking.schedule?.classes?.id || '');
    });
  }

  // Filter by instructor IDs
  if (filters.instructorIds.length > 0) {
    filtered = filtered.filter((booking) => {
      return filters.instructorIds.includes(booking.schedule?.instructors?.id || '');
    });
  }

  // Filter by status
  if (filters.statuses.length > 0) {
    filtered = filtered.filter((booking) => {
      return filters.statuses.includes(booking.status);
    });
  }

  return filtered;
}

/**
 * Hook for week view calendar data
 */
export function useWeekCalendar(
  currentDate: Date,
  filters: CalendarFilters = {
    classIds: [],
    instructorIds: [],
    statuses: ['confirmed', 'pending'],
  }
) {
  const weekDates = useMemo(() => getWeekDates(currentDate), [currentDate]);
  const startDate = weekDates[0];
  const endDate = weekDates[weekDates.length - 1];

  const {
    data: bookings = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['bookingCalendar', 'week', format(startDate, 'yyyy-MM-dd')],
    queryFn: () => fetchBookingsByDateRange(startDate, endDate),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
  });

  // Apply filters
  const filteredBookings = useMemo(
    () => applyFilters(bookings, filters),
    [bookings, filters]
  );

  // Create day summaries for each day of the week
  const daySummaries = useMemo(
    () => weekDates.map((date) => createDayBookingSummary(date, filteredBookings)),
    [weekDates, filteredBookings]
  );

  // Calculate stats
  const stats = useMemo(() => calculateCalendarStats(daySummaries), [daySummaries]);

  return {
    weekDates,
    daySummaries,
    stats,
    bookings: filteredBookings,
    isLoading,
    error,
    refetch,
  };
}

/**
 * Hook for month view calendar data
 */
export function useMonthCalendar(
  currentDate: Date,
  filters: CalendarFilters = {
    classIds: [],
    instructorIds: [],
    statuses: ['confirmed', 'pending'],
  }
) {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const monthDates = useMemo(() => getMonthDates(year, month), [year, month]);
  const startDate = monthDates[0];
  const endDate = monthDates[monthDates.length - 1];

  const {
    data: bookings = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['bookingCalendar', 'month', `${year}-${month}`],
    queryFn: () => fetchBookingsByDateRange(startDate, endDate),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });

  // Apply filters
  const filteredBookings = useMemo(
    () => applyFilters(bookings, filters),
    [bookings, filters]
  );

  // Create day summaries for each day of the month
  const daySummaries = useMemo(
    () => monthDates.map((date) => createDayBookingSummary(date, filteredBookings)),
    [monthDates, filteredBookings]
  );

  // Calculate stats
  const stats = useMemo(() => calculateCalendarStats(daySummaries), [daySummaries]);

  return {
    monthDates,
    daySummaries,
    stats,
    bookings: filteredBookings,
    isLoading,
    error,
    refetch,
  };
}

/**
 * Hook for custom date range calendar data
 */
export function useCustomRangeCalendar(
  startDate: Date,
  endDate: Date,
  filters: CalendarFilters = {
    classIds: [],
    instructorIds: [],
    statuses: ['confirmed', 'pending'],
  }
) {
  const {
    data: bookings = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: [
      'bookingCalendar',
      'custom',
      format(startDate, 'yyyy-MM-dd'),
      format(endDate, 'yyyy-MM-dd'),
    ],
    queryFn: () => fetchBookingsByDateRange(startDate, endDate),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });

  // Apply filters
  const filteredBookings = useMemo(
    () => applyFilters(bookings, filters),
    [bookings, filters]
  );

  // Calculate stats
  const stats = useMemo(() => {
    const dates = [];
    const current = new Date(startDate);
    while (current <= endDate) {
      dates.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }
    const daySummaries = dates.map((date) =>
      createDayBookingSummary(date, filteredBookings)
    );
    return calculateCalendarStats(daySummaries);
  }, [startDate, endDate, filteredBookings]);

  return {
    bookings: filteredBookings,
    stats,
    isLoading,
    error,
    refetch,
  };
}

/**
 * Hook to fetch available classes and instructors for filters
 */
export function useCalendarFilterOptions() {
  // Fetch classes
  const {
    data: classes = [],
    isLoading: classesLoading,
  } = useQuery({
    queryKey: ['classes', 'all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('classes')
        .select('id, name')
        .order('name', { ascending: true });

      if (error) throw new Error(error.message);
      return data || [];
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
  });

  // Fetch instructors
  const {
    data: instructors = [],
    isLoading: instructorsLoading,
  } = useQuery({
    queryKey: ['instructors', 'active'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('instructors')
        .select('id, name')
        .eq('is_active', true)
        .order('name', { ascending: true });

      if (error) throw new Error(error.message);
      return data || [];
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
  });

  return {
    classes,
    instructors,
    isLoading: classesLoading || instructorsLoading,
  };
}
