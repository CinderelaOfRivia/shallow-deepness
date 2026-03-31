import fs from "node:fs";
import path from "node:path";

const projectRoot = process.cwd();
const lockfilePath = path.join(projectRoot, "package-lock.json");

function fail(message, details = []) {
  console.error(`SECURITY CHECK FAILED: ${message}`);
  for (const detail of details) {
    console.error(`- ${detail}`);
  }
  process.exit(1);
}

if (!fs.existsSync(lockfilePath)) {
  fail("package-lock.json is missing", ["Run npm install intentionally and review dependency diffs before trusting a fresh lockfile."]);
}

const lock = JSON.parse(fs.readFileSync(lockfilePath, "utf8"));
const packages = lock.packages ?? {};
const findings = [];

for (const [packagePath, meta] of Object.entries(packages)) {
  if (!meta || typeof meta !== "object") continue;

  const name = meta.name ?? packagePath.replace(/^node_modules\//, "");
  const version = meta.version ?? "unknown";

  if (name === "plain-crypto-js") {
    findings.push(`${name}@${version} at ${packagePath || "root"}`);
  }

  if (name === "axios" && version === "1.14.1") {
    findings.push(`${name}@${version} at ${packagePath || "root"}`);
  }
}

if (findings.length > 0) {
  fail("suspicious axios supply-chain indicators found", findings);
}

console.log("Security check passed: no axios@1.14.1 or plain-crypto-js entries found in package-lock.json.");
