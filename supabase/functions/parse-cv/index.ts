import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import pako from "https://esm.sh/pako@2.1.0";

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

// Clean and normalize extracted text
function cleanExtractedText(text: string): string {
  if (!text) return '';
  
  // Remove common PDF artifacts and metadata
  const metadataPatterns = [
    /Adobe\s+Identity\s+Adobe/gi,
    /Skia\/PDF/gi,
    /Google\s+Docs\s+Renderer/gi,
    /PDF\s+version/gi,
    /Creator:/gi,
    /Producer:/gi,
    /CreationDate:/gi,
    /ModDate:/gi,
    /Font\s+\w+/gi,
    /Encoding:/gi,
    /BaseFont:/gi,
    /Subtype:/gi,
    /Type:/gi,
    /\bobj\b/gi,
    /\bendobj\b/gi,
    /stream\b/gi,
    /endstream\b/gi,
    /\bxref\b/gi,
    /\btrailer\b/gi,
    /startxref/gi,
  ];
  
  let cleaned = text;
  for (const pattern of metadataPatterns) {
    cleaned = cleaned.replace(pattern, '');
  }
  
  // Remove excessive whitespace, normalize line breaks
  cleaned = cleaned.replace(/\s+/g, ' ').trim();
  cleaned = cleaned.replace(/\r\n/g, '\n');
  cleaned = cleaned.replace(/\n\s*\n+/g, '\n');
  
  // Remove non-printable characters but keep basic punctuation
  cleaned = cleaned.replace(/[^\x20-\x7E\n]/g, '');
  
  return cleaned;
}

// Comprehensive skills dictionary
const SKILLS_DICT = [
  // Programming Languages
  "javascript", "typescript", "python", "java", "c++", "c#", "ruby", "php", "swift", "kotlin",
  "go", "rust", "scala", "perl", "r", "matlab", "objective-c", "dart", "elixir", "clojure",
  
  // Web Technologies
  "html", "css", "sass", "less", "react", "angular", "vue", "svelte", "nextjs", "nuxt",
  "jquery", "bootstrap", "tailwind", "redux", "mobx", "webpack", "vite", "babel", "graphql",
  
  // Backend & Databases
  "nodejs", "express", "django", "flask", "spring", "laravel", "rails", "asp.net",
  "mongodb", "postgresql", "mysql", "redis", "elasticsearch", "cassandra", "dynamodb",
  "sql", "nosql", "oracle", "mariadb",
  
  // Cloud & DevOps
  "aws", "azure", "gcp", "docker", "kubernetes", "terraform", "ansible", "jenkins",
  "circleci", "github actions", "gitlab ci", "travis ci", "heroku", "netlify", "vercel",
  
  // Tools & Practices
  "git", "jira", "agile", "scrum", "kanban", "ci/cd", "tdd", "bdd", "microservices",
  "rest api", "soap", "grpc", "oauth", "jwt", "linux", "bash", "powershell",
  
  // Data & AI
  "machine learning", "deep learning", "tensorflow", "pytorch", "keras", "scikit-learn",
  "pandas", "numpy", "data analysis", "data visualization", "tableau", "power bi",
  "ai", "ml", "nlp", "computer vision", "big data", "hadoop", "spark",
  
  // Mobile
  "ios", "android", "react native", "flutter", "xamarin", "ionic",
  
  // Other
  "ui/ux", "figma", "sketch", "adobe xd", "photoshop", "illustrator",
  "seo", "sem", "analytics", "a/b testing", "project management",
];

// Extract email addresses from text
function extractEmail(text: string): string[] {
  const emailPattern = /\b[a-zA-Z0-9][a-zA-Z0-9._%+-]*@[a-zA-Z0-9][a-zA-Z0-9.-]*\.[a-zA-Z]{2,}\b/gi;
  const matches = text.match(emailPattern);
  const emails = matches ? [...new Set(matches)].filter(email => {
    const invalid = ['example.com', 'test.com', 'email.com', 'domain.com'];
    return !invalid.some(inv => email.toLowerCase().includes(inv));
  }) : [];
  console.log('Extracted emails:', emails);
  return emails;
}

// Extract phone numbers from text
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

// Extract links from text
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

