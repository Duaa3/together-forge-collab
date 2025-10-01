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

// Use Gemini to extract text from PDF (treating as document, not image)
async function extractTextWithGemini(arrayBuffer: ArrayBuffer): Promise<string> {
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  if (!LOVABLE_API_KEY) {
    throw new Error('LOVABLE_API_KEY not configured');
  }

  // Convert to base64 in chunks to avoid memory issues
  const bytes = new Uint8Array(arrayBuffer);
  let binary = '';
  const chunkSize = 8192;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, Math.min(i + chunkSize, bytes.length));
    binary += String.fromCharCode(...chunk);
  }
  const base64Pdf = btoa(binary);

  console.log('Using Gemini to extract text from PDF...');

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
              text: `Extract ALL text from this CV/Resume document. Return the complete text content exactly as it appears, preserving:
- Names, contact information (email, phone)
- All sections (Education, Experience, Projects, Skills, etc.)
- Dates and locations
- Bullet points and descriptions
- Links and URLs

Return ONLY the extracted text, no commentary or formatting instructions.`
            },
            {
              type: 'image_url',
              image_url: {
                url: `data:application/pdf;base64,${base64Pdf}`
              }
            }
          ]
        }
      ]
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Gemini extraction error:', response.status, errorText);
    throw new Error(`Gemini extraction failed: ${response.status}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || '';
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
    
    // Try Gemini-based text extraction directly
    console.log('Extracting text with Gemini Vision...');
    let extractedText = '';
    
    try {
      extractedText = await extractTextWithGemini(arrayBuffer);
      console.log('Gemini extraction successful, length:', extractedText.length);
      console.log('Text preview:', extractedText.slice(0, 500));
    } catch (geminiError) {
      console.error('Gemini extraction failed:', geminiError);
      throw new Error('Failed to extract text from PDF. Please ensure the PDF is readable.');
    }
    
    if (!extractedText || extractedText.trim().length < 20) {
      throw new Error('Could not extract sufficient text from PDF');
    }

    // Apply robust heuristics
    console.log('Applying extraction heuristics...');
    
    const emails = extractEmail(extractedText);
    const phones = extractPhones(extractedText);
    const links = extractLinks(extractedText);
    const name = extractName(extractedText);
    const skills = extractSkills(extractedText);

    const parsedCV: ParsedCV = {
      name: name || 'Unknown Candidate',
      email: emails[0] || '',
      phone: phones[0] || '',
      links: links,
      skills: skills
    };
    
    // Validate the extracted name - reject if it's garbage
    if (parsedCV.name && parsedCV.name !== 'Unknown Candidate') {
      const nameAlphanumeric = (parsedCV.name.match(/[a-zA-Z]/g) || []).length;
      const nameRatio = nameAlphanumeric / parsedCV.name.length;
      
      // Name should be at least 60% letters and less than 100 characters
      if (nameRatio < 0.6 || parsedCV.name.length > 100) {
        console.log('Invalid name detected, resetting:', parsedCV.name.slice(0, 50));
        parsedCV.name = 'Unknown Candidate';
      }
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
