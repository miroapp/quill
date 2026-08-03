# Miro Quill Fork

This is Miro's public fork of Quill.

## Before You Work

- Read `.github/DEVELOPMENT.md` before setup, build, or test work.
- Read `.github/CONTRIBUTING.md` before preparing a contribution or pull request.

## Miro Beta Releases

- Before changing a Miro beta version or publishing, read the internal [Quill Contribution guide](https://miro.atlassian.net/wiki/spaces/SD/pages/4285268031/Quill+Contribution+guide).
- Commit beta version bumps in `packages/quill/package.json`; keep Artifactory configuration, credentials, and `.npmrc` changes local and uncommitted.
- `.github/workflows/release.yml` packages releases for public npm and GitHub Releases. Do not use it to publish the Artifactory beta consumed by Miro client.
- Before updating the client dependency, verify the beta is available in Artifactory and comply with the client's package age gate.
- If the contribution guide is unavailable, ask a maintainer rather than infer a publication path.
