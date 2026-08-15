#!/usr/bin/env python3
import sys
import os
import re
import json
import shutil
import urllib.request
import urllib.error

# Reconfigure sys.stdout/stderr to UTF-8 for terminal compatibility.
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')
    sys.stderr.reconfigure(encoding='utf-8')

CATALOG_URL = "https://raw.githubusercontent.com/rmyndharis/antigravity-skills/main/catalog.json"
RAW_BASE_URL = "https://raw.githubusercontent.com/rmyndharis/antigravity-skills/main/"
API_BASE_URL = "https://api.github.com/repos/rmyndharis/antigravity-skills/contents/"

GLOBAL_SKILLS_DIR = os.path.join(os.path.expanduser("~"), ".gemini", "antigravity", "skills")

def get_workspace_skills_dir():
    # If this script is in .agents/tools/, workspace root is two levels up
    script_dir = os.path.dirname(os.path.abspath(__file__))
    agents_dir = os.path.abspath(os.path.join(script_dir, ".."))
    return os.path.join(agents_dir, "skills")

def get_skills_dir(target_scope="workspace"):
    override = os.environ.get("AG_SKILLS_DIR")
    if override:
        if override == "~" or override.startswith(("~/", "~\\")):
            override = os.path.expanduser("~") + override[1:]
        return os.path.abspath(override)
    
    if target_scope == "global":
        return os.path.abspath(GLOBAL_SKILLS_DIR)
    
    return os.path.abspath(get_workspace_skills_dir())

SKILL_PATH_RE = re.compile(r'^skills/([A-Za-z0-9._-]+)/SKILL\.md$')

def skill_folder_from_catalog(cat_path, skill_id):
    candidate = cat_path or f"skills/{skill_id}/SKILL.md"
    match = SKILL_PATH_RE.match(candidate)
    if not match or match.group(1) in ('.', '..'):
        raise ValueError(f"unsafe skill path in catalog entry: {candidate!r}")
    return candidate[:-len('/SKILL.md')]

def contained_join(base, *parts):
    base_abs = os.path.abspath(base)
    target = os.path.abspath(os.path.join(base_abs, *parts))
    if target != base_abs and not target.startswith(base_abs + os.sep):
        raise ValueError(f"refusing to write outside {base_abs}: {target}")
    return target

def fetch_json(url):
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "AntigravitySkillsInstaller/1.0"})
        with urllib.request.urlopen(req, timeout=10) as resp:
            return json.loads(resp.read().decode('utf-8'))
    except Exception as e:
        print(f"Error fetching {url}: {e}", file=sys.stderr)
        return None

def fetch_bytes(url):
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "AntigravitySkillsInstaller/1.0"})
        with urllib.request.urlopen(req, timeout=15) as resp:
            return resp.read()
    except Exception as e:
        print(f"Error downloading {url}: {e}", file=sys.stderr)
        return None

def load_catalog():
    script_dir = os.path.dirname(os.path.abspath(__file__))
    candidates = [
        os.path.join(script_dir, "catalog.json"),
        os.path.join(script_dir, "..", "catalog.json"),
    ]
    for local_catalog in candidates:
        if os.path.exists(local_catalog):
            try:
                with open(local_catalog, "r", encoding="utf-8") as f:
                    return json.load(f)
            except Exception:
                pass
    return fetch_json(CATALOG_URL)

def load_bundles():
    script_dir = os.path.dirname(os.path.abspath(__file__))
    candidates = [
        os.path.join(script_dir, "bundles.json"),
        os.path.join(script_dir, "..", "bundles.json"),
    ]
    for b in candidates:
        if os.path.exists(b):
            try:
                with open(b, "r", encoding="utf-8") as f:
                    return json.load(f)
            except Exception:
                pass
    return None

def skill_matches(s, query):
    if not query:
        return True
    haystack = " ".join([
        s.get('id', ''),
        s.get('name', ''),
        s.get('description', ''),
        s.get('category', ''),
        " ".join(s.get('tags', [])),
        " ".join(s.get('triggers', [])),
    ]).lower()
    return all(token in haystack for token in query.lower().split())

