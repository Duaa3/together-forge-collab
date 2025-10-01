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
  
  // Clean text and split into lines
  const cleanText = text
    .replace(/curriculum\s*vitae|resume|cv\b/gi, '')
    .replace(/\b(page|of)\s+\d+/gi, '')
    .trim();
  
  const lines = cleanText
    .split(/[\n\r]+/)
    .map(l => l.trim())
    .filter(l => l.length > 2);
  
  console.log(`Processing ${lines.length} lines for name extraction`);
  
  // Strategy 1: Look for explicit "Name:" label
  for (const line of lines.slice(0, 20)) {
    const labelMatch = line.match(/(?:name|full\s*name|candidate)\s*:?\s*([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z'-]+){1,3})/i);
    if (labelMatch && labelMatch[1]) {
      const name = labelMatch[1].trim();
      console.log(`Found name with label: ${name}`);
      return name;
    }
  }
  
  // Strategy 2: First lines with proper name format (2-4 capitalized words)
  for (const line of lines.slice(0, 15)) {
    // Skip lines that are clearly not names
    if (line.match(/^(http|www|email|phone|address|linkedin|github|\d+|@)/i)) continue;
    if (line.length < 5 || line.length > 60) continue;
    if (/(resume|curriculum|profile|contact|objective|education|experience|skills)/i.test(line)) continue;
    
    // Match 2-4 capitalized words (typical name)
    const nameMatch = line.match(/^([A-Z][a-zA-Z]{1,}(?:\s+[A-Z]\.?)?(?:\s+[A-Z][a-zA-Z'-]{1,}){0,2})$/);
    if (nameMatch && nameMatch[1]) {
      const words = nameMatch[1].split(/\s+/).filter(w => w.length > 1);
      // Validate it looks like a real name (at least 2 words)
      if (words.length >= 2 && words.length <= 4) {
        console.log(`Found name in early lines: ${nameMatch[1]}`);
        return nameMatch[1].trim();
      }
    }
  }
  
  // Strategy 3: Look for name pattern in beginning
  const beginning = lines.slice(0, 30).join(' ');
  const namePatterns = [
    /\b([A-Z][a-z]{2,}\s+[A-Z][a-z]{2,}\s+[A-Z][a-z]{2,})\b/, // Three names
    /\b([A-Z][a-z]{2,}\s+[A-Z][a-z]{2,})\b/, // Two names
  ];
  
  for (const pattern of namePatterns) {
    const match = beginning.match(pattern);
    if (match && match[1]) {
      // Avoid common false positives
      const stopWords = ['Dear Sir', 'Dear Madam', 'Project Manager', 'Software Engineer', 'January', 'February', 'March', 'April', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
      const isStopWord = stopWords.some(sw => match[1].includes(sw));
      if (!isStopWord) {
        console.log(`Found name with pattern: ${match[1]}`);
        return match[1].trim();
      }
    }
  }
  
  console.log('Name not found, returning Unknown Candidate');
  return 'Unknown Candidate';
}

function extractSkills(text: string): string[] {
  console.log('Extracting skills...');
  const foundSkills = new Set<string>();
  const lowerText = text.toLowerCase();
  
  // Method 1: Direct matching from skills dictionary with better patterns
  for (const skill of SKILLS_DICT) {
    // Escape special regex characters
    const escaped = skill.replace(/[+.^$*|{}()[\]\\]/g, '\\$&');
    // Use word boundaries but handle special cases like .net, c++, c#
    const regex = new RegExp(`\\b${escaped}\\b`, 'i');
    
    if (regex.test(lowerText)) {
      foundSkills.add(skill);
    }
  }
  
  // Method 2: Extract from "Skills" section with better parsing
  const skillsSectionPatterns = [
    /(?:technical\s*)?skills\s*:?\s*(.*?)(?:\n\s*\n|education|experience|work history|projects|$)/is,
    /(?:core\s*)?competencies\s*:?\s*(.*?)(?:\n\s*\n|education|experience|$)/is,
    /technologies\s*:?\s*(.*?)(?:\n\s*\n|education|$)/is,
  ];
  
  for (const pattern of skillsSectionPatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      const skillsText = match[1];
      console.log(`Found skills section, extracting from ${skillsText.length} chars`);
      
      // Split by various delimiters
      const skillTokens = skillsText.split(/[,;|\n•·▪▫\t]/);
      
      skillTokens.forEach(token => {
        const cleaned = token
          .trim()
          .replace(/^[-•·\*\+>\d\.)]+\s*/, '') // Remove bullets
          .replace(/\([^)]*\)/g, '') // Remove parentheses
          .toLowerCase();
        
        if (cleaned.length > 1 && cleaned.length < 30) {
          // Check against dictionary
          for (const skill of SKILLS_DICT) {
            if (cleaned === skill || 
                (cleaned.includes(skill) && skill.length > 3) ||
                (skill.includes(cleaned) && cleaned.length > 3)) {
              foundSkills.add(skill);
            }
          }
        }
      });
    }
  }
  
  // Method 3: Context-based extraction (experience with, proficient in, etc.)
  const contextPatterns = [
    /(?:proficient in|experience with|worked with|using|including|expertise in)\s*:?\s*([^.]+)/gi,
    /\b([\w\s+#.-]{2,20})\s*[-–]\s*(?:\d+\s*(?:years?|yrs)|proficient|expert|advanced)/gi,
  ];
  
  for (const pattern of contextPatterns) {
    const matches = [...text.matchAll(pattern)];
    matches.forEach(match => {
      const content = match[1].trim().toLowerCase();
      const tokens = content.split(/[,;|&]/);
      
      tokens.forEach(token => {
        const cleaned = token.trim();
        if (cleaned.length > 1 && cleaned.length < 30) {
          for (const skill of SKILLS_DICT) {
            if (cleaned === skill || cleaned.includes(skill)) {
              foundSkills.add(skill);
            }
          }
        }
      });
    });
  }
  
  const skills = [...foundSkills].sort();
  console.log(`Extracted ${skills.length} skills:`, skills);
  return skills;
}

async function extractTextFromPDF(arrayBuffer: ArrayBuffer): Promise<string> {
  console.log('Starting PDF text extraction, size:', arrayBuffer.byteLength);
  
  try {
    const uint8Array = new Uint8Array(arrayBuffer);
    const decoder = new TextDecoder('utf-8', { fatal: false });
    let rawText = decoder.decode(uint8Array);
    
    let extractedText = '';
    
    // Method 1: Extract from BT/ET text blocks (most common in PDFs)
    const textBlockPattern = /BT\s+(.*?)\s+ET/gs;
    const textBlocks = [...rawText.matchAll(textBlockPattern)];
    
    console.log(`Found ${textBlocks.length} text blocks`);
    
    for (const block of textBlocks) {
      const blockContent = block[1];
      // Extract text within parentheses (Tj and TJ operators)
      const textMatches = blockContent.match(/\(([^)]*)\)/g);
      if (textMatches) {
        for (const match of textMatches) {
          const content = match
            .slice(1, -1) // Remove parentheses
            .replace(/\\n/g, '\n')
            .replace(/\\r/g, ' ')
            .replace(/\\t/g, ' ')
            .replace(/\\\(/g, '(')
            .replace(/\\\)/g, ')')
            .replace(/\\\\/g, '\\');
          extractedText += content + ' ';
        }
      }
    }
    
    // Method 2: Also try Tj and TJ operators directly
    const tjPattern = /\(([^)]*)\)\s*Tj/g;
    const tjMatches = [...rawText.matchAll(tjPattern)];
    for (const match of tjMatches) {
      const content = match[1]
        .replace(/\\n/g, '\n')
        .replace(/\\r/g, ' ');
      extractedText += content + ' ';
    }
    
    // Clean up extracted text
    let finalText = extractedText
      .replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F]/g, ' ') // Remove control chars
      .replace(/\s+/g, ' ') // Normalize whitespace
      .replace(/([a-z])([A-Z])/g, '$1 $2') // Add space between camelCase
      .trim();
    
    // Fallback if extraction yielded little text
    if (finalText.length < 100) {
      console.log('Primary extraction yielded little text, using fallback...');
      const allParenthesesContent = rawText.match(/\(([^)]*)\)/g);
      if (allParenthesesContent) {
        finalText = allParenthesesContent
          .map(m => m.slice(1, -1).replace(/\\n/g, '\n').replace(/\\r/g, ' '))
          .join(' ')
          .replace(/[\x00-\x1F]/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();
      }
    }
    
    console.log(`Text extracted, length: ${finalText.length}`);
    console.log(`First 500 chars: ${finalText.substring(0, 500)}`);
    
    if (finalText.length < 50) {
      throw new Error('Extracted text is too short');
    }
    
    return finalText;
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
