import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { batchSize = 5, offset = 0 } = await req.json();

    console.log(`Starting batch processing at offset ${offset} with batch size ${batchSize}`);

    // Fetch candidates that haven't been processed yet
    const { data: candidates, error: fetchError } = await supabase
      .from('candidates')
      .select('id, cv_text, skills')
      .order('created_at', { ascending: true })
      .range(offset, offset + batchSize - 1);

    if (fetchError) {
      console.error('Error fetching candidates:', fetchError);
      throw fetchError;
    }

    if (!candidates || candidates.length === 0) {
      console.log('No more candidates to process');
      return new Response(
        JSON.stringify({ 
          success: true, 
          processed: 0, 
          message: 'No more candidates to process',
          completed: true 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Processing ${candidates.length} candidates`);

    const results = {
      processed: 0,
      errors: [] as any[],
      skills: new Set<string>(),
    };

    // Process each candidate
    for (const candidate of candidates) {
      try {
        // Check if already processed
        const { data: existingScore } = await supabase
          .from('ml_scores')
          .select('id')
          .eq('candidate_id', candidate.id)
          .single();

        if (existingScore) {
          console.log(`Candidate ${candidate.id} already processed, skipping`);
          results.processed++;
          continue;
        }

        // Get job requirements (using a default for batch processing)
        const { data: jobs } = await supabase
          .from('jobs')
          .select('job_description')
          .limit(1)
          .single();

        const jobRequirements = jobs?.job_description || 'General technical position requiring programming skills';

        // Run advanced analysis
        console.log(`Analyzing candidate ${candidate.id}`);
        const { data: analysisData, error: analysisError } = await supabase.functions.invoke(
          'analyze-candidate-advanced',
          {
            body: {
              cvText: candidate.cv_text,
              jobRequirements: jobRequirements,
            },
          }
        );

        if (analysisError) {
          console.error(`Analysis error for candidate ${candidate.id}:`, analysisError);
          results.errors.push({ candidateId: candidate.id, error: 'Analysis failed' });
          continue;
        }

        // Run scoring engine
        console.log(`Scoring candidate ${candidate.id}`);
        const { data: scoringData, error: scoringError } = await supabase.functions.invoke(
          'candidate-scoring-engine',
          {
            body: {
              candidateData: {
                cv_text: candidate.cv_text,
                skills: candidate.skills,
              },
              jobRequirements: jobRequirements,
              advancedAnalysis: analysisData?.analysis,
            },
          }
        );

        if (scoringError) {
          console.error(`Scoring error for candidate ${candidate.id}:`, scoringError);
          results.errors.push({ candidateId: candidate.id, error: 'Scoring failed' });
          continue;
        }

        // Store ML scores
        const { error: insertError } = await supabase
          .from('ml_scores')
          .insert({
            candidate_id: candidate.id,
            technical_fit: scoringData.technicalFit,
            experience_match: scoringData.experienceMatch,
            growth_potential: scoringData.growthPotential,
            cultural_fit: scoringData.culturalFit,
            overall_score: scoringData.overallScore,
            confidence_lower: scoringData.confidence.lower,
            confidence_upper: scoringData.confidence.upper,
            feature_importance: scoringData.featureImportance,
            reasoning: scoringData.reasoning,
          });

        if (insertError) {
          console.error(`Insert error for candidate ${candidate.id}:`, insertError);
          results.errors.push({ candidateId: candidate.id, error: 'Failed to store scores' });
          continue;
        }

        // Collect skills for market analysis
        if (candidate.skills && Array.isArray(candidate.skills)) {
          candidate.skills.forEach((skill: string) => results.skills.add(skill));
        }

        results.processed++;
        console.log(`Successfully processed candidate ${candidate.id}`);

        // Add a small delay to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 500));

      } catch (error) {
        console.error(`Error processing candidate ${candidate.id}:`, error);
        results.errors.push({ 
          candidateId: candidate.id, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        });
      }
    }

    // Run market analytics if we have collected skills
    if (results.skills.size > 0) {
      console.log(`Running market analytics for ${results.skills.size} skills`);
      const skillsArray = Array.from(results.skills).slice(0, 20); // Top 20 skills

      try {
        await supabase.functions.invoke('market-analytics', {
          body: {
            skills: skillsArray,
            analysisType: 'demand',
          },
        });
        console.log('Market analytics completed successfully');
      } catch (error) {
        console.error('Market analytics error:', error);
        results.errors.push({ type: 'market-analytics', error: 'Failed to run market analytics' });
      }
    }

    const hasMoreCandidates = candidates.length === batchSize;

    return new Response(
      JSON.stringify({
        success: true,
        processed: results.processed,
        errors: results.errors,
        skillsCollected: results.skills.size,
        nextOffset: offset + batchSize,
        completed: !hasMoreCandidates,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Batch processing error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
