// ============================================================
// AI INTEGRATION - Multi-Provider with Mock Fallback
// ============================================================

import { getActiveWorkspaceId } from "@/server/actions/active-workspace";
import { prisma } from "@/lib/prisma";

export interface AIProviderConfig {
  id: string;
  name: string;
  defaultUrl: string;
  defaultModel: string;
  protocol: "openai" | "gemini" | "anthropic";
}

export const AI_PROVIDERS: AIProviderConfig[] = [
  { id: "alibaba", name: "Alibaba Model Studio", defaultUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1", defaultModel: "qwen-plus", protocol: "openai" },
  { id: "amazon_bedrock", name: "Amazon Bedrock", defaultUrl: "", defaultModel: "anthropic.claude-3-5-sonnet-20241022-v2:0", protocol: "openai" },
  { id: "amazon_bedrock_mantle", name: "Amazon Bedrock Mantle", defaultUrl: "", defaultModel: "mantle-model", protocol: "openai" },
  { id: "anthropic", name: "Anthropic", defaultUrl: "https://api.anthropic.com/v1", defaultModel: "claude-3-5-sonnet-latest", protocol: "anthropic" },
  { id: "arcee", name: "Arcee AI", defaultUrl: "https://api.arcee.ai/v1", defaultModel: "arcee-merlin", protocol: "openai" },
  { id: "byteplus", name: "BytePlus", defaultUrl: "https://ark.cn-beijing.volces.com/api/v3", defaultModel: "doubao-pro-4k", protocol: "openai" },
  { id: "chutes", name: "Chutes", defaultUrl: "https://api.chutes.ai/v1", defaultModel: "meta-llama/Llama-3-70b-Instruct", protocol: "openai" },
  { id: "cloudflare_gateway", name: "Cloudflare AI Gateway", defaultUrl: "https://gateway.ai.cloudflare.com/v1/ACCOUNT_ID/GATEWAY_ID/openai", defaultModel: "meta-llama-3-8b-instruct", protocol: "openai" },
  { id: "deepseek", name: "DeepSeek", defaultUrl: "https://api.deepseek.com/v1", defaultModel: "deepseek-chat", protocol: "openai" },
  { id: "fireworks", name: "Fireworks", defaultUrl: "https://api.fireworks.ai/inference/v1", defaultModel: "accounts/fireworks/models/llama-v3-70b-instruct", protocol: "openai" },
  { id: "github_copilot", name: "GitHub Copilot", defaultUrl: "https://api.githubcopilot.com", defaultModel: "gpt-4o", protocol: "openai" },
  { id: "glm_zhipu", name: "GLM / Zhipu", defaultUrl: "https://open.bigmodel.cn/api/paas/v4", defaultModel: "glm-4", protocol: "openai" },
  { id: "google_gemini", name: "Google Gemini", defaultUrl: "https://generativelanguage.googleapis.com/v1beta", defaultModel: "gemini-2.0-flash", protocol: "gemini" },
  { id: "groq", name: "Groq", defaultUrl: "https://api.groq.com/openai/v1", defaultModel: "llama3-70b-8192", protocol: "openai" },
  { id: "huggingface", name: "Hugging Face Inference", defaultUrl: "https://api-inference.huggingface.co/v1", defaultModel: "meta-llama/Meta-Llama-3-8B-Instruct", protocol: "openai" },
  { id: "inferrs", name: "inferrs", defaultUrl: "https://api.inferrs.com/v1", defaultModel: "default", protocol: "openai" },
  { id: "kilocode", name: "Kilocode / Kilo Gateway", defaultUrl: "https://api.kilocode.dev/v1", defaultModel: "default", protocol: "openai" },
  { id: "minimax", name: "MiniMax", defaultUrl: "https://api.minimax.chat/v1", defaultModel: "abab6.5-chat", protocol: "openai" },
  { id: "mistral", name: "Mistral", defaultUrl: "https://api.mistral.ai/v1", defaultModel: "mistral-large-latest", protocol: "openai" },
  { id: "moonshot", name: "Moonshot AI / Kimi", defaultUrl: "https://api.moonshot.cn/v1", defaultModel: "moonshot-v1-8k", protocol: "openai" },
  { id: "nvidia", name: "NVIDIA", defaultUrl: "https://integrate.api.nvidia.com/v1", defaultModel: "meta/llama3-70b-instruct", protocol: "openai" },
  { id: "openai", name: "OpenAI / Codex", defaultUrl: "https://api.openai.com/v1", defaultModel: "gpt-4o-mini", protocol: "openai" },
  { id: "opencode", name: "OpenCode", defaultUrl: "https://api.opencode.ai/v1", defaultModel: "opencode-model", protocol: "openai" },
  { id: "opencode_go", name: "OpenCode Go", defaultUrl: "https://api.opencode.ai/go/v1", defaultModel: "opencode-go-model", protocol: "openai" },
  { id: "openrouter", name: "OpenRouter", defaultUrl: "https://openrouter.ai/api/v1", defaultModel: "meta-llama/llama-3-8b-instruct:free", protocol: "openai" },
  { id: "perplexity", name: "Perplexity", defaultUrl: "https://api.perplexity.ai", defaultModel: "sonar-reasoning", protocol: "openai" },
  { id: "qianfan", name: "Qianfan", defaultUrl: "https://qianfan.baidubce.com/v2", defaultModel: "ERNIE-Speed-8K", protocol: "openai" },
  { id: "qwen_cloud", name: "Qwen Cloud", defaultUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1", defaultModel: "qwen-max", protocol: "openai" },
  { id: "stepfun", name: "StepFun", defaultUrl: "https://api.stepfun.com/v1", defaultModel: "step-1-8k", protocol: "openai" },
  { id: "synthetic", name: "Synthetic", defaultUrl: "https://api.synthetic.ai/v1", defaultModel: "synthetic-model", protocol: "openai" },
  { id: "tencent_tokenhub", name: "Tencent Cloud / TokenHub", defaultUrl: "https://api.tokenhub.cn/v1", defaultModel: "hunyuan-lite", protocol: "openai" },
  { id: "together", name: "Together AI", defaultUrl: "https://api.together.xyz/v1", defaultModel: "mistralai/Mixtral-8x7B-Instruct-v0.1", protocol: "openai" },
  { id: "venice", name: "Venice AI", defaultUrl: "https://api.venice.ai/api/v1", defaultModel: "llama-3-70b", protocol: "openai" },
  { id: "vercel_gateway", name: "Vercel AI Gateway", defaultUrl: "https://gateway.ai.vercel.pub/v1", defaultModel: "gpt-4o-mini", protocol: "openai" },
  { id: "volcengine", name: "Volcengine / Doubao", defaultUrl: "https://ark.cn-beijing.volces.com/api/v3", defaultModel: "doubao-lite-4k", protocol: "openai" },
  { id: "vydra", name: "Vydra", defaultUrl: "https://api.vydra.ai/v1", defaultModel: "vydra-model", protocol: "openai" },
  { id: "xai", name: "xAI", defaultUrl: "https://api.x.ai/v1", defaultModel: "grok-beta", protocol: "openai" },
  { id: "xiaomi_mimo", name: "Xiaomi MiMo", defaultUrl: "https://api.mimo.xiaomi.com/v1", defaultModel: "mimo-model", protocol: "openai" },
  { id: "z_ai", name: "Z.AI", defaultUrl: "https://api.z.ai/v1", defaultModel: "z-model", protocol: "openai" }
];

export interface AIConfig {
  provider: string;
  apiKey: string | null;
  apiUrl: string | null;
  model: string | null;
}

export async function getAIConfig(): Promise<AIConfig> {
  try {
    const activeWorkspaceId = await getActiveWorkspaceId();
    if (activeWorkspaceId) {
      const ws = await prisma.workspace.findUnique({
        where: { id: activeWorkspaceId },
        select: {
          aiProvider: true,
          aiApiKey: true,
          aiApiUrl: true,
          aiModel: true,
          geminiApiKey: true,
          openaiApiKey: true,
        },
      });

      if (ws) {
        let provider = ws.aiProvider || "google_gemini";
        let apiKey = ws.aiApiKey || null;
        let apiUrl = ws.aiApiUrl || null;
        let model = ws.aiModel || null;

        // Legacy compatibility
        if (!apiKey) {
          if (ws.openaiApiKey) {
            provider = "openai";
            apiKey = ws.openaiApiKey;
          } else if (ws.geminiApiKey) {
            provider = "google_gemini";
            apiKey = ws.geminiApiKey;
          }
        }

        // Environment key mapping fallback
        if (!apiKey) {
          if (provider === "google_gemini") {
            apiKey = process.env.GEMINI_API_KEY || null;
          } else if (provider === "openai") {
            apiKey = process.env.OPENAI_API_KEY || null;
          } else {
            const envKeyName = `${provider.toUpperCase()}_API_KEY`;
            apiKey = process.env[envKeyName] || process.env.OPENAI_API_KEY || process.env.GEMINI_API_KEY || null;
          }
        }

        const providerMeta = AI_PROVIDERS.find((p) => p.id === provider);
        if (providerMeta) {
          if (!apiUrl) apiUrl = providerMeta.defaultUrl || null;
          if (!model) model = providerMeta.defaultModel || null;
        }

        return { provider, apiKey, apiUrl, model };
      }
    }
  } catch (error) {
    console.error("Error retrieving AI configuration from active workspace:", error);
  }

  const defaultProvider = process.env.GEMINI_API_KEY ? "google_gemini" : "openai";
  const defaultKey = process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY || null;
  const providerMeta = AI_PROVIDERS.find((p) => p.id === defaultProvider);
  return {
    provider: defaultProvider,
    apiKey: defaultKey,
    apiUrl: providerMeta?.defaultUrl || null,
    model: providerMeta?.defaultModel || null,
  };
}

// ============================================================
// CORE AI FUNCTION
// ============================================================

async function callAI(
  prompt: string,
  config: AIConfig
): Promise<{ content: string; isMock: boolean }> {
  if (!config.apiKey) {
    return { content: getMockResponse(prompt), isMock: true };
  }

  try {
    const providerMeta = AI_PROVIDERS.find((p) => p.id === config.provider);
    const protocol = providerMeta?.protocol || "openai";

    if (protocol === "gemini") {
      const content = await callGemini(prompt, config.apiKey, config.model || "gemini-2.0-flash");
      return { content, isMock: false };
    }

    if (protocol === "anthropic") {
      const content = await callAnthropic(prompt, config.apiKey, config.model || "claude-3-5-sonnet-latest", config.apiUrl);
      return { content, isMock: false };
    }

    // Default: openai protocol
    const content = await callOpenAICompatible(
      prompt,
      config.apiKey,
      config.model || "gpt-4o-mini",
      config.apiUrl || "https://api.openai.com/v1"
    );
    return { content, isMock: false };
  } catch (err) {
    console.error("AI execution failed, falling back to mock:", err);
    return { content: getMockResponse(prompt), isMock: true };
  }
}

async function callOpenAICompatible(
  prompt: string,
  apiKey: string,
  model: string,
  baseUrl: string
): Promise<string> {
  try {
    const cleanUrl = `${baseUrl.replace(/\/$/, "")}/chat/completions`;
    const response = await fetch(cleanUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        "HTTP-Referer": "https://devboardai.vercel.app",
        "X-Title": "DevBoard AI",
      },
      body: JSON.stringify({
        model: model,
        messages: [
          {
            role: "system",
            content:
              "You are a helpful project management AI assistant for DevBoard AI. Provide clear, structured, professional reports in Markdown format.",
          },
          { role: "user", content: prompt },
        ],
        max_tokens: 2000,
        temperature: 0.7,
      }),
    });

    const data = await response.json();
    return data.choices?.[0]?.message?.content || getMockResponse(prompt);
  } catch {
    return getMockResponse(prompt);
  }
}

