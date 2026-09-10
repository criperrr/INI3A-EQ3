const fs = require("fs");
const path = require("path");
const os = require("os");
const { execSync } = require("child_process");

function patchSwiftInterfaceContent(content) {
  let modified = false;

  // 1. Remove isolated conformance attributes in type inheritance clauses (e.g. `: @MainActor Protocol` or `: @_Concurrency.MainActor Protocol`), which Swift < 6.2 rejects
  if (/:\s*@(_Concurrency\.)?MainActor\s+/.test(content)) {
    content = content.replace(/:\s*@(_Concurrency\.)?MainActor\s+/g, ": ");
    modified = true;
  }

  // 2. Normalize any remaining @_Concurrency.MainActor declarations to @MainActor
  if (content.includes("_Concurrency.MainActor")) {
    content = content.replace(/@_Concurrency\.MainActor/g, "@MainActor");
    modified = true;
  }

  if (/swift-compiler-version:\s*Apple Swift version 6\.[2-9]\.\d+/i.test(content)) {
    content = content.replace(
      /swift-compiler-version:\s*Apple Swift version 6\.[2-9]\.\d+[^\n]*/gi,
      "swift-compiler-version: Apple Swift version 6.1.2 (swiftlang-6.1.2.1.2 clang-1700.0.13.5)"
    );
    modified = true;
  }

  if (/-interface-compiler-version 6\.[2-9]\.\d+/i.test(content)) {
    content = content.replace(/-interface-compiler-version 6\.[2-9]\.\d+/gi, "-interface-compiler-version 6.1.2");
    modified = true;
  }

  return { content, modified };
}

function patchTarGz(tarPath) {
  const tmpDir = path.join(
    os.tmpdir(),
    "patch_tar_" + path.basename(tarPath, ".tar.gz") + "_" + Date.now() + "_" + Math.random().toString(36).slice(2, 6)
  );

  try {
    fs.mkdirSync(tmpDir, { recursive: true });
    execSync(`tar -xzf "${tarPath}" -C "${tmpDir}"`);

    let modified = false;

    function walk(d) {
      const list = fs.readdirSync(d, { withFileTypes: true });
      for (const item of list) {
        const itemPath = path.join(d, item.name);
        if (item.isDirectory()) {
          walk(itemPath);
        } else if (item.name.endsWith(".swiftinterface") && !item.name.startsWith("._")) {
          try {
            const original = fs.readFileSync(itemPath, "utf8");
            const res = patchSwiftInterfaceContent(original);
            if (res.modified) {
              fs.writeFileSync(itemPath, res.content, "utf8");
              modified = true;
            }
          } catch (e) {}
        }
      }
    }

    walk(tmpDir);

    if (modified) {
      execSync(`tar -czf "${tarPath}" -C "${tmpDir}" .`);
      console.log("Patched and repacked prebuilt tarball:", tarPath);
    }

    fs.rmSync(tmpDir, { recursive: true, force: true });
  } catch (err) {
    console.error("Failed to patch tarball:", tarPath, err.message);
  }
}

function patchSwiftInterfaceFile(full) {
  try {
    const original = fs.readFileSync(full, "utf8");
    const res = patchSwiftInterfaceContent(original);
    if (res.modified) {
      fs.writeFileSync(full, res.content, "utf8");
      console.log("Patched .swiftinterface on disk:", full);
    }
  } catch (e) {}
}

function patchPackageSwift(full) {
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
}

