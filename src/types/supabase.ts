// src/types/supabase.ts

// This type represents the combined data from the 'schedule' and 'classes' tables.
// It's what our component will use after fetching and joining the data.
export interface ScheduledClass {
  id: string; // schedule id
  day_of_week: string;
  start_time: string;
  end_time: string;
  max_capacity: number;
  classes: {
    id: string; // class id
    name: string;
    description: string | null;
    instructor: string | null;
    image_url: string | null;
  } | null;
}
