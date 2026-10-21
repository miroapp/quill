const versionPattern = /^2\.0\.(\d+)(?:-([0-9A-Za-z-]+)\.(\d+))?$/;

export const parseVersion = (version) => {
  const match = version.match(versionPattern);
  if (!match) {
    return null;
  }
  return {
    patch: Number(match[1]),
    branch: match[2] || "",
    index: match[3] ? Number(match[3]) : 0,
  };
};

export const formatVersion = ({ patch, branch, index }) =>
  branch ? `2.0.${patch}-${branch}.${index}` : `2.0.${patch}`;

export const sanitizeBranch = (raw) => {
  const slug = (raw || "")
    .toLowerCase()
    .replace(/[^0-9a-z-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return !slug || /^\d+$/.test(slug) ? `pr-${slug || "branch"}` : slug;
};

export const nextVersionOnConflict = (version) => {
  const parsed = parseVersion(version);
  if (!parsed) {
    throw new Error(`Cannot increment version ${version}`);
  }
  if (parsed.branch) {
    return formatVersion({
      patch: parsed.patch,
      branch: parsed.branch,
      index: parsed.index + 1,
    });
  }
  return formatVersion({ patch: parsed.patch + 1, branch: "", index: 0 });
};
