export function codeCleanliness(totalLOC, totalFiles, totalCommentLines) {
  const avgFileLength = totalFiles ? (totalLOC / totalFiles) : 0;
  const commentDensity = totalLOC ? (totalCommentLines / totalLOC) : 0;
  let codeCleanliness = 'Unknown';
  if (commentDensity > 0.15 && avgFileLength < 400) codeCleanliness = 'Clean';
  else if (commentDensity > 0.05) codeCleanliness = 'Moderate';
  else codeCleanliness = 'Needs Improvement';
  return { avgFileLength, commentDensity, codeCleanliness };
}
