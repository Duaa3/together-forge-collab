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
  
  // Clean text - remove file paths, metadata, PDF artifacts
  const cleanText = text
    .replace(/curriculum\s*vitae|resume|cv\s*\//gi, '')
    .replace(/\.pdf|\.doc|\.docx/gi, '')
    .replace(/\b(page|of)\s+\d+/gi, '')
    .replace(/\b\d{4}[-/]\d{2}[-/]\d{2}\b/g, '') // Remove dates
    .replace(/google\s*docs|renderer|skia|pdf\s*m\d+/gi, '') // Remove PDF artifacts
    .trim();
  
  const lines = cleanText
    .split(/[\n\r]+/)
    .map(l => l.trim())
    .filter(l => l.length > 2 && l.length < 100); // Filter reasonable line lengths
  
  console.log(`Processing ${lines.length} lines for name extraction`);
  
  // Common stop words to avoid
  const stopWords = [
    'resume', 'curriculum', 'vitae', 'profile', 'contact', 'objective',
    'education', 'experience', 'skills', 'work history', 'employment',
    'dear sir', 'dear madam', 'project manager', 'software engineer',
    'january', 'february', 'march', 'april', 'may', 'june', 'july',
    'august', 'september', 'october', 'november', 'december',
    'google', 'docs', 'renderer', 'new skia', 'skia', 'pdf'
  ];
  
  // Strategy 1: Look for explicit "Name:" label
  for (const line of lines.slice(0, 20)) {
    const labelMatch = line.match(/(?:name|full\s*name|candidate)\s*:?\s*([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z'-]+){1,3})/i);
    if (labelMatch && labelMatch[1]) {
      const name = labelMatch[1].trim();
      const hasStopWord = stopWords.some(sw => name.toLowerCase().includes(sw));
      if (!hasStopWord) {
        console.log(`Found name with label: ${name}`);
        return name;
      }
    }
  }
  
  // Strategy 2: First clean lines with proper name format (2-4 capitalized words)
  for (const line of lines.slice(0, 25)) {
    // Skip lines that are clearly not names
    if (line.match(/^(http|www|email|phone|address|linkedin|github|\d+|@|\.com|\.net)/i)) continue;
    if (line.length < 5 || line.length > 50) continue;
    
    // Check if line contains stop words
    const hasStopWord = stopWords.some(sw => line.toLowerCase().includes(sw));
    if (hasStopWord) continue;
    
    // Match 2-4 capitalized words (typical name format)
    const nameMatch = line.match(/^([A-Z][a-z]+(?:\s+[A-Z]\.?)?(?:\s+[A-Z][a-z]+(?:-[A-Z][a-z]+)?){1,3})$/);
    if (nameMatch && nameMatch[1]) {
      const words = nameMatch[1].split(/\s+/).filter(w => w.length > 1 && !w.match(/^[A-Z]\.$/));
      // Validate it looks like a real name (at least 2 words, each at least 2 chars)
      if (words.length >= 2 && words.length <= 4 && words.every(w => w.length >= 2)) {
        console.log(`Found name in early lines: ${nameMatch[1]}`);
        return nameMatch[1].trim();
      }
    }
  }
  
  // Strategy 3: Look for name pattern in text
  const beginning = lines.slice(0, 40).join(' ');
  const namePatterns = [
    /\b([A-Z][a-z]{2,}\s+[A-Z][a-z]{2,}\s+[A-Z][a-z]{2,})\b/, // Three names
    /\b([A-Z][a-z]{2,}\s+[A-Z]\.\s+[A-Z][a-z]{2,})\b/, // First M. Last
    /\b([A-Z][a-z]{2,}\s+[A-Z][a-z]{2,})\b/, // Two names
  ];
  
  for (const pattern of namePatterns) {
    const matches = [...beginning.matchAll(new RegExp(pattern, 'g'))];
    for (const match of matches) {
      if (match && match[1]) {
        const candidate = match[1].trim();
        const hasStopWord = stopWords.some(sw => candidate.toLowerCase().includes(sw));
        if (!hasStopWord && candidate.length >= 5) {
          console.log(`Found name with pattern: ${candidate}`);
          return candidate;
        }
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
    const rawText = decoder.decode(uint8Array);
    
    let extractedText = '';
    const textParts: string[] = [];
    
    // Method 1: Extract from stream objects with comprehensive operators
    const streamPattern = /stream\s+([\s\S]*?)\s+endstream/g;
    const streams = [...rawText.matchAll(streamPattern)];
    
    console.log(`Found ${streams.length} stream objects`);
    
    for (const stream of streams) {
      const streamContent = stream[1];
      
      // Extract text from various PDF text operators
      // Tj operator: (text) Tj
      const tjMatches = streamContent.matchAll(/\(([^)\\]*(?:\\.[^)\\]*)*)\)\s*Tj/g);
      for (const match of tjMatches) {
        textParts.push(match[1]);
      }
      
      // TJ operator: [(text)] TJ
      const tjArrayMatches = streamContent.matchAll(/\[\s*\(([^)\\]*(?:\\.[^)\\]*)*)\)\s*\]\s*TJ/g);
      for (const match of tjArrayMatches) {
        textParts.push(match[1]);
      }
      
      // ' operator: (text) '
      const quoteMatches = streamContent.matchAll(/\(([^)\\]*(?:\\.[^)\\]*)*)\)\s*'/g);
      for (const match of quoteMatches) {
        textParts.push(match[1]);
      }
    }
    
    // Method 2: Extract from BT/ET blocks (text blocks)
    const btPattern = /BT\s+([\s\S]*?)\s+ET/g;
    const textBlocks = [...rawText.matchAll(btPattern)];
    
    console.log(`Found ${textBlocks.length} BT/ET text blocks`);
    
    for (const block of textBlocks) {
      const blockContent = block[1];
      
      // Extract all text within parentheses in text blocks
      const parenthesesMatches = blockContent.matchAll(/\(([^)\\]*(?:\\.[^)\\]*)*)\)/g);
      for (const match of parenthesesMatches) {
        textParts.push(match[1]);
      }
    }
    
    // Method 3: Global parentheses extraction (fallback)
    if (textParts.length < 20) {
      console.log('Low extraction, using global parentheses method...');
      const globalMatches = rawText.matchAll(/\(([^)\\]{3,}(?:\\.[^)\\]*)*)\)/g);
      for (const match of globalMatches) {
        const text = match[1];
        // Filter out binary/hex data
        if (!/^[\x00-\x1F\x7F-\xFF]{5,}/.test(text)) {
          textParts.push(text);
        }
      }
    }
    
    // Process and decode extracted text parts
    for (const part of textParts) {
      let decoded = part
        // Decode PDF escape sequences
        .replace(/\\n/g, '\n')
        .replace(/\\r/g, '\n')
        .replace(/\\t/g, '\t')
        .replace(/\\\(/g, '(')
        .replace(/\\\)/g, ')')
        .replace(/\\\\/g, '\\')
        .replace(/\\(\d{3})/g, (_, octal) => String.fromCharCode(parseInt(octal, 8)))
        // Clean up
        .replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, ' ');
      
      extractedText += decoded + ' ';
    }
    
    // Clean up final text
    let finalText = extractedText
      .replace(/\s+/g, ' ') // Normalize whitespace
      .replace(/([a-z])([A-Z])/g, '$1 $2') // Add space between camelCase
      .replace(/([a-zA-Z])(\d)/g, '$1 $2') // Add space between letters and numbers
      .replace(/(\d)([a-zA-Z])/g, '$1 $2')
      .trim();
    
    console.log(`Text extracted, length: ${finalText.length}`);
    console.log(`First 500 chars: ${finalText.substring(0, 500)}`);
    
    if (finalText.length < 50) {
      throw new Error(`Extracted text is too short (${finalText.length} chars)`);
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
