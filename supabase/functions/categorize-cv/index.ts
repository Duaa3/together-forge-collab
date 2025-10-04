import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const JOB_CATEGORIES = [
  "HR", "Designer", "Information Technology", "Teacher", "Advocate",
  "Business Development", "Healthcare", "Fitness", "Agriculture", "BPO",
  "Sales", "Consultant", "Digital Media", "Automobile", "Chef",
  "Finance", "Apparel", "Engineering", "Accountant", "Construction",
  "Public Relations", "Banking", "Arts", "Aviation"
];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { cvText } = await req.json();

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

    const systemPrompt = `You are an expert CV categorization system. Analyze the CV and classify it into ONE of these 24 job categories:
${JOB_CATEGORIES.join(', ')}

Consider:
- Job titles and roles mentioned
- Skills and expertise
- Work experience domain
- Education background
- Industry keywords

Provide a confidence score (0-100) and brief reasoning for your classification.`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Categorize this CV:\n\n${cvText.substring(0, 3000)}` }
        ],
        tools: [
          {
            type: 'function',
            function: {
              name: 'categorize_cv',
              description: 'Categorize a CV into a job category',
              parameters: {
                type: 'object',
                properties: {
                  category: {
                    type: 'string',
                    enum: JOB_CATEGORIES,
                    description: 'The job category that best matches this CV'
                  },
                  confidence: {
                    type: 'number',
                    minimum: 0,
                    maximum: 100,
                    description: 'Confidence score for this categorization (0-100)'
                  },
                  reasoning: {
                    type: 'string',
                    description: 'Brief explanation for why this category was chosen'
                  }
                },
                required: ['category', 'confidence', 'reasoning'],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: 'function', function: { name: 'categorize_cv' } }
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
      console.error('AI API error:', response.status, errorText);
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      throw new Error('No tool call in response');
    }

    const result = JSON.parse(toolCall.function.arguments);

    return new Response(
      JSON.stringify({
        category: result.category,
        confidence: result.confidence,
        reasoning: result.reasoning
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Error in categorize-cv:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
