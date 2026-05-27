import { warmPaper } from './themes/warmPaper';
import { radii } from './constants';

// Temporary bridge export that includes both new tokens and old color names
// to prevent typecheck errors in un-refactored components.
export const colors: any = {
  ...warmPaper,
  paper: '#fff7ed',
  paperWarm: '#fffaf0',
  cream: '#fffbeb',
  ink: '#3b1d12',
  muted: '#7c5d4a',
  line: '#f3d6bf',
  lineStrong: '#d89b72',
  shelf: '#9a3412',
  shelfDark: '#7c2d12',
  red: '#e11d48',
  redDark: '#9f1239',
  coral: '#f97316',
  peach: '#fed7aa',
  green: '#15803d',
  greenDark: '#166534',
  blue: '#2563eb',
  gold: '#f59e0b',
  missing: '#a8a29e',
  white: '#ffffff',
};

export { radii };
