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

// Advanced PDF text extraction
function extractTextFromPDF(bytes: Uint8Array): string {
  const decoder = new TextDecoder('utf-8', { fatal: false });
  const pdfText = decoder.decode(bytes);
  
  let extractedText = '';
  
  // Strategy 1: Extract text from stream objects
  const streamRegex = /stream\s*(.*?)\s*endstream/gs;
  const streams = pdfText.matchAll(streamRegex);
  
  for (const match of streams) {
    const streamContent = match[1];
    // Try to decode the stream
    const textInStream = streamContent
      .replace(/[^\x20-\x7E\n]/g, ' ') // Keep only printable ASCII
      .replace(/\s+/g, ' ')
      .trim();
    
    if (textInStream.length > 10) {
      extractedText += textInStream + ' ';
    }
  }
  
  // Strategy 2: Extract text between parentheses (common PDF format)
  const parenRegex = /\(([^)]{2,})\)/g;
  const parenMatches = pdfText.matchAll(parenRegex);
  
  for (const match of parenMatches) {
    let text = match[1]
      .replace(/\\n/g, ' ')
      .replace(/\\r/g, ' ')
      .replace(/\\t/g, ' ')
      .replace(/\\\(/g, '(')
      .replace(/\\\)/g, ')')
      .replace(/\\\\/g, '\\')
      .trim();
    
    if (text.length > 1) {
      extractedText += text + ' ';
    }
  }
  
  // Strategy 3: Extract text from TJ/Tj operators
  const tjRegex = /\[(.*?)\]\s*TJ/g;
  const tjMatches = pdfText.matchAll(tjRegex);
  
  for (const match of tjMatches) {
    const text = match[1]
      .replace(/[<>]/g, '')
      .replace(/\\/g, '')
      .trim();
    
    if (text.length > 1) {
      extractedText += text + ' ';
    }
  }
  
  // Clean up the final text
  extractedText = extractedText
    .replace(/\s+/g, ' ')
    .replace(/[^\x20-\x7E\n@+\-()./]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  
  return extractedText;
}