function patchSwiftSource(full) {
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

    // 4. Delegate PropNameID push_back to C++ appendPropName helper to avoid move-only Swift C++ interop template issues
    if (full.endsWith("JavaScriptRuntime.swift") && content.includes("vector.push_back")) {
      content = content.replace(
        /for propertyName in propertyNames\s*\{[\s\S]*?vector\.push_back\([^\)]*\)\s*\}/,
        `for propertyName in propertyNames {
        expo.HostObjectCallbacks.appendPropName(&vector, iRuntime, std.string(propertyName))
      }`
      );
      modified = true;
    }

    // 5. Fix Swift 6.1 concurrency data-race error on capturing raw pointers into actor-isolated closures
    if (full.endsWith("JavaScriptRuntime.swift") && content.includes("nonisolated(unsafe) let thisPtr = thisPtr")) {
      content = content.replace(
        /nonisolated\(unsafe\) let thisPtr = thisPtr\s*\n\s*nonisolated\(unsafe\) let argumentsPtr = argumentsPtr\s*\n\s*nonisolated\(unsafe\) let resultPtr = resultPtr[\s\S]*?return try context\.call\(thisValue, consume arguments\)\.asJSIValue\(\)\s*\}\s*\}\s*\}/g,
        (match) => {
          if (match.includes("UnsafeMutablePointer(mutating: thisPtr).move()")) {
            return `let thisBits = UInt(bitPattern: thisPtr)
    let argumentsBits = UInt(bitPattern: argumentsPtr)
    let resultBits = UInt(bitPattern: resultPtr)

    withGuaranteedContext(context) { (context: HostFunctionContext, runtime) in
      let targetResultPtr = UnsafeMutablePointer<facebook.jsi.Value>(bitPattern: resultBits)!
      targetResultPtr.pointee = JavaScriptActor.assumeIsolated {
        return forwardingSwiftErrorsToJS(runtime: runtime) {
          let targetThisPtr = UnsafePointer<facebook.jsi.Value>(bitPattern: thisBits)!
          let targetArgsPtr = UnsafePointer<facebook.jsi.Value>(bitPattern: argumentsBits)!
          let this = UnsafeMutablePointer(mutating: targetThisPtr).move()
          let arguments = JavaScriptValuesBuffer(runtime, start: targetArgsPtr, count: argumentsCount)
          let thisValue = JavaScriptValue(runtime, this)
          return try context.call(thisValue, consume arguments).asJSIValue()
        }
      }
    }`;
          } else {
            return `let thisBits = UInt(bitPattern: thisPtr)
    let argumentsBits = UInt(bitPattern: argumentsPtr)
    let resultBits = UInt(bitPattern: resultPtr)

    withGuaranteedContext(context) { (context: UnownedThisHostFunctionContext, runtime) in
      let targetResultPtr = UnsafeMutablePointer<facebook.jsi.Value>(bitPattern: resultBits)!
      targetResultPtr.pointee = JavaScriptActor.assumeIsolated {
        return forwardingSwiftErrorsToJS(runtime: runtime) {
          let targetThisPtr = UnsafePointer<facebook.jsi.Value>(bitPattern: thisBits)!
          let targetArgsPtr = UnsafePointer<facebook.jsi.Value>(bitPattern: argumentsBits)!
          let arguments = JavaScriptValuesBuffer(runtime, start: targetArgsPtr, count: argumentsCount)
          let thisValue = JavaScriptUnownedValue(runtime.pointee, targetThisPtr)
          return try context.call(thisValue, consume arguments).asJSIValue()
        }
      }
    }`;
          }
        }
      );
      modified = true;
    }

    // 6. Fix expo-router iOS 26 forward-compatibility APIs not present in Xcode 16.4 / iPhoneOS18.5.sdk
    if (full.includes("expo-router") && full.includes("Toolbar")) {
      if (full.endsWith("RouterToolbarHostView.swift") && content.includes("item.hidesSharedBackground = hidesSharedBackground")) {
        content = content.replace(
          /if #available\(iOS 26\.0, \*\)\s*\{[\s\S]*?item\.sharesBackground = sharesBackground\s*\}\s*\}/g,
          "// iOS 26.0 background properties omitted for iOS 18 SDK compatibility"
        );
        modified = true;
      }

      if (full.endsWith("RouterToolbarItemView.swift")) {
        if (content.includes("controller.navigationItem.searchBarPlacementBarButtonItem")) {
          content = content.replace(
            /guard #available\(iOS 26\.0, \*[\s\S]*?item = controller\.navigationItem\.searchBarPlacementBarButtonItem/g,
            "logger?.warn(\"[expo-router] navigationItem.searchBarPlacementBarButtonItem not available on iOS 18 SDK.\")\n      currentBarButtonItem = nil\n      return"
          );
          modified = true;
        }
        if (content.includes("applyCommonProperties")) {
          content = content.replace(
            /private func applyCommonProperties\(to item: UIBarButtonItem\)\s*\{[\s\S]*?\n  \}/,
            `private func applyCommonProperties(to item: UIBarButtonItem) {
    item.style = barButtonItemStyle ?? .plain
    item.width = width.map { CGFloat($0) } ?? 0
    item.isSelected = selected
    item.accessibilityLabel = routerAccessibilityLabel
    item.accessibilityHint = routerAccessibilityHint
    item.isEnabled = !disabled
  }`
          );
          modified = true;
        }
      }

      if (full.endsWith("RouterToolbarModule.swift") && content.includes("return .prominent")) {
        content = content.replace(
          /case \.prominent:\s*if #available\(iOS 26\.0, \*\)\s*\{[\s\S]*?return \.done\s*\}/g,
          "case .prominent:\n      return .done"
        );
        modified = true;
      }
    }

    if (modified) {
      fs.writeFileSync(full, content, "utf8");
      console.log("Patched Swift syntax in:", full);
    }
  } catch (err) {}
}

