import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

// Simple language detection by file extension
const EXT_LANG_MAP = {
  '.js': 'JavaScript', '.ts': 'TypeScript', '.java': 'Java', '.py': 'Python',
  '.rb': 'Ruby', '.go': 'Go', '.cs': 'C#', '.cpp': 'C++', '.c': 'C',
  '.html': 'HTML', '.css': 'CSS', '.sh': 'Shell', '.md': 'Markdown'
};

// Framework detection by file presence
const FRAMEWORK_FILES = {
  'Spring Boot': ['pom.xml', 'build.gradle'],
  'React': ['package.json'],
  'Node.js': ['package.json'],
  'Django': ['manage.py'],
  'Cucumber': ['cucumber.js', 'cucumber.yml'],
  'JUnit': ['pom.xml', 'build.gradle'],
  'Docker': ['Dockerfile'],
  'Maven': ['pom.xml'],
  'Gradle': ['build.gradle'],
  'Jest': ['jest.config.js'],
  'Mocha': ['mocha.opts'],
  'GitHub Actions': ['.github/workflows'],
  'GitLab CI': ['.gitlab-ci.yml']
};

// Helper function to count lines of code in a file
function countLines(filePath) {
  try {
    console.log(`Counting lines in file: ${filePath}`); // Debug log
    const content = fs.readFileSync(filePath, 'utf-8');
    return content.split('\n').length;
  } catch (e) {
    console.error(`Error reading file: ${filePath}`, e); // Debug log
    return 0;
  }
}

export function analyzeAllRepos(repoPath) {
  console.log(`Analyzing repository at: ${repoPath}`); // Debug log

  // 1. Language detection and LOC count
  const languages = {};
  let totalLOC = 0;

  function walk(dir) {
    console.log(`Walking directory: ${dir}`); // Debug log
    fs.readdirSync(dir).forEach(f => {
      const full = path.join(dir, f);
      if (fs.statSync(full).isDirectory() && !f.startsWith('.')) {
        walk(full);
      } else {
        const ext = path.extname(f);
        if (EXT_LANG_MAP[ext]) {
          const lang = EXT_LANG_MAP[ext];
          const loc = countLines(full);
          languages[lang] = (languages[lang] || 0) + loc;
          totalLOC += loc;
          console.log(`Detected language: ${lang}, LOC: ${loc}`); // Debug log
        }
      }
    });
  }
  walk(repoPath);

  // Sort languages by LOC
  const sortedLanguages = Object.entries(languages)
    .sort(([, locA], [, locB]) => locB - locA)
    .reduce((obj, [key, value]) => {
      obj[key] = value;
      return obj;
    }, {});
  console.log(`Sorted languages:`, sortedLanguages); // Debug log

  // 2. Framework detection
  const frameworks = [];
  Object.entries(FRAMEWORK_FILES).forEach(([fw, files]) => {
    if (files.some(f => fs.existsSync(path.join(repoPath, f)) || fs.existsSync(path.join(repoPath, ...f.split('/'))))) {
      frameworks.push(fw);
      console.log(`Detected framework: ${fw}`); // Debug log
    }
  });

  // 3. Project type (more comprehensive)
  let projectType = 'Unknown';
  if (frameworks.includes('React') || frameworks.includes('Django')) projectType = 'Web App';
  else if (frameworks.includes('Cucumber') || frameworks.includes('JUnit')) projectType = 'Test Framework';
  else if (frameworks.includes('Node.js')) projectType = 'CLI Tool';
  if (fs.existsSync(path.join(repoPath, 'Dockerfile'))) projectType = 'Containerized App';
  if (fs.existsSync(path.join(repoPath, '.github/workflows'))) projectType = 'CI/CD Pipeline';
  console.log(`Project type: ${projectType}`); // Debug log

  // 4. Commit history
  let commits = 0, firstCommit = new Date(), lastCommit = new Date(0);
  try {
    const log = execSync('git log --pretty=format:"%ct"', { cwd: repoPath }).toString().split('\n').map(Number);
    commits = log.length;
    if (log.length) {
      firstCommit = new Date(log[log.length - 1] * 1000);
      lastCommit = new Date(log[0] * 1000);
    }
    console.log(`Commit history: ${commits} commits, First: ${firstCommit}, Last: ${lastCommit}`); // Debug log
  } catch (e) {
    console.error(`Error fetching commit history for: ${repoPath}`, e); // Debug log
  }

  // 5. Experience estimation (very basic)
  let experienceLevel = 'Beginner';
  if (totalLOC > 5000 || commits > 100) experienceLevel = 'Intermediate';
  if (totalLOC > 20000 || commits > 500) experienceLevel = 'Advanced';
  console.log(`Experience level: ${experienceLevel}`); // Debug log

  return {
    name: path.basename(repoPath),
    languages: sortedLanguages, // Use sorted languages
    frameworks,
    projectType,
    commits,
    firstCommit,
    lastCommit,
    experienceLevel,
    totalLOC
  };
}