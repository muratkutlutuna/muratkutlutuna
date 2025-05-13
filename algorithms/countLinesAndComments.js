import fs from 'fs';

export function countLinesAndComments(filePath, log, error) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    let commentLines = 0;
    let inBlockComment = false;
    for (let line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('//') || trimmed.startsWith('#')) commentLines++;
      if (trimmed.startsWith('/*')) inBlockComment = true;
      if (inBlockComment) commentLines++;
      if (trimmed.endsWith('*/')) inBlockComment = false;
    }
    return { total: lines.length, comments: commentLines };
  } catch (e) {
    error?.(`Error reading file: ${filePath}`, e);
    return { total: 0, comments: 0 };
  }
}
