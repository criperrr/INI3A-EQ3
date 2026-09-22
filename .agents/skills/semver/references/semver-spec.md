# Semantic Versioning 2.0.0 Specification Reference

Summary of the official SemVer 2.0.0 rules ([semver.org](https://semver.org/)):

## 1. Syntax Format

Given a version number `MAJOR.MINOR.PATCH`, increment the:

1. **MAJOR** version when you make incompatible API changes,
2. **MINOR** version when you add functionality in a backward-compatible manner, and
3. **PATCH** version when you make backward-compatible bug fixes.

Additional labels for pre-release and build metadata are available as extensions to the `MAJOR.MINOR.PATCH` format:
- Pre-release: `1.0.0-alpha`, `1.0.0-alpha.1`, `1.0.0-0.3.7`, `1.0.0-x.7.z.92`, `1.0.0-rc.1`
- Build metadata: `1.0.0+20130313144700`, `1.0.0-beta+exp.sha.5114f85`

## 2. Key Rules

- A normal version number MUST take the form `X.Y.Z` where `X`, `Y`, and `Z` are non-negative integers and MUST NOT contain leading zeroes (`1.0.0`, not `01.00.00`).
- Once a versioned package has been released, the contents of that version MUST NOT be modified. Any modifications MUST be released as a new version.
- Major version zero (`0.y.z`) is for initial development. Anything MAY change at any time. The public API SHOULD NOT be considered stable.
- Version `1.0.0` defines the initial stable public API.
- Patch version `Z` (`x.y.Z | x > 0`) MUST be incremented if only backward compatible bug fixes are introduced. A bug fix is defined as an internal change that fixes incorrect behavior.
- Minor version `Y` (`x.Y.z | x > 0`) MUST be incremented if new, backward compatible functionality is introduced to the public API. It MUST be incremented if any public API functionality is marked as deprecated. It MAY be incremented if substantial new functionality or improvements are introduced within the private code. It MAY include patch level changes. Patch version MUST be reset to 0 when minor version is incremented.
- Major version `X` (`X.y.z | X > 0`) MUST be incremented if any backward incompatible changes are introduced to the public API. It MAY also include minor and patch level changes. Patch and minor version MUST be reset to 0 when major version is incremented.

## 3. Precedence Order

Precedence refers to how versions are compared to each other when ordered:
- Precedence MUST be calculated by separating the version into major, minor, patch and pre-release identifiers in that order (Build metadata does not figure into precedence).
- Precedence is determined by the first difference when comparing each of these identifiers from left to right:
  `1.0.0 < 2.0.0 < 2.1.0 < 2.1.1`
- When major, minor, and patch are equal, a pre-release version has lower precedence than a normal version:
  `1.0.0-alpha < 1.0.0`
