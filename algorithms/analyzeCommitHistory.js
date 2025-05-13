import { execSync } from 'child_process';

export function analyzeCommitHistory(repoPath, log, error) {
  let commits = 0, firstCommit = new Date(), lastCommit = new Date(0);
  let commitMessages = [];
  try {
    const logArr = execSync('git log --pretty=format:"%ct|%s"', { cwd: repoPath }).toString().split('\n');
    commits = logArr.length;
    if (logArr.length) {
      firstCommit = new Date(Number(logArr[logArr.length - 1].split('|')[0]) * 1000);
      lastCommit = new Date(Number(logArr[0].split('|')[0]) * 1000);
      commitMessages = logArr.map(l => l.split('|')[1] || '');
    }
    log?.(`Commit history: ${commits} commits, First: ${firstCommit}, Last: ${lastCommit}`);
  } catch (e) {
    error?.(`Error fetching commit history for: ${repoPath}`, e);
  }
  return { commits, firstCommit, lastCommit, commitMessages };
}
