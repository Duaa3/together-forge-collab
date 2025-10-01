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

    let textContent = '';
    const arrayBuffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);

    // Multi-method PDF text extraction for different PDF encodings
    if (file.name.toLowerCase().endsWith('.pdf')) {
      console.log('Extracting text from PDF using multiple methods...');
      const decoder = new TextDecoder('utf-8', { fatal: false });
      const rawText = decoder.decode(uint8Array);
      
      const extractedTexts: string[] = [];
      
      // Method 1: Text in parentheses (most common in PDFs)
      const parenMatches = rawText.match(/\(([^)]{2,})\)/g);
      if (parenMatches) {
        const parenText = parenMatches
          .map(m => m.slice(1, -1))
          .map(t => t.replace(/\\([nrt])/g, ' '))  // Replace escape sequences
          .join(' ');
        extractedTexts.push(parenText);
        console.log('Method 1 (parentheses): extracted', parenText.length, 'chars');
      }
      
      // Method 2: Hex strings in angle brackets
      const hexMatches = rawText.match(/<([0-9A-Fa-f\s]{4,})>/g);
      if (hexMatches) {
        const hexText = hexMatches.map(hex => {
          const cleaned = hex.slice(1, -1).replace(/\s/g, '');
          let decoded = '';
          for (let i = 0; i < cleaned.length - 1; i += 2) {
            const charCode = parseInt(cleaned.substr(i, 2), 16);
            if (charCode >= 32 && charCode <= 126) {
              decoded += String.fromCharCode(charCode);
            }
          }
          return decoded;
        }).join(' ');
        extractedTexts.push(hexText);
        console.log('Method 2 (hex): extracted', hexText.length, 'chars');
      }
      
      // Method 3: Text between BT/ET markers
      const btMatches = rawText.match(/BT\s+([\s\S]*?)\s+ET/g);
      if (btMatches) {
        const btText = btMatches.map(block => {
          // Extract text from Tj and TJ operators
          const tjMatches = block.match(/\(([^)]+)\)\s*T[jJ]/g);
          if (tjMatches) {
            return tjMatches.map(m => m.match(/\(([^)]+)\)/)?.[1] || '').join(' ');
          }
          return '';
        }).join(' ');
        extractedTexts.push(btText);
        console.log('Method 3 (BT/ET): extracted', btText.length, 'chars');
      }
      
      // Method 4: Text after /F operators (font changes)
      const fontMatches = rawText.match(/\/F\d+\s+[\d.]+\s+Tf\s*\(([^)]+)\)/g);
      if (fontMatches) {
        const fontText = fontMatches
          .map(m => m.match(/\(([^)]+)\)/)?.[1] || '')
          .join(' ');
        extractedTexts.push(fontText);
        console.log('Method 4 (fonts): extracted', fontText.length, 'chars');
      }
      
      // Method 5: Look for stream data
      const streamMatches = rawText.match(/stream\s+([\s\S]*?)\s+endstream/g);
      if (streamMatches) {
        streamMatches.forEach(stream => {
          const streamText = stream.match(/\(([^)]+)\)/g);
          if (streamText) {
            extractedTexts.push(streamText.map(m => m.slice(1, -1)).join(' '));
          }
        });
        console.log('Method 5 (streams): extracted text');
      }
      
      // Combine all extracted text
      textContent = extractedTexts.join('\n\n');
      
      // Clean up the combined text
      textContent = textContent
        .replace(/\\([nrt()])/g, ' ')    // Remove escape sequences
        .replace(/\s+/g, ' ')             // Collapse whitespace
        .replace(/[^\x20-\x7E\n]/g, '')  // Remove non-printable chars
        .trim();
      
      console.log('Total extracted text length:', textContent.length);
    } else {
      // For non-PDF files
      const decoder = new TextDecoder('utf-8', { fatal: false });
      textContent = decoder.decode(uint8Array);
    }
    
    // Log preview for debugging
    console.log('Text preview (first 1000 chars):', textContent.slice(0, 1000));

    // If extraction failed or text is too short, try alternate method
    if (textContent.length < 100 && file.name.toLowerCase().endsWith('.pdf')) {
      console.log('Low quality extraction, trying raw binary scan...');
      const decoder = new TextDecoder('utf-8', { fatal: false });
      const rawText = decoder.decode(uint8Array);
      
      // Extract any printable ASCII sequences
      const printableMatches = rawText.match(/[\x20-\x7E]{3,}/g);
      if (printableMatches) {
        textContent = printableMatches.join(' ');
        console.log('Recovered text from binary scan:', textContent.length, 'chars');
      }
    }

    // Advanced text cleaning and preprocessing
    console.log('Applying advanced text cleaning...');
    
    // Remove common PDF artifacts and noise
    textContent = textContent
      .replace(/obj\s*<<\s*\/Type/g, ' ')
      .replace(/\/[A-Z][a-z]+\s+/g, ' ')
      .replace(/\d+\s+\d+\s+obj/g, ' ')
      .replace(/endobj/g, ' ')
      .replace(/stream|endstream/g, ' ')
      .replace(/startxref/g, ' ')
      .replace(/xref/g, ' ')
      .replace(/%%EOF/g, ' ')
      .replace(/\[(\s*\d+\s*)+\]/g, ' ')
      .replace(/[<>]{2,}/g, ' ')
      .replace(/\d{10,}/g, ' ')
      .replace(/[^\x20-\x7E\s]/g, ' ')  // Remove non-printable ASCII
      .replace(/\b[a-zA-Z]{1,2}\b/g, ' ')  // Remove 1-2 letter words (likely noise)
      .replace(/[|\\\/\[\]{}@#$%^&*<>]/g, ' ')  // Remove special chars that are PDF artifacts
      .replace(/\s+/g, ' ')
      .trim();
    
    // Extract text near common CV section headers
    const cvSections = [
      'skills', 'experience', 'education', 'work experience', 
      'technical skills', 'professional skills', 'expertise',
      'qualifications', 'competencies', 'proficiencies',
      'projects', 'achievements', 'certifications', 'languages',
      'tools', 'technologies', 'summary', 'profile', 'about'
    ];
    
    let sectionText = '';
    for (const section of cvSections) {
      const regex = new RegExp(`${section}[:\\s\\-]*((?:[^\\n]{0,200}\\n?){0,20})`, 'gi');
      const matches = textContent.match(regex);
      if (matches) {
        sectionText += '\n\n' + matches.join('\n');
      }
    }
    
    // If we found section-based text, prepend it for better extraction
    if (sectionText.length > 50) {
      textContent = sectionText + '\n\n' + textContent;
      console.log('Enhanced with section-based extraction:', sectionText.length, 'chars');
    }
    
    // Extract potential skills only from relevant sections
    const skillPatterns = [
      /\b(?:Python|Java|JavaScript|TypeScript|C\+\+|C#|PHP|Ruby|Go|Rust|Swift|Kotlin)\b/g,
      /\b(?:React|Angular|Vue|Django|Flask|Spring|Node\.js|Express|FastAPI)\b/g,
      /\b(?:SQL|MySQL|PostgreSQL|MongoDB|Redis|Oracle|Firebase|Supabase)\b/g,
      /\b(?:AWS|Azure|GCP|Docker|Kubernetes|Jenkins|Git|GitHub|GitLab)\b/g,
      /\b(?:Machine Learning|Data Analysis|Data Science|Deep Learning)\b/g,
    ];
    
    const foundSkills = new Set<string>();
    
    // Only extract from section text to avoid noise
    if (sectionText) {
      for (const pattern of skillPatterns) {
        const matches = sectionText.match(pattern);
        if (matches) {
          matches.forEach(skill => foundSkills.add(skill));
        }
      }
    }
    
    if (foundSkills.size > 0) {
      const skillsArray = Array.from(foundSkills);
      console.log('Pre-extracted skills:', skillsArray.join(', '));
      textContent = `VERIFIED SKILLS FROM CV: ${skillsArray.join(', ')}\n\n` + textContent;
    }
    
    console.log('Final cleaned text length:', textContent.length);

    // Use Lovable AI to extract structured information
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
            content: `You are a PRECISE CV parser. Extract ONLY legitimate information that appears in the CV context.

CRITICAL RULES:
1. NAME: Extract the full name ONLY if it appears at the top of the CV or in a clear name field. Look for:
   - Names near "CV", "Resume", or at document start
   - Format: First Middle Last or First Last
   - Ignore random capitalized words

2. EMAIL: Extract ONLY valid email addresses with @ and proper domain (.com, .org, etc.)

3. PHONE: Extract phone numbers that follow standard formats:
   - International: +XX XXX XXX XXXX
   - Local formats with area codes
   - Must have at least 10 digits

4. LINKS: Extract ONLY complete URLs:
   - LinkedIn profiles (linkedin.com/in/...)
   - GitHub profiles (github.com/...)
   - Portfolio websites
   - Professional social media

5. SKILLS (CRITICAL - BE SELECTIVE):
   - Extract ONLY skills mentioned in "Skills", "Technical Skills", "Experience", "Projects" sections
   - Programming languages: Python, Java, JavaScript, etc.
   - Frameworks: React, Angular, Django, etc.
   - Databases: SQL, PostgreSQL, MongoDB, etc.
   - Cloud/DevOps: AWS, Docker, Kubernetes, etc.
   - IGNORE: PDF artifacts, random words, partial words, special characters
   - IGNORE: Anything under 3 characters unless it's a well-known acronym (SQL, AWS, Git)
   - NO DUPLICATES: Return each unique skill once

VALIDATION:
- If something looks like noise or PDF artifact, DO NOT extract it
- Skills must be real technology names, not random text
- Return empty arrays if you cannot find legitimate information
- Quality over quantity - only extract what you're confident about`
          },
          {
            role: 'user',
            content: `Extract information from this CV. Be selective and only extract legitimate data:

IMPORTANT: 
- The text may contain pre-verified skills at the top - prioritize those
- Only extract skills that appear in proper context (skills section, work experience, projects)
- Ignore PDF artifacts, random characters, and noise
- Remove duplicates

CV Text:
${textContent.slice(0, 35000)}`
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
