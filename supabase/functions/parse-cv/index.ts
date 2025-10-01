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

// Convert PDF to base64 for image analysis
async function pdfToBase64(arrayBuffer: ArrayBuffer): Promise<string> {
  const bytes = new Uint8Array(arrayBuffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
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

    // Get PDF as base64
    const arrayBuffer = await file.arrayBuffer();
    const base64Pdf = await pdfToBase64(arrayBuffer);
    
    console.log('PDF converted to base64, size:', base64Pdf.length);

    // Use Gemini's vision capability to analyze the PDF visually
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    console.log('Calling Gemini with vision for PDF analysis...');

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
            content: `You are an expert CV/Resume parser with perfect visual recognition capabilities.

CRITICAL INSTRUCTIONS:
- You will receive a PDF document as an image
- READ IT CAREFULLY and extract ONLY the information that is actually visible in the document
- DO NOT make up or hallucinate any information
- If a field is not clearly visible, leave it empty

EXTRACTION RULES:

📝 NAME:
- Extract the full name exactly as written in the document
- Usually at the top of the CV

📧 EMAIL:
- Must be a valid email address visible in the document
- Format: something@domain.com

📞 PHONE:
- Extract the phone number exactly as written
- Include country code if present

🔗 LINKS:
- LinkedIn, GitHub, portfolio websites
- Only extract full URLs that are visible

💼 SKILLS:
- Only extract REAL technical skills that are explicitly listed
- Include: Programming languages, frameworks, databases, cloud platforms, tools
- Categories: JavaScript, Python, React, Node.js, AWS, Docker, Git, etc.
- DO NOT extract: company names, soft skills, random words
- Each skill should be 2+ characters

QUALITY OVER QUANTITY:
- Only extract what you can clearly see
- Empty fields are better than wrong data
- Be precise and accurate`
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Please analyze this CV/Resume PDF and extract the candidate information. Read the document carefully and extract only the information that is clearly visible.'
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:application/pdf;base64,${base64Pdf}`
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
                  name: { type: "string", description: "Full name of the candidate" },
                  email: { type: "string", description: "Email address" },
                  phone: { type: "string", description: "Phone number" },
                  links: {
                    type: "array",
                    items: { type: "string" },
                    description: "LinkedIn, GitHub, portfolio URLs"
                  },
                  skills: {
                    type: "array",
                    items: { type: "string" },
                    description: "Technical skills only"
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
    console.log('AI response received');

    let parsedCV: ParsedCV;

    // Extract from tool call response
    if (aiData.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments) {
      const args = aiData.choices[0].message.tool_calls[0].function.arguments;
      parsedCV = typeof args === 'string' ? JSON.parse(args) : args;
    } else {
      throw new Error('No tool call response from AI');
    }

    // Clean up and validate the extracted data
    if (parsedCV.skills && Array.isArray(parsedCV.skills)) {
      const cleanedSkills = new Set<string>();
      
      parsedCV.skills.forEach((skill: string) => {
        // Filter out garbage
        if (skill && 
            skill.length >= 2 &&
            !/^[^a-zA-Z0-9]+$/.test(skill) &&
            !/[|\\\/\[\]{}#$%^&*<>]/.test(skill) &&
            !skill.match(/^\d+$/)) { // No pure numbers
          cleanedSkills.add(skill.trim());
        }
      });
      
      parsedCV.skills = Array.from(cleanedSkills);
    }

    // Validate email format
    if (parsedCV.email && !parsedCV.email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      console.log('Invalid email detected, clearing:', parsedCV.email);
      parsedCV.email = '';
    }

    // Validate phone format (should contain digits)
    if (parsedCV.phone && !parsedCV.phone.match(/\d{3,}/)) {
      console.log('Invalid phone detected, clearing:', parsedCV.phone);
      parsedCV.phone = '';
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
