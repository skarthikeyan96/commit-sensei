#!/usr/bin/env node

import { execSync } from "child_process";
import { GoogleGenerativeAI } from "@google/generative-ai";
import * as p from "@clack/prompts";
import fs from "fs";
import path from "path";
import { promisify } from "util";
import dotenv from "dotenv";
import { editor } from "@inquirer/prompts";

const readFileAsync = promisify(fs.readFile);
const writeFileAsync = promisify(fs.writeFile);
const configFilePath = path.resolve(process.cwd(), ".genai-config.json");
const usageFilePath = path.resolve(process.cwd(), ".genai-usage.json");

const RATE_LIMITS = {
  RPD: 1500,
};

async function initConfig() {
  p.intro("Welcome to the commit message generator 🎉");
  const apiKey = await p.text({
    message: "Please enter your Google Generative AI API key:",
    validate: (value) => !value && "API key cannot be empty",
  });
  const config = { apiKey };
  await writeFileAsync(configFilePath, JSON.stringify(config));
  console.log("Configuration saved to .genai-config.json");
}

async function loadConfig() {
  try {
    const data = await readFileAsync(configFilePath, "utf-8");
    return JSON.parse(data);
  } catch (error) {
    console.error("Error loading configuration:", error.message);
    process.exit(1);
  }
}

async function loadUsage() {
  try {
    if (!fs.existsSync(usageFilePath)) {
      return { requests: 0, tokens: 0, timestamp: Date.now() };
    }
    const data = await readFileAsync(usageFilePath);
    return JSON.parse(data);
  } catch (error) {
    console.error("Error loading usage data", error);
  }
}

async function saveUsage(usage) {
  try {
    await writeFileAsync(usageFilePath, JSON.stringify(usage, null, 2));
  } catch (error) {
    console.error("Error saving usage data:", error);
  }
}

async function resetUsageIfNeeded(usage) {
  const now = Date.now();
  const oneDay = 24 * 60 * 60 * 1000;
  if (now - usage.timestamp > oneDay) {
    usage.requests = 0;
    usage.timestamp = now;
  }
  await saveUsage(usage);
}

const commitEmojis = {
  feat: "✨",
  fix: "🐛",
  docs: "📚",
  style: "💎",
  refactor: "🔨",
  perf: "🚀",
  test: "🚨",
  build: "📦",
  ci: "👷",
  chore: "🔧",
};

async function editCommitMessage(initialMsg) {
  try {
    const answer = await editor({
      message: "Edit the generated commit message if needed:",
      default: initialMsg,
    });

    return answer;
  } catch (error) {
    console.error("failed to edit the commit message", error);
  }
}

async function main() {
  if (!fs.existsSync(configFilePath)) {
    await initConfig();
  }

  let usage = await loadUsage();
  await resetUsageIfNeeded(usage);

  if (usage.requests >= RATE_LIMITS.RPD) {
    console.error("Rate limit exceeded: 1,500 requests per day");
    process.exit(1);
  }

  const config = await loadConfig();
  dotenv.config();

  const genAI = new GoogleGenerativeAI(config.apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  const commitStandard = `The commit message should be structured as follows:

  <type>[optional scope]: <description>
  The commit contains the following structural elements, to communicate intent to the consumers of your library:

  fix: a commit of the type fix patches a bug in your codebase (this correlates with PATCH in Semantic Versioning).
  feat: a commit of the type feat introduces a new feature to the codebase (this correlates with MINOR in Semantic Versioning).
  BREAKING CHANGE: a commit that has a footer BREAKING CHANGE:, or appends a ! after the type/scope, introduces a breaking API change (correlating with MAJOR in Semantic Versioning). A BREAKING CHANGE can be part of commits of any type.
  types other than fix: and feat: are allowed, for example @commitlint/config-conventional (based on the Angular convention) recommends build:, chore:, ci:, docs:, style:, refactor:, perf:, test:, and others.
  footers other than BREAKING CHANGE: <description> may be provided and follow a convention similar to git trailer format.
  `;

  const diff = execSync("git diff --staged --cached").toString();
  if (!diff) {
    console.log("No changes to commit 🙅");
    console.log("Try git add .");
    process.exit(1);
  }

  const s = p.spinner();
  s.start("Generating commit message...");

  try {
    const prompt = `Generate a concise and meaningful commit message for the following changes:
    ${diff}
    
    Please adhere to best practices for commit messages, such as starting with an imperative verb, being specific about what was changed and why, and maintaining a professional tone. Ensure the message aligns with the following standard:
    
    ${commitStandard}
    
    The message should only include the title and be limited to 50 characters.`;

    const result = await model.generateContent(prompt);
    s.stop();

    if (result && result.response) {
      const commitMsg = result.response.text().trim();
      const commitType = Object.keys(commitEmojis).find((c) =>
        commitMsg.startsWith(c)
      );
      const emoji = commitEmojis[commitType] || "";
      let updatedCommit = `${emoji} ${commitMsg}`;

      console.log("Generated commit message: \n", updatedCommit);

      usage.requests += 1;
      usage.tokens += result.response.tokens;
      await saveUsage(usage);

      // ask if the user want to edit the commit message
      const shouldContinueEdit = await p.confirm({
        message: "Do you want to edit the commit message",
      });

      if (shouldContinueEdit) {
        // open the interactive editor and edit the message -> unfortunately going for inquirer because no editor in clack
        updatedCommit = await editCommitMessage(updatedCommit);
      }

      const shouldContinue = await p.confirm({
        message: "Do you want to continue with this commit message? \n ",
      });

      if (shouldContinue) {
        execSync(`git commit -m "${updatedCommit}"`);
        console.log("Commit successful.");
      } else {
        console.log("Commit aborted.");
      }
    } else {
      console.log("Failed to generate commit message.");
    }
  } catch (error) {
    s.stop();
    console.error("Error:", error.message);
    process.exit(1);
  }
}

main();
