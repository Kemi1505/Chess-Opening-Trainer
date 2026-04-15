import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import { parse } from 'csv-parse/sync';
import { UserModel } from '../src/auth/types/user-type';

const prisma = new PrismaClient();

interface OpeningsType {
    eco: string,
    name: string,
    pgn: string
}
async function seedOpenings() {
  const files = ['a.tsv', 'b.tsv', 'c.tsv', 'd.tsv', 'e.tsv'];
  const dataDirectory = path.join(__dirname, 'data'); 
  
  const allOpenings: { eco_code: string; name: string; pgn_moves: string }[] = [];
  const seenPgn = new Set<string>();

  console.log('Reading files and removing duplicates...');

  for (const file of files) {
    const filePath = path.join(dataDirectory, file);
    if (!fs.existsSync(filePath)) {
      console.warn(`File ${file} not found, skipping...`);
      continue;
    }

    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const records = parse(fileContent, {
      columns: true,
      delimiter: '\t',
      skip_empty_lines: true,
      quote: null, // Lichess TSVs sometimes have stray quotes
    }) as OpeningsType[];

    for (const record of records) {
      // Use record.pgn or record.moves depending on the TSV header
      const pgn = record.pgn; 
      const eco = record.eco;
      const name = record.name;

      if (!pgn || seenPgn.has(pgn)) continue;

      allOpenings.push({
        eco_code: eco,
        name: name,
        pgn_moves: pgn,
      });
      
      seenPgn.add(pgn);
    }
    console.log(`- Processed ${file}`);
  }

  console.log(`🚀 Starting database insert of ${allOpenings.length} unique records...`);

  // Using createMany for high performance
  // skipDuplicates: true ensures it won't crash if a PGN already exists in the DB
  const result = await prisma.openingMoves.createMany({
    data: allOpenings,
    skipDuplicates: true,
  });

  console.log(`✅ Successfully seeded ${result.count} new openings!`);
}

seedOpenings()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });