# Miro Quill Fork

This is Miro's public fork of Quill.

## Before You Work

- Read `.github/DEVELOPMENT.md` before setup, build, or test work.
- Read `.github/CONTRIBUTING.md` before preparing a contribution or pull request.

## Access

Clone `https://github.com/miroapp/quill.git`. Contributions need access to the `miroapp` organization, which is not `miroapp-dev`. Request it from IT: https://miro.atlassian.net/servicedesk/customer/portal/34/create/655

## Branches and pull requests

Create a feature branch from `main` and open the pull request against `miroapp/quill`. The default base is `slab/quill`.

Add exactly one of `change:bugfix`, `change:feature`, `change:documentation`, `change:chore`, or `change:refactor`. `.github/workflows/label.yml` fails the pull request otherwise.

## Local client link

Build Quill, then point the client dependency at that `dist` directory. Do not commit the pin.

```bash
# quill-miro/packages/quill
npm run build
```

Sibling checkouts of `client` and `quill-miro` use:

```json
"quill": "file:../quill-miro/packages/quill/dist"
```

After further Quill edits, run `npm run build` again. The client does not need a reinstall for that `file:` pin.

To try the same build without a version bump or an Artifactory publish:

```bash
# quill-miro/packages/quill
npm run build
npm pack ./dist --pack-destination <client-root>

# client root
yarn add ./quill-<version>.tgz
```

Do not commit the tarball or the `./quill-*.tgz` specifier. The client's `restrict-dependency-versions` rule rejects it, and no client workflow builds Quill. A client pull request installs the lockfile only.

## Miro releases

Versions consumed by the client are `2.0.N`. Do not publish a `-beta.N` suffix.

- Bump `packages/quill/package.json` and `packages/quill.version` in `package-lock.json`. Leave the root `quill-monorepo` version alone.
- Do not commit `publishConfig`, a registry URL in `.npmrc`, or credentials.
- `.github/workflows/release.yml` publishes to public npm. The client package is published from `packages/quill/dist` to Artifactory `npm-local`. The registry URL is in the [Quill contribution guide](https://miro.atlassian.net/wiki/spaces/SD/pages/4285268031/Quill+Contribution+guide).
- `npm publish` with no `--tag` moves the `latest` dist-tag. Do not pass `--tag beta`.
- The client accepts only an exact `X.Y.Z` pin (`restrict-dependency-versions`). Unscoped `quill` is subject to `npmMinimalAgeGate` (24h) in the client `.yarnrc.yml`. `yarn add quill@<version> --no-time-gate` is the install bypass. Do not add unscoped `quill` to `npmPreapprovedPackages`.

Recheck Artifactory before choosing the version. `2.0.N` numbers are not reserved.

```bash
# client root
yarn npm info quill --fields versions,dist-tags --json
```

On a checkout of the version bump:

```bash
# quill-miro/packages/quill
# Pass --registry with the URL from the Quill contribution guide.
npm login --registry=<registry URL from the contribution guide>
npm whoami --registry=<registry URL from the contribution guide>
npm run build
cd dist
npm publish --dry-run --registry=<registry URL from the contribution guide>
```

`packages/quill/scripts/build` copies `package.json` into `dist`. Confirm the dry-run version, then run the same `npm publish` without `--dry-run`. Remove any local `publishConfig` before committing.

Then pin that exact version in the client:

```bash
# client root
yarn add quill@2.0.N --no-time-gate
yarn why quill
```

## Upstreaming

For a change that belongs in `slab/quill`:

1. `git checkout upstream-main`
2. `git checkout -b my-branch`
3. Commit and push the change.
4. Open the pull request with `slab/quill` as the base.
