import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import * as pdfjsLib from "https://esm.sh/pdfjs-dist@3.11.174/legacy/build/pdf.mjs";

// Configure PDF.js worker for Deno environment
(pdfjsLib as any).GlobalWorkerOptions.workerSrc = 
  "https://esm.sh/pdfjs-dist@3.11.174/legacy/build/pdf.worker.mjs";

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

// Advanced extraction functions with improved patterns
function extractEmail(text: string): string[] {
  // More comprehensive email pattern
  const emailPattern = /[\w\.-]+@[\w\.-]+\.\w{2,}/gi;
  const matches = text.match(emailPattern);
  return matches ? [...new Set(matches)] : [];
}

function extractPhones(text: string): string[] {
  const phonePatterns = [
    // International format with + and country code
    /\+\d{1,4}[\s.-]?\(?\d{1,4}\)?[\s.-]?\d{1,4}[\s.-]?\d{1,4}[\s.-]?\d{0,4}/g,
    // US format
    /\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/g,
    // General format with dashes or spaces
    /\d{2,4}[\s.-]\d{2,4}[\s.-]\d{2,4}[\s.-]?\d{0,4}/g,
    // Compact format
    /\b\d{8,15}\b/g
  ];
  
  const allMatches = new Set<string>();
  for (const pattern of phonePatterns) {
    const matches = text.match(pattern);
    if (matches) {
      matches.forEach(m => {
        // Clean up the match
        const cleaned = m.trim();
        // Only add if it looks like a phone number (has enough digits)
        if (cleaned.replace(/\D/g, '').length >= 7) {
          allMatches.add(cleaned);
        }
      });
    }
  }
  
  return [...allMatches];
}

function extractLinks(text: string): string[] {
  const linkPatterns = [
    // URLs with protocol
    /https?:\/\/[^\s\)]+/gi,
    // LinkedIn without protocol
    /linkedin\.com\/in\/[^\s\)]+/gi,
    // GitHub without protocol
    /github\.com\/[^\s\)]+/gi,
    // Generic domain patterns
    /(?:www\.)?[\w-]+\.(?:com|net|org|io|dev)\/[^\s\)]+/gi
  ];
  
  const allMatches = new Set<string>();
  for (const pattern of linkPatterns) {
    const matches = text.match(pattern);
    if (matches) {
      matches.forEach(m => {
        let url = m.trim();
        // Add protocol if missing
        if (!url.startsWith('http')) {
          url = 'https://' + url;
        }
        allMatches.add(url);
      });
    }
  }
  
  return [...allMatches];
}

function extractName(text: string): string {
  const lines = text.split(/\r?\n/)
    .map(l => l.trim())
    .filter(Boolean);
  
  // Strategy 1: Look for "Name:" label
  const nameWithLabel = text.match(/(?:name|candidate)\s*:?\s*([A-Z][a-z]+(?:\s+[A-Z][a-z'-]+){1,3})/i);
  if (nameWithLabel && nameWithLabel[1]) {
    return nameWithLabel[1];
  }
  
  // Strategy 2: First 15 lines, look for 2-4 capitalized words
  const earlyLines = lines.slice(0, 15);
  for (const line of earlyLines) {
    // Match 2-4 capitalized words (flexible with middle initials)
    if (/^[A-Z][a-z]+(?:\s+[A-Z]\.?)?(?:\s+[A-Z][a-z'-]+){1,2}$/i.test(line) &&
        line.length > 4 && line.length < 60 &&
        !/(resume|curriculum|cv|profile|contact|email|phone|address|education|experience|skills|objective)/i.test(line)) {
      return line;
    }
  }
  
  // Strategy 3: Look for capital letters pattern in first line
  if (lines[0] && /[A-Z]/.test(lines[0]) && lines[0].length > 3 && lines[0].length < 60) {
    const firstLine = lines[0];
    if (!/^(resume|cv|curriculum)/i.test(firstLine)) {
      return firstLine;
    }
  }
  
  return '';
}

function extractSkills(text: string): string[] {
  const foundSkills = new Set<string>();
  const lowerText = text.toLowerCase();
  
  // Method 1: Match against skills dictionary
  for (const skill of SKILLS_DICT) {
    const escaped = skill.replace(/[+.^$*|{}()[\]\\]/g, '\\$&');
    const regex = new RegExp(`\\b${escaped}\\b`, 'i');
    
    if (regex.test(lowerText)) {
      const match = text.match(regex);
      if (match) {
        foundSkills.add(skill.toLowerCase());
      }
    }
  }
  
  // Method 2: Extract from "Skills" section
  const skillsSectionMatch = text.match(/(?:skills|technical skills|technologies|competencies)[:\s]*([^\n]+(?:\n(?!\n)[^\n]+)*)/i);
  if (skillsSectionMatch) {
    const skillsText = skillsSectionMatch[1];
    // Split by common delimiters
    const skillTokens = skillsText.split(/[,;|\n•·▪▫-]/);
    skillTokens.forEach(token => {
      const cleaned = token.trim().toLowerCase();
      if (cleaned.length > 1 && cleaned.length < 30) {
        // Check if it's a known skill or looks technical
        if (SKILLS_DICT.some(s => s === cleaned) || 
            /^[a-z0-9#+.-]+$/i.test(cleaned)) {
          foundSkills.add(cleaned);
        }
      }
    });
  }
  
  // Method 3: Look for programming patterns (e.g., "Python, Java, C++")
  const techPatterns = text.match(/\b(?:proficient in|experience with|worked with|using|including)\s*:?\s*([^.]+)/gi);
  if (techPatterns) {
    techPatterns.forEach(pattern => {
      const tokens = pattern.split(/[,;|&]/);
      tokens.forEach(token => {
        const cleaned = token.replace(/^(?:proficient in|experience with|worked with|using|including)\s*:?\s*/i, '').trim().toLowerCase();
        if (cleaned.length > 1 && cleaned.length < 30) {
          if (SKILLS_DICT.some(s => s === cleaned)) {
            foundSkills.add(cleaned);
          }
        }
      });
    });
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
  
  // Log first 500 chars of extracted text for debugging
  console.log('Extracted text preview:', text.substring(0, 500));
  
  // Extract information using regex/heuristics
  const emails = extractEmail(text);
  const phones = extractPhones(text);
  const links = extractLinks(text);
  const name = extractName(text);
  const skills = extractSkills(text);
  
  console.log('Extraction results:', {
    name,
    emails: emails.slice(0, 3),
    phones: phones.slice(0, 3),
    linksCount: links.length,
    skillsCount: skills.length,
    skills: skills.slice(0, 10)
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
