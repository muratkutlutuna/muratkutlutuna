export function learningImprovement(languages, frameworks, commitMessages, commits) {
  let learningScore = 0;
  if (Object.keys(languages).length > 2) learningScore += 1;
  if (frameworks.length > 1) learningScore += 1;
  const learningKeywords = ['fix', 'refactor', 'improve', 'learn', 'test', 'experiment', 'update', 'cleanup', 'docs', 'typo', 'upgrade', 'migrate'];
  const learningCommits = commitMessages.filter(msg =>
    learningKeywords.some(kw => msg && msg.toLowerCase().includes(kw))
  ).length;
  if (learningCommits / (commits || 1) > 0.2) learningScore += 1;
  if (learningCommits > 5) learningScore += 1;

  let learningLevel = 'Low';
  if (learningScore >= 3) learningLevel = 'High';
  else if (learningScore === 2) learningLevel = 'Moderate';

  return { learningLevel, learningScore };
}