function patchCppHeader(full) {
  try {
    let content = fs.readFileSync(full, "utf8");
    let modified = false;

    if (content.includes("SWIFT_RETURNS_RETAINED")) {
      content = content.replace(/SWIFT_RETURNS_RETAINED\s+/g, "");
      modified = true;
    }

    // Expose appendPropName static helper for HostObjectCallbacks to handle move-only PropNameID
    if (full.endsWith("HostObjectCallbacks.h")) {
      if (!content.includes('"IRuntimeCompat.h"')) {
        content = content.replace('#include <jsi/jsi.h>', '#include <jsi/jsi.h>\n#include "IRuntimeCompat.h"');
        modified = true;
      }
      if (!content.includes("appendPropName")) {
        content = content.replace(
          "inline PropNameIds getPropertyNames() const {",
          `static inline void appendPropName(PropNameIds &vector, facebook::jsi::IRuntime &runtime, const std::string &name) {
    vector.push_back(facebook::jsi::PropNameID::forUtf8(runtime, name));
  }

  inline PropNameIds getPropertyNames() const {`
        );
        modified = true;
      } else if (content.includes("appendPropName(PropNameIds &vector, facebook::jsi::Runtime &runtime")) {
        content = content.replace(
          "appendPropName(PropNameIds &vector, facebook::jsi::Runtime &runtime",
          "appendPropName(PropNameIds &vector, facebook::jsi::IRuntime &runtime"
        );
        modified = true;
      }
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

function patchDirectory(dir) {
  if (!fs.existsSync(dir)) return;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== ".git" && entry.name !== ".build" && entry.name !== "build" && entry.name !== "DerivedData") {
        patchDirectory(full);
      }
    } else {
      if (entry.name.endsWith(".tar.gz") && full.includes("xcframeworks")) {
        patchTarGz(full);
      } else if (entry.name.endsWith(".swiftinterface") && !entry.name.startsWith("._")) {
        patchSwiftInterfaceFile(full);
      } else if (entry.name === "Package.swift" && (full.includes("expo-modules-jsi") || full.includes("ExpoModulesJSI"))) {
        patchPackageSwift(full);
      } else if (entry.name.endsWith(".swift")) {
        patchSwiftSource(full);
      } else if (entry.name.endsWith(".h") || entry.name.endsWith(".hpp")) {
        patchCppHeader(full);
      }
    }
  }
}

const targetDirs = [
  "node_modules",
  "src/frontend/node_modules",
  "src/frontend",
  "src/frontend/ios/Pods",
  "src/frontend/ios/build"
];

targetDirs.forEach(d => {
  const resolved = path.resolve(process.cwd(), d);
  patchDirectory(resolved);
});

console.log("iOS Swift 6.1 patch routine completed successfully.");