async function callGemini(prompt: string, apiKey: string, model: string): Promise<string> {
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: `You are a helpful project management AI assistant for DevBoard AI. Provide clear, structured, professional reports in Markdown format.\n\n${prompt}`,
                },
              ],
            },
          ],
          generationConfig: { maxOutputTokens: 2000, temperature: 0.7 },
        }),
      }
    );

    const data = await response.json();
    return (
      data.candidates?.[0]?.content?.parts?.[0]?.text || getMockResponse(prompt)
    );
  } catch {
    return getMockResponse(prompt);
  }
}

async function callAnthropic(
  prompt: string,
  apiKey: string,
  model: string,
  baseUrl?: string | null
): Promise<string> {
  try {
    const url = baseUrl ? `${baseUrl.replace(/\/$/, "")}/messages` : "https://api.anthropic.com/v1/messages";
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: model,
        messages: [{ role: "user", content: prompt }],
        max_tokens: 2000,
        system: "You are a helpful project management AI assistant for DevBoard AI. Provide clear, structured, professional reports in Markdown format.",
        temperature: 0.7,
      }),
    });
    const data = await response.json();
    return data.content?.[0]?.text || getMockResponse(prompt);
  } catch {
    return getMockResponse(prompt);
  }
}

// ============================================================
// MOCK RESPONSES
// ============================================================