// Advanced heuristics for data extraction
function extractWithHeuristics(text: string): Partial<ParsedCV> {
  const result: Partial<ParsedCV> = {
    name: '',
    email: '',
    phone: '',
    links: [],
    skills: []
  };
  
  // Extract email
  const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
  const emails = text.match(emailRegex);
  if (emails && emails.length > 0) {
    result.email = emails[0];
  }
  
  // Extract phone (international and local formats)
  const phoneRegex = /(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g;
  const phones = text.match(phoneRegex);
  if (phones && phones.length > 0) {
    result.phone = phones[0].trim();
  }
  
  // Extract name (first capitalized words, usually at the beginning)
  const nameRegex = /^([A-Z][a-z]+(?: [A-Z][a-z]+){1,3})/m;
  const nameMatch = text.match(nameRegex);
  if (nameMatch) {
    result.name = nameMatch[1];
  }
  
  // Extract links (LinkedIn, GitHub, portfolio)
  const linkRegex = /(?:https?:\/\/)?(?:www\.)?(?:linkedin\.com\/in\/[A-Za-z0-9-]+|github\.com\/[A-Za-z0-9-]+|(?:[A-Za-z0-9-]+\.)+[A-Za-z]{2,}\/[^\s]*)/g;
  const links = text.match(linkRegex);
  if (links) {
    result.links = [...new Set(links)];
  }
  
  // Extract skills using comprehensive keyword matching
  const skillKeywords = [
    // Programming Languages
    'JavaScript', 'TypeScript', 'Python', 'Java', 'C\\+\\+', 'C#', 'Ruby', 'Go', 'Rust', 
    'Swift', 'Kotlin', 'PHP', 'Scala', 'R', 'Perl', 'Dart', 'Objective-C',
    // Frontend
    'React', 'Angular', 'Vue', 'Svelte', 'Next\\.js', 'Nuxt\\.js', 'jQuery', 'Bootstrap',
    'Tailwind', 'HTML', 'CSS', 'SASS', 'LESS', 'Webpack', 'Vite',
    // Backend
    'Node\\.js', 'Express', 'Django', 'Flask', 'Spring', '\\.NET', 'FastAPI', 'Laravel',
    'Ruby on Rails', 'ASP\\.NET', 'GraphQL', 'REST', 'API',
    // Databases
    'PostgreSQL', 'MySQL', 'MongoDB', 'Redis', 'Oracle', 'SQL Server', 'Supabase', 
    'Firebase', 'DynamoDB', 'Cassandra', 'SQLite', 'MariaDB', 'SQL',
    // Cloud & DevOps
    'AWS', 'Azure', 'GCP', 'Docker', 'Kubernetes', 'Jenkins', 'CI/CD', 'Terraform',
    'Ansible', 'CircleCI', 'GitLab CI', 'GitHub Actions', 'Heroku', 'Vercel', 'Netlify',
    // Tools
    'Git', 'GitHub', 'GitLab', 'Bitbucket', 'JIRA', 'VS Code', 'Linux', 'Unix', 
    'Agile', 'Scrum', 'Kanban', 'Figma', 'Adobe XD', 'Sketch',
    // Other
    'Machine Learning', 'Deep Learning', 'TensorFlow', 'PyTorch', 'Pandas', 'NumPy',
    'Data Science', 'Big Data', 'Hadoop', 'Spark', 'Elasticsearch', 'Nginx', 'Apache'
  ];
  
  const foundSkills = new Set<string>();
  
  for (const keyword of skillKeywords) {
    const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
    if (regex.test(text)) {
      // Find the actual matched text to preserve case
      const matches = text.match(regex);
      if (matches) {
        foundSkills.add(matches[0]);
      }
    }
  }
  
  result.skills = Array.from(foundSkills);
  
  return result;
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
    
    console.log('Extracting text from PDF with advanced parsing...');
    const extractedText = extractTextFromPDF(bytes);
    
    console.log('Extracted text preview:', extractedText.slice(0, 500));
    console.log('Total extracted length:', extractedText.length);
    
    if (!extractedText || extractedText.trim().length < 50) {
      throw new Error('Could not extract meaningful text from PDF');
    }

    // Extract data using heuristics
    console.log('Applying heuristics for data extraction...');
    const heuristicData = extractWithHeuristics(extractedText);
    
    console.log('Heuristic extraction result:', heuristicData);

    // Use Lovable AI to enhance and validate the extraction
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
            content: `You are a CV parser validator. You will receive extracted CV text and preliminary data extracted using heuristics.

YOUR TASK: Validate and enhance the extracted information. Fill in any missing fields if you can find them in the text.

RULES:
1. If preliminary data has a field filled, verify it's correct against the text
2. If a field is empty, try to extract it from the text
3. For skills: Add any REAL technical skills you find that were missed
4. Remove any invalid or nonsensical data
5. Maintain the same format as the preliminary data

Focus on accuracy and completeness.`
          },
          {
            role: 'user',
            content: `CV Text:
${extractedText.slice(0, 30000)}

Preliminary Extraction:
${JSON.stringify(heuristicData, null, 2)}

Please validate and enhance this data.`
          }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "extract_cv_data",
              description: "Extract and validate CV information",
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
      
      // Fallback to heuristic data if AI fails
      console.log('AI failed, using heuristic data as fallback');
      const parsedCV: ParsedCV = {
        name: heuristicData.name || 'Unknown',
        email: heuristicData.email || '',
        phone: heuristicData.phone || '',
        links: heuristicData.links || [],
        skills: heuristicData.skills || []
      };
      
      return new Response(
        JSON.stringify(parsedCV),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        }
      );
    }

    const aiData = await aiResponse.json();
    console.log('AI response received');

    let parsedCV: ParsedCV;

    // Extract from tool call response
    if (aiData.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments) {
      const args = aiData.choices[0].message.tool_calls[0].function.arguments;
      parsedCV = typeof args === 'string' ? JSON.parse(args) : args;
    } else {
      // Fallback to heuristic data
      parsedCV = {
        name: heuristicData.name || 'Unknown',
        email: heuristicData.email || '',
        phone: heuristicData.phone || '',
        links: heuristicData.links || [],
        skills: heuristicData.skills || []
      };
    }

    // Clean up skills
    if (parsedCV.skills && Array.isArray(parsedCV.skills)) {
      const cleanedSkills = new Set<string>();
      
      parsedCV.skills.forEach((skill: string) => {
        if (skill && 
            skill.length >= 2 &&
            !/^[^a-zA-Z0-9]+$/.test(skill) &&
            !/[|\\\/\[\]{}@#$%^&*<>]/.test(skill)) {
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
