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

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

// Comprehensive skills dictionary
const SKILLS_DICT = [
  // Programming Languages
  'javascript', 'typescript', 'python', 'java', 'c++', 'c#', 'ruby', 'go', 'rust',
  'swift', 'kotlin', 'php', 'scala', 'r', 'perl', 'dart', 'objective-c', 'c',
  // Frontend
  'react', 'angular', 'vue', 'svelte', 'next.js', 'nuxt.js', 'jquery', 'bootstrap',
  'tailwind', 'html', 'css', 'sass', 'less', 'webpack', 'vite', 'redux', 'mobx', 'streamlit',
  // Backend
  'node.js', 'express', 'django', 'flask', 'spring', 'spring boot', '.net', 'fastapi',
  'laravel', 'ruby on rails', 'asp.net', 'graphql', 'rest', 'restful', 'api', 'nestjs', 'swagger',
  // Databases
  'postgresql', 'mysql', 'mongodb', 'redis', 'oracle', 'sql server', 'supabase',
  'firebase', 'dynamodb', 'cassandra', 'sqlite', 'mariadb', 'sql', 'nosql', 'postgres',
  // Cloud & DevOps
  'aws', 'azure', 'gcp', 'docker', 'kubernetes', 'jenkins', 'ci/cd', 'terraform',
  'ansible', 'circleci', 'gitlab ci', 'github actions', 'heroku', 'vercel', 'netlify',
  // Tools & Version Control
  'git', 'github', 'gitlab', 'bitbucket', 'jira', 'vs code', 'visual studio code', 'intellij', 'linux', 'unix',
  'bash', 'powershell', 'vim', 'emacs', 'postman', 'trello', 'slack',
  // Methodologies
  'agile', 'scrum', 'kanban', 'devops', 'tdd', 'bdd', 'solid',
  // Design & UI/UX
  'figma', 'adobe xd', 'sketch', 'photoshop', 'illustrator', 'invision',
  // AI & Data Science
  'machine learning', 'deep learning', 'tensorflow', 'pytorch', 'pandas', 'numpy',
  'scikit-learn', 'keras', 'opencv', 'nlp', 'computer vision', 'data science', 'ml', 'ai',
  'big data', 'hadoop', 'spark', 'tableau', 'power bi',
  // Other Technologies
  'elasticsearch', 'rabbitmq', 'kafka', 'nginx', 'apache', 'microservices',
  'serverless', 'websocket', 'oauth', 'jwt', 'soap', 'xml', 'json', 'iot'
];

// Advanced extraction functions
function extractEmail(text: string): string[] {
  const matches = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi);
  return matches ? [...new Set(matches)] : [];
}

function extractPhones(text: string): string[] {
  // Covers international formats including Oman (+968)
  const matches = text.match(/(?:\+?968[-\s]?)?\b[279]\d{7,8}\b|(?:\+\d{1,3}[-\s]?)?\(?\d{2,4}\)?[-\s]?\d{3,4}[-\s]?\d{3,4}/g);
  return matches ? [...new Set(matches)] : [];
}

function extractLinks(text: string): string[] {
  const matches = text.match(/https?:\/\/[^\s)]+/gi);
  const unique = new Set(matches || []);
  // Filter for professional domains
  const professional = [...unique].filter(url => 
    /(linkedin\.com|github\.com|researchgate\.net|ijrar\.org|portfolio|medium\.com|behance\.net|dribbble\.com|gitlab\.com|bitbucket\.org)/i.test(url)
  );
  return professional.length > 0 ? professional : [...unique];
}

