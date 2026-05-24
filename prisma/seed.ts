import { PrismaClient, WorkspaceRole, ProjectStatus, TicketType, TicketStatus, TicketPriority, BugSeverity, BugStatus, FileStatus, InviteStatus } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Cleaning database...");
  await prisma.activityLog.deleteMany({});
  await prisma.notification.deleteMany({});
  await prisma.aIReport.deleteMany({});
  await prisma.iDEFile.deleteMany({});
  await prisma.bugReport.deleteMany({});
  await prisma.ticketComment.deleteMany({});
  await prisma.ticket.deleteMany({});
  await prisma.projectMember.deleteMany({});
  await prisma.gitHubCommitLog.deleteMany({});
  await prisma.gitHubBranch.deleteMany({});
  await prisma.gitHubRepository.deleteMany({});
  await prisma.workspaceInvite.deleteMany({});
  await prisma.workspaceMember.deleteMany({});
  await prisma.project.deleteMany({});
  await prisma.workspace.deleteMany({});
  await prisma.session.deleteMany({});
  await prisma.account.deleteMany({});
  await prisma.user.deleteMany({});

  console.log("Creating seed users...");
  const users = await Promise.all([
    prisma.user.create({
      data: {
        name: "Alice Johnson",
        email: "alice@devboard.ai",
        githubId: "10001",
        githubUsername: "alicejohnson",
        githubAvatarUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150",
        githubProfileUrl: "https://github.com/alicejohnson",
      },
    }),
    prisma.user.create({
      data: {
        name: "Bob Smith",
        email: "bob@devboard.ai",
        githubId: "10002",
        githubUsername: "bobsmith",
        githubAvatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150",
        githubProfileUrl: "https://github.com/bobsmith",
      },
    }),
    prisma.user.create({
      data: {
        name: "Charlie Brown",
        email: "charlie@devboard.ai",
        githubId: "10003",
        githubUsername: "charliebrown",
        githubAvatarUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150",
        githubProfileUrl: "https://github.com/charliebrown",
      },
    }),
    prisma.user.create({
      data: {
        name: "Diana Prince",
        email: "diana@devboard.ai",
        githubId: "10004",
        githubUsername: "dianaprince",
        githubAvatarUrl: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150",
        githubProfileUrl: "https://github.com/dianaprince",
      },
    }),
    prisma.user.create({
      data: {
        name: "Evan Wright",
        email: "evan@devboard.ai",
        githubId: "10005",
        githubUsername: "evanwright",
        githubAvatarUrl: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150",
        githubProfileUrl: "https://github.com/evanwright",
      },
    }),
    prisma.user.create({
      data: {
        name: "Fiona Gallagher",
        email: "fiona@devboard.ai",
        githubId: "10006",
        githubUsername: "fionagallagher",
        githubAvatarUrl: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150",
        githubProfileUrl: "https://github.com/fionagallagher",
      },
    }),
    prisma.user.create({
      data: {
        name: "George Costanza",
        email: "george@devboard.ai",
        githubId: "10007",
        githubUsername: "georgec",
        githubAvatarUrl: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150",
        githubProfileUrl: "https://github.com/georgec",
      },
    }),
    prisma.user.create({
      data: {
        name: "Helen Miller",
        email: "helen@devboard.ai",
        githubId: "10008",
        githubUsername: "helenmiller",
        githubAvatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150",
        githubProfileUrl: "https://github.com/helenmiller",
      },
    }),
  ]);

  console.log("Creating workspaces...");
  const workspace1 = await prisma.workspace.create({
    data: {
      name: "Apollo Team",
      slug: "apollo-team",
      description: "Primary engineering workspace for Apollo core projects.",
      createdById: users[0].id,
    },
  });

  const workspace2 = await prisma.workspace.create({
    data: {
      name: "SaaS Builders",
      slug: "saas-builders",
      description: "Workspace for multi-tenant SaaS application incubation.",
      createdById: users[5].id,
    },
  });

  console.log("Creating workspace memberships...");
  // Workspace 1 members
  await prisma.workspaceMember.createMany({
    data: [
      { userId: users[0].id, workspaceId: workspace1.id, role: WorkspaceRole.ADMIN },
      { userId: users[1].id, workspaceId: workspace1.id, role: WorkspaceRole.PROJECT_MANAGER },
      { userId: users[2].id, workspaceId: workspace1.id, role: WorkspaceRole.DEVELOPER },
      { userId: users[3].id, workspaceId: workspace1.id, role: WorkspaceRole.DEVELOPER },
      { userId: users[4].id, workspaceId: workspace1.id, role: WorkspaceRole.VIEWER },
    ],
  });

  // Workspace 2 members
  await prisma.workspaceMember.createMany({
    data: [
      { userId: users[5].id, workspaceId: workspace2.id, role: WorkspaceRole.ADMIN },
      { userId: users[6].id, workspaceId: workspace2.id, role: WorkspaceRole.DEVELOPER },
      { userId: users[7].id, workspaceId: workspace2.id, role: WorkspaceRole.DEVELOPER },
    ],
  });

  console.log("Creating mock invites...");
  await prisma.workspaceInvite.create({
    data: {
      workspaceId: workspace1.id,
      invitedEmail: "guest@devboard.ai",
      invitedGithubUsername: "guestdev",
      inviteCode: "ABC123XY",
      inviteToken: "token-abc-123",
      role: WorkspaceRole.DEVELOPER,
      status: InviteStatus.PENDING,
      invitedById: users[0].id,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });

  console.log("Creating projects...");
  const project1 = await prisma.project.create({
    data: {
      workspaceId: workspace1.id,
      name: "Apollo Gateway",
      description: "High-performance GraphQL gateway routing layer for microservices.",
      status: ProjectStatus.ACTIVE,
      deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      techStack: ["Next.js", "GraphQL", "TypeScript", "Prisma"],
      repositoryLink: "https://github.com/apollo/gateway",
      createdById: users[0].id,
    },
  });

  const project2 = await prisma.project.create({
    data: {
      workspaceId: workspace1.id,
      name: "Dashboard UI",
      description: "Frontend layout and visual telemetry widgets for cluster metrics.",
      status: ProjectStatus.ACTIVE,
      deadline: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000), // 10 days
      techStack: ["React", "TailwindCSS", "Recharts", "shadcn/ui"],
      repositoryLink: "https://github.com/apollo/dashboard-ui",
      createdById: users[1].id,
    },
  });

  const project3 = await prisma.project.create({
    data: {
      workspaceId: workspace2.id,
      name: "SaaS Core Engine",
      description: "Multi-tenant billing, subscription, and custom landing engine.",
      status: ProjectStatus.PLANNING,
      deadline: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // 60 days
      techStack: ["Next.js", "PostgreSQL", "Stripe", "Docker"],
      repositoryLink: "https://github.com/saas-builders/core-engine",
      createdById: users[5].id,
    },
  });

  console.log("Creating project members...");
  await prisma.projectMember.createMany({
    data: [
      { userId: users[0].id, projectId: project1.id },
      { userId: users[1].id, projectId: project1.id },
      { userId: users[2].id, projectId: project1.id },
      { userId: users[3].id, projectId: project1.id },
      
      { userId: users[1].id, projectId: project2.id },
      { userId: users[2].id, projectId: project2.id },
      
      { userId: users[5].id, projectId: project3.id },
      { userId: users[6].id, projectId: project3.id },
    ],
  });

  console.log("Creating mock GitHub Repository & branches...");
  const mockRepo = await prisma.gitHubRepository.create({
    data: {
      workspaceId: workspace1.id,
      projectId: project1.id,
      owner: "apollo",
      repo: "gateway",
      fullName: "apollo/gateway",
      defaultBranch: "main",
      githubRepoId: 98765432,
      connectedById: users[0].id,
    },
  });

  await prisma.gitHubBranch.createMany({
    data: [
      { repositoryId: mockRepo.id, name: "main", sha: "sha-main-12345", isDefault: true },
      { repositoryId: mockRepo.id, name: "feature/auth-jwt", sha: "sha-feature-jwt", isDefault: false },
      { repositoryId: mockRepo.id, name: "bugfix/cors-header", sha: "sha-bug-cors", isDefault: false },
    ],
  });

  console.log("Creating tickets...");
  const ticketsData = [
    // Project 1: Apollo Gateway
    {
      projectId: project1.id,
      title: "Configure OAuth2 JWT token middleware",
      description: "Implement JWT validation middleware on the gateway to verify requests before routing.",
      type: TicketType.FEATURE,
      status: TicketStatus.IN_PROGRESS,
      priority: TicketPriority.CRITICAL,
      assigneeId: users[2].id,
      reporterId: users[1].id,
    },
    {
      projectId: project1.id,
      title: "CORS preflight requests fail with 403",
      description: "Verify headers for CORS preflight options check. Allow origin headers in response.",
      type: TicketType.BUG,
      status: TicketStatus.TODO,
      priority: TicketPriority.HIGH,
      assigneeId: users[3].id,
      reporterId: users[0].id,
    },
    {
      projectId: project1.id,
      title: "Write integration tests for GraphQL stitching",
      description: "Add integration tests for gateway stitching functionality under tests/stitching.test.ts.",
      type: TicketType.DOCUMENTATION,
      status: TicketStatus.BACKLOG,
      priority: TicketPriority.MEDIUM,
      assigneeId: users[2].id,
      reporterId: users[1].id,
    },
    {
      projectId: project1.id,
      title: "Optimize database pool connection timeout",
      description: "Reduce DB pool acquire connection timeout to 15 seconds to prevent memory blocks.",
      type: TicketType.IMPROVEMENT,
      status: TicketStatus.REVIEW,
      priority: TicketPriority.MEDIUM,
      assigneeId: users[3].id,
      reporterId: users[2].id,
    },
    {
      projectId: project1.id,
      title: "Upgrade Prisma client dependency to latest v6",
      description: "Run npm install @prisma/client@latest to leverage new query speed improvements.",
      type: TicketType.TASK,
      status: TicketStatus.DONE,
      priority: TicketPriority.LOW,
      assigneeId: users[2].id,
      reporterId: users[0].id,
    },
    // Project 2: Dashboard UI
    {
      projectId: project2.id,
      title: "Create responsive Sidebar navigation layout",
      description: "Implement collapsible navigation with responsive drawer drawer panels for mobile devices.",
      type: TicketType.FEATURE,
      status: TicketStatus.IN_PROGRESS,
      priority: TicketPriority.HIGH,
      assigneeId: users[2].id,
      reporterId: users[1].id,
    },
    {
      projectId: project2.id,
      title: "Fix PieChart layout overlap on small screens",
      description: "Responsiveness of Recharts PieChart component needs adjustment. Center coordinates properly.",
      type: TicketType.BUG,
      status: TicketStatus.REVIEW,
      priority: TicketPriority.HIGH,
      assigneeId: users[2].id,
      reporterId: users[1].id,
    },
    {
      projectId: project2.id,
      title: "Support dark theme switching using Tailwind classes",
      description: "Implement class-based dark theme toggle utilizing NextTheme custom context providers.",
      type: TicketType.FEATURE,
      status: TicketStatus.DONE,
      priority: TicketPriority.MEDIUM,
      assigneeId: users[2].id,
      reporterId: users[1].id,
    },
  ];

  const createdTickets = [];
  for (const t of ticketsData) {
    const created = await prisma.ticket.create({ data: t });
    createdTickets.push(created);
  }

  // Create 12 more generic tickets to reach a total of 20
  for (let i = 1; i <= 12; i++) {
    const created = await prisma.ticket.create({
      data: {
        projectId: i % 2 === 0 ? project1.id : project2.id,
        title: `Sprint task allocation index ${i}`,
        description: `Generic tickets allocated automatically to balance backlog sprints.`,
        type: i % 3 === 0 ? TicketType.BUG : TicketType.TASK,
        status: i % 4 === 0 ? TicketStatus.DONE : TicketStatus.TODO,
        priority: i % 2 === 0 ? TicketPriority.MEDIUM : TicketPriority.LOW,
        reporterId: users[1].id,
      },
    });
    createdTickets.push(created);
  }

  console.log("Creating ticket comments...");
  await prisma.ticketComment.createMany({
    data: [
      {
        ticketId: createdTickets[0].id,
        userId: users[1].id,
        content: "Please ensure unit test coverage is above 85% for the JWT middleware.",
      },
      {
        ticketId: createdTickets[0].id,
        userId: users[2].id,
        content: "Sure, I am wrapping it with Jest mocks right now.",
      },
      {
        ticketId: createdTickets[1].id,
        userId: users[3].id,
        content: "Confirming that configuring Origin header solves this locally.",
      },
    ],
  });

  console.log("Creating bug reports...");
  await prisma.bugReport.createMany({
    data: [
      {
        projectId: project1.id,
        title: "Auth token expires immediately after login",
        errorMessage: "JWT expiration assertion error: value -1 is less than 0",
        component: "AuthMiddleware",
        severity: BugSeverity.CRITICAL,
        stepsToReproduce: "1. Login using GitHub OAuth\n2. Open dashboard\n3. Click refresh token button",
        expectedResult: "Token remains valid for 24 hours.",
        actualResult: "Token expires instantly prompting redirect back to login.",
        status: BugStatus.OPEN,
        createdById: users[2].id,
        assignedDeveloperId: users[3].id,
      },
      {
        projectId: project1.id,
        title: "CORS blocks API gateway routing",
        errorMessage: "Access-Control-Allow-Origin header is missing on resource request",
        component: "CorsHandler",
        severity: BugSeverity.HIGH,
        stepsToReproduce: "1. Deploy client to localhost:3000\n2. Fetch API at localhost:4000\n3. Inspect console logs",
        expectedResult: "CORS headers generated allowed for specified origin domain.",
        actualResult: "Browser console logs CORS header missing error.",
        status: BugStatus.INVESTIGATING,
        createdById: users[3].id,
        assignedDeveloperId: users[2].id,
      },
      {
        projectId: project2.id,
        title: "PieChart rendering overlaps grid panel margin",
        errorMessage: "Uncaught TypeError: Cannot read property 'width' of null inside responsive charts",
        component: "ChartsPanel",
        severity: BugSeverity.MEDIUM,
        stepsToReproduce: "1. Open dashboard\n2. Resize browser window to mobile width\n3. Charts panel cuts off",
        expectedResult: "Responsive Recharts resizes dynamically with parent div padding.",
        actualResult: "Charts overlaps border outline container.",
        status: BugStatus.OPEN,
        createdById: users[2].id,
        assignedDeveloperId: users[2].id,
      },
    ],
  });

  // Create 7 more generic bug reports to reach 10
  for (let i = 1; i <= 7; i++) {
    await prisma.bugReport.create({
      data: {
        projectId: project1.id,
        title: `Security alert audit index ${i}`,
        errorMessage: "Dependency vulnerability flag raised by snyk static scanner.",
        component: "Dependencies",
        severity: i % 2 === 0 ? BugSeverity.MEDIUM : BugSeverity.LOW,
        status: BugStatus.OPEN,
        createdById: users[2].id,
      },
    });
  }

  console.log("Creating IDE files...");
  await prisma.iDEFile.createMany({
    data: [
      {
        projectId: project1.id,
        repositoryId: mockRepo.id,
        path: "src/index.ts",
        fileName: "index.ts",
        language: "typescript",
        content: `import express from "express";\nimport cors from "cors";\nimport { verifyToken } from "./middleware/auth";\n\nconst app = express();\napp.use(cors());\napp.use(express.json());\n\napp.get("/health", (req, res) => {\n  res.json({ status: "healthy", version: "1.0.0" });\n});\n\napp.listen(4000, () => {\n  console.log("Gateway listening on port 4000");\n});`,
        status: FileStatus.UNCHANGED,
        githubSha: "sha-file-index",
      },
      {
        projectId: project1.id,
        repositoryId: mockRepo.id,
        path: "src/middleware/auth.ts",
        fileName: "auth.ts",
        language: "typescript",
        content: `import { Request, Response, NextFunction } from "express";\nimport jwt from "jsonwebtoken";\n\nexport function verifyToken(req: Request, res: Response, next: NextFunction) {\n  const token = req.headers["authorization"]?.split(" ")[1];\n  if (!token) return res.status(401).json({ error: "Access Denied" });\n\n  try {\n    const verified = jwt.verify(token, process.env.JWT_SECRET || "fallback");\n    (req as any).user = verified;\n    next();\n  } catch {\n    res.status(400).json({ error: "Invalid Token" });\n  }\n}`,
        status: FileStatus.MODIFIED,
        githubSha: "sha-file-auth",
        lastEditedById: users[2].id,
      },
      {
        projectId: project1.id,
        repositoryId: mockRepo.id,
        path: "README.md",
        fileName: "README.md",
        language: "markdown",
        content: `# Apollo Gateway\\n\\nGraphQL routing layer for core microservices. Built with TypeScript.`,
        status: FileStatus.UNCHANGED,
        githubSha: "sha-readme",
      },
      {
        projectId: project1.id,
        repositoryId: mockRepo.id,
        path: "package.json",
        fileName: "package.json",
        language: "json",
        content: `{\n  "name": "gateway",\n  "version": "1.0.0",\n  "dependencies": {\n    "express": "^4.21.0",\n    "cors": "^2.8.5",\n    "jsonwebtoken": "^9.0.2"\n  }\n}`,
        status: FileStatus.UNCHANGED,
        githubSha: "sha-pkg-json",
      },
      {
        projectId: project2.id,
        path: "src/app/page.tsx",
        fileName: "page.tsx",
        language: "typescript",
        content: `export default function Page() {\n  return <div>Welcome to Dashboard</div>;\n}`,
        status: FileStatus.ADDED,
      },
    ],
  });

  console.log("Creating AI reports...");
  const reportTypes = ["daily", "weekly", "bug_summary", "risk", "release"];
  for (let i = 0; i < 5; i++) {
    await prisma.aIReport.create({
      data: {
        projectId: project1.id,
        reportType: reportTypes[i],
        title: `AI Generated ${reportTypes[i].toUpperCase()} Report`,
        content: `# ${reportTypes[i].toUpperCase()} Analytics Summary\\n\\nGenerated report summary details here.`,
        generatedById: users[0].id,
      },
    });
  }

  console.log("Creating commit logs...");
  await prisma.gitHubCommitLog.createMany({
    data: [
      {
        repositoryId: mockRepo.id,
        projectId: project1.id,
        userId: users[2].id,
        branch: "main",
        commitSha: "sha-c1",
        commitMessage: "feat: configure auth middlewares and tests",
        changedFilesCount: 2,
      },
      {
        repositoryId: mockRepo.id,
        projectId: project1.id,
        userId: users[3].id,
        branch: "main",
        commitSha: "sha-c2",
        commitMessage: "fix: update CORS headers for routing validation",
        changedFilesCount: 1,
      },
    ],
  });

  console.log("Creating notifications...");
  for (let i = 1; i <= 10; i++) {
    await prisma.notification.create({
      data: {
        userId: users[2].id,
        title: `Mock Notification Title #${i}`,
        message: `Activity alerts summary for allocated project sprint #${i}.`,
        type: i % 2 === 0 ? "TICKET_ASSIGNED" : "BUG_ASSIGNED",
        isRead: i > 7,
      },
    });
  }

  console.log("Creating activity logs...");
  const logs = [
    { workspaceId: workspace1.id, action: "WORKSPACE_CREATED", description: `Created workspace "Apollo Team"`, userId: users[0].id },
    { workspaceId: workspace1.id, action: "PROJECT_CREATED", description: `Created project "Apollo Gateway"`, userId: users[0].id, projectId: project1.id },
    { workspaceId: workspace1.id, action: "PROJECT_CREATED", description: `Created project "Dashboard UI"`, userId: users[1].id, projectId: project2.id },
    { workspaceId: workspace1.id, action: "MEMBER_JOINED", description: `Bob Smith joined the workspace via invite`, userId: users[1].id },
    { workspaceId: workspace1.id, action: "MEMBER_JOINED", description: `Charlie Brown joined the workspace via invite`, userId: users[2].id },
    { workspaceId: workspace1.id, action: "TICKET_CREATED", description: `Created ticket "Configure OAuth2 JWT token middleware"`, userId: users[1].id, projectId: project1.id },
    { workspaceId: workspace1.id, action: "TICKET_STATUS_CHANGED", description: `Updated ticket status to IN_PROGRESS`, userId: users[2].id, projectId: project1.id },
    { workspaceId: workspace1.id, action: "BUG_REPORTED", description: `Reported bug "Auth token expires immediately after login"`, userId: users[2].id, projectId: project1.id },
  ];
  for (const log of logs) {
    await prisma.activityLog.create({ data: log });
  }

  console.log("Seeding completed successfully!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
