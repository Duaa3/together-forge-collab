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
            content: `You are an expert CV/Resume parser specialized in extracting information from noisy or poorly formatted text.

CRITICAL EXTRACTION RULES:
1. NAME: Look for capitalized full names at the start, near "CV", "Resume", or after "Name:"
2. EMAIL: Find patterns with @ symbol (e.g., name@domain.com)
3. PHONE: Find number sequences with + country codes, dashes, spaces, or parentheses
4. LINKS: Extract any URLs or domains (linkedin.com, github.com, etc.)
5. SKILLS: Extract ANY technical, professional, or soft skills mentioned throughout the text

IMPORTANT:
- Work with fragmented or noisy text - piece together information
- If text is garbled, look for partial matches (e.g., "python", "java", "communication")
- Extract skills even if they appear in lists, sentences, or mixed with other text
- Common skill categories: programming languages, frameworks, tools, soft skills, certifications
- Don't invent information - only extract what's present
- If truly nothing is found for a field, return empty string/array`
          },
          {
            role: 'user',
            content: `Parse this CV text and extract all information. The text may be fragmented or noisy, so be thorough:\n\n${textContent.slice(0, 25000)}`
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
