import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import AdminLayout from '@/components/admin/AdminLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { CalendarWeekView } from '@/components/admin/CalendarWeekView';
import { CalendarMonthView } from '@/components/admin/CalendarMonthView';
import { BookingDayDetailModal } from '@/components/admin/BookingDayDetailModal';
import { useWeekCalendar, useMonthCalendar, useCalendarFilterOptions } from '@/hooks/useBookingCalendar';
import { formatDateRange, navigatePrevious, navigateNext } from '@/utils/calendarHelpers';
import { CalendarFilters, DayBookingSummary, ViewMode } from '@/types/calendar';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Users,
  TrendingUp,
  AlertCircle,
  Activity,
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export default function BookingCalendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('week');
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [filters, setFilters] = useState<CalendarFilters>({
    classIds: [],
    instructorIds: [],
    statuses: ['confirmed', 'pending'],
  });

  // Fetch filter options
  const { classes, instructors, isLoading: filtersLoading } = useCalendarFilterOptions();

  // Fetch calendar data based on view mode
  const weekCalendar = useWeekCalendar(currentDate, filters);
  const monthCalendar = useMonthCalendar(currentDate, filters);

  const isLoading = viewMode === 'week' ? weekCalendar.isLoading : monthCalendar.isLoading;
  const error = viewMode === 'week' ? weekCalendar.error : monthCalendar.error;
  const stats = viewMode === 'week' ? weekCalendar.stats : monthCalendar.stats;
  const daySummaries = viewMode === 'week' ? weekCalendar.daySummaries : monthCalendar.daySummaries;

  // Get the selected day summary for modal
  const selectedDaySummary = useMemo(() => {
    if (!selectedDate) return null;
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    return daySummaries.find((summary) => summary.date === dateStr) || null;
  }, [selectedDate, daySummaries]);

  // Navigation handlers
  const handlePrevious = () => {
    setCurrentDate((prev) => navigatePrevious(prev, viewMode === 'month' ? 'month' : 'week'));
  };

  const handleNext = () => {
    setCurrentDate((prev) => navigateNext(prev, viewMode === 'month' ? 'month' : 'week'));
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  const handleDayClick = (date: Date) => {
    setSelectedDate(date);
  };

  // Filter handlers
  const handleClassFilterChange = (value: string) => {
    if (value === 'all') {
      setFilters((prev) => ({ ...prev, classIds: [] }));
    } else {
      setFilters((prev) => ({
        ...prev,
        classIds: prev.classIds.includes(value)
          ? prev.classIds.filter((id) => id !== value)
          : [...prev.classIds, value],
      }));
    }
  };

  const handleInstructorFilterChange = (value: string) => {
    if (value === 'all') {
      setFilters((prev) => ({ ...prev, instructorIds: [] }));
    } else {
      setFilters((prev) => ({
        ...prev,
        instructorIds: prev.instructorIds.includes(value)
          ? prev.instructorIds.filter((id) => id !== value)
          : [...prev.instructorIds, value],
      }));
    }
  };

  const handleClearFilters = () => {
    setFilters({
      classIds: [],
      instructorIds: [],
      statuses: ['confirmed', 'pending'],
    });
  };

  const hasActiveFilters = filters.classIds.length > 0 || filters.instructorIds.length > 0;

  // Date range display
  const dateRangeDisplay = useMemo(() => {
    if (viewMode === 'week') {
      const weekDates = weekCalendar.weekDates;
      return formatDateRange(weekDates[0], weekDates[weekDates.length - 1]);
    } else {
      return format(currentDate, 'MMMM yyyy');
    }
  }, [viewMode, currentDate, weekCalendar.weekDates]);

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Booking Calendar</h1>
            <p className="text-muted-foreground">
              Visualize bookings and capacity across dates
            </p>
          </div>

          {/* View selector */}
          <div className="flex items-center gap-2">
            <Select
              value={viewMode}
              onValueChange={(value) => setViewMode(value as ViewMode)}
            >
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="week">Week View</SelectItem>
                <SelectItem value="month">Month View</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Date navigation */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handlePrevious}
                  disabled={isLoading}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  onClick={handleToday}
                  disabled={isLoading}
                  className="min-w-[80px]"
                >
                  Today
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleNext}
                  disabled={isLoading}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>

              <div className="text-center">
                <p className="text-lg font-semibold text-foreground">{dateRangeDisplay}</p>
              </div>

              {/* Filters */}
              <div className="flex items-center gap-2">
                <Select
                  value={filters.classIds.length > 0 ? filters.classIds[0] : 'all'}
                  onValueChange={handleClassFilterChange}
                  disabled={filtersLoading}
                >
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="All Classes" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Classes</SelectItem>
                    {classes.map((cls) => (
                      <SelectItem key={cls.id} value={cls.id}>
                        {cls.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select
                  value={filters.instructorIds.length > 0 ? filters.instructorIds[0] : 'all'}
                  onValueChange={handleInstructorFilterChange}
                  disabled={filtersLoading}
                >
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="All Instructors" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Instructors</SelectItem>
                    {instructors.map((instructor) => (
                      <SelectItem key={instructor.id} value={instructor.id}>
                        {instructor.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {hasActiveFilters && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleClearFilters}
                    className="text-xs"
                  >
                    Clear
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Error state */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error Loading Calendar</AlertTitle>
            <AlertDescription>
              {error instanceof Error ? error.message : 'Failed to load booking data'}
            </AlertDescription>
          </Alert>
        )}

        {/* Stats */}
        {!isLoading && stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Bookings
                </CardTitle>
                <CalendarIcon className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">{stats.total_bookings}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Avg Utilization
                </CardTitle>
                <Activity className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">{stats.avg_utilization}%</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Full Classes
                </CardTitle>
                <AlertCircle className="h-4 w-4 text-red-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">{stats.full_classes}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Available Spots
                </CardTitle>
                <Users className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">{stats.available_spots}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Busiest Day
                </CardTitle>
                <TrendingUp className="h-4 w-4 text-orange-600" />
              </CardHeader>
              <CardContent>
                <div className="text-sm font-bold text-foreground truncate">
                  {stats.busiest_day || 'N/A'}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Calendar view */}
        {viewMode === 'week' ? (
          <CalendarWeekView
            weekDates={weekCalendar.weekDates}
            daySummaries={weekCalendar.daySummaries}
            onDayClick={handleDayClick}
            isLoading={isLoading}
          />
        ) : (
          <CalendarMonthView
            currentDate={currentDate}
            monthDates={monthCalendar.monthDates}
            daySummaries={monthCalendar.daySummaries}
            onDayClick={handleDayClick}
            isLoading={isLoading}
          />
        )}

        {/* Day detail modal */}
        <BookingDayDetailModal
          date={selectedDate}
          summary={selectedDaySummary}
          open={selectedDate !== null}
          onOpenChange={(open) => !open && setSelectedDate(null)}
        />
      </div>
    </AdminLayout>
  );
}
