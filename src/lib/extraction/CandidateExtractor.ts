export interface ExtractedCandidate {
  name: string;
  email: string;
  phone: string;
  skills: string[];
  links: {
    github?: string;
    linkedin?: string;
  };
}

export class CandidateExtractor {
  // Enhanced email patterns to catch more formats
  private static readonly EMAIL_REGEX = /\b[A-Za-z0-9._%+\-']+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}\b/gi;
  
  // Multiple phone patterns for international formats
  private static readonly PHONE_PATTERNS = [
    /\+?\d{1,3}[-.\s]?\(?\d{1,4}\)?[-.\s]?\d{1,4}[-.\s]?\d{1,4}[-.\s]?\d{1,9}/g, // International
    /\(\d{3}\)\s?\d{3}[-.\s]?\d{4}/g, // (123) 456-7890
    /\d{3}[-.\s]\d{3}[-.\s]\d{4}/g, // 123-456-7890
    /\d{10,}/g // 1234567890
  ];
  
  // Enhanced social media patterns
  private static readonly GITHUB_REGEX = /(?:https?:\/\/)?(?:www\.)?github\.com\/([a-zA-Z0-9_-]+)(?:\/)?/gi;
  private static readonly LINKEDIN_REGEX = /(?:https?:\/\/)?(?:www\.)?linkedin\.com\/in\/([a-zA-Z0-9_-]+)(?:\/)?/gi;

  private static readonly COMMON_SKILLS = [
    // Programming Languages
    'javascript', 'js', 'typescript', 'ts', 'python', 'java', 'c++', 'cpp', 'c#', 'csharp',
    'ruby', 'php', 'swift', 'kotlin', 'go', 'golang', 'rust', 'scala', 'r', 'matlab',
    'perl', 'shell', 'bash', 'powershell', 'objective-c', 'dart', 'elixir', 'haskell',
    
    // Frontend Frameworks & Libraries
    'react', 'react.js', 'reactjs', 'vue', 'vue.js', 'vuejs', 'angular', 'angularjs',
    'svelte', 'ember', 'backbone', 'jquery', 'preact', 'solid', 'qwik',
    
    // Frontend Technologies
    'html', 'html5', 'css', 'css3', 'sass', 'scss', 'less', 'tailwind', 'tailwindcss',
    'bootstrap', 'material-ui', 'mui', 'chakra ui', 'styled-components', 'emotion',
    
    // Build Tools & Bundlers
    'webpack', 'vite', 'rollup', 'parcel', 'esbuild', 'turbopack', 'gulp', 'grunt',
    
    // Meta Frameworks
    'next.js', 'nextjs', 'nuxt', 'nuxt.js', 'gatsby', 'remix', 'astro', 'sveltekit',
    
    // State Management
    'redux', 'mobx', 'zustand', 'recoil', 'jotai', 'xstate', 'pinia', 'vuex',
    
    // Backend Frameworks
    'node.js', 'nodejs', 'node', 'express', 'express.js', 'fastify', 'koa', 'hapi',
    'django', 'flask', 'fastapi', 'spring', 'spring boot', 'asp.net', '.net', 'dotnet',
    'laravel', 'symfony', 'rails', 'ruby on rails', 'nestjs', 'nest.js', 'adonis',
    
    // API Technologies
    'rest', 'rest api', 'restful', 'graphql', 'grpc', 'soap', 'websocket', 'websockets',
    'microservices', 'api gateway', 'openapi', 'swagger',
    
    // Databases - SQL
    'sql', 'mysql', 'postgresql', 'postgres', 'mariadb', 'sqlite', 'oracle', 'mssql',
    'sql server', 't-sql', 'pl/sql',
    
    // Databases - NoSQL
    'mongodb', 'mongo', 'couchdb', 'cassandra', 'dynamodb', 'neo4j', 'redis',
    'memcached', 'elasticsearch', 'elastic', 'solr',
    
    // Cloud Platforms
    'aws', 'amazon web services', 'azure', 'microsoft azure', 'gcp', 'google cloud',
    'heroku', 'digitalocean', 'linode', 'vercel', 'netlify', 'cloudflare',
    
    // Cloud Services
    's3', 'ec2', 'lambda', 'rds', 'cloudfront', 'route53', 'sqs', 'sns', 'cloudwatch',
    'azure functions', 'cloud functions', 'cloud run', 'app engine',
    
    // DevOps & CI/CD
    'docker', 'kubernetes', 'k8s', 'jenkins', 'gitlab ci', 'github actions', 'circleci',
    'travis ci', 'terraform', 'ansible', 'puppet', 'chef', 'vagrant', 'ci/cd',
    
    // Version Control
    'git', 'github', 'gitlab', 'bitbucket', 'svn', 'mercurial',
    
    // Operating Systems & Servers
    'linux', 'unix', 'ubuntu', 'centos', 'debian', 'redhat', 'windows server',
    'nginx', 'apache', 'iis', 'tomcat',
    
    // Testing
    'jest', 'mocha', 'chai', 'jasmine', 'pytest', 'junit', 'selenium', 'cypress',
    'playwright', 'testing library', 'vitest', 'phpunit', 'rspec', 'testing',
    'unit testing', 'integration testing', 'e2e testing', 'tdd', 'bdd',
    
    // Mobile Development
    'react native', 'flutter', 'ionic', 'xamarin', 'cordova', 'phonegap',
    'android', 'ios', 'swift ui', 'jetpack compose',
    
    // AI & Data Science
    'machine learning', 'ml', 'deep learning', 'ai', 'artificial intelligence',
    'tensorflow', 'pytorch', 'keras', 'scikit-learn', 'pandas', 'numpy',
    'data science', 'data analysis', 'nlp', 'computer vision', 'opencv',
    
    // Methodologies & Practices
    'agile', 'scrum', 'kanban', 'waterfall', 'devops', 'lean', 'xp', 'safe',
    
    // Security & Authentication
    'oauth', 'oauth2', 'jwt', 'saml', 'ssl', 'tls', 'security', 'cybersecurity',
    'penetration testing', 'owasp',
    
    // Other Technologies
    'blockchain', 'ethereum', 'solidity', 'web3', 'iot', 'mqtt', 'rabbitmq',
    'kafka', 'apache kafka', 'spark', 'hadoop', 'firebase', 'supabase',
    'figma', 'sketch', 'adobe xd', 'photoshop', 'illustrator',
  ];

  // Skills to exclude (noise words)
  private static readonly EXCLUDED_SKILLS = [
    'experience', 'years', 'work', 'team', 'project', 'development', 'software',
    'engineer', 'developer', 'programming', 'coding', 'technical', 'skills',
    'technologies', 'tools', 'frameworks', 'languages', 'databases', 'the', 'and',
    'with', 'using', 'strong', 'good', 'excellent', 'knowledge', 'understanding',
  ];

  // Skill normalization map
  private static readonly SKILL_NORMALIZATIONS: Record<string, string> = {
    'js': 'javascript',
    'ts': 'typescript',
    'reactjs': 'react',
    'react.js': 'react',
    'vuejs': 'vue',
    'vue.js': 'vue',
    'nodejs': 'node.js',
    'node': 'node.js',
    'nextjs': 'next.js',
    'postgres': 'postgresql',
    'mongo': 'mongodb',
    'k8s': 'kubernetes',
    'gcp': 'google cloud',
    'aws': 'amazon web services',
    'ml': 'machine learning',
    'ai': 'artificial intelligence',
    'dotnet': '.net',
    'csharp': 'c#',
    'cpp': 'c++',
    'golang': 'go',
  };

  /**
   * Extract name from filename with smart cleaning
   */
  private static extractNameFromFilename(filename: string): string | null {
    try {
      // Remove file extension
      let name = filename.replace(/\.(pdf|doc|docx|txt)$/i, '');
      
      // Remove common CV keywords (case insensitive)
      const cvKeywords = [
        'cv', 'resume', 'curriculum', 'vitae', 'curriculum vitae',
        'resume cv', 'cv resume', 'cv_', '_cv', '-cv', 'cv-',
        'my cv', 'mycv', 'my resume', 'myresume'
      ];
      
      cvKeywords.forEach(keyword => {
        const regex = new RegExp(`\\b${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
        name = name.replace(regex, '');
      });
      
      // Remove dates and years (2020-2025, etc.)
      name = name.replace(/\b(19|20)\d{2}\b/g, '');
      name = name.replace(/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s*\d{1,2}(st|nd|rd|th)?\s*,?\s*(19|20)?\d{2}\b/gi, '');
      
      // Remove common suffixes like "updated", "final", "latest"
      const suffixes = ['updated', 'final', 'latest', 'new', 'old', 'draft', 'version', 'v1', 'v2', 'v3'];
      suffixes.forEach(suffix => {
        const regex = new RegExp(`\\b${suffix}\\b`, 'gi');
        name = name.replace(regex, '');
      });
      
      // Replace separators (underscore, hyphen, dot) with spaces
      name = name.replace(/[_\-\.]+/g, ' ');
      
      // Remove extra whitespace
      name = name.trim().replace(/\s+/g, ' ');
      
      // Validate: should have 1-5 words, each word 2+ characters
      const words = name.split(/\s+/).filter(word => word.length >= 2);
      if (words.length === 0 || words.length > 5) {
        return null;
      }
      
      // Apply proper capitalization
      const capitalizedWords = words.map(word => {
        // Handle all caps or all lowercase
        if (word === word.toUpperCase() || word === word.toLowerCase()) {
          return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
        }
        return word;
      });
      
      const finalName = capitalizedWords.join(' ');
      
      // Final validation: should look like a name (letters only, possibly with spaces)
      if (!/^[a-zA-Z\s]{3,50}$/.test(finalName)) {
        return null;
      }
      
      return finalName;
    } catch (error) {
      console.error('Error extracting name from filename:', error);
      return null;
    }
  }

  /**
   * Extract candidate information from CV text
   */
  static extract(text: string, filename?: string): ExtractedCandidate {
    const cleanedText = this.cleanText(text);
    
    // Try filename extraction first (highest priority)
    let extractedName = 'Unknown';
    if (filename) {
      const nameFromFile = this.extractNameFromFilename(filename);
      if (nameFromFile) {
        extractedName = nameFromFile;
      }
    }
    
    // If filename extraction failed, try text-based extraction
    if (extractedName === 'Unknown') {
      extractedName = this.extractName(cleanedText);
    }
    
    // Final fallback: try email username if available
    if (extractedName === 'Unknown') {
      const email = this.extractEmail(cleanedText);
      if (email) {
        const username = email.split('@')[0];
        const nameFromEmail = username.replace(/[._\-]/g, ' ')
          .split(' ')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
          .join(' ');
        if (nameFromEmail.length >= 3) {
          extractedName = nameFromEmail;
        }
      }
    }
    
    return {
      name: extractedName,
      email: this.extractEmail(cleanedText),
      phone: this.extractPhone(cleanedText),
      skills: this.extractSkills(cleanedText),
      links: this.extractLinks(cleanedText),
    };
  }

  /**
   * Clean and normalize text - enhanced to remove PDF artifacts
   */
  private static cleanText(text: string): string {
    return text
      // Remove PDF artifacts
      .replace(/[\x00-\x1F\x7F-\x9F]/g, '') // Control characters
      .replace(/[^\x20-\x7E\n\r\t]/g, ' ') // Non-printable characters
      // Normalize whitespace
      .replace(/[ \t]+/g, ' ') // Multiple spaces to single space
      .replace(/\n\s+/g, '\n') // Remove leading spaces on new lines
      .replace(/\n{3,}/g, '\n\n') // Multiple line breaks to double
      // Remove common PDF metadata
      .replace(/\/Type\s*\/\w+/g, '')
      .replace(/\/Length\s*\d+/g, '')
      .replace(/stream|endstream|obj|endobj/g, '')
      .trim();
  }

  /**
   * Extract candidate name - enhanced with better cleaning
   */
  private static extractName(text: string): string {
    const lines = text.split('\n');
    
    // Pass 1: Strict matching (first 10 lines, proper capitalization)
    for (let i = 0; i < Math.min(10, lines.length); i++) {
      const trimmed = this.cleanNameCandidate(lines[i]);
      
      if (!trimmed || this.isContactInfo(trimmed)) continue;
      
      const words = trimmed.split(/\s+/);
      if (words.length >= 2 && words.length <= 6) {
        const looksLikeName = words.every(word => 
          word.length > 1 && /^[A-Z]/.test(word) && !/\d/.test(word)
        );
        
        if (looksLikeName && !this.containsCommonWords(trimmed)) {
          return trimmed;
        }
      }
    }
    
    // Pass 2: Relaxed matching (first 15 lines, case-insensitive with particles)
    for (let i = 0; i < Math.min(15, lines.length); i++) {
      const trimmed = this.cleanNameCandidate(lines[i]);
      
      if (!trimmed || this.isContactInfo(trimmed)) continue;
      
      const words = trimmed.split(/\s+/);
      if (words.length >= 1 && words.length <= 6) {
        // Handle international names with particles
        const particles = ['al', 'el', 'van', 'de', 'del', 'bin', 'ibn', 'von', 'da', 'di', 'le', 'la'];
        const hasValidStructure = words.some(word => 
          (word.length > 1 && /^[A-Z]/.test(word) && !/\d/.test(word)) || 
          particles.includes(word.toLowerCase())
        );
        
        if (hasValidStructure && !this.containsCommonWords(trimmed)) {
          return this.capitalizeWords(trimmed);
        }
      }
    }
    
    // Pass 3: Look near contact information
    for (let i = 0; i < Math.min(20, lines.length); i++) {
      if (this.EMAIL_REGEX.test(lines[i]) || this.hasPhoneNumber(lines[i])) {
        // Check 2 lines before contact info
        for (let j = Math.max(0, i - 2); j < i; j++) {
          const trimmed = this.cleanNameCandidate(lines[j]);
          if (trimmed && !this.isContactInfo(trimmed)) {
            const words = trimmed.split(/\s+/);
            if (words.length >= 2 && words.length <= 6 && !/\d/.test(trimmed)) {
              return this.capitalizeWords(trimmed);
            }
          }
        }
      }
    }

    return 'Unknown';
  }

  /**
   * Clean name candidate - remove file artifacts and CV-related terms
   */
  private static cleanNameCandidate(text: string): string {
    return text
      .trim()
      // Remove file extensions
      .replace(/\.(pdf|doc|docx|txt)$/i, '')
      // Remove years and dates
      .replace(/\b(19|20)\d{2}\b/g, '')
      // Remove CV/Resume keywords
      .replace(/\b(cv|resume|curriculum vitae)\b/gi, '')
      // Remove extra whitespace
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Check if line contains contact information
   */
  private static isContactInfo(text: string): boolean {
    return this.EMAIL_REGEX.test(text) || 
           this.hasPhoneNumber(text) ||
           /https?:\/\//i.test(text);
  }

  /**
   * Check if text contains a phone number using any pattern
   */
  private static hasPhoneNumber(text: string): boolean {
    return this.PHONE_PATTERNS.some(pattern => {
      pattern.lastIndex = 0; // Reset regex state
      return pattern.test(text);
    });
  }

  /**
   * Check if text contains common CV words (not a name)
   */
  private static containsCommonWords(text: string): boolean {
    const commonWords = [
      'curriculum', 'vitae', 'resume', 'cv', 'profile', 'summary', 'objective',
      'experience', 'education', 'skills', 'contact', 'about', 'professional',
      'personal', 'information', 'details', 'address', 'phone', 'email'
    ];
    const lowerText = text.toLowerCase();
    return commonWords.some(word => lowerText.includes(word));
  }

  /**
   * Capitalize first letter of each word
   */
  private static capitalizeWords(text: string): string {
    return text.split(/\s+/).map(word => 
      word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    ).join(' ');
  }

  /**
   * Extract email address - enhanced with multiple strategies
   */
  private static extractEmail(text: string): string {
    // Strategy 1: Direct regex match
    this.EMAIL_REGEX.lastIndex = 0; // Reset regex state
    const matches = text.match(this.EMAIL_REGEX);
    if (matches && matches.length > 0) {
      // Return the first valid-looking email
      const validEmail = matches.find(email => {
        const lowerEmail = email.toLowerCase();
        // Exclude common false positives
        return !lowerEmail.includes('example') && 
               !lowerEmail.includes('test') &&
               !lowerEmail.includes('sample');
      });
      if (validEmail) return validEmail.toLowerCase();
    }

    // Strategy 2: Look in contact sections
    const contactSectionRegex = /(?:email|e-mail|contact)[:\s]+([a-z0-9._%+\-']+@[a-z0-9.\-]+\.[a-z]{2,})/gi;
    const contactMatch = contactSectionRegex.exec(text);
    if (contactMatch && contactMatch[1]) {
      return contactMatch[1].toLowerCase();
    }

    // Strategy 3: Look near phone numbers
    const lines = text.split('\n');
    for (let i = 0; i < lines.length; i++) {
      if (this.hasPhoneNumber(lines[i])) {
        // Check surrounding lines
        for (let j = Math.max(0, i - 2); j <= Math.min(lines.length - 1, i + 2); j++) {
          this.EMAIL_REGEX.lastIndex = 0;
          const nearbyMatch = lines[j].match(this.EMAIL_REGEX);
          if (nearbyMatch) return nearbyMatch[0].toLowerCase();
        }
      }
    }

    return '';
  }

  /**
   * Extract phone number - enhanced with normalization
   */
  private static extractPhone(text: string): string {
    // Try each phone pattern
    for (const pattern of this.PHONE_PATTERNS) {
      pattern.lastIndex = 0; // Reset regex state
      const matches = text.match(pattern);
      if (matches && matches.length > 0) {
        // Find the most likely phone number (longest match, has reasonable length)
        const validPhone = matches
          .map(p => p.trim())
          .filter(p => {
            const digits = p.replace(/\D/g, '');
            return digits.length >= 10 && digits.length <= 15;
          })
          .sort((a, b) => b.length - a.length)[0];
        
        if (validPhone) {
          return this.normalizePhone(validPhone);
        }
      }
    }

    // Look in contact sections
    const contactSectionRegex = /(?:phone|tel|mobile|cell)[:\s]+([\d\s\-\(\)\+\.]+)/gi;
    const contactMatch = contactSectionRegex.exec(text);
    if (contactMatch && contactMatch[1]) {
      const phone = contactMatch[1].trim();
      const digits = phone.replace(/\D/g, '');
      if (digits.length >= 10) {
        return this.normalizePhone(phone);
      }
    }

    return '';
  }

  /**
   * Normalize phone number format
   */
  private static normalizePhone(phone: string): string {
    // Remove all non-digit characters except + at the start
    const hasPlus = phone.trim().startsWith('+');
    const digits = phone.replace(/\D/g, '');
    
    // Format based on length
    if (digits.length === 10) {
      // US format: (XXX) XXX-XXXX
      return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
    } else if (digits.length === 11 && digits.startsWith('1')) {
      // US with country code: +1 (XXX) XXX-XXXX
      return `+1 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
    } else if (hasPlus) {
      // International format: keep + and add spacing
      return `+${digits}`;
    }
    
    // Return as-is with basic formatting
    return phone.trim();
  }

  /**
   * Extract skills from CV text - enhanced with filtering and normalization
   */
  private static extractSkills(text: string): string[] {
    const lowerText = text.toLowerCase();
    const foundSkills = new Set<string>();

    // Strategy 1: Find skills by keyword matching
    for (const skill of this.COMMON_SKILLS) {
      // Escape special characters for regex
      const escapedSkill = skill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`\\b${escapedSkill}\\b`, 'i');
      
      if (regex.test(lowerText)) {
        // Normalize the skill
        const normalized = this.normalizeSkill(skill);
        if (!this.isExcludedSkill(normalized)) {
          foundSkills.add(normalized);
        }
      }
    }

    // Strategy 2: Extract from dedicated skills sections
    const skillsSectionPatterns = [
      /(?:technical\s+)?skills[:\s]+(.*?)(?:\n\n|experience|education|projects|$)/is,
      /(?:technologies|tech\s+stack)[:\s]+(.*?)(?:\n\n|experience|education|projects|$)/is,
      /(?:expertise|competencies)[:\s]+(.*?)(?:\n\n|experience|education|projects|$)/is,
    ];

    for (const pattern of skillsSectionPatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        const skillsSection = match[1];
        
        // Extract comma, bullet, or newline-separated items
        const items = skillsSection
          .split(/[,;•\n\-\|]/)
          .map(s => s.trim())
          .filter(s => s.length > 0);

        items.forEach(item => {
          const cleaned = this.cleanSkill(item);
          if (this.isValidSkill(cleaned)) {
            const normalized = this.normalizeSkill(cleaned);
            if (!this.isExcludedSkill(normalized)) {
              foundSkills.add(normalized);
            }
          }
        });
      }
    }

    // Remove duplicates from normalization
    const uniqueSkills = Array.from(foundSkills);
    
    // Sort by relevance (prioritize known skills)
    const sorted = uniqueSkills.sort((a, b) => {
      const aKnown = this.COMMON_SKILLS.includes(a.toLowerCase());
      const bKnown = this.COMMON_SKILLS.includes(b.toLowerCase());
      if (aKnown && !bKnown) return -1;
      if (!aKnown && bKnown) return 1;
      return a.localeCompare(b);
    });

    return sorted.slice(0, 25); // Limit to 25 most relevant skills
  }

  /**
   * Clean a skill string
   */
  private static cleanSkill(skill: string): string {
    return skill
      .toLowerCase()
      .replace(/[()[\]{}]/g, '') // Remove brackets
      .replace(/\s+/g, ' ') // Normalize whitespace
      .replace(/^[•\-\*]+\s*/, '') // Remove leading bullets
      .trim();
  }

  /**
   * Check if a skill is valid
   */
  private static isValidSkill(skill: string): boolean {
    // Must be between 2 and 30 characters
    if (skill.length < 2 || skill.length > 30) return false;
    
    // Must not be just numbers
    if (/^\d+$/.test(skill)) return false;
    
    // Must not be a single character (unless it's a known skill like 'c' or 'r')
    if (skill.length === 1 && !['c', 'r'].includes(skill)) return false;
    
    // Must contain at least one letter
    if (!/[a-z]/i.test(skill)) return false;
    
    return true;
  }

  /**
   * Normalize skill name
   */
  private static normalizeSkill(skill: string): string {
    const lower = skill.toLowerCase().trim();
    return this.SKILL_NORMALIZATIONS[lower] || lower;
  }

  /**
   * Check if skill should be excluded
   */
  private static isExcludedSkill(skill: string): boolean {
    return this.EXCLUDED_SKILLS.includes(skill.toLowerCase());
  }

  /**
   * Extract GitHub and LinkedIn links - enhanced detection
   */
  private static extractLinks(text: string): { github?: string; linkedin?: string } {
    const links: { github?: string; linkedin?: string } = {};

    // Strategy 1: Direct URL matching
    this.GITHUB_REGEX.lastIndex = 0;
    const githubMatch = text.match(this.GITHUB_REGEX);
    if (githubMatch) {
      const url = githubMatch[0].trim();
      links.github = url.startsWith('http') ? url : `https://${url}`;
    }

    this.LINKEDIN_REGEX.lastIndex = 0;
    const linkedinMatch = text.match(this.LINKEDIN_REGEX);
    if (linkedinMatch) {
      const url = linkedinMatch[0].trim();
      links.linkedin = url.startsWith('http') ? url : `https://${url}`;
    }

    // Strategy 2: Look in contact/social sections if not found
    if (!links.github || !links.linkedin) {
      const socialPatterns = [
        /(?:github|git)[:\s]+([^\s\n]+)/gi,
        /(?:linkedin|linked-in)[:\s]+([^\s\n]+)/gi,
      ];

      for (const pattern of socialPatterns) {
        pattern.lastIndex = 0;
        const matches = Array.from(text.matchAll(pattern));
        
        matches.forEach(match => {
          const url = match[1].trim();
          
          if (!links.github && /github/i.test(match[0])) {
            // Extract GitHub username/URL
            const usernameMatch = url.match(/(?:github\.com\/)?([a-zA-Z0-9_-]+)/);
            if (usernameMatch) {
              links.github = url.includes('github.com') 
                ? (url.startsWith('http') ? url : `https://${url}`)
                : `https://github.com/${usernameMatch[1]}`;
            }
          }
          
          if (!links.linkedin && /linkedin/i.test(match[0])) {
            // Extract LinkedIn username/URL
            const usernameMatch = url.match(/(?:linkedin\.com\/in\/)?([a-zA-Z0-9_-]+)/);
            if (usernameMatch) {
              links.linkedin = url.includes('linkedin.com')
                ? (url.startsWith('http') ? url : `https://${url}`)
                : `https://linkedin.com/in/${usernameMatch[1]}`;
            }
          }
        });
      }
    }

    // Clean up URLs - remove trailing slashes and ensure proper format
    if (links.github) {
      links.github = links.github.replace(/\/+$/, '');
    }
    if (links.linkedin) {
      links.linkedin = links.linkedin.replace(/\/+$/, '');
    }

    return links;
  }
}
