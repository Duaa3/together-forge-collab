import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ScoringResult {
  technicalFit: number;
  experienceMatch: number;
  growthPotential: number;
  culturalFit: number;
  overallScore: number;
  confidenceInterval: { lower: number; upper: number };
  featureImportance: Record<string, number>;
  reasoning: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { candidateData, jobRequirements, advancedAnalysis } = await req.json();
    
    if (!candidateData || !jobRequirements) {
      return new Response(
        JSON.stringify({ error: 'Candidate data and job requirements are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    console.log('Calculating multi-dimensional candidate score...');

    // Use Lovable AI for intelligent scoring
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: `You are an expert talent assessment AI. Evaluate candidates using a sophisticated multi-dimensional scoring algorithm.

Scoring Framework:
- Technical Fit (35%): Match between candidate skills and job requirements
- Experience Match (25%): Seniority level and years of experience alignment  
- Growth Potential (20%): Learning velocity and adaptability indicators
- Cultural Fit (20%): Communication style, soft skills, work preferences

Provide scores from 0-100 for each dimension and calculate overall score.`
          },
          {
            role: 'user',
            content: `Score this candidate for the job:

Candidate:
${JSON.stringify(candidateData, null, 2)}

Advanced Analysis:
${JSON.stringify(advancedAnalysis, null, 2)}

Job Requirements:
${JSON.stringify(jobRequirements, null, 2)}

Provide detailed scoring with reasoning.`
          }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "score_candidate",
              description: "Multi-dimensional candidate scoring",
              parameters: {
                type: "object",
                properties: {
                  technicalFit: {
                    type: "number",
                    description: "Technical skills match score (0-100)"
                  },
                  experienceMatch: {
                    type: "number",
                    description: "Experience level alignment score (0-100)"
                  },
                  growthPotential: {
                    type: "number",
                    description: "Learning and growth indicators score (0-100)"
                  },
                  culturalFit: {
                    type: "number",
                    description: "Cultural and soft skills fit score (0-100)"
                  },
                  confidenceLower: {
                    type: "number",
                    description: "Lower bound of confidence interval"
                  },
                  confidenceUpper: {
                    type: "number",
                    description: "Upper bound of confidence interval"
                  },
                  featureImportance: {
                    type: "object",
                    description: "Key factors and their weights",
                    additionalProperties: { type: "number" }
                  },
                  reasoning: {
                    type: "string",
                    description: "Detailed explanation of the scoring decision"
                  }
                },
                required: [
                  "technicalFit",
                  "experienceMatch",
                  "growthPotential",
                  "culturalFit",
                  "reasoning"
                ],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "score_candidate" } }
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'Payment required. Please add credits to your Lovable AI workspace.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      const errorText = await response.text();
      console.error('Scoring engine error:', response.status, errorText);
      throw new Error(`Scoring failed: ${response.status}`);
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    
    if (!toolCall) {
      throw new Error('No scoring result from AI');
    }

    const scoring = JSON.parse(toolCall.function.arguments);
    
    // Calculate overall score with weights
    const overallScore = (
      scoring.technicalFit * 0.35 +
      scoring.experienceMatch * 0.25 +
      scoring.growthPotential * 0.20 +
      scoring.culturalFit * 0.20
    );

    const result: ScoringResult = {
      technicalFit: scoring.technicalFit,
      experienceMatch: scoring.experienceMatch,
      growthPotential: scoring.growthPotential,
      culturalFit: scoring.culturalFit,
      overallScore: Math.round(overallScore * 100) / 100,
      confidenceInterval: {
        lower: scoring.confidenceLower || overallScore - 5,
        upper: scoring.confidenceUpper || overallScore + 5,
      },
      featureImportance: scoring.featureImportance || {},
      reasoning: scoring.reasoning,
    };
    
    console.log('Scoring complete:', result);

    return new Response(
      JSON.stringify({ scoring: result }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in candidate-scoring-engine:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
