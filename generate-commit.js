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

const usageFilePath = path.resolve(process.cwd(), ".genai-usage.json");
const configFilePath = path.resolve(process.cwd(), ".genai-config.json");

const RATE_LIMITS = { RPD: 1500 };

async function loadConfig() {
  try {
    const data = await readFileAsync(configFilePath, "utf-8");
    return JSON.parse(data);
  } catch (error) {
    console.error("Error loading configuration:", error.message);
    process.exit(1);
  }
}

async function loadAndValidateConfig() {
  if (!fs.existsSync(configFilePath)) {
    console.error(
      "Configuration file is missing. Please run the set-config command."
    );
    process.exit(1);
  }

  let config;
  try {
    const data = await readFileAsync(configFilePath, "utf-8");
    config = JSON.parse(data);
  } catch (error) {
    console.error("Error reading configuration file:", error.message);
    process.exit(1);
  }

  if (!config.apiKey || config.apiKey.trim() === "") {
    console.error("API key is missing in the configuration. Please set it up.");
    process.exit(1);
  }

  return config;
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
    console.error("Failed to edit the commit message", error);
  }
}

async function main() {
  let usage = await loadUsage();
  await resetUsageIfNeeded(usage);

  if (usage.requests >= RATE_LIMITS.RPD) {
    console.error("Rate limit exceeded: 1,500 requests per day");
    process.exit(1);
  }

  const config = await loadAndValidateConfig();
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

  const diff = execSync("git diff --staged --cached --diff-algorithm=minimal").toString();
  if (!diff) {
    console.log("No changes to commit 🙅");
    console.log("Try git add .");
    process.exit(1);
  }

  const s = p.spinner();
  s.start("Generating commit message...");

  try {
    const prompt = `Let's assume you're an automated AI that will generate a conventional git commit message based on this diff:
    ${diff}
    The commit message should follow this structure:
      <type>[optional scope]: <description>
      - Start with an imperative verb.
      - Be specific about what was changed and why.
      - Maintain a professional tone.
      The types are:
      - fix: A bug fix.
      - feat: A new feature.
      - build: Changes that affect the build system.
      - ci: Changes to our CI configuration.
      - docs: Documentation only changes.
      - style: Code style changes (formatting, missing semi-colons, etc.).
      - refactor: A code change that neither fixes a bug nor adds a feature.
      - perf: A code change that improves performance.
      - test: Adding or correcting tests.
      - chore: Other changes that don't modify src or test files.
      Your response will be directly passed into 'git commit -m', so it should be concise and meaningful, adhering strictly to the 50-character limit for the title. No body or footers, and avoid any special characters. Make sure include ' for wrapping file names`;

    const result = await model.generateContent(prompt);
    s.stop();

    if (result && result.response) {
      const commitMsg = result.response.text().trim();
      const titleOnly = commitMsg.split('\n')[0];

      const commitType = Object.keys(commitEmojis).find((c) =>
      titleOnly.startsWith(c)
      );
      const emoji = commitEmojis[commitType] || "";

      let updatedCommit = `${emoji} ${titleOnly}`;

      console.log("Generated commit message: \n", updatedCommit);

      usage.requests += 1;
      usage.tokens += result.response.tokens;
      await saveUsage(usage);

      const shouldContinueEdit = await p.confirm({
        message: "Do you want to edit the commit message?",
      });

      if (shouldContinueEdit) {
        updatedCommit = await editCommitMessage(updatedCommit);
      }

      const shouldContinue = await p.confirm({
        message: "Do you want to continue with this commit message?",
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
