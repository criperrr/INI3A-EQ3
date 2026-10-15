#!/usr/bin/env python3
"""Validate semantic version strings according to SemVer 2.0.0 specification."""
from __future__ import annotations

import re
import sys

SEMVER_RE = re.compile(
    r"^(?P<major>0|[1-9]\d*)\.(?P<minor>0|[1-9]\d*)\.(?P<patch>0|[1-9]\d*)"
    r"(?:-(?P<prerelease>[0-9A-Za-z.-]+))?"
    r"(?:\+(?P<build>[0-9A-Za-z.-]+))?$"
)


def validate_semver(version: str) -> bool:
    clean = version.strip().lstrip("v")
    return bool(SEMVER_RE.fullmatch(clean))


def main() -> int:
    if len(sys.argv) < 2:
        print("Usage: validate_semver.py <version>")
        return 1

    version = sys.argv[1]
    if validate_semver(version):
        print(f"✅ Valid SemVer: {version}")
        return 0
    else:
        print(f"❌ Invalid SemVer: {version}")
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
