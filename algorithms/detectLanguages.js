import fs from 'fs';
import path from 'path';

export function detectLanguages(repoPath, EXT_LANG_MAP, countLinesAndComments, log, error) {
  const languages = {};
  let totalLOC = 0;
  let totalFiles = 0;
  let totalCommentLines = 0;

  function walk(dir) {
    fs.readdirSync(dir).forEach(f => {
      const full = path.join(dir, f);
      if (fs.statSync(full).isDirectory() && !f.startsWith('.')) {
        walk(full);
      } else {
        const ext = path.extname(f);
        if (EXT_LANG_MAP[ext]) {
          const lang = EXT_LANG_MAP[ext];
          const { total, comments } = countLinesAndComments(full, log, error);
          languages[lang] = (languages[lang] || 0) + total;
          totalLOC += total;
          totalFiles++;
          totalCommentLines += comments;
        }
      }
    });
  }
  walk(repoPath);

  return { languages, totalLOC, totalFiles, totalCommentLines };
}
