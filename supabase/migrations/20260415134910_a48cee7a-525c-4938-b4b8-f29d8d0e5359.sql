-- Add columns to available_time_slots
ALTER TABLE public.available_time_slots ADD COLUMN specific_date date;
ALTER TABLE public.available_time_slots ADD COLUMN slot_type text NOT NULL DEFAULT 'intake';
ALTER TABLE public.available_time_slots ADD COLUMN notes text;

-- Create pt_bookings table
CREATE TABLE public.pt_bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  naam text NOT NULL,
  email text NOT NULL,
  telefoon text NOT NULL,
  selected_date date NOT NULL,
  selected_time_slot text NOT NULL,
  bericht text,
  status text NOT NULL DEFAULT 'nieuw',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.pt_bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit a PT booking"
ON public.pt_bookings FOR INSERT
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can view PT bookings"
ON public.pt_bookings FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can update PT bookings"
ON public.pt_bookings FOR UPDATE
TO authenticated
USING (true);