import { readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const coversDir = path.join(projectRoot, 'assets', 'covers');
const outputFile = path.join(projectRoot, 'src', 'data', 'coverSources.generated.ts');

function issueNumberFromFile(fileName) {
  const match = fileName.match(/^(\d{1,4})\.(jpg|jpeg|png|webp)$/i);
  return match ? Number(match[1]) : null;
}

let files = [];
try {
  files = await readdir(coversDir);
} catch {
  files = [];
}

const entries = files
  .map((fileName) => ({ fileName, issueNumber: issueNumberFromFile(fileName) }))
  .filter((entry) => entry.issueNumber)
  .sort((a, b) => a.issueNumber - b.issueNumber)
  .map((entry) => `  ${entry.issueNumber}: require('../../assets/covers/${entry.fileName}'),`);

const body = `import type { ImageSourcePropType } from 'react-native';

export const coverSources: Record<number, ImageSourcePropType> = {
${entries.join('\n')}
};
`;

await writeFile(outputFile, body, 'utf8');
console.log(`Wrote ${entries.length} cover entries to ${path.relative(projectRoot, outputFile)}`);
