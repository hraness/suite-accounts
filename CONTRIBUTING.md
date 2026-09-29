# Contributing

Issues and focused pull requests are welcome in the hraness/suite-accounts
repository.

Open an issue before changing a protocol value, registry entry, public
subpath, dependency, or security invariant. Maintainers review changes for
closed authority, runtime separation, source compatibility, exact parsing,
and deterministic evidence.

Use Bun 1.3.14 and run the complete local gate before opening a pull request:

```sh
bun install --frozen-lockfile --ignore-scripts
bun run check
```

Include a readable regression test for each behavior change. Add a property
test for a parser, round trip, ordering rule, or other invariant over arbitrary
input. Never put credentials, provider state, webhook payloads, billing
catalog data, or private service implementation details in an issue, fixture,
commit, or pull request.

## npm

After the GitHub Release, the release workflow's `npm` job publishes the
tagged commit to npm as `@hraness/suite-accounts` with a provenance attestation. It uses npm
trusted publishing, so GitHub Actions proves the workflow's identity to npm
and no npm token is stored anywhere. No one needs to approve a release. The
job skips a version that npm already has.

npm only accepts trusted publishing for a package that already exists, so the
job warns and skips until a maintainer does this once:

1. From a clean checkout of the newest `v*` tag, which the release workflow
   has already checked, publish the first version by hand:
   `npm publish --access public --ignore-scripts`.
2. Let this workflow publish from now on:
   `npm trust github @hraness/suite-accounts --repo hraness/suite-accounts --file release.yml --allow-publish --yes`
   (npm 11.16 or newer).
3. In the package settings on npmjs.com, require two-factor authentication and
   disallow tokens.
