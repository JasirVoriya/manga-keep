import { readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const coversDir = path.join(repoRoot, 'mobile', 'assets', 'covers');
const outputFile = path.join(repoRoot, 'release', 'catalogs', 'zhiyin-manke', 'manifest.generated.json');

function issueNumberFromFile(fileName) {
  const match = fileName.match(/^(\d{1,4})\.(jpg|jpeg|png|webp)$/i);
  return match ? Number(match[1]) : null;
}

const files = await readdir(coversDir);
const issues = files
  .map((fileName) => ({ fileName, number: issueNumberFromFile(fileName) }))
  .filter((entry) => entry.number)
  .sort((left, right) => left.number - right.number)
  .map((entry) => ({
    number: entry.number,
    coverUrl: `../../covers/zhiyin-manke/${entry.fileName}`,
  }));

const manifest = {
  schemaVersion: 1,
  id: 'zhiyin-manke',
  name: '知音漫客',
  shortName: '漫客',
  kind: 'magazine',
  description: '默认漫画杂志目录',
  issueCount: 704,
  numberPadding: 3,
  issues,
};

await writeFile(outputFile, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
console.log(`Wrote ${issues.length} issue cover entries to ${path.relative(repoRoot, outputFile)}`);
