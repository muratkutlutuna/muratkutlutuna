import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { analyzeAllRepos } from './analyze-repo.js';
import fetch from 'node-fetch';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const username = 'muratkutlutuna';
const token = process.env.PERSONAL_GITHUB_TOKEN;

async function getRepos() {
  const res = await fetch(`https://api.github.com/users/${username}/repos?per_page=100`, {
    headers: { Authorization: `token ${token}` }
  });
  return res.json();
}

// 1. Find all local repos
function getLocalRepos(baseDir) {
  return fs.readdirSync(baseDir)
    .filter(f => fs.statSync(path.join(baseDir, f)).isDirectory())
    .filter(f => fs.existsSync(path.join(baseDir, f, '.git')));
}

// 2. Analyze all repos
const reposDir = __dirname;
const repoNames = getLocalRepos(reposDir);
const repoAnalyses = repoNames.map(repo => analyzeAllRepos(path.join(reposDir, repo)));

// Function to analyze commit history and generate timeline
function analyzeTimeline(analyses) {
  let firstActivity = new Date();
  const yearlyCommits = {};
  let totalCommits = 0;

  analyses.forEach(a => {
    if (a.firstCommit < firstActivity) {
      firstActivity = a.firstCommit;
    }
    totalCommits += a.commits;

    // Aggregate commits per year
    let year = a.firstCommit.getFullYear();
    yearlyCommits[year] = (yearlyCommits[year] || 0) + a.commits;
  });

  // Calculate years active
  const yearsActive = ((Date.now() - firstActivity.getTime()) / (1000 * 60 * 60 * 24 * 365)).toFixed(1);

  // Find most active year
  let mostActiveYear = null;
  let maxCommits = 0;
  for (const year in yearlyCommits) {
    if (yearlyCommits[year] > maxCommits) {
      maxCommits = yearlyCommits[year];
      mostActiveYear = year;
    }
  }

  return {
    firstActivity,
    yearsActive,
    mostActiveYear,
    totalCommits
  };
}

// 3. Synthesize a developer BIO
function synthesizeBio(analyses) {
  const timeline = analyzeTimeline(analyses);

  // Aggregate language usage
  const languageUsage = {};
  analyses.forEach(a => {
    Object.entries(a.languages).forEach(([lang, loc]) => {
      languageUsage[lang] = (languageUsage[lang] || 0) + loc;
    });
  });

  // Find most used language
  const mostUsedLanguage = Object.entries(languageUsage).sort(([, a], [, b]) => b - a)[0]?.[0] || 'code';

  // Aggregate frameworks
  const frameworks = new Set();
  analyses.forEach(a => a.frameworks.forEach(fw => frameworks.add(fw)));

  // Aggregate project types
  const projectTypes = new Set();
  analyses.forEach(a => projectTypes.add(a.projectType));

  return `
# Hi, I'm Kutlu 👋🏼

> "In the quiet hum of midnight code,
> I build, I break, I learn, I grow."

Since **${timeline.firstActivity.toLocaleDateString()}** (**${timeline.yearsActive} years**), I've been on a journey through software, marked by **${timeline.totalCommits} commits**.
My most active year was **${timeline.mostActiveYear}**, a testament to my dedication.

My primary tool is **${mostUsedLanguage}**, which I wield to craft ${Array.from(projectTypes).join(', ')}.
I'm also proficient in frameworks like ${Array.from(frameworks).join(', ')}, each chosen to solve unique challenges.

My journey is not just about lines of code, but about the problems I solve and the knowledge I gain.
  `;
}

// 4. Write README.md
const bio = synthesizeBio(repoAnalyses);
fs.writeFileSync(path.join(__dirname, 'README.md'), bio.trim());

async function main() {
  const repos = await getRepos();
  // Analyze repos, synthesize bio, etc.
  // ...existing code...
  fs.writeFileSync('README.md', '# Example README\n');
}

main();