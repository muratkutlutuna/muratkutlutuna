import fs from 'fs';
import path from 'path';

export function detectFrameworks(repoPath, FRAMEWORK_FILES, log) {
  const frameworks = [];
  Object.entries(FRAMEWORK_FILES).forEach(([fw, files]) => {
    if (files.some(f => {
      const filePath = path.join(repoPath, f);
      // Support glob-like detection for patterns like *.csproj, etc.
      if (f.includes('*')) {
        const dir = path.dirname(filePath);
        if (fs.existsSync(dir)) {
          const pattern = f.replace('*', '');
          return fs.readdirSync(dir).some(file => file.endsWith(pattern));
        }
        return false;
      }
      return fs.existsSync(filePath) || fs.existsSync(path.join(repoPath, ...f.split('/')));
    })) {
      frameworks.push(fw);
      log?.(`Detected framework: ${fw}`);
    }
  });
  return frameworks;
}
