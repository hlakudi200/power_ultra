-- seed.sql
-- This script populates the database with sample data for the Power Ultra Gym application.
-- It fills the `memberships`, `classes`, and `schedule` tables.

-- 1. POPULATE `memberships` TABLE
-- Inserts three different membership plans.

INSERT INTO public.memberships (name, price, duration_months, features)
VALUES
  ('Basic', 29.00, 1, '{"Access to gym floor", "Cardio equipment", "Locker room access", "Mobile app access"}'),
  ('Pro', 59.00, 1, '{"Everything in Basic", "All group classes", "Free guest passes (2/month)", "Nutrition consultation", "Sauna & steam room"}'),
  ('Elite', 99.00, 1, '{"Everything in Pro", "Personal training (4 sessions/month)", "Priority class booking", "Massage therapy (2/month)", "VIP lounge access", "Meal planning service"}');

-- 2. POPULATE `classes` AND `schedule` TABLES
-- This section uses Common Table Expressions (CTEs) to first insert the classes
-- and then use their generated IDs to create the weekly schedule.

WITH inserted_classes AS (
  INSERT INTO public.classes (name, description, instructor)
  VALUES
    ('HIIT Power', 'High-intensity interval training to maximize fat burn and build endurance.', 'Thabo Mbeki'),
    ('Strength & Conditioning', 'Build muscle and strength with compound movements and progressive overload.', 'Sarah van der Merwe'),
    ('Yoga Flow', 'Relaxing yoga session focused on flexibility, balance, and mindfulness.', 'Lerato Dlamini'),
    ('Boxing Bootcamp', 'Explosive boxing combinations mixed with conditioning exercises.', 'Marcus Johnson'),
    ('Spin & Burn', 'Indoor cycling class set to energizing music for cardio endurance.', 'Nomsa Khumalo'),
    ('Core Strength', 'Targeted core exercises to build a strong, stable foundation.', 'Pieter Botha'),
    ('CrossFit Challenge', 'Functional fitness combining weightlifting, cardio, and gymnastics.', 'Thabo Mbeki'),
    ('Pilates', 'Low-impact exercises to improve posture, flexibility, and muscle tone.', 'Lerato Dlamini'),
    ('Circuit Training', 'Rotating stations of strength and cardio exercises for a total body workout.', 'Sarah van der Merwe'),
    ('Kickboxing', 'High-energy martial arts workout combining kicks, punches, and cardio.', 'Marcus Johnson'),
    ('Zumba Dance', 'Dance fitness party with Latin and international music rhythms.', 'Nomsa Khumalo'),
    ('Saturday Bootcamp', 'Ultimate weekend warrior workout combining all fitness elements.', 'Marcus Johnson'),
    ('Open Gym', 'Free access to all gym equipment with trainers available for guidance.', 'All Trainers')
  RETURNING id, name
)
INSERT INTO public.schedule (class_id, day_of_week, start_time, end_time, max_capacity)
SELECT
  ic.id,
  s.day_of_week,
  s.start_time::time,
  s.end_time::time,
  s.max_capacity
FROM (
  VALUES
    ('HIIT Power', 'Monday', '06:00', '06:45', 20),
    ('Strength & Conditioning', 'Monday', '09:00', '10:00', 15),
    ('Yoga Flow', 'Monday', '18:30', '19:30', 25),
    ('Boxing Bootcamp', 'Tuesday', '06:00', '06:50', 18),
    ('Spin & Burn', 'Tuesday', '12:00', '12:45', 30),
    ('Core Strength', 'Tuesday', '17:30', '18:00', 20),
    ('CrossFit Challenge', 'Wednesday', '06:00', '07:00', 15),
    ('Pilates', 'Wednesday', '10:00', '10:55', 20),
    ('Circuit Training', 'Wednesday', '18:00', '18:50', 25),
    ('Kickboxing', 'Thursday', '07:00', '07:45', 20),
    ('Strength & Conditioning', 'Thursday', '12:30', '13:30', 15),
    ('Zumba Dance', 'Thursday', '18:30', '19:20', 30),
    ('HIIT Power', 'Friday', '06:00', '06:45', 20),
    ('Yoga Flow', 'Friday', '17:00', '17:45', 25),
    ('Saturday Bootcamp', 'Saturday', '08:00', '09:00', 25),
    ('Pilates', 'Saturday', '10:00', '11:15', 30),
    ('Open Gym', 'Sunday', '09:00', '11:00', 50)
) AS s(class_name, day_of_week, start_time, end_time, max_capacity)
JOIN inserted_classes ic ON ic.name = s.class_name;