// Extract name from the beginning of clean text
function extractName(text: string): string {
  console.log("Extracting name from text...");
  
  if (!text || text.trim().length === 0) {
    return "Unknown Candidate";
  }
  
  const lines = text.split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0)
    .slice(0, 15); // Check first 15 lines
  
  console.log(`Processing ${lines.length} lines for name extraction`);
  
  const metadataKeywords = [
    'cv', 'resume', 'curriculum', 'vitae', 'page', 'of',
    'email', 'phone', 'tel', 'mobile', 'address', 'street',
    'city', 'state', 'zip', 'country', 'objective', 'summary',
    'experience', 'education', 'skills', 'projects', 'certifications'
  ];
  
  const candidates: { name: string; score: number }[] = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Skip empty, too short, or too long lines
    if (line.length < 4 || line.length > 60) continue;
    
    // Skip lines with email, URLs, or special characters
    if (/@/.test(line) || /http|www/.test(line) || /[<>{}[\]\\\/]/.test(line)) continue;
    
    // Skip lines with too many numbers
    const digitCount = (line.match(/\d/g) || []).length;
    if (digitCount > 3) continue;
    
    // Calculate score
    let score = 15 - i; // Earlier lines get higher base score
    
    // Heavy penalty for metadata keywords
    const lowerLine = line.toLowerCase();
    const hasMetadata = metadataKeywords.some(keyword => lowerLine.includes(keyword));
    if (hasMetadata) {
      score -= 20;
      continue; // Skip this line entirely
    }
    
    // Check if line looks like a name (2-5 words, mostly alphabetic)
    const words = line.split(/\s+/).filter(w => w.length > 0);
    if (words.length >= 2 && words.length <= 5) {
      // Check if words are mostly alphabetic
      const alphaCount = (line.match(/[a-zA-Z]/g) || []).length;
      const alphaRatio = alphaCount / line.length;
      
      if (alphaRatio > 0.8) {
        score += 10;
        
        // Bonus for capitalized words
        const capitalizedCount = words.filter(word => 
          word.length > 0 && word[0] === word[0].toUpperCase()
        ).length;
        
        if (capitalizedCount === words.length) {
          score += 5;
        }
      }
    }
    
    // Extra bonus for being in the first 3 lines
    if (i < 3) score += 3;
    
    candidates.push({ name: line, score });
  }
  
  // Sort by score
  candidates.sort((a, b) => b.score - a.score);
  
  console.log("Top name candidates:", candidates.slice(0, 3));
  
  if (candidates.length > 0 && candidates[0].score > 5) {
    return candidates[0].name;
  }
  
  return "Unknown Candidate";
}

