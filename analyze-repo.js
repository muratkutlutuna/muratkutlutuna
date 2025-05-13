import fs from 'fs';
import path from 'path';
import { EXT_LANG_MAP } from './data/ext-lang-map.js';
import { FRAMEWORK_FILES } from './data/framework-files.js';
import { countLinesAndComments } from './algorithms/countLinesAndComments.js';
import { detectFrameworks } from './algorithms/detectFrameworks.js';
import { detectLanguages } from './algorithms/detectLanguages.js';
import { analyzeCommitHistory } from './algorithms/analyzeCommitHistory.js';
import { determineProjectType } from './algorithms/projectType.js';
import { codeCleanliness } from './algorithms/codeCleanliness.js';
import { learningImprovement } from './algorithms/learningImprovement.js';
import { ChatOpenAI } from "langchain/chat_models/openai";
import { HumanMessage, SystemMessage } from "langchain/schema";

// Main repo analysis function
export function analyzeAllRepos(repoPath, logger = {}) {
  const log = logger.log || (() => {});
  const error = logger.error || (() => {});

  log(`Analyzing repository at: ${repoPath}`);

  // Language detection and LOC count
  const { languages, totalLOC, totalFiles, totalCommentLines } = detectLanguages(repoPath, EXT_LANG_MAP, countLinesAndComments, log, error);

  // Framework detection
  const frameworks = detectFrameworks(repoPath, FRAMEWORK_FILES, log);

  // Project type
  const projectType = determineProjectType(repoPath, frameworks);

  // Commit history
  const { commits, firstCommit, lastCommit, commitMessages } = analyzeCommitHistory(repoPath, log, error);

  // Experience estimation
  let experienceLevel = 'Beginner';
  if (totalLOC > 5000 || commits > 100) experienceLevel = 'Intermediate';
  if (totalLOC > 20000 || commits > 500) experienceLevel = 'Advanced';

  // Code cleanliness
  const { avgFileLength, commentDensity, codeCleanliness: cleanliness } =
    codeCleanliness(totalLOC, totalFiles, totalCommentLines);

  // Learning/improvement
  const { learningLevel, learningScore } =
    learningImprovement(languages, frameworks, commitMessages, commits);

  // Sort languages by LOC
  const sortedLanguages = Object.entries(languages)
    .sort(([, locA], [, locB]) => locB - locA)
    .reduce((obj, [key, value]) => {
      obj[key] = value;
      return obj;
    }, {});

  return {
    name: path.basename(repoPath),
    languages: sortedLanguages,
    frameworks,
    projectType,
    commits,
    firstCommit,
    lastCommit,
    experienceLevel,
    totalLOC,
    codeCleanliness: cleanliness,
    avgFileLength,
    commentDensity,
    learningLevel,
    learningScore
  };
}

// Helper: Aggregate all repo analyses for prompt input
function aggregateRepoData(analyses) {
  let totalLOC = 0, totalCommits = 0, avgCommentDensity = 0, avgLearningScore = 0;
  let count = analyses.length;
  analyses.forEach(a => {
    totalLOC += a.totalLOC || 0;
    totalCommits += a.commits || 0;
    avgCommentDensity += a.commentDensity || 0;
    avgLearningScore += a.learningScore || 0;
  });
  if (count) {
    avgCommentDensity /= count;
    avgLearningScore /= count;
  }
  return { totalLOC, totalCommits, avgCommentDensity, avgLearningScore };
}

// Helper: Use LangChain to generate an assessment string
async function generateAssessmentWithLangChain(analyses) {
  const { totalLOC, totalCommits, avgCommentDensity, avgLearningScore } = aggregateRepoData(analyses);
  const summary = `
Total LOC: ${totalLOC}
Total commits: ${totalCommits}
Average comment density: ${avgCommentDensity}
Average learning score: ${avgLearningScore}
  `.trim();

  const chat = new ChatOpenAI({ temperature: 0.7 });
  const systemPrompt = `You are an expert developer profile analyst. Given the following repository statistics, write a concise assessment of the developer's experience, code quality, and learning habits.`;
  const userPrompt = `Repository statistics:\n${summary}\nRespond with a short assessment.`;

  const response = await chat.call([
    new SystemMessage(systemPrompt),
    new HumanMessage(userPrompt)
  ]);
  return response.content;
}

// Main function to analyze all remote repos and output a prompt for the bio
export async function analyzeAndGeneratePromptForBio(repoPaths, logger = {}) {
  // repoPaths: array of repo paths (local clones)
  const analyses = repoPaths.map(repoPath => analyzeAllRepos(repoPath, logger));
  // Use LangChain to generate an assessment
  const assessment = await generateAssessmentWithLangChain(analyses);

  // Gather summary data for the prompt
  const languages = new Set();
  const frameworks = new Set();
  const projectTypes = new Set();
  let firstActivity = new Date();
  let totalCommits = 0;
  analyses.forEach(a => {
    Object.keys(a.languages).forEach(l => languages.add(l));
    a.frameworks.forEach(fw => frameworks.add(fw));
    projectTypes.add(a.projectType);
    if (a.firstCommit < firstActivity) firstActivity = a.firstCommit;
    totalCommits += a.commits;
  });

  // Compose the prompt for LangChain
  const chat = new ChatOpenAI({ temperature: 0.7 });
  const systemPrompt = `You are a creative assistant for writing GitHub profile bios.`;
  const userPrompt = `
Write a short, engaging GitHub profile bio for a developer named Kutlu.
- Coding since ${firstActivity.toLocaleDateString()}.
- Total commits: ${totalCommits}.
- Main languages: ${Array.from(languages).join(', ') || 'N/A'}.
- Frameworks: ${Array.from(frameworks).join(', ') || 'N/A'}.
- Project types: ${Array.from(projectTypes).join(', ') || 'N/A'}.
- Assessment: ${assessment}
Focus on strengths, learning, and growth. Make it concise and inspiring.
`.trim();

  const response = await chat.call([
    new SystemMessage(systemPrompt),
    new HumanMessage(userPrompt)
  ]);
  const prompt = response.content;

  // Output the prompt with a marker for GitHub Actions to capture
  console.log(`::set-output name=ai_prompt::${prompt}`);

  // Optionally, return the prompt for local use
  return prompt;
}

// Analyze all repos in a directory (each subdirectory is a repo)
export function analyzeReposInDirectory(parentDir, logger = {}) {
  const log = logger.log || (() => {});
  const error = logger.error || (() => {});
  const results = [];
  fs.readdirSync(parentDir).forEach(dir => {
    const fullPath = path.join(parentDir, dir);
    if (fs.statSync(fullPath).isDirectory()) {
      if (fs.existsSync(path.join(fullPath, '.git'))) {
        log(`Analyzing repo: ${fullPath}`);
        try {
          results.push(analyzeAllRepos(fullPath, logger));
        } catch (e) {
          error(`Failed to analyze repo: ${fullPath}`, e);
        }
      } else {
        log(`Skipped (no .git): ${fullPath}`);
      }
    } else {
      log(`Skipped (not a directory): ${fullPath}`);
    }
  });
  return results;
}