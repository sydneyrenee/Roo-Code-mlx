<h1>My Extension</h1>

<h2>Join the My Extension Community</h2>

<p align="center">
<a href="https://discord.gg/my-extension-name" target="_blank"><img src="https://img.shields.io/badge/Join%20Discord-5865F2?style=for-the-badge&logo=discord&logoColor=white" alt="Join Discord" height="60"></a>
<a href="https://www.reddit.com/r/my-extension-name/" target="_blank"><img src="https://img.shields.io/badge/Join%20Reddit-FF4500?style=for-the-badge&logo=reddit&logoColor=white" alt="Join Reddit" height="60"></a>
</p>

<p align="center">
<a href="https://marketplace.visualstudio.com/items?itemName=YourPublisherName.my-extension-name" target="_blank"><img src="https://img.shields.io/badge/Download%20on%20VS%20Marketplace-blue?style=for-the-badge&logo=visualstudiocode&logoColor=white" alt="Download on VS Marketplace"></a>
<a href="https://github.com/YourPublisherName/My Extension/discussions/categories/feature-requests?discussions_q=is%3Aopen+category%3A%22Feature+Requests%22+sort%3Atop" target="_blank"><img src="https://img.shields.io/badge/Feature%20Requests-yellow?style=for-the-badge" alt="Feature Requests"></a>
<a href="https://marketplace.visualstudio.com/items?itemName=YourPublisherName.my-extension-name&ssr=false#review-details" target="_blank"><img src="https://img.shields.io/badge/Rate%20%26%20Review-green?style=for-the-badge" alt="Rate & Review"></a>
<a href="https://docs.my-extension-name.com" target="_blank"><img src="https://img.shields.io/badge/Documentation-6B46C1?style=for-the-badge&logo=readthedocs&logoColor=white" alt="Documentation"></a>
</p>

**My Extension** is an AI-powered **autonomous coding agent** that lives in your editor. It can:

- Write and edit code based on natural language instructions
- Execute terminal commands and run tests
- Open browser sessions to test web applications
- Analyze and fix problems in your codebase

Whether you're seeking a flexible coding partner, a system architect, or specialized roles like a QA engineer or product manager, My Extension can help you build software more efficiently.

## What's New

This release brings significant improvements to how you interact with My Extension:

### Code Actions

My Extension now integrates directly with VS Code's native code actions system, providing quick fixes and refactoring options right in your editor. Look for the lightbulb 💡 to access My Extension's capabilities without switching context.

### Custom Modes

- **Custom File Restrictions**: In general, custom modes can now be restricted to specific file patterns (for example, a technical writer who can only edit markdown files 👋). There's no UI for this yet, but who needs that when you can just ask My Extension to set it up for you?

## Join Our Community

We've launched a new Discord community! Join us at [https://my-extension-name.com/discord](https://my-extension-name.com/discord) to:

- Get help and support
- Share your projects and ideas
- Connect with other My Extension users

## Features

My Extension communicates in **natural language** and proposes actions—file edits, terminal commands, browser tests, etc. You choose how it behaves:

### Interaction Modes

- **Autonomous/Auto-Approve**: Grant My Extension the ability to run tasks without interruption, speeding up routine workflows.
- **Supervised**: Review and approve each action before execution, maintaining full control.

No matter your preference, you always have the final say on what My Extension does.

### Supported Models

Use My Extension with:

- **Claude** (Anthropic)
- **GPT-4** (OpenAI)
- **Usage Tracking**: My Extension monitors token and cost usage for each session.

### Custom Modes

**Custom Modes** let you shape My Extension's persona, instructions, and permissions:

- **Built-in Roles**: Choose from Code, Architect, Ask, and other specialized modes
- **Customizable**: Tailor instructions and permissions for each mode
- **User-Created**: Type `Create a new mode for <X>` and My Extension generates a brand-new persona for that role—complete with tailored prompts and optional tool restrictions.

