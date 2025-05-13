import fs from 'fs';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';
import { analyzeAllRepos } from './analyze-repo.js';
import fetch from 'node-fetch';
import simpleGit from 'simple-git';

// --- Logger Setup ---
const logFilePath = path.join(process.cwd(), 'process.log');
function logToFile(...args) {
  const msg = args.map(a => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' ');
  fs.appendFileSync(logFilePath, `[${new Date().toISOString()}] ${msg}\n`);
}
function log(...args) {
  logToFile(...args);
  // Optionally, also print to console:
  // console.log(...args);
}
function error(...args) {
  logToFile('ERROR:', ...args);
  // Optionally, also print to console:
  // console.error(...args);
}
// --- End Logger Setup ---

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const username = 'muratkutlutuna';
const token = process.env.GITHUB_TOKEN;

// Fetch all public repos from GitHub API
async function getRepos() {
  let repos = [];
  let page = 1;
  while (true) {
    const res = await fetch(`https://api.github.com/users/${username}/repos?per_page=100&page=${page}`, {
      headers: { Authorization: `token ${token}` }
    });
    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) break;
    repos = repos.concat(data);
    page++;
  }
  return repos;
}

// Clone a repo to a temp directory and return the path
async function cloneRepo(gitUrl, repoName) {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), `repo-${repoName}-`));
  const git = simpleGit();
  await git.clone(gitUrl, tmpDir, ['--depth', '20']); // shallow clone for speed
  return tmpDir;
}

// Analyze all remote GitHub repos
async function analyzeRemoteRepos() {
  const repos = await getRepos();
  log(`Fetched ${repos.length} repos from GitHub`);
  const analyses = [];
  for (const repo of repos) {
    try {
      log(`Cloning ${repo.name}...`);
      const tmpPath = await cloneRepo(repo.clone_url, repo.name);
      log(`Analyzing ${repo.name}...`);
      const analysis = analyzeAllRepos(tmpPath, { log, error });
      analysis.remoteUrl = repo.html_url;
      analyses.push(analysis);
      fs.rmSync(tmpPath, { recursive: true, force: true });
      log(`Cleaned up ${tmpPath}`);
    } catch (e) {
      error(`Failed to analyze ${repo.name}:`, e);
    }
  }
  return analyses;
}

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

  const timeline = {
    firstActivity,
    yearsActive,
    mostActiveYear,
    totalCommits
  };

  log(`Timeline:`, timeline); // Changed from console.log

  return timeline;
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
async function main() {
  try {
    const repoAnalyses = await analyzeRemoteRepos();
    log(`Repo analyses:`, repoAnalyses);
    const bio = synthesizeBio(repoAnalyses);
    fs.writeFileSync(path.join(__dirname, 'README.md'), bio.trim());
  } catch (e) {
    error('Error in main:', e);
  }
}

main();