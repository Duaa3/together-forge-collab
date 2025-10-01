import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AnalysisResult {
  experienceLevel: string;
  yearsOfExperience: number;
  careerProgression: string[];
  projectComplexity: number;
  educationRelevance: number;
  technicalDepth: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { cvText, jobRequirements } = await req.json();
    
    if (!cvText) {
      return new Response(
        JSON.stringify({ error: 'CV text is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    console.log('Analyzing candidate with advanced ML...');

    // Use Lovable AI (Gemini 2.5 Flash) for deep analysis
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
            content: `You are an expert HR analyst specializing in candidate assessment. Analyze CVs with precision and provide structured insights.`
          },
          {
            role: 'user',
            content: `Analyze this CV and provide detailed assessment:

CV Text:
${cvText}

Job Requirements:
${JSON.stringify(jobRequirements, null, 2)}

Provide your analysis in the following JSON format:
{
  "experienceLevel": "junior|mid|senior|lead|principal",
  "yearsOfExperience": <number>,
  "careerProgression": ["role1 (year)", "role2 (year)", ...],
  "projectComplexity": <score 0-100>,
  "educationRelevance": <score 0-100>,
  "technicalDepth": <score 0-100>,
  "keyStrengths": ["strength1", "strength2", ...],
  "developmentAreas": ["area1", "area2", ...],
  "industryExperience": ["industry1", "industry2", ...],
  "leadershipIndicators": <score 0-100>
}`
          }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "analyze_candidate",
              description: "Provide detailed candidate analysis",
              parameters: {
                type: "object",
                properties: {
                  experienceLevel: {
                    type: "string",
                    enum: ["junior", "mid", "senior", "lead", "principal"]
                  },
                  yearsOfExperience: { type: "number" },
                  careerProgression: {
                    type: "array",
                    items: { type: "string" }
                  },
                  projectComplexity: { type: "number" },
                  educationRelevance: { type: "number" },
                  technicalDepth: { type: "number" },
                  keyStrengths: {
                    type: "array",
                    items: { type: "string" }
                  },
                  developmentAreas: {
                    type: "array",
                    items: { type: "string" }
                  },
                  industryExperience: {
                    type: "array",
                    items: { type: "string" }
                  },
                  leadershipIndicators: { type: "number" }
                },
                required: [
                  "experienceLevel",
                  "yearsOfExperience",
                  "careerProgression",
                  "projectComplexity",
                  "educationRelevance",
                  "technicalDepth"
                ],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "analyze_candidate" } }
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
      console.error('AI analysis error:', response.status, errorText);
      throw new Error(`AI analysis failed: ${response.status}`);
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    
    if (!toolCall) {
      throw new Error('No analysis result from AI');
    }

    const analysis = JSON.parse(toolCall.function.arguments);
    
    console.log('Analysis complete:', analysis);

    return new Response(
      JSON.stringify({ analysis }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in analyze-candidate-advanced:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
