import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import {
  formatVersion,
  nextVersionOnConflict,
  parseVersion,
  sanitizeBranch,
} from "./publish-version.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const distDir = join(root, "packages/quill/dist");
const registry = "https://registry.npmjs.org";
const packageName = "@mirohq/quill";

const { values } = parseArgs({
  options: {
    tag: { type: "string" },
    version: { type: "string" },
    branch: { type: "string" },
    "dry-run": { type: "boolean", default: false },
  },
});

const fail = (message) => {
  console.error(message);
  process.exit(1);
};

if (values.tag !== "pr" && values.tag !== "latest") {
  fail("Pass --tag pr or --tag latest");
}

if (!values["dry-run"] && !process.env.CI) {
  fail("Refusing to publish outside CI");
}

const readPublishedVersions = async () => {
  const response = await fetch(`${registry}/${packageName}`);
  if (response.status === 404) {
    return [];
  }
  if (!response.ok) {
    fail(`Registry returned ${response.status} for ${packageName}`);
  }
  const body = await response.json();
  return Object.keys(body.versions || {});
};

const detectBranch = () => {
  const explicit =
    values.branch || process.env.GITHUB_HEAD_REF || process.env.GITHUB_REF_NAME;
  if (explicit) {
    return sanitizeBranch(explicit);
  }
  let current = "";
  try {
    current = execFileSync("git", ["branch", "--show-current"], {
      cwd: root,
      encoding: "utf8",
    }).trim();
  } catch (error) {
    fail(
      `Could not detect the current branch. Pass --branch. ${error.message}`,
    );
  }
  if (!current) {
    fail("Could not detect the current branch. Pass --branch.");
  }
  return sanitizeBranch(current);
};

const resolveVersion = async () => {
  if (values.version) {
    const parsed = parseVersion(values.version);
    if (!parsed) {
      fail(
        `Version must look like 2.0.N or 2.0.N-<branch>.<index>, received ${values.version}`,
      );
    }
    if (values.tag === "latest" && parsed.branch) {
      fail(
        `dist-tag latest requires an exact 2.0.N version, received ${values.version}`,
      );
    }
    return values.version;
  }

  const allVersions = await readPublishedVersions();
  const stablePatches = allVersions.flatMap((version) => {
    const parsed = parseVersion(version);
    return parsed && !parsed.branch ? [parsed.patch] : [];
  });
  if (stablePatches.length === 0) {
    fail("No stable 2.0.N is published");
  }
  const highestPatch = Math.max(...stablePatches);

  if (values.tag === "latest") {
    return formatVersion({ patch: highestPatch + 1, branch: "", index: 0 });
  }

  const branch = detectBranch();
  const highestIndex = allVersions.reduce((max, version) => {
    const parsed = parseVersion(version);
    if (!parsed || parsed.patch !== highestPatch || parsed.branch !== branch) {
      return max;
    }
    return parsed.index > max ? parsed.index : max;
  }, 0);

  return formatVersion({
    patch: highestPatch,
    branch,
    index: highestIndex + 1,
  });
};

const build = () => {
  execFileSync("npm", ["run", "build", "--workspace=packages/quill"], {
    cwd: root,
    stdio: "inherit",
  });
};

const writeDistManifest = (version) => {
  const manifestPath = join(distDir, "package.json");
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  manifest.name = packageName;
  manifest.version = version;
  manifest.repository = {
    type: "git",
    url: "git+https://github.com/miroapp/quill.git",
    directory: "packages/quill",
  };
  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
};

const assertBuild = () => {
  if (!existsSync(join(distDir, "quill.js"))) {
    fail("packages/quill/dist/quill.js is missing");
  }
  if (!existsSync(join(distDir, "dist/quill.js"))) {
    fail("packages/quill/dist/dist/quill.js is missing");
  }
};

const publishOnce = () => {
  const args = [
    "publish",
    "--tag",
    values.tag,
    "--access",
    "public",
    "--registry",
    registry,
    "--provenance",
  ];
  try {
    const output = execFileSync("npm", args, {
      cwd: distDir,
      encoding: "utf8",
    });
    process.stdout.write(output);
  } catch (error) {
    process.stdout.write(error.stdout || "");
    process.stderr.write(error.stderr || "");
    throw error;
  }
};

const publish = (version) => {
  try {
    publishOnce();
    return version;
  } catch (error) {
    const output = `${error.stderr || ""}${error.stdout || ""}${error.message}`;
    if (
      !/previously published|EPUBLISHCONFLICT|cannot publish over/i.test(output)
    ) {
      throw error;
    }
    let retry;
    try {
      retry = nextVersionOnConflict(version);
    } catch (incrementError) {
      fail(incrementError.message);
    }
    console.error(
      `Version ${version} is already published. Retrying ${retry}.`,
    );
    writeDistManifest(retry);
    publishOnce();
    return retry;
  }
};

const version = await resolveVersion();
build();
assertBuild();
writeDistManifest(version);

if (values["dry-run"]) {
  console.log(`PUBLISHED_VERSION=${version}`);
  process.exit(0);
}

const published = publish(version);
console.log(`PUBLISHED_VERSION=${published}`);
