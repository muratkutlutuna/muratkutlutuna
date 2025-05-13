import fs from 'fs';
import path from 'path';

export function determineProjectType(repoPath, frameworks) {
  let projectType = 'Unknown';
  if (frameworks.includes('React') || frameworks.includes('Django') || frameworks.includes('Vue') || frameworks.includes('Angular') || frameworks.includes('Svelte') || frameworks.includes('Next.js')) {
    projectType = 'Web App';
  } else if (frameworks.includes('Cucumber') || frameworks.includes('JUnit') || frameworks.includes('Jest') || frameworks.includes('Mocha')) {
    projectType = 'Test Framework';
  } else if (frameworks.includes('Node.js') || frameworks.includes('Express') || frameworks.includes('NestJS')) {
    projectType = 'CLI Tool / Backend';
  }
  if (fs.existsSync(path.join(repoPath, 'Dockerfile'))) projectType = 'Containerized App';
  if (fs.existsSync(path.join(repoPath, '.github/workflows'))) projectType = 'CI/CD Pipeline';
  return projectType;
}