// Extract skills from clean text with better accuracy
function extractSkills(text: string): string[] {
  console.log("Extracting skills...");
  
  const cleanedText = cleanExtractedText(text);
  const foundSkills = new Set<string>();
  const lowerText = cleanedText.toLowerCase();
  
  // Search for each skill in the text
  for (const skill of SKILLS_DICT) {
    const skillLower = skill.toLowerCase();
    
    // For single-word skills, ensure word boundaries
    if (!skill.includes(' ')) {
      const regex = new RegExp(`\\b${skillLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
      if (regex.test(lowerText)) {
        foundSkills.add(skill);
      }
    } else {
      // For multi-word skills, use simple includes
      if (lowerText.includes(skillLower)) {
        foundSkills.add(skill);
      }
    }
  }
  
  const skillsArray = Array.from(foundSkills).sort();
  console.log(`Extracted ${skillsArray.length} skills:`, skillsArray);
  
  return skillsArray;
}

// Extract text from PDF with proper decompression
async function extractTextFromPDF(arrayBuffer: ArrayBuffer): Promise<string> {
  console.log("Starting PDF text extraction with proper decompression, size:", arrayBuffer.byteLength);
  
  try {
    const uint8Array = new Uint8Array(arrayBuffer);
    
    // Convert to string preserving byte values
    let pdfData = '';
    for (let i = 0; i < uint8Array.length; i++) {
      pdfData += String.fromCharCode(uint8Array[i]);
    }
    
    console.log('PDF data loaded, searching for text content...');
    
    const textParts: string[] = [];
    
    // Find all stream objects with proper decompression
    const streamRegex = /(\d+\s+\d+\s+obj[\s\S]*?)stream\s*([\s\S]*?)\s*endstream/g;
    let streamMatch;
    let streamCount = 0;
    
    while ((streamMatch = streamRegex.exec(pdfData)) !== null) {
      streamCount++;
      const objectHeader = streamMatch[1];
      const streamData = streamMatch[2];
      
      // Check if stream is compressed
      const isCompressed = /\/Filter\s*(?:\/FlateDecode|\[\/FlateDecode\])/.test(objectHeader);
      
      if (isCompressed) {
        console.log(`Stream ${streamCount} is FlateDecode compressed, decompressing...`);
        try {
          // Extract the binary stream data
          const streamBytes: number[] = [];
          for (let i = 0; i < streamData.length; i++) {
            streamBytes.push(streamData.charCodeAt(i) & 0xff);
          }
          
          // Decompress using pako
          const compressed = new Uint8Array(streamBytes);
          const decompressed = pako.inflate(compressed);
          const decodedText = new TextDecoder('utf-8', { fatal: false }).decode(decompressed);
          
          // Extract text from decompressed data
          const textMatches = decodedText.match(/\(((?:[^()\\]|\\.)*)\)\s*Tj/g);
          if (textMatches) {
            textMatches.forEach(match => {
              const text = match.match(/\(((?:[^()\\]|\\.)*)\)/);
              if (text && text[1]) {
                textParts.push(text[1]);
              }
            });
          }
          
          // Also extract from TJ arrays
          const tjArrayMatches = decodedText.match(/\[((?:[^\[\]\\]|\\.)*)\]\s*TJ/g);
          if (tjArrayMatches) {
            tjArrayMatches.forEach(match => {
              const texts = match.match(/\(((?:[^()\\]|\\.)*)\)/g);
              if (texts) {
                texts.forEach(t => {
                  const cleaned = t.slice(1, -1);
                  if (cleaned.length > 0) {
                    textParts.push(cleaned);
                  }
                });
              }
            });
          }
          
          console.log(`Successfully decompressed stream ${streamCount}, extracted ${textParts.length} text fragments so far`);
        } catch (decompressError) {
          const errorMsg = decompressError instanceof Error ? decompressError.message : String(decompressError);
          console.warn(`Failed to decompress stream ${streamCount}:`, errorMsg);
        }
      } else {
        // Extract text from uncompressed streams
        const textMatches = streamData.match(/\(((?:[^()\\]|\\.)*)\)\s*Tj/g);
        if (textMatches) {
          textMatches.forEach(match => {
            const text = match.match(/\(((?:[^()\\]|\\.)*)\)/);
            if (text && text[1]) {
              textParts.push(text[1]);
            }
          });
        }
        
        // Extract from TJ arrays
        const tjArrayMatches = streamData.match(/\[((?:[^\[\]\\]|\\.)*)\]\s*TJ/g);
        if (tjArrayMatches) {
          tjArrayMatches.forEach(match => {
            const texts = match.match(/\(((?:[^()\\]|\\.)*)\)/g);
            if (texts) {
              texts.forEach(t => {
                const cleaned = t.slice(1, -1);
                if (cleaned.length > 0) {
                  textParts.push(cleaned);
                }
              });
            }
          });
        }
      }
    }
    
    console.log(`Processed ${streamCount} streams, extracted ${textParts.length} text fragments`);
    
    // Decode PDF string escapes
    const decodedText = textParts.map(text => {
      return text
        .replace(/\\n/g, '\n')
        .replace(/\\r/g, '\r')
        .replace(/\\t/g, '\t')
        .replace(/\\b/g, '\b')
        .replace(/\\f/g, '\f')
        .replace(/\\\(/g, '(')
        .replace(/\\\)/g, ')')
        .replace(/\\\\/g, '\\')
        .replace(/\\(\d{3})/g, (_, oct) => String.fromCharCode(parseInt(oct, 8)));
    });
    
    const finalText = decodedText.join(' ');
    
    console.log("Final text length:", finalText.length, "characters");
    console.log("Preview (first 500 chars):", finalText.substring(0, 500));
    
    // Calculate text quality
    const alphanumeric = (finalText.match(/[a-zA-Z0-9]/g) || []).length;
    const quality = finalText.length > 0 ? (alphanumeric / finalText.length) * 100 : 0;
    console.log(`Text quality score: ${quality.toFixed(1)}% alphanumeric`);
    
    return finalText;
  } catch (error) {
    console.error("Error extracting text from PDF:", error);
    const errorMsg = error instanceof Error ? error.message : String(error);
    throw new Error(`PDF extraction failed: ${errorMsg}`);
  }
}

// Main parsing function
async function parseCVData(arrayBuffer: ArrayBuffer): Promise<ParsedCV> {
  console.log("Starting CV parsing...");
  
  // Extract raw text from PDF
  const rawText = await extractTextFromPDF(arrayBuffer);
  
  // Clean the extracted text
  const cleanedText = cleanExtractedText(rawText);
  console.log("Cleaned text length:", cleanedText.length);
  console.log("Cleaned preview (first 300 chars):", cleanedText.substring(0, 300));
  
  // Extract all information from cleaned text
  const emails = extractEmail(cleanedText);
  const phones = extractPhones(cleanedText);
  const links = extractLinks(cleanedText);
  const name = extractName(cleanedText);
  const extractedSkills = extractSkills(cleanedText);
  
  console.log("Extracted emails:", emails);
  console.log("Extracted phones:", phones);
  console.log("Extracted links:", links);
  console.log("Extracted name:", name);
  console.log("Extracted skills count:", extractedSkills.length);
  
  // Parse links for GitHub and LinkedIn
  let github = null;
  let linkedin = null;
  
  for (const link of links) {
    if (link.includes('github.com')) {
      github = link;
    } else if (link.includes('linkedin.com')) {
      linkedin = link;
    }
  }
  
  const result: ParsedCV = {
    name,
    email: emails.length > 0 ? emails[0] : null,
    phone: phones.length > 0 ? phones[0] : null,
    github,
    linkedin,
    extractedSkills,
  };
  
  console.log("Successfully parsed CV:", JSON.stringify(result, null, 2));
  
  return result;
}

// Serverless function handler
serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  console.log('Starting CV parsing request...');

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      throw new Error('No file provided');
    }

    console.log(`File received: ${file.name} Size: ${file.size}`);

    const arrayBuffer = await file.arrayBuffer();
    const parsed = await parseCVData(arrayBuffer);

    console.log('Parsing completed:', JSON.stringify(parsed));

    return new Response(
      JSON.stringify(parsed),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('Error parsing CV:', error);
    const errorMsg = error instanceof Error ? error.message : 'Failed to parse CV';
    const errorDetails = error instanceof Error ? error.toString() : String(error);
    return new Response(
      JSON.stringify({
        error: errorMsg,
        details: errorDetails,
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});
