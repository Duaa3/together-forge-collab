-- Create role enum
CREATE TYPE public.app_role AS ENUM ('hr', 'candidate');

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Users can view their own roles
CREATE POLICY "Users can view own roles"
ON public.user_roles
FOR SELECT
USING (auth.uid() = user_id);

-- Create security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Update jobs table RLS policies
DROP POLICY IF EXISTS "Users can view jobs" ON public.jobs;
DROP POLICY IF EXISTS "Users can create jobs" ON public.jobs;

CREATE POLICY "Everyone can view jobs"
ON public.jobs
FOR SELECT
USING (true);

CREATE POLICY "HR can create jobs"
ON public.jobs
FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'hr'));

CREATE POLICY "HR can update own jobs"
ON public.jobs
FOR UPDATE
USING (public.has_role(auth.uid(), 'hr') AND auth.uid() = user_id);

CREATE POLICY "HR can delete own jobs"
ON public.jobs
FOR DELETE
USING (public.has_role(auth.uid(), 'hr') AND auth.uid() = user_id);

-- Update candidates table RLS policies
DROP POLICY IF EXISTS "Users can view candidates" ON public.candidates;
DROP POLICY IF EXISTS "Users can create candidates" ON public.candidates;

CREATE POLICY "HR can view all candidates"
ON public.candidates
FOR SELECT
USING (public.has_role(auth.uid(), 'hr'));

CREATE POLICY "Candidates can view own applications"
ON public.candidates
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Candidates can create applications"
ON public.candidates
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "HR can update candidates"
ON public.candidates
FOR UPDATE
USING (public.has_role(auth.uid(), 'hr'));