function getMockResponse(prompt: string): string {
  const lowerPrompt = prompt.toLowerCase();

  if (lowerPrompt.includes("commit message")) {
    return "feat: update project files with latest changes\n\n- Modified core components for improved performance\n- Updated configuration files\n- Fixed minor styling issues";
  }

  if (lowerPrompt.includes("pull request")) {
    return "## Summary\n\nThis PR introduces several improvements to the project including updated components, bug fixes, and configuration changes.\n\n## Changes\n\n- Updated core components\n- Fixed styling issues\n- Improved error handling\n\n## Testing\n\n- All existing tests pass\n- Manual testing completed\n\n## Notes\n\nPlease review the changes carefully before merging.";
  }

  if (lowerPrompt.includes("daily") || lowerPrompt.includes("progress")) {
    return `# Daily Progress Report\n\n**Date:** ${new Date().toLocaleDateString()}\n\n## Summary\n\nThe team made significant progress today across multiple project areas.\n\n## Completed Tasks\n- ✅ Implemented user authentication flow\n- ✅ Fixed 3 critical bugs in the dashboard\n- ✅ Updated API documentation\n- ✅ Deployed staging environment\n\n## In Progress\n- 🔄 Building notification system\n- 🔄 Optimizing database queries\n- 🔄 Setting up CI/CD pipeline\n\n## Blockers\n- ⚠️ Waiting for design review on settings page\n- ⚠️ Third-party API rate limit investigation\n\n## Metrics\n- Tickets completed: 5\n- Bugs fixed: 3\n- Code reviews: 4\n- Pull requests merged: 2`;
  }

  if (lowerPrompt.includes("weekly") || lowerPrompt.includes("sprint")) {
    return `# Weekly Sprint Report\n\n**Sprint:** Week ${Math.ceil(new Date().getDate() / 7)}\n**Period:** ${new Date().toLocaleDateString()} - ${new Date(Date.now() + 7 * 86400000).toLocaleDateString()}\n\n## Sprint Overview\n\n| Metric | Count |\n|--------|-------|\n| Total Tickets | 15 |\n| Completed | 8 |\n| In Progress | 4 |\n| Blocked | 2 |\n| Carry Over | 1 |\n\n## Team Performance\n\nThe team achieved **53%** completion rate this sprint, slightly above the target of 50%.\n\n## Key Achievements\n1. Launched new dashboard features\n2. Reduced bug backlog by 40%\n3. Improved test coverage to 78%\n\n## Areas for Improvement\n- Better estimation on complex tasks\n- More frequent code reviews\n- Earlier identification of blockers\n\n## Next Sprint Goals\n- Complete remaining UI components\n- Deploy to production\n- Start user acceptance testing`;
  }

  if (lowerPrompt.includes("bug")) {
    return `# Bug Summary Report\n\n## Overview\n\n| Severity | Open | Investigating | Fixed | Closed |\n|----------|------|---------------|-------|--------|\n| Critical | 1 | 0 | 2 | 1 |\n| High | 2 | 1 | 3 | 2 |\n| Medium | 3 | 2 | 5 | 4 |\n| Low | 1 | 0 | 2 | 3 |\n\n## Critical Issues\n1. **Authentication timeout** - Users experiencing session expiry after 5 minutes (Expected: 24 hours)\n2. ~~Database connection pool exhaustion~~ - Fixed in v1.2.3\n\n## Trends\n- Bug report rate decreasing 📉\n- Fix time improving from 3.2 days → 1.8 days\n- No new critical bugs this week\n\n## Recommendations\n- Prioritize authentication timeout fix\n- Add monitoring for connection pool metrics\n- Implement automated regression testing`;
  }

  if (lowerPrompt.includes("risk")) {
    return `# Project Risk Report\n\n## Risk Matrix\n\n| Risk | Probability | Impact | Severity |\n|------|------------|--------|----------|\n| Deadline slip | Medium | High | 🟡 Medium |\n| Scope creep | High | Medium | 🟡 Medium |\n| Technical debt | Low | High | 🟢 Low |\n| Team burnout | Low | High | 🟢 Low |\n\n## Top Risks\n\n### 1. Deadline Slip (Medium Risk)\n- Current velocity: 12 story points/sprint\n- Required velocity: 15 story points/sprint\n- **Mitigation:** Re-prioritize backlog, reduce scope of non-critical features\n\n### 2. Scope Creep (Medium Risk)\n- 3 new feature requests added this week\n- **Mitigation:** Strict change request process, defer to v2.0\n\n## Recommendations\n1. Hold daily standups to catch blockers early\n2. Freeze feature requests until current sprint is complete\n3. Schedule technical debt sprint for next month`;
  }

  if (lowerPrompt.includes("release")) {
    return `# Release Notes - v1.0.0\n\n## 🎉 New Features\n- **User Dashboard** - Beautiful new dashboard with real-time metrics\n- **Ticket Management** - Full Kanban board with drag-and-drop\n- **GitHub Integration** - Connect repos, commit, and create PRs\n- **AI Reports** - Generate intelligent project reports\n- **Online IDE** - Browser-based code editor with Monaco\n\n## 🐛 Bug Fixes\n- Fixed authentication redirect loop\n- Fixed ticket status not updating in real-time\n- Fixed sidebar navigation on mobile\n- Fixed chart rendering with empty data\n\n## 🔧 Improvements\n- 40% faster page load times\n- Better error handling and user feedback\n- Improved responsive design\n- Updated dependencies\n\n## 💥 Breaking Changes\n- None\n\n## 📦 Dependencies\n- Next.js 15\n- React 19\n- Prisma 6\n- NextAuth v5`;
  }

  if (lowerPrompt.includes("performance") || lowerPrompt.includes("team")) {
    return `# Team Performance Summary\n\n## Individual Metrics\n\n| Member | Tickets Completed | Bugs Fixed | Reviews | Commits |\n|--------|-------------------|------------|---------|----------|\n| @developer1 | 8 | 3 | 5 | 24 |\n| @developer2 | 6 | 5 | 4 | 18 |\n| @developer3 | 7 | 2 | 6 | 21 |\n\n## Team Velocity\n- **Current Sprint:** 21 story points\n- **Previous Sprint:** 18 story points\n- **Improvement:** +16.7% 📈\n\n## Highlights\n- ⭐ @developer2 resolved the most critical bugs\n- ⭐ @developer3 completed the most code reviews\n- ⭐ Team collaboration improved by 25%\n\n## Recommendations\n- Balance workload more evenly across team\n- Encourage pair programming for complex tasks\n- Celebrate milestones to maintain morale`;
  }

  return `# Project Report\n\n**Generated:** ${new Date().toLocaleDateString()}\n\n## Summary\n\nYour project is progressing well with steady development activity.\n\n## Key Metrics\n- Active tickets: 12\n- Bugs reported: 5\n- Commits this week: 23\n- Team members: 4\n\n## Status\nOverall project health: **Good** ✅\n\n## Recommendations\n1. Review open tickets for priority adjustments\n2. Address high-severity bugs first\n3. Schedule weekly team sync\n4. Update project documentation`;
}

