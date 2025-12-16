// Calendar-specific types for booking calendar view

export interface BookingWithDetails {
  id: string;
  user_id: string;
  schedule_id: string;
  class_date: string;
  status: 'confirmed' | 'pending' | 'cancelled' | 'completed';
  booking_date: string;
  created_at: string;
  profiles?: {
    first_name: string;
    last_name: string;
    email: string;
    phone?: string;
  };
  schedule?: {
    id: string;
    day_of_week: string;
    start_time: string;
    end_time?: string;
    max_capacity: number;
    classes?: {
      id: string;
      name: string;
      description?: string;
    };
    instructors?: {
      id: string;
      name: string;
      email?: string;
    };
  };
}

export interface ClassWithBookings {
  schedule_id: string;
  class_name: string;
  class_date: string;
  day_of_week: string;
  start_time: string;
  end_time?: string;
  max_capacity: number;
  instructor_name?: string;
  bookings: BookingWithDetails[];
  booking_count: number;
  utilization_percent: number;
  is_full: boolean;
  is_nearly_full: boolean;
}

export interface DayBookingSummary {
  date: string;
  total_classes: number;
  total_bookings: number;
  confirmed_bookings: number;
  pending_bookings: number;
  cancelled_bookings: number;
  total_capacity: number;
  utilization_percent: number;
  classes: ClassWithBookings[];
}

export interface CalendarStats {
  total_bookings: number;
  total_capacity: number;
  avg_utilization: number;
  full_classes: number;
  available_spots: number;
  busiest_day?: string;
  most_popular_class?: string;
}

export interface CalendarFilters {
  classIds: string[];
  instructorIds: string[];
  statuses: ('confirmed' | 'pending' | 'cancelled' | 'completed')[];
  minUtilization?: number;
  maxUtilization?: number;
}

export type ViewMode = 'week' | 'month' | 'custom';

export interface DateRange {
  startDate: Date;
  endDate: Date;
}
