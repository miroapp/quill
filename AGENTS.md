# Miro Quill Fork

This is Miro's public fork of Quill.

## Before You Work

- Read `.github/DEVELOPMENT.md` before setup, build, or test work.
- Read `.github/CONTRIBUTING.md` before preparing a contribution or pull request.

## Access

`miroapp/quill` is a public repository. Clone it and open a pull request from a fork with no extra access request.

Pushing a branch directly to `miroapp/quill` needs write permission on that repository. That permission is on the `miroapp` organization, not `miroapp-dev`. If you do not already have it, request it from IT: https://miro.atlassian.net/servicedesk/customer/portal/34/create/655

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

`.github/workflows/publish-npm.yml` publishes `@mirohq/quill` from `packages/quill/dist` to public npm (`https://registry.npmjs.org`) using GitHub OIDC trusted publishing:

- On a same-repo pull request that changes `packages/quill/**`, CI publishes `2.0.N-<branch>.<index>` under dist-tag `pr` and comments the version on the pull request.
- On merge to `main` (when `packages/quill/**` changes), CI publishes the next stable `2.0.N` under dist-tag `latest`.

To test a pull-request build or pin a merged release in `client`:

```bash
# client root
yarn add quill@npm:@mirohq/quill@<version>
yarn why quill
```

When adopting the package in `client`, allow only stable `npm:@mirohq/quill@2.0.N` in `restrict-dependency-versions`. A `2.0.N-<branch>.<index>` pin still deploys a shadow build from `build-web`.

## Upstreaming

For a change that belongs in `slab/quill`:

1. `git checkout upstream-main`
2. `git checkout -b my-branch`
3. Commit and push the change.
4. Open the pull request with `slab/quill` as the base.
