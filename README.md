# Commit Message Generator CLI

This CLI tool helps developers generate concise and meaningful commit messages for their projects. Leveraging the power of Google Generative AI, it suggests commit messages based on the diff of staged changes. The tool ensures adherence to best practices for commit messages, including proper formatting and optional inclusion of emojis.

## Features

- **AI-Powered Commit Messages**: Generates commit messages using Google Generative AI.
- **Rate Limiting**: Adheres to API rate limits to prevent overuse.
- **Configuration Management**: Stores and manages API keys securely.
- **Emoji Support**: Automatically adds relevant emojis based on the commit type.
- **Interactive Editing**: Allows users to review and edit the generated commit message before finalizing the commit.

## Installation

```bash
npm install -g commit-message-generator
```

## Usage

1. **Initialize the Configuration**:
   The first time you use the tool, it will prompt you to enter your Google Generative AI API key.
   ```bash
   commit-msg-gen
   ```

2. **Generate a Commit Message**:
   ```bash
   commit-msg-gen
   ```
   This command will generate a commit message based on the staged changes and prompt you to confirm or edit it.

## Configuration

The tool stores configuration details in a `.genai-config.json` file in the project's root directory. The file includes the API key needed to access Google Generative AI services.

## Rate Limiting

To comply with the API's rate limits, the tool tracks usage and ensures that the following limits are not exceeded:
- 15 Requests Per Minute (RPM)
- 1 Million Tokens Per Minute (TPM)
- 1,500 Requests Per Day (RPD)

## Emoji Mapping

The tool supports the following conventional commit types with corresponding emojis:

- **feat** (new feature): ✨
- **fix** (bug fix): 🐛
- **docs** (documentation): 📚
- **style** (formatting, missing semi-colons, etc.): 💎
- **refactor** (code change that neither fixes a bug nor adds a feature): 🔨
- **perf** (performance improvement): 🚀
- **test** (adding missing tests or correcting existing tests): 🚨
- **build** (changes that affect the build system or external dependencies): 📦
- **ci** (changes to CI configuration files and scripts): 👷
- **chore** (other changes that don't modify src or test files): 🔧

## Future Roadmap

### 1. **Batch Processing**
   - Handle multiple commits or large diffs by summarizing changes or generating multiple commit messages.

### 2. **Extended Emoji Support**
   - Expand emoji options to cover more commit types and scenarios.

### 3. **Customizable Prompts**
   - Allow users to customize prompts and commit message formats according to their team's conventions.

### 4. **Localization**
   - Add support for multiple languages, enabling internationalization of commit messages.

### 5. **Enhanced Configuration Management**
   - Provide more robust configuration options, such as environment-based settings and secure storage.

### 6. **Advanced Rate Limiting**
   - Implement more sophisticated rate limiting strategies, including user-specific limits and real-time monitoring.

### 7. **Integration with CI/CD**
   - Integrate the tool with popular CI/CD pipelines to automate commit message generation.

## Contributing

Contributions are welcome! Please submit a pull request or open an issue to discuss improvements or report bugs.

## License

This project is licensed under the MIT License.