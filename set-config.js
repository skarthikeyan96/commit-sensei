#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { promisify } from 'util';
import * as p from "@clack/prompts";

const writeFileAsync = promisify(fs.writeFile);
const configFilePath = path.resolve(process.cwd(), '.genai-config.json');

async function setConfig() {
  p.intro("Welcome to the commit message generator configuration 🎉");

  const apiKey = await p.text({
    message: "Please enter your Google Generative AI API key:",
    validate: (value) => !value && "API key cannot be empty",
  });

  const config = { apiKey };

  await writeFileAsync(configFilePath, JSON.stringify(config));
  console.log("Configuration saved to .genai-config.json");

  p.outro("Configuration setup complete! You can now use the commit-sensei command.");
  process.exit(0);
}

export default setConfig;