def cmd_list(category=None, query=None):
    catalog = load_catalog()
    if catalog is None or 'skills' not in catalog:
        print("Failed to load catalog.", file=sys.stderr)
        sys.exit(1)

    skills = catalog['skills']
    if not skills:
        print("\n[+] Found 0 skill(s) in catalog:\n" + "-"*60)
        print("No skills available in catalog.")
        return

    if category:
        skills = [s for s in skills if s.get('category', '').lower() == category.lower()]
    if query:
        skills = [s for s in skills if skill_matches(s, query)]

    print(f"\n[+] Found {len(skills)} skill(s) in catalog:\n" + "-"*60)
    if not skills:
        print("No skills found matching filter.")
        return

    limit = None if (category or query) else 40
    for s in (skills if limit is None else skills[:limit]):
        cat = f"[{s.get('category', 'general')}]"
        print(f"* {s.get('id', ''):<50} {cat:<12}")
        if s.get('description'):
            desc = s['description'][:80] + "..." if len(s['description']) > 80 else s['description']
            print(f"  └─ {desc}")
    if limit is not None and len(skills) > limit:
        print(f"\n... and {len(skills) - limit} more. Use search <term> to filter.")

def cmd_bundles():
    data = load_bundles()
    if not data or 'bundles' not in data:
        print("Bundles definition not found.")
        return
    print("\n[+] Available Curated Skill Bundles:\n" + "-"*60)
    for name, info in data['bundles'].items():
        desc = info.get('description', '')
        skills_count = len(info.get('skills', []))
        print(f"* Bundle: {name:<20} ({skills_count} skills)")
        print(f"  └─ {desc}")

def cmd_search(query):
    if not query or not query.strip():
        print("Usage: python3 skills_cli.py search <term>", file=sys.stderr)
        sys.exit(1)
    cmd_list(query=query.strip())

def download_folder_recursive(remote_path, local_target_dir):
    os.makedirs(local_target_dir, exist_ok=True)
    api_url = API_BASE_URL + remote_path
    items = fetch_json(api_url)
    if not items or not isinstance(items, list):
        raw_url = RAW_BASE_URL + remote_path + "/SKILL.md"
        content = fetch_bytes(raw_url)
        if content:
            with open(contained_join(local_target_dir, "SKILL.md"), "wb") as f:
                f.write(content)
            print("  └─ Downloaded: SKILL.md (folder listing unavailable, other files skipped)")
        return False

    success = True
    for item in items:
        item_name = item.get('name', '')
        item_path = item.get('path', '')
        item_type = item.get('type', '')
        target_item_path = contained_join(local_target_dir, item_name)

        if not item_path.startswith(remote_path + "/"):
            print(f"  └─ Skipped (outside {remote_path}): {item_path}", file=sys.stderr)
            success = False
            continue

        if item_type == 'file':
            download_url = item.get('download_url') or (RAW_BASE_URL + item_path)
            if not download_url.startswith(RAW_BASE_URL):
                print(f"  └─ Skipped (unexpected download host): {download_url}", file=sys.stderr)
                success = False
                continue
            data = fetch_bytes(download_url)
            if data is not None:
                with open(target_item_path, "wb") as f:
                    f.write(data)
                print(f"  └─ Downloaded: {item_name}")
            else:
                success = False
        elif item_type == 'dir':
            dir_ok = download_folder_recursive(item_path, target_item_path)
            if not dir_ok:
                success = False

    return success