function extractName(text: string): string {
  // Look at first 10 lines for name patterns
  const lines = text.split(/\r?\n/).slice(0, 10)
    .map(l => l.trim())
    .filter(Boolean);
  
  // Prefer lines with 2-4 capitalized words (typical name format)
  const candidates = lines.filter(l => 
    /^[A-Z][a-z]+(?:\s+[A-Z][a-z'-]+){1,3}$/.test(l) &&
    l.length > 5 &&
    l.length < 50
  );
  
  if (candidates.length > 0) {
    return candidates[0];
  }
  
  // Fallback: first line with capital letters
  const fallback = lines.find(l => 
    /^[A-Z][a-z]/.test(l) &&
    l.length > 3 &&
    l.length < 50 &&
    !/^(curriculum|resume|cv|profile|about|contact|education|experience|skills)/i.test(l)
  );
  
  return fallback || '';
}

function extractSkills(text: string): string[] {
  const foundSkills = new Set<string>();
  const lowerText = text.toLowerCase();
  
  for (const skill of SKILLS_DICT) {
    // Escape special regex characters
    const escaped = skill.replace(/[+.^$*|{}()[\]\\]/g, '\\$&');
    const regex = new RegExp(`\\b${escaped}\\b`, 'i');
    
    if (regex.test(lowerText)) {
      // Find the actual match to preserve original case
      const match = text.match(regex);
      if (match) {
        foundSkills.add(match[0]);
      }
    }
  }
  
  return [...foundSkills];
}

// Use Lovable AI to extract structured data from PDF
async function extractCVDataWithAI(arrayBuffer: ArrayBuffer): Promise<ParsedCV> {
  console.log('Using Lovable AI to extract CV data from PDF...');
  
  if (!LOVABLE_API_KEY) {
    throw new Error('LOVABLE_API_KEY is not configured');
  }

  // Convert PDF to base64 efficiently (handle large files by chunking)
  const uint8Array = new Uint8Array(arrayBuffer);
  let binary = '';
  const chunkSize = 8192;
  for (let i = 0; i < uint8Array.length; i += chunkSize) {
    const chunk = uint8Array.subarray(i, Math.min(i + chunkSize, uint8Array.length));
    binary += String.fromCharCode.apply(null, Array.from(chunk));
  }
  const base64 = btoa(binary);
  
  try {
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
            role: 'user',
            content: [
              {
                type: 'text',
                text: `Extract ALL information from this CV/Resume PDF with high accuracy. 

CRITICAL INSTRUCTIONS:
- Extract the candidate's FULL NAME exactly as it appears (first and last name)
- Extract ALL email addresses found in the document
- Extract ALL phone numbers in their original format
- Extract ALL professional links (LinkedIn, GitHub, portfolio websites, ResearchGate, etc.)
- Extract ALL technical skills, programming languages, frameworks, tools, and technologies mentioned
- Look for skills in sections like: Skills, Technical Skills, Technologies, Tools, Competencies, etc.
- Include both explicitly listed skills AND skills mentioned in project descriptions or work experience
- Be thorough - extract EVERY skill mentioned throughout the entire document

Return structured data with:
- name: Full name of candidate
- email: Primary email address
- phone: Phone number with country code if available
- links: Array of ALL professional URLs found
- skills: Array of ALL technical skills, tools, and technologies (be comprehensive)`
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:application/pdf;base64,${base64}`
                }
              }
            ]
          }
        ],
        tools: [
          {
            type: 'function',
            function: {
              name: 'extract_cv_data',
              description: 'Extract structured candidate information from CV',
              parameters: {
                type: 'object',
                properties: {
                  name: {
                    type: 'string',
                    description: 'Full name of the candidate'
                  },
                  email: {
                    type: 'string',
                    description: 'Email address'
                  },
                  phone: {
                    type: 'string',
                    description: 'Phone number'
                  },
                  links: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'Professional links (LinkedIn, GitHub, portfolio, etc.)'
                  },
                  skills: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'Technical skills and technologies'
                  }
                },
                required: ['name', 'email', 'phone', 'links', 'skills'],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: 'function', function: { name: 'extract_cv_data' } }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Lovable AI error:', response.status, errorText);
      throw new Error(`AI extraction failed: ${response.status}`);
    }

    const data = await response.json();
    console.log('AI response:', JSON.stringify(data, null, 2));

    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      throw new Error('No tool call in AI response');
    }

    const extractedData = JSON.parse(toolCall.function.arguments);
    console.log('Extracted CV data:', extractedData);

    return {
      name: extractedData.name || 'Unknown Candidate',
      email: extractedData.email || '',
      phone: extractedData.phone || '',
      links: extractedData.links || [],
      skills: extractedData.skills || []
    };
  } catch (error) {
    console.error('AI extraction error:', error);
    throw error;
  }
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

    const arrayBuffer = await file.arrayBuffer();
    
    // Extract CV data using Lovable AI
    console.log('Extracting CV data with Lovable AI...');
    const parsedCV = await extractCVDataWithAI(arrayBuffer);

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
