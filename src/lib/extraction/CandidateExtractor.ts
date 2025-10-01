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
  private static readonly EMAIL_REGEX = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
  private static readonly PHONE_REGEX = /(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g;
  private static readonly GITHUB_REGEX = /(?:https?:\/\/)?(?:www\.)?github\.com\/([a-zA-Z0-9_-]+)/gi;
  private static readonly LINKEDIN_REGEX = /(?:https?:\/\/)?(?:www\.)?linkedin\.com\/in\/([a-zA-Z0-9_-]+)/gi;

  private static readonly COMMON_SKILLS = [
    // Programming Languages
    'javascript', 'typescript', 'python', 'java', 'c++', 'c#', 'ruby', 'php', 'swift', 'kotlin',
    'go', 'rust', 'scala', 'r', 'matlab', 'perl', 'shell', 'bash',
    
    // Frontend
    'react', 'vue', 'angular', 'html', 'css', 'sass', 'scss', 'tailwind', 'bootstrap',
    'webpack', 'vite', 'next.js', 'nuxt', 'gatsby', 'redux', 'mobx',
    
    // Backend
    'node.js', 'express', 'django', 'flask', 'spring', 'asp.net', 'laravel', 'rails',
    'fastapi', 'nestjs', 'graphql', 'rest api', 'microservices',
    
    // Databases
    'sql', 'mysql', 'postgresql', 'mongodb', 'redis', 'elasticsearch', 'cassandra',
    'dynamodb', 'oracle', 'sqlite', 'firebase', 'supabase',
    
    // Cloud & DevOps
    'aws', 'azure', 'gcp', 'docker', 'kubernetes', 'jenkins', 'gitlab', 'github actions',
    'terraform', 'ansible', 'ci/cd', 'linux', 'nginx', 'apache',
    
    // Tools & Concepts
    'git', 'agile', 'scrum', 'testing', 'tdd', 'bdd', 'machine learning', 'ai',
    'data science', 'blockchain', 'iot', 'security', 'oauth', 'jwt',
  ];

  /**
   * Extract candidate information from CV text
   */
  static extract(text: string): ExtractedCandidate {
    const cleanText = this.cleanText(text);
    
    return {
      name: this.extractName(cleanText),
      email: this.extractEmail(cleanText),
      phone: this.extractPhone(cleanText),
      skills: this.extractSkills(cleanText),
      links: this.extractLinks(cleanText),
    };
  }

  /**
   * Clean and normalize text
   */
  private static cleanText(text: string): string {
    return text
      .replace(/\s+/g, ' ') // Normalize whitespace
      .replace(/\n+/g, '\n') // Normalize line breaks
      .trim();
  }

  /**
   * Extract candidate name (usually at the top of the CV)
   */
  private static extractName(text: string): string {
    // Strategy 1: Look for name in first few lines
    const lines = text.split('\n').slice(0, 5);
    
    for (const line of lines) {
      const trimmed = line.trim();
      
      // Skip empty lines, emails, phones, and URLs
      if (!trimmed || 
          this.EMAIL_REGEX.test(trimmed) || 
          this.PHONE_REGEX.test(trimmed) ||
          /https?:\/\//.test(trimmed)) {
        continue;
      }

      // Look for a line with 2-4 words (typical name format)
      const words = trimmed.split(/\s+/);
      if (words.length >= 2 && words.length <= 4) {
        // Check if it looks like a name (capitalized words)
        const looksLikeName = words.every(word => 
          word.length > 1 && /^[A-Z]/.test(word)
        );
        
        if (looksLikeName) {
          return trimmed;
        }
      }
    }

    return 'Unknown';
  }

  /**
   * Extract email address
   */
  private static extractEmail(text: string): string {
    const matches = text.match(this.EMAIL_REGEX);
    return matches ? matches[0] : '';
  }

  /**
   * Extract phone number
   */
  private static extractPhone(text: string): string {
    const matches = text.match(this.PHONE_REGEX);
    return matches ? matches[0].trim() : '';
  }

  /**
   * Extract skills from CV text
   */
  private static extractSkills(text: string): string[] {
    const lowerText = text.toLowerCase();
    const foundSkills = new Set<string>();

    // Find skills by keyword matching
    for (const skill of this.COMMON_SKILLS) {
      const regex = new RegExp(`\\b${skill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
      if (regex.test(lowerText)) {
        foundSkills.add(skill);
      }
    }

    // Also look for skills sections
    const skillsSectionMatch = text.match(/(?:skills|technologies|expertise|competencies)[:\s]+(.*?)(?:\n\n|$)/is);
    if (skillsSectionMatch) {
      const skillsSection = skillsSectionMatch[1].toLowerCase();
      
      // Extract comma or bullet-separated items
      const items = skillsSection.split(/[,•\n-]/).map(s => s.trim());
      items.forEach(item => {
        if (item && item.length > 2 && item.length < 30) {
          foundSkills.add(item);
        }
      });
    }

    return Array.from(foundSkills).slice(0, 20); // Limit to 20 skills
  }

  /**
   * Extract GitHub and LinkedIn links
   */
  private static extractLinks(text: string): { github?: string; linkedin?: string } {
    const links: { github?: string; linkedin?: string } = {};

    // Extract GitHub
    const githubMatch = text.match(this.GITHUB_REGEX);
    if (githubMatch) {
      links.github = githubMatch[0].startsWith('http') 
        ? githubMatch[0] 
        : `https://${githubMatch[0]}`;
    }

    // Extract LinkedIn
    const linkedinMatch = text.match(this.LINKEDIN_REGEX);
    if (linkedinMatch) {
      links.linkedin = linkedinMatch[0].startsWith('http') 
        ? linkedinMatch[0] 
        : `https://${linkedinMatch[0]}`;
    }

    return links;
  }
}
