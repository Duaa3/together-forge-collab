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

    // Extract text from PDF
    const arrayBuffer = await file.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    
    // Simple but effective: extract all text between parentheses (PDF text format)
    // and between text markers, then let AI sort it out
    const decoder = new TextDecoder('utf-8', { fatal: false });
    const pdfText = decoder.decode(bytes);
    
    console.log('Extracting text from PDF...');
    
    // Extract text in parentheses (most common PDF text format)
    const textMatches = pdfText.match(/\(([^)]+)\)/g) || [];
    let extractedText = textMatches
      .map(m => m.slice(1, -1))
      .join(' ')
      .replace(/\\[nrt]/g, ' ')
      .replace(/\s+/g, ' ');
    
    console.log('Extracted text preview:', extractedText.slice(0, 500));
    console.log('Total extracted length:', extractedText.length);

    // Use Lovable AI to intelligently extract structured information
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

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
            content: `You are an expert CV parser. The text you receive is extracted from a PDF and may be messy or have formatting issues.

YOUR TASK: Extract accurate, clean information from noisy CV text.

EXTRACTION RULES:

📝 NAME: 
- Look for a person's full name (typically 2-4 words, capitalized)
- Usually appears at the very beginning
- Format: "FirstName LastName" or "FirstName MiddleName LastName"

📧 EMAIL:
- Must contain @ symbol and valid domain (.com, .org, .edu, etc.)
- Format: something@domain.com

📞 PHONE:
- Numbers with + or () or - separators
- At least 10 digits
- Formats: +1234567890, (123) 456-7890, 123-456-7890

🔗 LINKS:
- LinkedIn: linkedin.com/in/username
- GitHub: github.com/username  
- Portfolio websites
- Full URLs only

💼 SKILLS (MOST IMPORTANT):
Only extract REAL technical skills from these categories:

✅ Programming Languages:
JavaScript, TypeScript, Python, Java, C++, C#, Ruby, Go, Rust, Swift, Kotlin, PHP

✅ Frontend Frameworks:
React, Angular, Vue, Svelte, Next.js, Nuxt.js

✅ Backend Frameworks:
Node.js, Express, Django, Flask, Spring, .NET, FastAPI, Laravel

✅ Databases:
PostgreSQL, MySQL, MongoDB, Redis, Oracle, SQL Server, Supabase, Firebase

✅ Cloud & DevOps:
AWS, Azure, GCP, Docker, Kubernetes, Jenkins, CI/CD, Terraform

✅ Tools & Others:
Git, GitHub, GitLab, JIRA, VS Code, Linux, Agile, Scrum

❌ NEVER extract:
- Random words or partial words
- PDF artifact text
- Company names (unless it's a tool/platform)
- Common words like "experience", "education"
- Anything less than 2 characters (except: R, C, Go)

QUALITY OVER QUANTITY:
- Only extract what you're confident about
- Each skill should appear once
- If something looks wrong, skip it
- Empty fields are better than wrong data`
          },
          {
            role: 'user',
            content: `Parse this CV text and extract structured information. The text is messy from PDF extraction, so focus on finding real data patterns:

${extractedText.slice(0, 30000)}`
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
