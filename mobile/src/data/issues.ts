import { coverSources } from './coverSources.generated';
import type { ComicIssue } from '../types';

export const TOTAL_ISSUES = 704;

export function formatIssueNumber(number: number) {
  return number.toString().padStart(3, '0');
}

export const issues: ComicIssue[] = Array.from({ length: TOTAL_ISSUES }, (_, index) => {
  const number = index + 1;
  const padded = formatIssueNumber(number);

  return {
    number,
    label: `第${padded}期`,
    displayTitle: `知音漫客 ${padded}`,
    cover: coverSources[number],
  };
});
