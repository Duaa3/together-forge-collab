import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ParsedCV {
  name: string;
  email: string | null;
  phone: string | null;
  github: string | null;
  linkedin: string | null;
  extractedSkills: string[];
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

function extractEmail(text: string): string[] {
  const emailPattern = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/gi;
  const matches = text.match(emailPattern);
  const emails = matches ? [...new Set(matches)] : [];
  console.log('Extracted emails:', emails);
  return emails;
}

function extractPhones(text: string): string[] {
  const phonePatterns = [
    /\+\d{1,4}[\s.-]?\(?\d{1,4}\)?[\s.-]?\d{1,4}[\s.-]?\d{1,4}[\s.-]?\d{0,4}/g,
    /\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/g,
    /\d{2,4}[\s.-]\d{2,4}[\s.-]\d{2,4}[\s.-]?\d{0,4}/g,
    /\b\d{8,15}\b/g
  ];
  
  const allMatches = new Set<string>();
  for (const pattern of phonePatterns) {
    const matches = text.match(pattern);
    if (matches) {
      matches.forEach(m => {
        const cleaned = m.trim();
        if (cleaned.replace(/\D/g, '').length >= 7) {
          allMatches.add(cleaned);
        }
      });
    }
  }
  
  const phones = [...allMatches];
  console.log('Extracted phones:', phones);
  return phones;
}

function extractLinks(text: string): string[] {
  const linkPatterns = [
    /https?:\/\/[^\s\)]+/gi,
    /linkedin\.com\/in\/[^\s\)]+/gi,
    /github\.com\/[^\s\)]+/gi,
    /(?:www\.)?[\w-]+\.(?:com|net|org|io|dev)\/[^\s\)]+/gi
  ];
  
  const allMatches = new Set<string>();
  for (const pattern of linkPatterns) {
    const matches = text.match(pattern);
    if (matches) {
      matches.forEach(m => {
        let url = m.trim();
        if (!url.startsWith('http')) {
          url = 'https://' + url;
        }
        allMatches.add(url);
      });
    }
  }
  
  const links = [...allMatches];
  console.log('Extracted links:', links);
  return links;
}