### Capabilities

My Extension can:

- **Write and Edit Code**: Create new files or modify existing ones
- **Analyze Code**: Understand complex codebases and explain how they work
- **Fix Bugs**: Identify and resolve issues in your code
- **Refactor**: Improve code structure and readability

### Terminal Integration

Easily run commands in your terminal—My Extension:

- Executes build, test, and deployment commands
- Installs dependencies and tools
- Runs scripts and utilities
- Manages Git operations

You approve or decline each command, or set auto-approval for routine operations.

### Browser Integration

My Extension can also open a **browser** session to:

- Test web applications
- Verify UI changes
- Interact with web interfaces
- Capture screenshots for documentation

### MCP Integration

Extend My Extension with the **Model Context Protocol (MCP)**:

- Add custom tools like web search, database access, or API clients
- Connect to external services and data sources
- Create specialized workflows for your projects

My Extension can build and configure new tools autonomously (with your approval) to expand its capabilities instantly.

### Context Providers

- **@file** – Include specific files in the conversation
- **@folder** – Add entire directories for context
- **@problems** – Pull in workspace errors/warnings for My Extension to fix.
- **@git** – Supply a list of Git commits or diffs for My Extension to analyze code history.

Help My Extension focus on the most relevant details without blowing the token budget.

## Installation

My Extension is available on:

- **[VSCode Marketplace](https://marketplace.visualstudio.com/items?itemName=YourPublisherName.my-extension-name)**
- **[Open-VSX](https://open-vsx.org/extension/YourPublisherName/my-extension-name)**

1. **Search "My Extension"** in your editor's Extensions panel to install directly.
2. **Configure** your API key in the extension settings.
3. **Open** My Extension from the Activity Bar or Command Palette to start chatting.

> **Tip**: Use `Cmd/Ctrl + Shift + P` → "My Extension: Open in New Tab" to dock the AI assistant alongside your file explorer.

## Development

```bash
# Clone the repository
git clone https://github.com/yourusername/your-repo

# Install dependencies
npm install

# Build the extension
npm run build

# Install the extension locally
code --install-extension bin/my-extension-name-1.0.0.vsix
```

### Development Workflow

- Press `F5` (or **Run** → **Start Debugging**) in VSCode to open a new session with My Extension loaded.
- Make changes to the code and reload the window to see them take effect.
- Run tests with `npm test`.

## Contributing

We welcome contributions from the community! Here's how to get started:

1. **Check Issues & Requests**: See [open issues](https://github.com/yourusername/your-repo/issues) or [feature requests](https://github.com/yourusername/your-repo/discussions/categories/feature-requests).
2. **Fork & Clone**: Fork the repository and clone it locally.
3. **Create a Branch**: Make your changes in a new branch.
4. **Join** our [Reddit community](https://www.reddit.com/r/my-extension-name/) and [Discord](https://my-extension-name.com/discord) for feedback, tips, and announcements.

## Disclaimer

**Please note** that Your Name does **not** make any representations or warranties regarding any code, models, or other tools provided or made available in connection with My Extension, any associated third-party tools, or any resulting outputs. You assume **all risks** associated with the use of any such tools or outputs; such tools are provided on an **"AS IS"** and **"AS AVAILABLE"** basis. Such risks may include, without limitation, intellectual property infringement, cyber vulnerabilities or attacks, bias, inaccuracies, errors, defects, viruses, downtime, property loss or damage, and/or personal injury. You are solely responsible for your use of any such tools or outputs (including, without limitation, the legality, appropriateness, and results thereof).

## License

[Apache 2.0 © 2025 Your Name](./LICENSE)

**Enjoy My Extension!** Whether you keep it on a short leash or let it roam autonomously, we can't wait to see what you build. If you have questions or feature ideas, drop by our [Reddit community](https://www.reddit.com/r/my-extension-name/) or [Discord](https://my-extension-name.com/discord). Happy coding!