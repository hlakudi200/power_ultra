-- update_prices.sql
-- This script updates the prices of membership plans to South African Rand (ZAR) values.

UPDATE public.memberships
SET price = 499.00
WHERE name = 'Basic';

UPDATE public.memberships
SET price = 899.00
WHERE name = 'Pro';

UPDATE public.memberships
SET price = 1499.00
WHERE name = 'Elite';
