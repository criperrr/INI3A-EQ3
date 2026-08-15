---
name: antigravity-skills-manager
description: Global and workspace skills manager for Google Antigravity. Explore, search, install, and manage 300+ agent skills from the catalog using stdlib CLI tools.
when_to_use: "When searching, listing, or installing skills from the 300+ skill catalog via tools/skills_cli.py or managing skill bundles."
allowed-tools: Read, Write, Edit, Glob, Grep, Bash
version: 1.0.0
---

# 📦 Antigravity Skills Manager (`rmyndharis/antigravity-skills`)

The `antigravity-skills-manager` skill empowers Google Antigravity agents and users to discover, search, install, and manage over **300+ agent skills** from the open-source repository [`rmyndharis/antigravity-skills`](https://github.com/rmyndharis/antigravity-skills).

---

## Use this skill when

- Searching or exploring available agent skills in the `antigravity-skills` catalog.
- Installing a new skill into workspace (`.agents/skills/<skill_id>/`) or global config (`~/.gemini/antigravity/skills/<skill_id>/`).
- Listing locally installed skills to check system capabilities.
- Managing skill updates or auditing active agent tools.

## Do not use this skill when

- Performing general domain coding tasks that do not involve discovering or managing skills.
- Working on tasks outside the scope of Antigravity skill management.

---

## Instructions

- To manage workspace skills (recommended for project encapsulation), use:
  ```bash
  python3 .agents/tools/skills_cli.py <command>
  ```
- To manage global skills across all projects, pass `--global`:
  ```bash
  python3 .agents/tools/skills_cli.py <command> --global
  ```
- All underlying commands use standard Python library features (`urllib.request`, `json`, `os`, `sys`) without external dependencies.

---

## Available Commands & Usage

### 1. Search Catalog Skills
Filters skills by matching keywords in skill id, name, description, category, tags, or triggers:
```bash
python3 .agents/tools/skills_cli.py search <term>
```
*Example*:
```bash
python3 .agents/tools/skills_cli.py search redis
```

### 2. List Curated Bundles
Inspect preset skill bundles:
```bash
python3 .agents/tools/skills_cli.py bundles
```

### 3. Install Skill (Workspace Scope by Default)
Installs the whole skill folder into `.agents/skills/<skill_id>/` (or global `~/.gemini/antigravity/skills/` if `--global` is passed):
```bash
python3 .agents/tools/skills_cli.py install <skill_id>
```
*Example*:
```bash
python3 .agents/tools/skills_cli.py install flutter-expert
```

### 4. List Installed Skills
Inspects installed skills:
```bash
python3 .agents/tools/skills_cli.py installed
```
