
-- Create available time slots table for admin to manage
CREATE TABLE public.available_time_slots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  label TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.available_time_slots ENABLE ROW LEVEL SECURITY;

-- Everyone can view active slots
CREATE POLICY "Anyone can view active time slots"
ON public.available_time_slots
FOR SELECT
USING (true);

-- Only authenticated users (admin) can manage slots
CREATE POLICY "Authenticated users can insert time slots"
ON public.available_time_slots
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update time slots"
ON public.available_time_slots
FOR UPDATE
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can delete time slots"
ON public.available_time_slots
FOR DELETE
TO authenticated
USING (true);

-- Add trigger for updated_at
CREATE TRIGGER update_available_time_slots_updated_at
BEFORE UPDATE ON public.available_time_slots
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add selected time slot to intake_requests
ALTER TABLE public.intake_requests
ADD COLUMN selected_time_slot TEXT;
