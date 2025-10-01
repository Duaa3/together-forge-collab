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

// Clean PDF metadata and artifacts from text
function cleanPDFMetadata(text: string): string {
  // Remove common PDF metadata patterns aggressively
  const metadataPatterns = [
    /Skia\/PDF\s+\S+/gi,
    /Google\s+Docs?\s+Renderer/gi,
    /Adobe\s+Identity/gi,
    /endstream\s+endobj/gi,
    /\/Type\s+\/Font/gi,
    /\/Subtype\s+\/Type\d+/gi,
    /\/BaseFont\s+\/[A-Z]+\+\w+/gi,
    /\/Encoding\s+\/\w+/gi,
    /\/DescendantFonts/gi,
    /\/ToUnicode/gi,
    /\/Length\d?\s+\d+/gi,
    /\/Filter\s+\/\w+/gi,
    /\/FlateDecode/gi,
    /<<[^>]*>>/g,
    /\d+\s+0\s+obj/g,
    /stream\s+[^a-zA-Z]*/gi,
  ];
  
  let cleaned = text;
  for (const pattern of metadataPatterns) {
    cleaned = cleaned.replace(pattern, ' ');
  }
  
  // Remove excessive whitespace
  cleaned = cleaned.replace(/\s+/g, ' ').trim();
  
  return cleaned;
}

