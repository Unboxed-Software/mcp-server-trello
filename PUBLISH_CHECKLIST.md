# Publishing to NPM - Checklist

## Prerequisites
- [ ] Ensure you have an npm account
- [ ] Create or join the @unboxed-software organization on npm
- [ ] Login to npm: `npm login`
- [ ] Verify you're logged in: `npm whoami`
- [ ] Ensure you have publish permissions for @unboxed-software scope

## Pre-publish Steps

### 1. Version & Attribution
- [x] Updated package.json with new scope: `@unboxed-software/mcp-server-trello`
- [x] Bumped version to 1.4.0
- [x] Added proper attribution to original author
- [x] Updated LICENSE file with both copyright holders

### 2. Documentation
- [x] Updated README with new package name and features
- [x] Created CHANGELOG.md with version history
- [x] Updated all installation instructions
- [x] Added pagination feature documentation

### 3. Repository Setup
- [ ] Create new repository at: https://github.com/unboxed-software/mcp-server-trello
- [ ] Push code to new repository
- [ ] Set up GitHub repository settings (description, topics, etc.)

### 4. Build & Test
- [x] Run `npm install` to ensure dependencies are correct
- [x] Run `npm run build` to compile TypeScript
- [x] Test the MCP server locally with Claude Code
- [x] Verify pagination features work correctly

### 5. NPM Configuration
- [x] Created .npmignore file
- [x] Set publishConfig.access to "public" in package.json
- [x] Verified "files" field includes build directory

## Publishing Commands

```bash
# 1. Final build
npm run build

# 2. Dry run to see what will be published
npm pack --dry-run

# 3. Review the package contents
npm pack
tar -xvf unboxed-software-mcp-server-trello-1.4.0.tgz
# Review the package/ directory, then clean up:
rm -rf package unboxed-software-mcp-server-trello-1.4.0.tgz

# 4. Publish to npm
npm publish --access public

# 5. Verify publication
npm view @unboxed-software/mcp-server-trello
```

## Post-publish Steps

- [ ] Test installation: `npm install -g @unboxed-software/mcp-server-trello`
- [ ] Test with npx: `npx @unboxed-software/mcp-server-trello`
- [ ] Create GitHub release with tag v1.4.0
- [ ] Update any documentation sites or wikis
- [ ] Announce the release (if applicable)

## Rollback (if needed)

```bash
# Unpublish a specific version (within 72 hours)
npm unpublish @unboxed-software/mcp-server-trello@1.4.0

# Deprecate instead of unpublish (recommended)
npm deprecate @unboxed-software/mcp-server-trello@1.4.0 "Critical bug, please use 1.4.1"
```

## Notes

- The package includes enhanced pagination features not present in the original
- Proper attribution is given to the original author (@delorenj)
- The MIT license is preserved with both copyright holders listed
- All test scripts are excluded from the npm package to reduce size