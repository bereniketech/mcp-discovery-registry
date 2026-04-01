import 'dotenv/config';
import { SeederService } from '../services/seeder.js';

interface CliOptions {
  limit?: number;
  batchSize?: number;
  delayMs?: number;
  searchPages?: number;
}

function parseNumberArg(raw: string | undefined, flag: string): number {
  const value = Number(raw);

  if (!Number.isFinite(value)) {
    throw new Error(`Invalid ${flag} value: ${raw}`);
  }

  return value;
}

function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = {};

  for (const arg of argv) {
    if (arg.startsWith('--limit=')) {
      options.limit = parseNumberArg(arg.split('=')[1], '--limit');
      continue;
    }

    if (arg.startsWith('--batch-size=')) {
      options.batchSize = parseNumberArg(arg.split('=')[1], '--batch-size');
      continue;
    }

    if (arg.startsWith('--delay-ms=')) {
      options.delayMs = parseNumberArg(arg.split('=')[1], '--delay-ms');
      continue;
    }

    if (arg.startsWith('--search-pages=')) {
      options.searchPages = parseNumberArg(arg.split('=')[1], '--search-pages');
      continue;
    }
  }

  return options;
}

async function run(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));
  const seeder = new SeederService();

  console.log('Starting MCP server import...');
  if (options.limit) {
    console.log(`Using limit=${options.limit}`);
  }

  const summary = await seeder.run(options);

  console.log('Seed completed.');
  console.log(
    `Summary: discovered=${summary.discovered}, attempted=${summary.attempted}, imported=${summary.imported}, skipped=${summary.skippedDuplicates}, failed=${summary.failed}`,
  );
}

run()
  .then(() => process.exit(0))
  .catch((error: unknown) => {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error(`Seed failed: ${message}`);
    process.exit(1);
  });
