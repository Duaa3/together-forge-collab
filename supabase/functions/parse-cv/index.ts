import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getDocument } from "https://esm.sh/pdfjs-dist@3.11.174/legacy/build/pdf.mjs";

// Configure PDF.js worker
const pdfjsLib = { getDocument };


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

// Extract text from PDF using PDF.js
async function extractTextFromPDF(arrayBuffer: ArrayBuffer): Promise<string> {
  console.log('Extracting text from PDF using PDF.js...');
  
  try {
    const uint8Array = new Uint8Array(arrayBuffer);
    const loadingTask = pdfjsLib.getDocument({ data: uint8Array });
    const pdf = await loadingTask.promise;
    
    console.log(`PDF loaded, pages: ${pdf.numPages}`);
    
    let fullText = '';
    
    // Extract text from all pages
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(' ');
      fullText += pageText + '\n';
    }
    
    console.log(`Extracted ${fullText.length} characters from PDF`);
    return fullText;
  } catch (error) {
    console.error('PDF.js extraction error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Failed to extract text from PDF: ${errorMessage}`);
  }
}

// Parse CV data using regex and heuristics
async function parseCVData(arrayBuffer: ArrayBuffer): Promise<ParsedCV> {
  console.log('Parsing CV with PDF.js and regex/heuristics...');
  
  // Extract text from PDF
  const text = await extractTextFromPDF(arrayBuffer);
  
  if (!text || text.trim().length === 0) {
    throw new Error('No text could be extracted from PDF');
  }
  
  // Extract information using regex/heuristics
  const emails = extractEmail(text);
  const phones = extractPhones(text);
  const links = extractLinks(text);
  const name = extractName(text);
  const skills = extractSkills(text);
  
  console.log('Extraction results:', {
    name,
    emailCount: emails.length,
    phoneCount: phones.length,
    linksCount: links.length,
    skillsCount: skills.length
  });
  
  return {
    name: name || 'Unknown Candidate',
    email: emails[0] || '',
    phone: phones[0] || '',
    links: links,
    skills: skills
  };
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
    
    // Parse CV data using PDF.js and regex/heuristics
    console.log('Parsing CV with PDF.js and regex/heuristics...');
    const parsedCV = await parseCVData(arrayBuffer);

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