def cmd_install(skill_id, scope="workspace"):
    if not skill_id or not skill_id.strip():
        print("Please specify skill name/id to install.", file=sys.stderr)
        sys.exit(1)

    skill_id_clean = skill_id.strip()
    catalog = load_catalog()
    if catalog is None or 'skills' not in catalog:
        print("Failed to load catalog.", file=sys.stderr)
        sys.exit(1)

    found = None
    for s in catalog['skills']:
        if s.get('id', '').lower() == skill_id_clean.lower() or s.get('name', '').lower() == skill_id_clean.lower():
            found = s
            break

    if not found:
        print(f"Error: Skill '{skill_id_clean}' not found in catalog.", file=sys.stderr)
        sys.exit(1)

    skills_dir = get_skills_dir(target_scope=scope)
    try:
        remote_skill_path = skill_folder_from_catalog(found.get('path', ''), found['id'])
        target_skill_dir = contained_join(skills_dir, found['id'])
    except ValueError as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)

    print(f"[*] Installing skill '{found['id']}' ({scope}) into: {target_skill_dir}")

    if os.path.isdir(target_skill_dir):
        print("  └─ Replacing existing installation")
        shutil.rmtree(target_skill_dir)

    os.makedirs(target_skill_dir, exist_ok=True)
    
    # Check if local repository checkout exists nearby
    script_dir = os.path.dirname(os.path.abspath(__file__))
    local_source_candidates = [
        os.path.abspath(os.path.join(script_dir, "..", "skills", found['id'])),
        os.path.abspath(os.path.join(script_dir, "..", "..", "scratch", "antigravity-skills", "skills", found['id']))
    ]
    
    installed_locally = False
    for candidate in local_source_candidates:
        if os.path.isdir(candidate) and os.path.exists(os.path.join(candidate, "SKILL.md")) and candidate != target_skill_dir:
            shutil.copytree(candidate, target_skill_dir, dirs_exist_ok=True)
            print("  └─ Installed from local catalog cache.")
            installed_locally = True
            break

    if not installed_locally:
        download_folder_recursive(remote_skill_path, target_skill_dir)

    print(f"[✓] Skill '{found['id']}' installed successfully.")

def cmd_installed(scope="workspace"):
    skills_dir = get_skills_dir(target_scope=scope)
    print(f"\n[+] Installed Skills in {scope} ({skills_dir}):\n" + "-"*60)
    if not os.path.isdir(skills_dir):
        print("No skills directory found.")
        return

    skills = [d for d in os.listdir(skills_dir) if os.path.isdir(os.path.join(skills_dir, d))]
    if not skills:
        print("No skills installed.")
        return

    for sk in sorted(skills):
        skill_path = os.path.join(skills_dir, sk, "SKILL.md")
        desc = ""
        if os.path.exists(skill_path):
            try:
                with open(skill_path, "r", encoding="utf-8") as f:
                    content = f.read()
                    match = re.search(r'description:\s*(.+)', content)
                    if match:
                        desc = match.group(1).strip()
            except Exception:
                pass
        print(f"* {sk:<35}")
        if desc:
            desc_short = desc[:75] + "..." if len(desc) > 75 else desc
            print(f"  └─ {desc_short}")

def print_help():
    print("""
Antigravity Skills CLI - Unified Skills Manager for Google Antigravity

Usage:
  python3 .agents/tools/skills_cli.py list [--category <cat>]
  python3 .agents/tools/skills_cli.py search <term>
  python3 .agents/tools/skills_cli.py bundles
  python3 .agents/tools/skills_cli.py install <skill_id> [--global | --workspace]
  python3 .agents/tools/skills_cli.py installed [--global | --workspace]

Examples:
  python3 .agents/tools/skills_cli.py search postgresql
  python3 .agents/tools/skills_cli.py install flutter-expert --workspace
  python3 .agents/tools/skills_cli.py installed
""")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print_help()
        sys.exit(0)

    cmd = sys.argv[1].lower()
    
    scope = "global" if "--global" in sys.argv else "workspace"

    if cmd == "list":
        cat = None
        if "--category" in sys.argv:
            idx = sys.argv.index("--category")
            if idx + 1 < len(sys.argv):
                cat = sys.argv[idx + 1]
        cmd_list(category=cat)
    elif cmd == "search":
        if len(sys.argv) < 3:
            print("Please provide a search query.")
            sys.exit(1)
        query = " ".join([a for a in sys.argv[2:] if not a.startswith("--")])
        cmd_search(query)
    elif cmd == "bundles":
        cmd_bundles()
    elif cmd == "install":
        if len(sys.argv) < 3:
            print("Please specify skill name to install.")
            sys.exit(1)
        skill_name = [a for a in sys.argv[2:] if not a.startswith("--")][0]
        cmd_install(skill_name, scope=scope)
    elif cmd == "installed":
        cmd_installed(scope=scope)
    else:
        print_help()