const SKILLS_DICT = [
  // Programming Languages
  'javascript', 'js', 'typescript', 'ts', 'python', 'java', 'c++', 'cpp', 'c#', 'csharp',
  'ruby', 'php', 'swift', 'kotlin', 'go', 'golang', 'rust', 'scala', 'r', 'matlab',
  'perl', 'shell', 'bash', 'powershell', 'objective-c', 'dart', 'elixir', 'haskell',
  'lua', 'assembly', 'c', 'vb.net', 'f#', 'clojure', 'erlang', 'groovy',
  
  // Web Frontend
  'html', 'html5', 'css', 'css3', 'sass', 'scss', 'less', 'tailwind', 'tailwindcss',
  'bootstrap', 'material-ui', 'mui', 'chakra ui', 'ant design', 'semantic ui',
  'react', 'reactjs', 'react.js', 'angular', 'angularjs', 'vue', 'vuejs', 'vue.js',
  'svelte', 'ember', 'backbone', 'jquery', 'next.js', 'nextjs', 'nuxt.js', 'nuxtjs',
  'gatsby', 'remix', 'astro', 'webpack', 'vite', 'rollup', 'parcel', 'babel', 'turbopack',
  'redux', 'mobx', 'zustand', 'recoil', 'context api', 'react query', 'swr', 'tanstack query',
  'styled-components', 'emotion', 'css modules', 'postcss',
  
  // Web Backend
  'node.js', 'nodejs', 'express', 'expressjs', 'nestjs', 'fastify', 'koa', 'hapi',
  'django', 'flask', 'fastapi', 'spring', 'spring boot', 'asp.net', '.net core', '.net',
  'laravel', 'symfony', 'codeigniter', 'yii', 'cakephp',
  'rails', 'ruby on rails', 'sinatra', 'gin', 'fiber', 'echo', 'chi',
  'actix', 'axum', 'rocket', 'warp',
  
  // Mobile Development
  'react native', 'flutter', 'ionic', 'xamarin', 'cordova', 'phonegap', 'capacitor',
  'swift ui', 'swiftui', 'jetpack compose', 'android', 'ios', 'kotlin multiplatform',
  
  // Databases & Data
  'sql', 'mysql', 'postgresql', 'postgres', 'mongodb', 'mongo', 'redis', 'cassandra',
  'oracle', 'sqlite', 'mariadb', 'dynamodb', 'couchdb', 'neo4j', 'graphdb', 'arangodb',
  'elasticsearch', 'solr', 'memcached', 'influxdb', 'timescaledb', 'cockroachdb',
  'firebase', 'firestore', 'supabase', 'planetscale', 'neon', 'turso',
  'prisma', 'typeorm', 'sequelize', 'mongoose', 'knex', 'drizzle',
  'sql alchemy', 'sqlalchemy', 'hibernate', 'entity framework', 'dapper',
  'nosql', 'sql server', 'mssql', 'db2',
  
  // Cloud Platforms
  'aws', 'amazon web services', 'azure', 'microsoft azure', 'gcp', 'google cloud',
  'heroku', 'digitalocean', 'linode', 'vultr', 'netlify', 'vercel', 'cloudflare',
  'railway', 'render', 'fly.io', 'deno deploy',
  
  // Cloud Services
  'ec2', 's3', 'lambda', 'rds', 'dynamodb', 'cloudfront', 'route53', 'elb', 'alb',
  'ecs', 'eks', 'fargate', 'sqs', 'sns', 'cloudwatch', 'iam', 'cognito',
  'azure functions', 'azure devops', 'azure ad', 'blob storage', 'azure sql',
  'compute engine', 'cloud functions', 'cloud run', 'bigquery', 'cloud storage',
  'app engine', 'cloud sql', 'pub/sub',
  
  // DevOps & CI/CD
  'docker', 'kubernetes', 'k8s', 'jenkins', 'gitlab', 'gitlab ci', 'github actions',
  'circleci', 'travis ci', 'bitbucket pipelines', 'azure pipelines', 'teamcity',
  'terraform', 'ansible', 'puppet', 'chef', 'saltstack', 'vagrant', 'packer',
  'helm', 'argocd', 'flux', 'tekton', 'spinnaker', 'rancher', 'openshift',
  'ci/cd', 'devops', 'gitops', 'infrastructure as code', 'iac', 'continuous integration',
  'continuous deployment', 'continuous delivery',
  
  // Monitoring & Logging
  'prometheus', 'grafana', 'datadog', 'new relic', 'splunk', 'elk stack', 'elk',
  'logstash', 'kibana', 'fluentd', 'sentry', 'rollbar', 'bugsnag',
  'pagerduty', 'opsgenie', 'cloudwatch', 'stackdriver', 'application insights',
  
  // Testing
  'jest', 'mocha', 'chai', 'jasmine', 'karma', 'cypress', 'playwright', 'testcafe',
  'selenium', 'webdriver', 'puppeteer', 'pytest', 'unittest', 'junit', 'testng',
  'rspec', 'phpunit', 'vitest', 'testing library', 'react testing library',
  'unit testing', 'integration testing', 'e2e testing', 'tdd', 'bdd',
  'test automation', 'qa', 'quality assurance',
  
  // API & Integration
  'rest api', 'restful', 'rest', 'graphql', 'grpc', 'soap', 'websocket', 'socket.io',
  'api design', 'microservices', 'service mesh', 'api gateway', 'oauth', 'oauth2',
  'jwt', 'openapi', 'swagger', 'postman', 'insomnia', 'api development',
  
  // Version Control
  'git', 'github', 'gitlab', 'bitbucket', 'svn', 'mercurial', 'perforce',
  'git flow', 'trunk based development', 'version control',
  
  // Project Management
  'jira', 'confluence', 'trello', 'asana', 'monday', 'notion', 'clickup', 'linear',
  'agile', 'scrum', 'kanban', 'waterfall', 'lean', 'safe', 'xp', 'extreme programming',
  'project management', 'product management', 'stakeholder management',
  
  // AI & Machine Learning
  'machine learning', 'ml', 'deep learning', 'dl', 'nlp', 'natural language processing',
  'computer vision', 'cv', 'tensorflow', 'pytorch', 'keras', 'scikit-learn', 'sklearn',
  'pandas', 'numpy', 'scipy', 'matplotlib', 'seaborn', 'plotly', 'dask',
  'opencv', 'yolo', 'transformer', 'bert', 'gpt', 'llm', 'langchain', 'llamaindex',
  'hugging face', 'huggingface', 'stable diffusion', 'gan', 'cnn', 'rnn', 'lstm',
  'reinforcement learning', 'supervised learning', 'unsupervised learning',
  'ai', 'artificial intelligence', 'neural networks', 'data science',
  'jupyter', 'colab', 'kaggle',
  
  // Data Engineering
  'etl', 'data pipeline', 'data warehouse', 'data lake', 'big data', 'data engineering',
  'apache spark', 'spark', 'hadoop', 'kafka', 'airflow', 'luigi', 'prefect', 'dagster',
  'dbt', 'snowflake', 'redshift', 'bigquery', 'databricks', 'delta lake',
  'data modeling', 'data visualization', 'tableau', 'power bi', 'looker', 'metabase',
  
  // Security
  'security', 'cybersecurity', 'infosec', 'penetration testing', 'ethical hacking',
  'owasp', 'ssl', 'tls', 'encryption', 'authentication', 'authorization',
  'oauth', 'saml', 'ldap', 'active directory', 'vault', 'secrets management',
  'devsecops', 'security testing', 'vulnerability assessment',
  
  // Blockchain
  'blockchain', 'ethereum', 'solidity', 'web3', 'smart contracts', 'defi',
  'nft', 'cryptocurrency', 'bitcoin', 'hyperledger', 'solana', 'polygon',
  
  // Design & UX
  'ui', 'ux', 'ui/ux', 'figma', 'sketch', 'adobe xd', 'invision', 'zeplin', 'framer',
  'photoshop', 'illustrator', 'after effects', 'user experience', 'user interface',
  'wireframing', 'prototyping', 'design systems', 'interaction design',
  
  // Other Tools
  'linux', 'unix', 'windows', 'macos', 'vim', 'emacs', 'vscode', 'visual studio',
  'intellij', 'pycharm', 'webstorm', 'sublime', 'atom', 'eclipse',
  'nginx', 'apache', 'tomcat', 'iis', 'rabbitmq', 'redis', 'memcached',
  'elasticsearch', 'logstash', 'kibana', 'grafana', 'prometheus',
  
  // Methodologies & Practices
  'solid', 'clean code', 'design patterns', 'mvc', 'mvvm', 'clean architecture',
  'domain driven design', 'ddd', 'event driven', 'cqrs', 'serverless',
  'pair programming', 'code review', 'refactoring',
  
  // Soft Skills
  'leadership', 'communication', 'problem solving', 'teamwork', 'collaboration',
  'critical thinking', 'time management', 'adaptability', 'creativity',
  'mentoring', 'coaching', 'presentation', 'technical writing', 'documentation'
];