function extractName(text: string): string {
  console.log('Extracting name from text...');
  const lines = text.split(/\r?\n/)
    .map(l => l.trim())
    .filter(Boolean);
  
  // Strategy 1: Look for "Name:" label
  const nameWithLabel = text.match(/(?:name|candidate)\s*:?\s*([A-Z][a-z]+(?:\s+[A-Z][a-z'-]+){1,3})/i);
  if (nameWithLabel && nameWithLabel[1]) {
    console.log('Found name with label:', nameWithLabel[1]);
    return nameWithLabel[1];
  }
  
  // Strategy 2: First 15 lines, look for 2-4 capitalized words
  const earlyLines = lines.slice(0, 15);
  for (const line of earlyLines) {
    if (/^[A-Z][a-z]+(?:\s+[A-Z]\.?)?(?:\s+[A-Z][a-z'-]+){1,2}$/i.test(line) &&
        line.length > 4 && line.length < 60 &&
        !/(resume|curriculum|cv|profile|contact|email|phone|address|education|experience|skills|objective)/i.test(line)) {
      console.log('Found name in early lines:', line);
      return line;
    }
  }
  
  // Strategy 3: Look for capital letters pattern in first line
  if (lines[0] && /[A-Z]/.test(lines[0]) && lines[0].length > 3 && lines[0].length < 60) {
    const firstLine = lines[0];
    if (!/^(resume|cv|curriculum)/i.test(firstLine)) {
      console.log('Found name in first line:', firstLine);
      return firstLine;
    }
  }
  
  console.log('Name not found, returning Unknown Candidate');
  return 'Unknown Candidate';
}

function extractSkills(text: string): string[] {
  console.log('Extracting skills...');
  const foundSkills = new Set<string>();
  const lowerText = text.toLowerCase();
  
  // Method 1: Match against skills dictionary
  for (const skill of SKILLS_DICT) {
    const escaped = skill.replace(/[+.^$*|{}()[\]\\]/g, '\\$&');
    const regex = new RegExp(`\\b${escaped}\\b`, 'i');
    
    if (regex.test(lowerText)) {
      foundSkills.add(skill);
    }
  }
  
  // Method 2: Extract from "Skills" section
  const skillsSectionMatch = text.match(/(?:skills|technical skills|technologies|competencies)[:\s]*([^\n]+(?:\n(?!\n)[^\n]+)*)/i);
  if (skillsSectionMatch) {
    const skillsText = skillsSectionMatch[1];
    const skillTokens = skillsText.split(/[,;|\n•·▪▫-]/);
    skillTokens.forEach(token => {
      const cleaned = token.trim().toLowerCase();
      if (cleaned.length > 1 && cleaned.length < 30) {
        if (SKILLS_DICT.some(s => s === cleaned) || 
            /^[a-z0-9#+.-]+$/i.test(cleaned)) {
          foundSkills.add(cleaned);
        }
      }
    });
  }
  
  // Method 3: Look for programming patterns
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
  
  const skills = [...foundSkills];
  console.log('Extracted skills:', skills);
  return skills;
}

async function extractTextFromPDF(arrayBuffer: ArrayBuffer): Promise<string> {
  console.log('Starting PDF text extraction, size:', arrayBuffer.byteLength);
  
  try {
    const uint8Array = new Uint8Array(arrayBuffer);
    const decoder = new TextDecoder('utf-8', { fatal: false });
    let text = decoder.decode(uint8Array);
    
    // Remove PDF control characters
    text = text.replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, ' ');
    
    // Extract text between PDF text markers (parentheses in PDF)
    const textMatches = text.match(/\(([^)]+)\)/g);
    if (textMatches && textMatches.length > 10) {
      const extractedText = textMatches
        .map(match => match.slice(1, -1))
        .join(' ')
        .replace(/\\n/g, '\n')
        .replace(/\\r/g, '')
        .replace(/\\\(/g, '(')
        .replace(/\\\)/g, ')')
        .replace(/\\\\/g, '\\');
      
      console.log('Extracted text length:', extractedText.length);
      console.log('First 200 chars:', extractedText.substring(0, 200));
      return extractedText;
    }
    
    // Fallback: clean up the raw text
    const cleanText = text
      .replace(/[^\x20-\x7E\n]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    
    console.log('Extracted text length (fallback):', cleanText.length);
    console.log('First 200 chars:', cleanText.substring(0, 200));
    return cleanText;
  } catch (error) {
    console.error('PDF extraction error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Failed to extract text from PDF: ${errorMessage}`);
  }
}

async function parseCVData(arrayBuffer: ArrayBuffer): Promise<ParsedCV> {
  console.log('Starting CV parsing...');
  
  try {
    const text = await extractTextFromPDF(arrayBuffer);
    console.log('Text extracted, length:', text.length);
    
    if (!text || text.length < 50) {
      throw new Error('Extracted text is too short or empty');
    }
    
    const emails = extractEmail(text);
    const phones = extractPhones(text);
    const links = extractLinks(text);
    const name = extractName(text);
    const skills = extractSkills(text);
    
    const parsedData: ParsedCV = {
      name: name || 'Unknown Candidate',
      email: emails[0] || null,
      phone: phones[0] || null,
      github: links.find(l => l.includes('github')) || null,
      linkedin: links.find(l => l.includes('linkedin')) || null,
      extractedSkills: skills,
    };
    
    console.log('Parsing completed:', parsedData);
    return parsedData;
  } catch (error) {
    console.error('Error in parseCVData:', error);
    throw error;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Starting CV parsing request...');
    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      throw new Error('No file provided');
    }

    console.log('File received:', file.name, 'Size:', file.size);

    const arrayBuffer = await file.arrayBuffer();
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
