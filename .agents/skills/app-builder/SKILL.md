---
name: app-builder
description: Main application building orchestrator. Creates full-stack applications from natural language requests. Determines project type, selects tech stack, coordinates agents.
when_to_use: "When creating a new full-stack application from scratch, selecting tech stack, or scaffolding project structure. Use with /create workflow."
allowed-tools: Read, Write, Edit, Glob, Grep, Bash, Agent
version: 1.1.0
---

# App Builder - Application Building Orchestrator

> Analyzes user's requests, determines tech stack, plans structure, and coordinates agents.

## 🎯 Selective Reading Rule

**Read ONLY files relevant to the request!** Check the content map, find what you need.

| File | Description | When to Read |
|------|-------------|--------------|
| `project-detection.md` | Keyword matrix, project type detection | Starting new project |
| `tech-stack.md` | 2026 default stack, alternatives | Choosing technologies |
| `agent-coordination.md` | Agent pipeline, execution order | Coordinating multi-agent work |
| `scaffolding.md` | Directory structure, core files | Creating project structure |
| `feature-building.md` | Feature analysis, error handling | Adding features to existing project |
| `templates/SKILL.md` | **Project templates** | Scaffolding new project |

---

## 📦 Templates (13)

Quick-start scaffolding for new projects. **Read the matching template only!**

| Template | Tech Stack | When to Use |
|----------|------------|-------------|
| [express-api](templates/express-api/TEMPLATE.md) | Express + JWT | REST API |
| [react-native-app](templates/react-native-app/TEMPLATE.md) | Expo + TypeScript | Mobile app |
| [cli-tool](templates/cli-tool/TEMPLATE.md) | Node.js + CLI | Ferramentas de terminal |
| [monorepo-turborepo](templates/monorepo-turborepo/TEMPLATE.md) | Turborepo + npm | Estruturas monorepo |

---

## 🔗 Related Agents

| Agent | Role |
|-------|------|
| `project-planner` | Task breakdown, dependency graph |
| `frontend-specialist` | UI components, pages |
| `backend-specialist` | API, business logic |
| `database-architect` | Schema, migrations |
| `devops-engineer` | Deployment, preview |

---

## Usage Example

```
User: "Make an Instagram clone with photo sharing and likes"

App Builder Process:
1. Project type: Social Media App
2. Tech stack: Next.js + Prisma + Cloudinary + Clerk
3. Create plan:
   ├─ Database schema (users, posts, likes, follows)
   ├─ API routes (auth, posts, likes, follows)
   ├─ Pages (feed, profile, upload)
   └─ Components (PostCard, Feed, LikeButton)
4. Coordinate agents
5. Report progress
6. Start preview
```
