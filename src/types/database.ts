export type Class = {
  id: number; // Changed from string to number for database primary key
  created_at: string;
  name: string;
  instructor: string;
  time: string; // Keeping as string for simplicity, could be time/timestamptz
  duration: string;
  capacity: string;
  intensity: "Low" | "Medium" | "High";
  description: string;
  color: "primary" | "secondary" | "accent";
  day: "monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday" | "sunday";
};

export type Booking = {
  id: number;
  created_at: string;
  class_id: number; // Foreign key to classes table
  name: string;
  email: string;
  phone: string;
};
