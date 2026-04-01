import { db } from './index.js';
import { categories } from './schema.js';

const DEFAULT_CATEGORIES = [
  { name: 'Databases', slug: 'databases', description: 'MCP servers for database access and management' },
  { name: 'Productivity', slug: 'productivity', description: 'MCP servers that enhance workflow and productivity' },
  { name: 'Social Media', slug: 'social-media', description: 'MCP servers for social media platforms and APIs' },
  { name: 'Developer Tools', slug: 'developer-tools', description: 'MCP servers for development tooling and automation' },
  { name: 'AI Infrastructure', slug: 'ai-infrastructure', description: 'MCP servers for AI models and machine learning infrastructure' },
  { name: 'Data Processing', slug: 'data-processing', description: 'MCP servers for data pipelines and transformation' },
  { name: 'Communication', slug: 'communication', description: 'MCP servers for messaging and communication platforms' },
] as const;

async function seed() {
  console.log('Seeding default categories...');

  await db
    .insert(categories)
    .values(DEFAULT_CATEGORIES.map((c) => ({ ...c })))
    .onConflictDoNothing();

  console.log(`Inserted ${DEFAULT_CATEGORIES.length} default categories.`);
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Seed failed:', err);
    process.exit(1);
  });
