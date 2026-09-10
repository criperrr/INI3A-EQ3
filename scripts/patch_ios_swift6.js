const fs = require("fs");
const path = require("path");

function patchDirectory(dir) {
  if (!fs.existsSync(dir)) return;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== ".git" && entry.name !== ".build" && entry.name !== "build") {
        patchDirectory(full);
      }
    } else {
      const isExpoModulesJSI = full.includes("expo-modules-jsi") || full.includes("ExpoModulesJSI");
      if (!isExpoModulesJSI) continue;

      if (entry.name === "Package.swift") {
        try {
          let content = fs.readFileSync(full, "utf8");
          let modified = false;

          if (/swift-tools-version:\s*6\.[12]/i.test(content)) {
            content = content.replace(/swift-tools-version:\s*6\.[12]/gi, "swift-tools-version: 6.0");
            modified = true;
          }

          if (content.includes("NonisolatedNonsendingByDefault")) {
            content = content.replace(/.*NonisolatedNonsendingByDefault.*\n?/g, "");
            modified = true;
          }
          if (content.includes("InferIsolatedConformances")) {
            content = content.replace(/.*InferIsolatedConformances.*\n?/g, "");
            modified = true;
          }

          if (content.includes('targets: ["ExpoModulesJSI"],')) {
            content = content.replace('targets: ["ExpoModulesJSI"],', 'targets: ["ExpoModulesJSI"]');
            modified = true;
          }
          if (content.includes('path: "Tests",')) {
            content = content.replace('path: "Tests",', 'path: "Tests"');
            modified = true;
          }
          if (content.includes('path: "Benchmarks",')) {
            content = content.replace('path: "Benchmarks",', 'path: "Benchmarks"');
            modified = true;
          }
          if (content.includes("      ],\n    ),")) {
            content = content.replace("      ],\n    ),", "      ]\n    ),");
            modified = true;
          }
          if (/swiftLanguageModes:\s*\[\.v6\](?!,)/.test(content)) {
            content = content.replace(/swiftLanguageModes:\s*\[\.v6\](?!,)/g, "swiftLanguageModes: [.v6],");
            modified = true;
          }
          if (/]\r?\n\s*linkerSettings:/.test(content)) {
            content = content.replace(/]\r?\n(\s*linkerSettings:)/g, "],\n$1");
            modified = true;
          }

          if (modified) {
            fs.writeFileSync(full, content, "utf8");
            console.log("Patched Package.swift in:", full);
          }
        } catch (err) {}
      } else if (entry.name.endsWith(".swift")) {
        try {
          let content = fs.readFileSync(full, "utf8");
          let modified = false;

          // 1. Remove trailing commas before closing parenthesis or brackets in Swift functions/closures
          if (/,(\s*[)>])/.test(content)) {
            content = content.replace(/,(\s*[)>])/g, "$1");
            modified = true;
          }

          // 2. Patch weak let/var runtime to nonisolated(unsafe) weak var runtime for Swift 6 Sendable classes
          if (/\bweak\s+(let|var)\s+runtime\b/.test(content)) {
            content = content.replace(/(?:nonisolated\(unsafe\)\s+)?(private|internal|public|fileprivate)?\s*weak\s+(let|var)\s+runtime\b/g, (match, access) => {
              return `nonisolated(unsafe) ${access ? access + " " : ""}weak var runtime`;
            });
            modified = true;
          } else if (/\bweak\s+let\b/.test(content)) {
            content = content.replace(/(?:nonisolated\(unsafe\)\s+)?(private|internal|public|fileprivate)?\s*weak\s+let\s+/g, (match, access) => {
              return `nonisolated(unsafe) ${access ? access + " " : ""}weak var `;
            });
            modified = true;
          }

          // 3. Task+immediate polyfill fix for Swift SDK < 6.2
          if (full.endsWith("Task+immediate.swift") && content.includes("Task.immediate")) {
            content = content.replace(/if #available[\s\S]*?return Task\(name: name, priority: \.high, operation: operation\)[\s\S]*?\}/, "return Task(priority: .high, operation: operation)");
            modified = true;
          }

          // 4. vector.push_back consuming label fix
          if (content.includes("vector.push_back(consuming: propNameId)")) {
            content = content.replace("vector.push_back(consuming: propNameId)", "vector.push_back(propNameId)");
            modified = true;
          }

          if (modified) {
            fs.writeFileSync(full, content, "utf8");
            console.log("Patched Swift syntax in:", full);
          }
        } catch (err) {}
      } else if (entry.name.endsWith(".h") || entry.name.endsWith(".hpp")) {
        try {
          let content = fs.readFileSync(full, "utf8");
          let modified = false;

          if (content.includes("SWIFT_RETURNS_RETAINED")) {
            content = content.replace(/SWIFT_RETURNS_RETAINED\s+/g, "");
            modified = true;
          }

          // Expose static factory initializers for SWIFT_SHARED_REFERENCE RuntimeScheduler
          if (full.endsWith("RuntimeScheduler.h") && !content.includes("SWIFT_NAME(init())")) {
            content = content.replace(/(?:SWIFT_RETURNS_RETAINED\s+)?RuntimeScheduler\(\)\s*\{\}/, `RuntimeScheduler() {}

  static RuntimeScheduler *create(void *scheduler, ScheduleFn fn) noexcept SWIFT_NAME(init(_:_:)) {
    return new RuntimeScheduler(scheduler, fn);
  }
  static RuntimeScheduler *create() SWIFT_NAME(init()) {
    return new RuntimeScheduler();
  }`);
            modified = true;
          }

          // Expose static factory initializers for SWIFT_IMMORTAL_REFERENCE HostFunctionClosure
          if (full.endsWith("HostFunctionClosure.h") && !content.includes("SWIFT_NAME(init(_:_:_:))")) {
            content = content.replace("virtual ~HostFunctionClosure()", `static HostFunctionClosure *create(Context context, Closure closure, Deallocator deallocator) SWIFT_NAME(init(_:_:_:)) {
    return new HostFunctionClosure(context, closure, deallocator);
  }

  virtual ~HostFunctionClosure()`);
            modified = true;
          }

          if (modified) {
            fs.writeFileSync(full, content, "utf8");
            console.log("Patched C++ Header in:", full);
          }
        } catch (err) {}
      }
    }
  }
}

const targetDirs = ["node_modules", "src/frontend", "src/frontend/ios/Pods"];
targetDirs.forEach(d => {
  const resolved = path.resolve(process.cwd(), d);
  patchDirectory(resolved);
});
console.log("iOS Swift 6.1 patch routine completed successfully.");
