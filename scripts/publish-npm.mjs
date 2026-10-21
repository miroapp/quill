import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const distDir = join(root, "packages/quill/dist");
const registry = "https://registry.npmjs.org";
const packageName = "@mirohq/quill";

const { values } = parseArgs({
  options: {
    tag: { type: "string" },
    version: { type: "string" },
    "dry-run": { type: "boolean", default: false },
    "write-source": { type: "boolean", default: false },
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

const isExactPatch = (version) => /^2\.0\.\d+$/.test(version);

const nextPatch = (version) => {
  const patch = Number(version.split(".")[2]) + 1;
  return `2.0.${patch}`;
};

const readPublishedPatches = async () => {
  const response = await fetch(`${registry}/${packageName}`);
  if (response.status === 404) {
    return [];
  }
  if (!response.ok) {
    fail(`Registry returned ${response.status} for ${packageName}`);
  }
  const body = await response.json();
  return Object.keys(body.versions || {}).filter(isExactPatch);
};

const resolveVersion = async () => {
  if (values.version) {
    if (!isExactPatch(values.version)) {
      fail(`Version must look like 2.0.N, received ${values.version}`);
    }
    return values.version;
  }
  const patches = await readPublishedPatches();
  const highest = patches.reduce((max, version) => {
    const patch = Number(version.split(".")[2]);
    return patch > max ? patch : max;
  }, 0);
  return `2.0.${highest + 1}`;
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

const publishOnce = (version) => {
  const args = [
    "publish",
    "--tag",
    values.tag,
    "--access",
    "public",
    "--registry",
    registry,
  ];
  if (values.tag === "latest") {
    args.push("--provenance");
  }
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
  return version;
};

const publish = (version) => {
  try {
    return publishOnce(version);
  } catch (error) {
    const output = `${error.stderr || ""}${error.stdout || ""}${error.message}`;
    if (!/previously published|EPUBLISHCONFLICT|cannot publish over/i.test(output)) {
      throw error;
    }
    const retry = nextPatch(version);
    console.error(`Version ${version} is already published. Retrying ${retry}.`);
    writeDistManifest(retry);
    return publishOnce(retry);
  }
};

const writeSourceVersion = (version) => {
  const packagePath = join(root, "packages/quill/package.json");
  const packageText = readFileSync(packagePath, "utf8").replace(
    /("version"\s*:\s*")[^"]+(")/,
    `$1${version}$2`
  );
  writeFileSync(packagePath, packageText);

  const lockPath = join(root, "package-lock.json");
  const lockText = readFileSync(lockPath, "utf8");
  const marker = '"packages/quill": {';
  const start = lockText.indexOf(marker);
  if (start === -1) {
    fail("package-lock.json has no packages/quill entry");
  }
  const head = lockText.slice(start, start + 160);
  if (!/"version": "[^"]+"/.test(head)) {
    fail("packages/quill lockfile entry has no version");
  }
  const nextHead = head.replace(/"version": "[^"]+"/, `"version": "${version}"`);
  writeFileSync(lockPath, lockText.slice(0, start) + nextHead + lockText.slice(start + head.length));
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
if (values["write-source"]) {
  writeSourceVersion(published);
}
console.log(`PUBLISHED_VERSION=${published}`);
