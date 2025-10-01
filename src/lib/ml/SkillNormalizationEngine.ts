import { pipeline, env } from '@huggingface/transformers';

// Configure to use WebGPU for better performance
env.backends.onnx.wasm.proxy = false;

// Skill categories for classification
export const SKILL_CATEGORIES = {
  TECHNICAL: 'Technical',
  SOFT_SKILLS: 'Soft Skills',
  DOMAIN_SPECIFIC: 'Domain-specific',
  TOOLS: 'Tools & Technologies',
  LANGUAGES: 'Programming Languages',
};

// Skill normalization dictionary
const SKILL_NORMALIZATION: Record<string, string> = {
  'js': 'JavaScript',
  'ts': 'TypeScript',
  'react.js': 'React',
  'reactjs': 'React',
  'node.js': 'Node.js',
  'nodejs': 'Node.js',
  'postgresql': 'PostgreSQL',
  'postgres': 'PostgreSQL',
  'mongo': 'MongoDB',
  'mongodb': 'MongoDB',
  'k8s': 'Kubernetes',
  'docker': 'Docker',
  'aws': 'Amazon Web Services',
  'gcp': 'Google Cloud Platform',
  'ci/cd': 'CI/CD',
  'ml': 'Machine Learning',
  'ai': 'Artificial Intelligence',
};

export class SkillNormalizationEngine {
  private embeddingPipeline: any = null;
  private isInitialized = false;

  async initialize() {
    if (this.isInitialized) return;
    
    try {
      console.log('Initializing skill normalization engine...');
      
      // Load the embedding model for semantic matching
      this.embeddingPipeline = await pipeline(
        'feature-extraction',
        'mixedbread-ai/mxbai-embed-xsmall-v1',
        { device: 'webgpu' }
      );
      
      this.isInitialized = true;
      console.log('Skill normalization engine initialized');
    } catch (error) {
      console.error('Failed to initialize ML models:', error);
      throw error;
    }
  }

  normalizeSkill(skill: string): string {
    const normalized = skill.toLowerCase().trim();
    return SKILL_NORMALIZATION[normalized] || skill;
  }

  normalizeSkills(skills: string[]): string[] {
    return skills.map(skill => this.normalizeSkill(skill));
  }

  categorizeSkill(skill: string): string {
    const lowerSkill = skill.toLowerCase();
    
    // Programming languages
    if (['javascript', 'typescript', 'python', 'java', 'c++', 'go', 'rust', 'ruby', 'php'].some(lang => lowerSkill.includes(lang))) {
      return SKILL_CATEGORIES.LANGUAGES;
    }
    
    // Tools & Technologies
    if (['docker', 'kubernetes', 'git', 'jenkins', 'terraform', 'ansible'].some(tool => lowerSkill.includes(tool))) {
      return SKILL_CATEGORIES.TOOLS;
    }
    
    // Soft skills
    if (['leadership', 'communication', 'teamwork', 'problem solving', 'creativity', 'agile'].some(soft => lowerSkill.includes(soft))) {
      return SKILL_CATEGORIES.SOFT_SKILLS;
    }
    
    // Domain-specific
    if (['finance', 'healthcare', 'ecommerce', 'blockchain', 'iot', 'security'].some(domain => lowerSkill.includes(domain))) {
      return SKILL_CATEGORIES.DOMAIN_SPECIFIC;
    }
    
    return SKILL_CATEGORIES.TECHNICAL;
  }

  async generateEmbedding(text: string): Promise<number[]> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      const output = await this.embeddingPipeline(text, { pooling: 'mean', normalize: true });
      return Array.from(output.data);
    } catch (error) {
      console.error('Failed to generate embedding:', error);
      throw error;
    }
  }

  async generateSkillEmbeddings(skills: string[]): Promise<Record<string, number[]>> {
    const embeddings: Record<string, number[]> = {};
    
    for (const skill of skills) {
      const normalizedSkill = this.normalizeSkill(skill);
      embeddings[normalizedSkill] = await this.generateEmbedding(normalizedSkill);
    }
    
    return embeddings;
  }

  cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      throw new Error('Vectors must have the same length');
    }
    
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    
    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  async calculateSemanticSimilarity(skills1: string[], skills2: string[]): Promise<number> {
    const embeddings1 = await this.generateSkillEmbeddings(skills1);
    const embeddings2 = await this.generateSkillEmbeddings(skills2);
    
    let totalSimilarity = 0;
    let count = 0;
    
    for (const [skill1, emb1] of Object.entries(embeddings1)) {
      for (const [skill2, emb2] of Object.entries(embeddings2)) {
        const similarity = this.cosineSimilarity(emb1, emb2);
        totalSimilarity += similarity;
        count++;
      }
    }
    
    return count > 0 ? totalSimilarity / count : 0;
  }
}

// Singleton instance
let engineInstance: SkillNormalizationEngine | null = null;

export const getSkillEngine = (): SkillNormalizationEngine => {
  if (!engineInstance) {
    engineInstance = new SkillNormalizationEngine();
  }
  return engineInstance;
};
