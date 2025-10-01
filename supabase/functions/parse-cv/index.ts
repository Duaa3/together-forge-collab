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

    // Read file content
    const arrayBuffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    
    // Extract text content using comprehensive PDF extraction
    const decoder = new TextDecoder('utf-8', { fatal: false });
    let rawText = decoder.decode(uint8Array);
    let textContent = '';
    
    // Enhanced PDF text extraction
    if (file.name.toLowerCase().endsWith('.pdf')) {
      // Extract text between parentheses (basic PDF text objects)
      const textInParens = rawText.match(/\(([^)]+)\)/g);
      if (textInParens) {
        textContent += textInParens.map(m => m.slice(1, -1)).join(' ') + ' ';
      }
      
      // Extract text between angle brackets (PDF hex strings)
      const hexStrings = rawText.match(/<([0-9A-Fa-f\s]+)>/g);
      if (hexStrings) {
        hexStrings.forEach(hex => {
          const cleaned = hex.slice(1, -1).replace(/\s/g, '');
          try {
            // Convert hex to ASCII
            let str = '';
            for (let i = 0; i < cleaned.length; i += 2) {
              const charCode = parseInt(cleaned.substr(i, 2), 16);
              if (charCode >= 32 && charCode < 127) {
                str += String.fromCharCode(charCode);
              }
            }
            textContent += str + ' ';
          } catch (e) {
            // Skip invalid hex strings
          }
        });
      }
      
      // Extract text after BT/ET markers (PDF text blocks)
      const btMatches = rawText.match(/BT\s+(.*?)\s+ET/gs);
      if (btMatches) {
        btMatches.forEach(block => {
          const textMatch = block.match(/\[([^\]]+)\]/g);
          if (textMatch) {
            textContent += textMatch.map(m => m.slice(1, -1)).join(' ') + ' ';
          }
        });
      }
      
      // Clean up the extracted text
      textContent = textContent
        .replace(/\\[nrt]/g, ' ')  // Remove escape sequences
        .replace(/\s+/g, ' ')      // Collapse whitespace
        .trim();
    } else {
      // For non-PDF files, use raw text
      textContent = rawText;
    }

    console.log('Text content length:', textContent.length);

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
            content: `You are an expert CV/Resume parser. Extract information even from poorly formatted or fragmented text.

IMPORTANT INSTRUCTIONS:
- Look for candidate name at the top of the document or near "CV" or "Resume"
- Email: Look for text matching email patterns (contains @ and domain)
- Phone: Look for number patterns (may include +, country codes, spaces, dashes)
- Links: Extract any URLs (LinkedIn, GitHub, portfolios, etc.)
- Skills: Extract ALL technical, professional, and soft skills mentioned

Be flexible with formatting and extract information even if it's fragmented or mixed with other characters.
If you cannot find a field, return empty string for name/email/phone or empty array for links/skills.
Do NOT make up information - only extract what's actually present.`
          },
          {
            role: 'user',
            content: `Extract all information from this CV text. Be thorough and extract skills even if they appear scattered:\n\n${textContent.slice(0, 20000)}`
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
