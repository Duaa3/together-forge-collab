import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ParsedCV {
  name: string;
  email: string;
  phone: string;
  links: string[];
  skills: string[];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Starting CV parsing...');
    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      throw new Error('No file provided');
    }

    console.log('File received:', file.name, 'Size:', file.size);

    // Use Lovable AI to extract structured information directly from PDF
    // This uses Gemini's vision capabilities to handle any PDF format
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    // Convert PDF to base64 for Gemini vision analysis
    const arrayBuffer = await file.arrayBuffer();
    const base64Data = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));

    console.log('Sending PDF to AI for visual analysis...');

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
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
            content: `You are a professional CV/Resume parser. Extract information ACCURATELY from the CV document.

EXTRACTION RULES:

1. NAME: Extract the full name (First Last or First Middle Last) from the top of the CV

2. EMAIL: Extract the email address - must be a valid format with @ and domain

3. PHONE: Extract phone number in any standard format

4. LINKS: Extract professional links:
   - LinkedIn profiles
   - GitHub profiles  
   - Portfolio websites
   - Professional social media

5. SKILLS: Extract ALL technical skills, but be selective:
   ✅ INCLUDE:
   - Programming languages (Python, JavaScript, Java, C++, etc.)
   - Frameworks (React, Angular, Vue, Django, Spring, etc.)
   - Databases (SQL, PostgreSQL, MongoDB, MySQL, etc.)
   - Cloud/DevOps (AWS, Azure, Docker, Kubernetes, etc.)
   - Tools (Git, JIRA, etc.)
   - Certifications
   
   ❌ EXCLUDE:
   - Generic words
   - Company names (unless they're technologies)
   - Random text or partial words
   - Skills shorter than 2 characters (except: C#, Go, R)
   
QUALITY RULES:
- Be accurate - only extract what you clearly see
- No duplicates
- No PDF artifacts or noise
- If uncertain, omit rather than guess`
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Extract structured information from this CV/Resume document. Focus on accuracy and only extract clearly visible information.'
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:application/pdf;base64,${base64Data}`
                }
              }
            ]
          }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "extract_cv_data",
              description: "Extract structured information from a CV/Resume",
              parameters: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  email: { type: "string" },
                  phone: { type: "string" },
                  links: {
                    type: "array",
                    items: { type: "string" }
                  },
                  skills: {
                    type: "array",
                    items: { type: "string" }
                  }
                },
                required: ["name", "email", "phone", "links", "skills"],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "extract_cv_data" } }
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI API error:', aiResponse.status, errorText);
      throw new Error(`AI API error: ${errorText}`);
    }

    const aiData = await aiResponse.json();
    console.log('AI response received:', JSON.stringify(aiData));

    let parsedCV: ParsedCV;

    // Extract from tool call response
    if (aiData.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments) {
      const args = aiData.choices[0].message.tool_calls[0].function.arguments;
      parsedCV = typeof args === 'string' ? JSON.parse(args) : args;
    } else {
      throw new Error('No tool call response from AI');
    }

    // Post-process and clean the extracted data
    // Remove duplicate skills and filter out noise
    if (parsedCV.skills && Array.isArray(parsedCV.skills)) {
      const cleanedSkills = new Set<string>();
      
      parsedCV.skills.forEach((skill: string) => {
        // Filter out obvious garbage
        if (skill && 
            skill.length >= 2 &&  // At least 2 chars
            !/^[^a-zA-Z0-9]+$/.test(skill) &&  // Not just special chars
            !/[|\\\/\[\]{}@#$%^&*<>]/.test(skill) &&  // No PDF artifacts
            skill !== 'ai' &&  // Filter generic/noise
            skill !== 'AI') {
          // Normalize and add
          cleanedSkills.add(skill.trim());
        }
      });
      
      parsedCV.skills = Array.from(cleanedSkills);
    }

    console.log('Successfully parsed CV:', parsedCV);

    return new Response(
      JSON.stringify(parsedCV),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    console.error('Error parsing CV:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        details: error instanceof Error ? error.stack : undefined
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