function extractEmail(text: string): string[] {
  // More comprehensive email pattern
  const emailPattern = /\b[a-zA-Z0-9][a-zA-Z0-9._%+-]*@[a-zA-Z0-9][a-zA-Z0-9.-]*\.[a-zA-Z]{2,}\b/gi;
  const matches = text.match(emailPattern);
  const emails = matches ? [...new Set(matches)].filter(email => {
    // Filter out common false positives
    const invalid = ['example.com', 'test.com', 'email.com', 'domain.com'];
    return !invalid.some(inv => email.toLowerCase().includes(inv));
  }) : [];
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
  
  // Clean metadata first
  const cleaned = cleanPDFMetadata(text);
  
  const lines = cleaned.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  console.log(`Processing ${lines.length} lines for name extraction`);
  
  // Score-based name extraction
  const nameCandidates: { name: string; score: number; position: number }[] = [];
  
  for (let i = 0; i < Math.min(15, lines.length); i++) {
    const line = lines[i];
    
    // Skip lines that are clearly not names
    if (line.length < 3 || line.length > 60) continue;
    if (/^[0-9]+$/.test(line)) continue;
    if (/^[^a-zA-Z]*$/.test(line)) continue;
    if (line.toLowerCase().includes('curriculum') || 
        line.toLowerCase().includes('vitae') ||
        line.toLowerCase().includes('resume') ||
        line.toLowerCase().includes('cv')) continue;
    
    let score = 0;
    
    // Higher score for names at the very beginning
    score += Math.max(0, 20 - i * 2);
    
    // Check if line matches name pattern (2-4 words, starts with capital)
    const namePattern = /^[A-Z][a-z]+(?:\s+[A-Z][a-zA-Z-]+){1,4}$/;
    if (namePattern.test(line)) {
      score += 30;
      console.log(`Found name pattern candidate (score ${score}): ${line}`);
    }
    
    // Check for common name structures
    const words = line.split(/\s+/);
    if (words.length >= 2 && words.length <= 5) {
      const allCapitalized = words.every(w => /^[A-Z]/.test(w));
      if (allCapitalized) score += 20;
    }
    
    // Penalize if contains special characters (except hyphens and apostrophes)
    if (/[^a-zA-Z\s'-]/.test(line)) score -= 15;
    
    // Penalize very short or very long lines
    if (line.length < 8) score -= 5;
    if (line.length > 40) score -= 10;
    
    if (score > 0) {
      nameCandidates.push({ name: line, score, position: i });
    }
  }
  
  // Sort by score and return best candidate
  nameCandidates.sort((a, b) => b.score - a.score);
  
  if (nameCandidates.length > 0) {
    console.log(`Best name candidate (score ${nameCandidates[0].score}): ${nameCandidates[0].name}`);
    return nameCandidates[0].name;
  }
  
  return 'Unknown Candidate';
}

function extractSkills(text: string): string[] {
  console.log('Extracting skills...');
  
  // Clean metadata first
  const cleaned = cleanPDFMetadata(text);
  const normalizedText = cleaned.toLowerCase();
  
  // Escape special regex characters in skill names BEFORE using them
  const escapeRegex = (str: string) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  
  const foundSkills = new Set<string>();
  
  // Look for each skill in the dictionary with context
  for (const skill of SKILLS_DICT) {
    const skillLower = skill.toLowerCase();
    const escapedSkill = escapeRegex(skillLower);
    
    // Skip single character skills unless they're common (C, R)
    if (skillLower.length === 1 && !['c', 'r'].includes(skillLower)) {
      continue;
    }
    
    // Create context-aware pattern with escaped skill
    const contextPattern = new RegExp(
      `(?:^|\\s|[,.:;()])${escapedSkill}(?:$|\\s|[,.:;())])`,
      'i'
    );
    
    if (contextPattern.test(normalizedText)) {
      // For single letter skills, require stronger context
      if (skillLower.length === 1) {
        const strongContextPattern = new RegExp(
          `(?:language|programming|proficient|skilled|experience)\\s+(?:in\\s+)?${escapedSkill}(?:\\s|[,.:;]|$)`,
          'i'
        );
        if (strongContextPattern.test(normalizedText)) {
          foundSkills.add(skill);
        }
      } else {
        foundSkills.add(skill);
      }
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
    
    // Convert to string preserving byte values
    let pdfData = '';
    for (let i = 0; i < uint8Array.length; i++) {
      pdfData += String.fromCharCode(uint8Array[i]);
    }
    
    console.log('PDF data loaded, searching for text content...');
    
    const textParts: string[] = [];
    
    // Method 1: Extract from content streams
    // Find all stream objects
    const streamRegex = /stream[\r\n]+([\s\S]*?)[\r\n]+endstream/g;
    let streamMatch;
    let streamCount = 0;
    
    while ((streamMatch = streamRegex.exec(pdfData)) !== null) {
      streamCount++;
      const streamData = streamMatch[1];
      
      // Check if stream is compressed (has FlateDecode filter)
      const objectStart = pdfData.lastIndexOf('<<', streamMatch.index);
      const objectHeader = pdfData.substring(objectStart, streamMatch.index);
      const isCompressed = /\/Filter\s*\/FlateDecode/.test(objectHeader);
      
      if (isCompressed) {
        console.log(`Stream ${streamCount} is compressed, attempting to extract readable text`);
        try {
          // Try to extract any readable text fragments from compressed stream
          const readableText = streamData.match(/[a-zA-Z0-9@.,;:'\-\s]{3,}/g);
          if (readableText && readableText.length > 0) {
            textParts.push(...readableText.filter(t => t.trim().length > 2));
          }
        } catch (e) {
          console.log(`Failed to process compressed stream ${streamCount}:`, e);
        }
        continue;
      }
      
      // Extract text from uncompressed stream using PDF text operators
      const textMatches = [
        ...streamData.matchAll(/\(((?:[^()\\]|\\.)*)\)\s*Tj/g),
        ...streamData.matchAll(/\(((?:[^()\\]|\\.)*)\)\s*TJ/g),
        ...streamData.matchAll(/\[((?:[^\[\]\\]|\\.)*)\]\s*TJ/g),
        ...streamData.matchAll(/\(((?:[^()\\]|\\.)*)\)\s*'/g),
        ...streamData.matchAll(/\(((?:[^()\\]|\\.)*)\)\s*"/g),
      ];
      
      for (const match of textMatches) {
        if (match[1]) {
          textParts.push(match[1]);
        }
      }
    }
    
    console.log(`Found ${streamCount} streams, extracted ${textParts.length} text fragments from content streams`);
    
    // Method 2: Extract from text objects (BT...ET blocks)
    const textObjectRegex = /BT\s+([\s\S]*?)\s+ET/g;
    let textObjMatch;
    let textObjCount = 0;
    
    while ((textObjMatch = textObjectRegex.exec(pdfData)) !== null) {
      textObjCount++;
      const textBlock = textObjMatch[1];
      
      // Extract all text in parentheses from this block
      const textInParens = textBlock.matchAll(/\(((?:[^()\\]|\\.)*)\)/g);
      for (const match of textInParens) {
        if (match[1] && match[1].trim()) {
          textParts.push(match[1]);
        }
      }
    }
    
    console.log(`Found ${textObjCount} text objects (BT/ET blocks), total fragments: ${textParts.length}`);
    
    // Method 3: Global fallback - extract all parenthesized strings that look like text
    if (textParts.length < 20) {
      console.log('Low extraction rate, trying global text extraction...');
      const globalTextRegex = /\(((?:[^()\\]|\\.){3,})\)/g;
      let globalMatch;
      
      while ((globalMatch = globalTextRegex.exec(pdfData)) !== null) {
        const text = globalMatch[1];
        // Filter: must have mostly printable ASCII or common chars
        const printableCount = (text.match(/[a-zA-Z0-9\s@.,;:()\-_]/g) || []).length;
        if (printableCount > text.length * 0.5) {
          textParts.push(text);
        }
      }
      
      console.log(`Global extraction added more fragments, total now: ${textParts.length}`);
    }
    
    if (textParts.length === 0) {
      throw new Error('No text found in PDF. The PDF may be image-based or use unsupported encoding.');
    }
    
    // Decode PDF text strings
    const decodedParts: string[] = [];
    for (const part of textParts) {
      let decoded = part;
      
      // Handle PDF string escape sequences
      decoded = decoded
        .replace(/\\n/g, '\n')
        .replace(/\\r/g, '\n')
        .replace(/\\t/g, '\t')
        .replace(/\\b/g, '\b')
        .replace(/\\f/g, '\f')
        .replace(/\\\(/g, '(')
        .replace(/\\\)/g, ')')
        .replace(/\\\\/g, '\\')
        .replace(/\\'/g, "'")
        .replace(/\\"/g, '"');
      
      // Handle octal escape sequences (\ddd)
      decoded = decoded.replace(/\\([0-7]{1,3})/g, (_, oct) => {
        const code = parseInt(oct, 8);
        return code >= 32 && code <= 126 ? String.fromCharCode(code) : ' ';
      });
      
      // Clean up control characters but keep newlines and tabs
      decoded = decoded.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
      
      if (decoded.trim().length > 0) {
        decodedParts.push(decoded.trim());
      }
    }
    
    console.log(`Decoded ${decodedParts.length} text parts`);
    
    // Join all parts with spaces
    let fullText = decodedParts.join(' ');
    
    // Clean up the text
    fullText = fullText
      // Normalize whitespace
      .replace(/\s+/g, ' ')
      // Add spaces between camelCase
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      // Preserve line breaks for sections
      .replace(/([a-z])\s+([A-Z][a-z])/g, '$1\n$2')
      .trim();
    
    console.log(`Final text length: ${fullText.length} characters`);
    console.log(`Preview (first 500 chars): ${fullText.substring(0, 500)}`);
    
    if (fullText.length < 50) {
      throw new Error(`Extracted text too short (${fullText.length} chars). PDF may be image-based or corrupted.`);
    }
    
    // Validate text quality - check for reasonable character distribution
    const alphaNumCount = (fullText.match(/[a-zA-Z0-9]/g) || []).length;
    const textQuality = alphaNumCount / fullText.length;
    
    console.log(`Text quality score: ${(textQuality * 100).toFixed(1)}% alphanumeric`);
    
    if (textQuality < 0.3) {
      console.warn('Low text quality detected, extraction may be unreliable');
    }
    
    return fullText;
    
  } catch (error) {
    console.error('PDF extraction error:', error);
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`PDF text extraction failed: ${errorMsg}`);
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
