import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { skills, analysisType = 'talent_pool' } = await req.json();
    
    if (!skills || !Array.isArray(skills)) {
      return new Response(
        JSON.stringify({ error: 'Skills array is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('Running market analytics for skills:', skills);

    // Fetch candidate data for market analysis
    const { data: candidates, error: candidatesError } = await supabase
      .from('candidates')
      .select('extracted_skills, created_at');

    if (candidatesError) {
      throw candidatesError;
    }

    // Analyze talent pool
    const talentPoolAnalysis = analyzeTalentPool(candidates || [], skills);
    
    // Use AI for trend detection and insights
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
            content: `You are a market intelligence analyst specializing in tech talent trends and recruitment analytics.`
          },
          {
            role: 'user',
            content: `Analyze the tech talent market for these skills: ${skills.join(', ')}

Current talent pool data:
${JSON.stringify(talentPoolAnalysis, null, 2)}

Provide insights on:
1. Skill availability and competition
2. Emerging trends and technologies
3. Salary benchmarking estimates
4. Hiring recommendations
5. Skills gap analysis`
          }
        ],
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
      console.error('Market analytics error:', response.status, errorText);
      throw new Error(`Market analysis failed: ${response.status}`);
    }

    const data = await response.json();
    const aiInsights = data.choices?.[0]?.message?.content || '';

    // Update market intelligence table
    for (const skill of skills) {
      const skillData = talentPoolAnalysis.skillBreakdown[skill];
      if (skillData) {
        await supabase
          .from('market_intelligence')
          .upsert({
            skill_name: skill,
            demand_score: skillData.demandScore,
            supply_score: skillData.supplyScore,
            trend_direction: skillData.trend,
            avg_salary_range: { min: 50000, max: 150000 }, // Placeholder
            updated_at: new Date().toISOString(),
          }, {
            onConflict: 'skill_name'
          });
      }
    }

    return new Response(
      JSON.stringify({
        talentPool: talentPoolAnalysis,
        aiInsights,
        timestamp: new Date().toISOString(),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in market-analytics:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function analyzeTalentPool(candidates: any[], targetSkills: string[]) {
  const skillBreakdown: Record<string, any> = {};
  
  for (const skill of targetSkills) {
    const candidatesWithSkill = candidates.filter(c => 
      c.extracted_skills?.includes(skill)
    );
    
    const supplyScore = (candidatesWithSkill.length / Math.max(candidates.length, 1)) * 100;
    const demandScore = 100 - supplyScore; // Inverse relationship
    
    // Simple trend detection based on recent candidates
    const recentCandidates = candidates.filter(c => {
      const createdDate = new Date(c.created_at);
      const monthsAgo = new Date();
      monthsAgo.setMonth(monthsAgo.getMonth() - 3);
      return createdDate > monthsAgo;
    });
    
    const recentWithSkill = recentCandidates.filter(c => 
      c.extracted_skills?.includes(skill)
    ).length;
    
    const trend = recentWithSkill > candidatesWithSkill.length / 2 ? 'rising' : 'stable';
    
    skillBreakdown[skill] = {
      candidatesWithSkill: candidatesWithSkill.length,
      supplyScore: Math.round(supplyScore),
      demandScore: Math.round(demandScore),
      trend,
    };
  }
  
  return {
    totalCandidates: candidates.length,
    skillBreakdown,
    analysisDate: new Date().toISOString(),
  };
}
