-- Create candidate_embeddings table for semantic skill matching
CREATE TABLE IF NOT EXISTS public.candidate_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID NOT NULL REFERENCES public.candidates(id) ON DELETE CASCADE,
  skill_embeddings JSONB NOT NULL,
  cv_embedding JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(candidate_id)
);

-- Create ml_scores table for detailed scoring breakdown
CREATE TABLE IF NOT EXISTS public.ml_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID NOT NULL REFERENCES public.candidates(id) ON DELETE CASCADE,
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  technical_fit_score DECIMAL(5,2) NOT NULL,
  experience_match_score DECIMAL(5,2) NOT NULL,
  growth_potential_score DECIMAL(5,2) NOT NULL,
  cultural_fit_score DECIMAL(5,2) NOT NULL,
  overall_score DECIMAL(5,2) NOT NULL,
  confidence_interval JSONB,
  feature_importance JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(candidate_id, job_id)
);

-- Create feedback_data table for continuous learning
CREATE TABLE IF NOT EXISTS public.feedback_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID NOT NULL REFERENCES public.candidates(id) ON DELETE CASCADE,
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  hired BOOLEAN,
  performance_rating DECIMAL(3,2),
  feedback_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create market_intelligence table for benchmarking
CREATE TABLE IF NOT EXISTS public.market_intelligence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  skill_name TEXT NOT NULL,
  demand_score DECIMAL(5,2),
  supply_score DECIMAL(5,2),
  trend_direction TEXT,
  avg_salary_range JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(skill_name)
);

-- Create model_versions table for tracking ML iterations
CREATE TABLE IF NOT EXISTS public.model_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_name TEXT NOT NULL,
  version TEXT NOT NULL,
  accuracy_metrics JSONB,
  is_active BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(model_name, version)
);

-- Enable RLS on new tables
ALTER TABLE public.candidate_embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ml_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedback_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.market_intelligence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.model_versions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for candidate_embeddings (HR can view all)
CREATE POLICY "HR can view all embeddings"
  ON public.candidate_embeddings FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'hr'));

CREATE POLICY "HR can insert embeddings"
  ON public.candidate_embeddings FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'hr'));

-- RLS Policies for ml_scores (HR can view all)
CREATE POLICY "HR can view all scores"
  ON public.ml_scores FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'hr'));

CREATE POLICY "HR can insert scores"
  ON public.ml_scores FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'hr'));

CREATE POLICY "HR can update scores"
  ON public.ml_scores FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'hr'));

-- RLS Policies for feedback_data (HR only)
CREATE POLICY "HR can manage feedback"
  ON public.feedback_data FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'hr'));

-- RLS Policies for market_intelligence (HR can view)
CREATE POLICY "HR can view market intelligence"
  ON public.market_intelligence FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'hr'));

-- RLS Policies for model_versions (HR can view)
CREATE POLICY "HR can view model versions"
  ON public.model_versions FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'hr'));

-- Create indexes for performance
CREATE INDEX idx_candidate_embeddings_candidate ON public.candidate_embeddings(candidate_id);
CREATE INDEX idx_ml_scores_candidate ON public.ml_scores(candidate_id);
CREATE INDEX idx_ml_scores_job ON public.ml_scores(job_id);
CREATE INDEX idx_feedback_candidate ON public.feedback_data(candidate_id);
CREATE INDEX idx_market_skill ON public.market_intelligence(skill_name);

-- Create updated_at trigger function if not exists
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers for updated_at
CREATE TRIGGER update_candidate_embeddings_updated_at
  BEFORE UPDATE ON public.candidate_embeddings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_ml_scores_updated_at
  BEFORE UPDATE ON public.ml_scores
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_market_intelligence_updated_at
  BEFORE UPDATE ON public.market_intelligence
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();