// ============================================================
// PUBLIC API
// ============================================================

export async function generateReport(
  reportType: string,
  projectData: {
    projectName: string;
    ticketCount?: number;
    bugCount?: number;
    completedTickets?: number;
    memberCount?: number;
    recentActivity?: string[];
    deadline?: string;
  }
): Promise<{ content: string; isMock: boolean }> {
  const prompt = buildReportPrompt(reportType, projectData);
  const config = await getAIConfig();
  return callAI(prompt, config);
}

export async function generateCommitMessage(
  changedFiles: { path: string; status: string }[]
): Promise<{ message: string; isMock: boolean }> {
  const fileList = changedFiles
    .map((f) => `- ${f.status}: ${f.path}`)
    .join("\n");
  const prompt = `Generate a concise, conventional commit message for these changes:\n\n${fileList}\n\nFormat: type(scope): description\n\nBody with bullet points for each change.`;
  const config = await getAIConfig();
  const res = await callAI(prompt, config);
  return { message: res.content, isMock: res.isMock };
}

export async function generatePRDescription(
  title: string,
  changedFiles: { path: string; status: string }[],
  commitMessages: string[]
): Promise<{ description: string; isMock: boolean }> {
  const prompt = `Generate a professional pull request description.\n\nTitle: ${title}\n\nChanged files:\n${changedFiles.map((f) => `- ${f.path}`).join("\n")}\n\nCommit messages:\n${commitMessages.join("\n")}\n\nInclude: Summary, Changes, Testing instructions.`;
  const config = await getAIConfig();
  const res = await callAI(prompt, config);
  return { description: res.content, isMock: res.isMock };
}

