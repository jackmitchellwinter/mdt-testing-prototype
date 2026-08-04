# Getting started with GitHub Copilot

This guide gets you from signing in to shipping your hackathon service. Your organisation has already set up your Copilot licence, so you can start straight away.

## How do I access GitHub Copilot?

Your organisation controls your licence and policies. You do not need to buy or activate anything yourself. GitHub does not use your organisation's Copilot data to train its models, and your admin can manage privacy and security settings centrally.

You need:

- a GitHub account approved by your organisation
- an active Copilot licence (already set up for you)
- a supported IDE, such as VS Code or a JetBrains IDE

## How do I set up Copilot in my IDE?

**In VS Code:**

1. Install the GitHub Copilot extension from the VS Code marketplace/Extentions tab located on left menu pane.
2. Sign in using your GitHub account.
3. Check the status bar to confirm Copilot is enabled.

**In a JetBrains IDE** (IntelliJ IDEA, PyCharm, and similar):

1. Install the GitHub Copilot plugin from JetBrains Marketplace/ settings (located under IDEA next to File) > Plugins.
2. Sign in using your GitHub account.
3. Enable the plugin for your current project.

## How do I get code from Copilot?

Copilot works in three ways. Use whichever fits the task.

- **Inline suggestions.** Start typing, or write a comment describing what you want, and accept the suggestion that appears.
- **Chat.** Ask Copilot Chat a question or ask it to explain existing code before you change it.
- **Agent mode.** Give Copilot a task and let it work across multiple files, running its own checks along the way. You review the result before committing.

Treat every suggestion like a junior developer's first draft. Read it before you accept it, and check it against your team's coding standards. You stay responsible for anything you commit.

## Which model should I use?

Copilot lets you pick which AI model does the work. Included models cost nothing. Premium models cost credits, charged per message you send, not per file Copilot reads or command it runs.

| Task type | Recommended model|
|---|---|
| Writing functions, tests, refactoring, documentation, debugging | GPT-5 mini | 
| Complex business logic the included model can't handle well | Claude Sonnet 4.6 |
| Complex problem-solving and architecture decisions | Claude Opus 4.6 |
| Long, many-step agentic tasks needing precision | Claude Opus 4.7 |

Start with the included model every time. Only move to a premium model when the included one genuinely falls short. If you pick "Auto", Copilot will never choose a high-cost model on your behalf, and it switches to a free model automatically once your allowance runs out.

## How do I use Copilot to plan and build my hackathon service?

1. **Describe the problem before you write code.** Tell Copilot Chat what the service needs to do and who it's for, in plain English. Ask it to suggest an approach before you start building.
2. **Build in small, reviewable steps.** Ask for one feature or function at a time rather than a whole service in one prompt. Smaller steps are easier to check and easier to fix.
3. **Ask Copilot to explain before you change.** If you're working with code someone else wrote, or code Copilot wrote earlier, ask Copilot to explain it first.
4. **Generate tests as you go.** Ask Copilot to write tests for each function, and tell it which test framework you're using. Check the tests still fail when the code is broken.
5. **Never paste secrets or sensitive data into a prompt.** Treat your prompts the same way you'd treat a public message.

## Hackathon tips

- **Use the included model for the bulk of your build, and save premium models for the hard problem you're stuck on.** This keeps your credits available for the moment you actually need them, usually late on day one.
- **Start a new chat session for each new feature.** Old messages pile up in the context and slow Copilot down. A fresh session with a clear, well-written prompt usually beats a long back-and-forth in an old one.

## Source

This guide draws on the GitHub Copilot user guides from the AI Engineering Lab repository:

- [Getting started with GitHub Copilot](https://github.com/gds-dtx/aiengineeringlab/blob/2902358d55c8373914c5cb82223c1b0a14b104e8/user-tool-guides/github-copilot/getting-started.md)
- [Advanced use of GitHub Copilot](https://github.com/gds-dtx/aiengineeringlab/blob/2902358d55c8373914c5cb82223c1b0a14b104e8/user-tool-guides/github-copilot/advanced-use.md)
- [Agent mode billing and credit consumption](https://github.com/gds-dtx/aiengineeringlab/blob/2902358d55c8373914c5cb82223c1b0a14b104e8/user-tool-guides/github-copilot/agent-mode-billing.md)