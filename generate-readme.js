import fs from 'fs';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';
import { analyzeAllRepos, analyzeAndGeneratePromptForBio } from './analyze-repo.js';
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
  // Improved error logging
  for (const arg of args) {
    if (arg instanceof Error) {
      logToFile('ERROR:', arg.stack || arg.message || arg);
    } else if (typeof arg === 'object') {
      logToFile('ERROR:', JSON.stringify(arg));
    } else {
      logToFile('ERROR:', arg);
    }
  }
  // Optionally, also print to console:
  // console.error(...args);
}
// --- End Logger Setup ---

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const username = 'muratkutlutuna';
const token = process.env.GITHUB_TOKEN;

if (!token) {
  error('GITHUB_TOKEN environment variable is not set. Exiting.');
  process.exit(1);
}

// This is where you would retrieve the prompt from GitHub Actions secrets
const aiPrompt = process.env.AI_PROMPT;

// Fetch all public repos from GitHub API
async function getRepos() {
  let repos = [];
  let page = 1;
  while (true) {
    const res = await fetch(`https://api.github.com/users/${username}/repos?per_page=100&page=${page}`, {
      headers: { Authorization: `token ${token}` }
    });
    if (!res.ok) {
      const errText = await res.text();
      error(`GitHub API error: ${res.status} ${res.statusText} - ${errText}`);
      throw new Error(`GitHub API error: ${res.status} ${res.statusText}`);
    }
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

// 4. Write README.md
async function main() {
  try {
    // 1. Fetch all remote repos and clone/analyze them
    const repos = await getRepos();
    log(`Fetched ${repos.length} repos from GitHub`);
    const repoPaths = [];
    for (const repo of repos) {
      try {
        log(`Cloning ${repo.name}...`);
        const tmpPath = await cloneRepo(repo.clone_url, repo.name);
        repoPaths.push(tmpPath);
      } catch (e) {
        error(`Failed to clone ${repo.name}:`, e);
      }
    }

    // 2. Generate AI-powered bio using all analyzed repos
    const aiBio = await analyzeAndGeneratePromptForBio(repoPaths, { log, error });

    // 3. Clean up temp directories
    for (const tmpPath of repoPaths) {
      try {
        fs.rmSync(tmpPath, { recursive: true, force: true });
        log(`Cleaned up ${tmpPath}`);
      } catch (e) {
        error(`Failed to clean up ${tmpPath}:`, e);
      }
    }

    // 4. Format the README
    const readmeContent = `# Hi, I'm Kutlu 👋🏼

> "In the quiet hum of midnight code,
> I build, I break, I learn, I grow."

${aiBio}
`;

    fs.writeFileSync(path.join(__dirname, 'README.md'), readmeContent.trim());
  } catch (e) {
    error('Error in main:', e && (e.stack || e.message || e));
  }
}

main();