import fetch from 'node-fetch';
import fs from 'fs';
import { OpenAI } from 'openai';

// Initialize OpenAI with your API key
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY, 
});

// GitHub username and birthdate
const username = 'muratkutlutuna';
const birthDate = new Date('1992-10-22');
const today = new Date();
let age = today.getFullYear() - birthDate.getFullYear();
if (today.getMonth() < birthDate.getMonth() || (today.getMonth() === birthDate.getMonth() && today.getDate() < birthDate.getDate())) {
  age--;
}

// Fetch repositories from GitHub API
async function fetchLanguages() {
  const res = await fetch(`https://api.github.com/users/${username}/repos`);
  const repos = await res.json();

  const languageCount = {};
  for (const repo of repos) {
    if (repo.language) {
      languageCount[repo.language] = (languageCount[repo.language] || 0) + 1;
    }
  }
  return languageCount;
}

// Function to call OpenAI for generating a dynamic career description
async function generateAIDescription() {
  const prompt = `
  You are an AI that generates a personalized professional description based on the user's GitHub profile and programming experience.
  The user is a Software Developer in Test with expertise in Java, working on a TakeAway project and contributing to a QA team-based product.
  The user is interested in continuous learning, exploring languages like Java, JavaScript, Python, and frameworks like Spring Boot, React, Node.js, and Django.
  Their favorite language is Java and they are currently learning Cucumber.
  Write a brief and engaging description of this user's career, focusing on their skills, experience, and learning path. Keep the tone professional and friendly.
  `;
  
  const response = await openai.chat.completions.create({
    model: 'gpt-3.5-turbo',
    messages: [{ role: 'user', content: prompt }],
  });

  return response.choices[0].message.content;
}

// AI-driven function to generate a bio section
function generateBio(languages) {
  const topLanguages = Object.entries(languages)
    .sort((a, b) => b[1] - a[1])
    .map(([lang, count]) => `- ${lang}: ${count} repo(s)`)
    .join('\n');

  const frameworks = [];
  if (languages.Java) frameworks.push('Spring Boot, Cucumber');
  if (languages.JavaScript || languages.TypeScript) frameworks.push('React, Node.js');
  if (languages.Python) frameworks.push('Django');
  if (languages.HTML || languages.CSS) frameworks.push('Bootstrap, Tailwind');

  const frameworkList = frameworks.length ? frameworks.join(', ') : 'Various frameworks';

  return `
<h2>Tech Experience Summary</h2>

#### 📍 Top Programming Languages:
${topLanguages}

#### 🧰 Frameworks & Tools:
${frameworkList}
  `;
}

// Main function to generate the README
(async () => {
  const languages = await fetchLanguages();
  const bio = generateBio(languages);
  const aiDescription = await generateAIDescription();  // Get AI-generated description

  const readme = `
<h1 align="center">Hi, 👋🏼 I'm Kutlu!</h1>
<h3 align="center">Software Developer in Test</h3>

<p align="center">
  I am a husband, son, videogame player, and automation tester.<br/>
  I'm ${age} years old and have been working in the IT world since I got the chance.<br/>
  I’m currently working on my own TakeAway project and contributing to a team-based QA test product.<br/>
  My favorite programming language is Java, and I’m currently learning Cucumber.<br/>
</p>

${bio}

#### 🤖 Career Overview:
${aiDescription}  <!-- Insert AI description here -->

---

_Last updated automatically every week by GitHub Actions._
`;

  // Write the new README
  fs.writeFileSync('README.md', readme.trim());
})();
