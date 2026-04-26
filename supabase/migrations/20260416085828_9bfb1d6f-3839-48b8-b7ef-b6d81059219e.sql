
-- 1. Create role enum and user_roles table
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Only admins can view roles
CREATE POLICY "Admins can view all roles" ON public.user_roles
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
  ));

-- Users can see their own roles
CREATE POLICY "Users can view own roles" ON public.user_roles
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- 2. Create security definer function
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- 3. Fix available_time_slots policies
DROP POLICY IF EXISTS "Authenticated users can delete time slots" ON public.available_time_slots;
DROP POLICY IF EXISTS "Authenticated users can insert time slots" ON public.available_time_slots;
DROP POLICY IF EXISTS "Authenticated users can update time slots" ON public.available_time_slots;

CREATE POLICY "Admins can insert time slots" ON public.available_time_slots
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update time slots" ON public.available_time_slots
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete time slots" ON public.available_time_slots
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 4. Fix intake_requests policies
DROP POLICY IF EXISTS "Authenticated users can view intakes" ON public.intake_requests;
DROP POLICY IF EXISTS "Authenticated users can update intakes" ON public.intake_requests;

CREATE POLICY "Admins can view intakes" ON public.intake_requests
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update intakes" ON public.intake_requests
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 5. Fix pt_bookings policies
DROP POLICY IF EXISTS "Authenticated users can view PT bookings" ON public.pt_bookings;
DROP POLICY IF EXISTS "Authenticated users can update PT bookings" ON public.pt_bookings;

CREATE POLICY "Admins can view PT bookings" ON public.pt_bookings
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update PT bookings" ON public.pt_bookings
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
