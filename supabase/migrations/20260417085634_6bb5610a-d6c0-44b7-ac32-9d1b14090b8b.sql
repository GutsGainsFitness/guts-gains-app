
-- 1. Add 'client' to app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'client';

-- 2. PROFILES table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  naam TEXT,
  email TEXT,
  telefoon TEXT,
  geboortedatum DATE,
  doel TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all profiles" ON public.profiles
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update all profiles" ON public.profiles
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete profiles" ON public.profiles
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. CLIENT_PACKAGES table
CREATE TYPE public.package_type AS ENUM ('maandkaart', 'rittenkaart');
CREATE TYPE public.package_status AS ENUM ('actief', 'verlopen', 'gepauzeerd');

CREATE TABLE public.client_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  package_type public.package_type NOT NULL,
  package_name TEXT NOT NULL,
  -- For maandkaart: sessions allowed per week
  sessions_per_week INTEGER,
  -- For rittenkaart: total + used
  total_sessions INTEGER,
  used_sessions INTEGER NOT NULL DEFAULT 0,
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE,
  status public.package_status NOT NULL DEFAULT 'actief',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_client_packages_user ON public.client_packages(user_id);
CREATE INDEX idx_client_packages_status ON public.client_packages(status);

ALTER TABLE public.client_packages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clients view own packages" ON public.client_packages
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins view all packages" ON public.client_packages
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins insert packages" ON public.client_packages
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update packages" ON public.client_packages
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins delete packages" ON public.client_packages
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_client_packages_updated_at
  BEFORE UPDATE ON public.client_packages
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4. PT_SESSIONS table
CREATE TYPE public.session_status AS ENUM ('gepland', 'voltooid', 'no_show', 'geannuleerd');
CREATE TYPE public.session_type AS ENUM ('pt_sessie', 'lichaamsmeting', 'small_group');

CREATE TABLE public.pt_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  package_id UUID REFERENCES public.client_packages(id) ON DELETE SET NULL,
  session_type public.session_type NOT NULL DEFAULT 'pt_sessie',
  session_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME,
  status public.session_status NOT NULL DEFAULT 'gepland',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_pt_sessions_user_date ON public.pt_sessions(user_id, session_date);
CREATE INDEX idx_pt_sessions_status ON public.pt_sessions(status);

ALTER TABLE public.pt_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clients view own sessions" ON public.pt_sessions
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Clients insert own sessions" ON public.pt_sessions
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Clients cancel own future sessions" ON public.pt_sessions
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id AND status = 'gepland' AND session_date >= CURRENT_DATE);
CREATE POLICY "Admins view all sessions" ON public.pt_sessions
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins insert sessions" ON public.pt_sessions
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update sessions" ON public.pt_sessions
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins delete sessions" ON public.pt_sessions
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_pt_sessions_updated_at
  BEFORE UPDATE ON public.pt_sessions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5. BODY_MEASUREMENTS table
CREATE TABLE public.body_measurements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  measurement_date DATE NOT NULL DEFAULT CURRENT_DATE,
  weight_kg NUMERIC(5,2),
  body_fat_pct NUMERIC(4,2),
  muscle_mass_kg NUMERIC(5,2),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_body_measurements_user_date ON public.body_measurements(user_id, measurement_date DESC);

ALTER TABLE public.body_measurements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clients view own measurements" ON public.body_measurements
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Clients insert own measurements" ON public.body_measurements
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Clients update own measurements" ON public.body_measurements
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Clients delete own measurements" ON public.body_measurements
  FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins view all measurements" ON public.body_measurements
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins insert measurements" ON public.body_measurements
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update measurements" ON public.body_measurements
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins delete measurements" ON public.body_measurements
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_body_measurements_updated_at
  BEFORE UPDATE ON public.body_measurements
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 6. PROGRESS_PHOTOS table
CREATE TYPE public.photo_type AS ENUM ('front', 'side', 'back');

CREATE TABLE public.progress_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  photo_date DATE NOT NULL DEFAULT CURRENT_DATE,
  photo_type public.photo_type NOT NULL,
  storage_path TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_progress_photos_user_date ON public.progress_photos(user_id, photo_date DESC);

ALTER TABLE public.progress_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clients view own photos" ON public.progress_photos
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Clients insert own photos" ON public.progress_photos
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Clients delete own photos" ON public.progress_photos
  FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins view all photos" ON public.progress_photos
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- 7. STORAGE bucket for progress photos (private)
INSERT INTO storage.buckets (id, name, public)
VALUES ('progress-photos', 'progress-photos', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Clients view own progress photos"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'progress-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Clients upload own progress photos"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'progress-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Clients delete own progress photos"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'progress-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Admins view all progress photos"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'progress-photos' AND public.has_role(auth.uid(), 'admin'));

-- 8. Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, naam)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'naam', NEW.raw_user_meta_data->>'full_name', '')
  )
  ON CONFLICT (user_id) DO NOTHING;

  -- Default role: client
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'client')
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