function buildReportPrompt(
  reportType: string,
  data: {
    projectName: string;
    ticketCount?: number;
    bugCount?: number;
    completedTickets?: number;
    memberCount?: number;
    recentActivity?: string[];
    deadline?: string;
  }
): string {
  const context = `
Project: ${data.projectName}
Total Tickets: ${data.ticketCount || 0}
Completed Tickets: ${data.completedTickets || 0}
Open Bugs: ${data.bugCount || 0}
Team Members: ${data.memberCount || 0}
Deadline: ${data.deadline || "Not set"}
Recent Activity: ${data.recentActivity?.join(", ") || "No recent activity"}
`;

  const prompts: Record<string, string> = {
    daily: `Generate a daily progress report for this project:\n${context}`,
    weekly: `Generate a weekly sprint report for this project:\n${context}`,
    bug_summary: `Generate a bug summary report for this project:\n${context}`,
    pending_work: `Generate a pending work summary for this project:\n${context}`,
    risk: `Generate a project risk assessment report:\n${context}`,
    release: `Generate release notes for this project:\n${context}`,
    team_performance: `Generate a team performance summary:\n${context}`,
    commit_summary: `Generate a GitHub commit summary for this project:\n${context}`,
    pr_summary: `Generate a pull request summary for this project:\n${context}`,
  };

  return prompts[reportType] || prompts.daily;
}
