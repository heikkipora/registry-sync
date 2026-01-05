# GitHub Copilot Instructions for registry-sync

## Project Overview

**registry-sync** is a Node.js CLI tool that synchronizes NPM packages from a remote registry (like npmjs.org) to a local folder for offline use. It parses `package-lock.json` and `yarn.lock` files and downloads packages, their metadata, and pre-built native binaries (node-pre-gyp) for multiple platforms.

### Key Capabilities
- Synchronize packages from remote NPM registries to local storage
- Parse npm's package-lock.json (v1, v2, v3) and yarn.lock files
- Download pre-built native binaries for multiple Node ABI versions, architectures, and platforms
- Incremental syncing with caching to avoid re-downloading unchanged packages
- Registry authentication via Bearer tokens
- Tarball integrity verification (SHA1 and SRI formats)
- Metadata rewriting to point to local URLs

## Tech Stack

- **Language**: TypeScript 5.9+ (targeting ES2022)
- **Runtime**: Node.js v20.17.0 or newer
- **Module Format**: CommonJS
- **CLI Framework**: commander 14.x
- **HTTP Client**: axios 1.13.x with LRU cache
- **Testing**: Mocha 11.x + Chai 6.x with ts-node
- **Linting**: ESLint 9.x (flat config) with typescript-eslint 8.x
- **Key Dependencies**: ssri, tar-fs, @yarnpkg/lockfile, semver

## Architecture & Code Patterns

### Functional Pipeline Architecture

The codebase follows a functional pipeline pattern with clear separation of concerns:

```
CLI (index.ts)
  → synchronize (sync.ts)
    → resolve dependencies (resolve.ts)
    → check cache (resolve.ts)
    → download packages (download.ts)
    → update cache (resolve.ts)
```

Each module handles a single concern:
- **index.ts**: CLI entry point and argument parsing
- **sync.ts**: Orchestration of the sync process
- **resolve.ts**: Dependency parsing from lockfiles
- **download.ts**: Package download and metadata management
- **client.ts**: HTTP client with caching
- **metadata.ts**: Tarball manipulation and metadata rewriting
- **pregyp.ts**: Pre-built binary handling
- **integrity.ts**: Checksum verification

### Core Code Patterns

1. **Async/Await First**
   - All I/O operations are asynchronous
   - Use `async`/`await` consistently
   - Return `Promise<T>` for async functions
   - Handle errors with try/catch blocks

   ```typescript
   async function downloadAll(packages: PackageWithId[], options: CommandLineOptions): Promise<void> {
     for (const pkg of packages) {
       await downloadPackage(pkg, options)
     }
   }
   ```

2. **Type-Driven Development**
   - Define interfaces for all data structures upfront in [types.d.ts](src/types.d.ts)
   - Use strong typing to prevent runtime errors
   - No implicit `any` types (enforced by tsconfig)
   - Type all function parameters and return values

   ```typescript
   interface PackageWithId extends Package {
     id: string
   }

   function parsePackages(lockfile: PackageLock): PackageWithId[] {
     // implementation
   }
   ```

3. **Immutable Data Handling**
   - Use filtering and mapping over collections
   - Use `structuredClone()` for deep object copies
   - Avoid mutating input parameters

   ```typescript
   const newPackages = allPackages.filter(pkg => !cache.has(pkg.id))
   const metadata = structuredClone(originalMetadata)
   ```

4. **Error Handling Strategy**
   - Distinguish between fatal errors and recoverable errors
   - Pre-built binaries are optional - catch 404 errors gracefully
   - Throw errors for integrity mismatches and network failures

   ```typescript
   try {
     await downloadPrebuiltBinary(url)
   } catch (err) {
     if (err.response?.status === 404) {
       console.error('Optional binary not found, continuing...')
     } else {
       throw err // Fatal error
     }
   }
   ```

5. **Configuration as Plain Objects**
   - Pass configuration through function parameters
   - No hidden state or singletons
   - Use dependency injection pattern

   ```typescript
   async function downloadPackage(
     pkg: PackageWithId,
     options: CommandLineOptions
   ): Promise<void> {
     // implementation uses options
   }
   ```

## Coding Conventions

### Naming
- **camelCase**: functions and variables (`downloadPackage`, `registryUrl`)
- **PascalCase**: interfaces and types (`PackageWithId`, `RegistryMetadata`)
- **kebab-case**: file names (`normalize-yarn-pattern.ts`)
- Descriptive function names that explain intent (`dependenciesFromPackageLock`, `rewriteVersionMetadata`)

### File Organization
- One primary export per file matching the file name
- Keep files focused on a single concern
- Place type definitions in [types.d.ts](src/types.d.ts)
- Import types with `import type` syntax

### Module Exports
```typescript
// Named exports for main functionality
export async function downloadAll(...) { }

// Type-only imports
import type {PackageWithId, CommandLineOptions} from './types.d.ts'
```

## Testing Approach

### Test Structure
- **Framework**: Mocha with Chai assertions
- **Execution**: Via ts-node for TypeScript tests
- **Timeout**: 120 seconds for network operations
- **Location**: `test/` directory with `*-test.ts` naming

### Test Patterns
1. **Fixture-Based Testing**
   - Use real lockfile examples from `test/manifests/`
   - Test against real npm registry (npmjs.org)
   - Verify behavior with actual package data

2. **Integration Tests**
   - Test full synchronization cycles in [sync-test.ts](test/sync-test.ts)
   - Test lockfile parsing in [resolve-test.ts](test/resolve-test.ts)
   - Test download and metadata rewriting in [download-test.ts](test/download-test.ts)

3. **Test Cleanup**
   - Always clean up temporary directories (`.download`, `.tmp`)
   - Remove test files after each test

4. **Assertions**
   - Use Chai's `deep.equal()` for object comparisons
   - Use `expect(...).to.be.true` for boolean checks
   - Match exact error messages when testing failures

### Example Test
```typescript
import {expect} from 'chai'

describe('downloadPackage', () => {
  it('should download package and create metadata', async () => {
    const pkg = {id: 'lodash@4.17.21', name: 'lodash', version: '4.17.21'}
    await downloadPackage(pkg, options)

    const metadata = JSON.parse(fs.readFileSync('./local-registry/lodash/index.json', 'utf-8'))
    expect(metadata.versions['4.17.21'].dist.tarball).to.include('http://localhost:8000')
  })
})
```

## Critical Implementation Details

### Cache Schema Versioning
- Support schema migrations between cache versions
- Current cache format is V2 (includes platform metadata)
- Auto-migrate from V1 (array of packages) on load

```typescript
interface CacheSchemaV2 {
  dependencies: PackageWithId[]
  prebuiltBinaryProperties: PlatformVariant[]
  prebuiltBinaryNApiSupport: boolean
}

type CacheSchemaV1 = PackageWithId[]
```

### Tarball Integrity Verification
- Support both modern SRI and legacy SHA1
- Use `ssri.checkData()` for SRI format
- Fall back to SHA1 hash comparison for older packages

```typescript
if (integrity) {
  ssri.checkData(data, integrity)
} else if (shasum) {
  const hash = crypto.createHash('sha1').update(data).digest('hex')
  if (hash !== shasum) throw new Error('Integrity check failed')
}
```

### Platform Variant Combinations
- Create Cartesian product of ABI × Architecture × Platform
- Filter combinations for pre-built binary downloads

```typescript
const variants = abis.flatMap(abi =>
  architectures.flatMap(arch =>
    platforms.map(platform => ({abi, arch, platform}))
  )
)
```

### Yarn Lock Parsing
- Detect non-registry sources (git:, file:, github:, etc.)
- Normalize scoped packages (@namespace/package)
- Handle npm: and yarn: protocol prefixes
- Filter out local file dependencies

```typescript
// Skip non-registry packages
if (resolved && !resolved.startsWith('https://registry')) {
  continue
}
```

## Important Guidelines for Copilot

### When Writing Code

1. **Always Define Types First**
   - Add interfaces to [types.d.ts](src/types.d.ts) before implementation
   - Ensure all public API functions have typed parameters and returns
   - Use type guards for optional fields

2. **Maintain Modular Separation**
   - Don't add dependencies between modules unnecessarily
   - Each file should have a single, clear purpose
   - Use dependency injection for configuration

3. **Follow Async Patterns**
   - Use `async`/`await` for all I/O operations
   - Chain promises properly, avoid callback hell
   - Handle promise rejections with try/catch

4. **Test Integration, Not Just Units**
   - Write integration tests that use real fixtures
   - Test against the actual npm registry when possible
   - Verify end-to-end behavior, not just isolated functions

5. **Handle Errors Appropriately**
   - Throw errors for unexpected conditions
   - Catch and log expected failures (like optional binaries)
   - Provide helpful error messages with context

6. **Avoid Over-Engineering**
   - Don't add features beyond what's requested
   - Keep solutions simple and focused
   - Three similar lines are better than premature abstraction
   - Don't add error handling for scenarios that can't happen

7. **No Backwards-Compatibility Hacks**
   - Delete unused code completely
   - No `_unusedVar` renaming or `// removed` comments
   - Clean refactors over compatibility shims

### When Adding Dependencies

1. Pin exact versions in package.json
2. Prefer well-maintained packages with TypeScript types
3. Update package-lock.json
4. Add @types/* packages to devDependencies if needed

### When Writing Tests

1. Use fixture files from `test/manifests/` directory
2. Test against real npm registry (integration over mocking)
3. Set appropriate timeouts for network operations
4. Clean up temp files and directories after tests
5. Use descriptive test names that explain the scenario

### Code Review Checklist

Before suggesting code, ensure:
- [ ] All functions have TypeScript type signatures
- [ ] Async operations use async/await
- [ ] Error handling distinguishes fatal vs recoverable
- [ ] No implicit `any` types
- [ ] No unnecessary dependencies between modules
- [ ] Tests cover the new functionality
- [ ] ESLint rules pass (run `npm run eslint`)
- [ ] Code follows existing patterns in the codebase

## Build & Release Process

### Build Steps
1. Remove old `build/` directory
2. Create new `build/` directory
3. Copy `LICENSE`, `package.json`, `README.md`, `bin/` to `build/`
4. Compile TypeScript: `npx tsc`

### Quality Checks
- ESLint must pass with zero warnings: `npm run eslint`
- All tests must pass: `npm test`
- GitHub Actions runs both checks automatically

## Common Tasks

### Adding a New CLI Option
1. Add option to commander in [index.ts](src/index.ts)
2. Add field to `CommandLineOptions` interface in [types.d.ts](src/types.d.ts)
3. Pass option through to relevant functions
4. Update README with new option
5. Add tests for the new functionality

### Adding a New Binary Platform
1. Update `PlatformVariant` type if needed
2. Add validation in [index.ts](src/index.ts)
3. Update [pregyp.ts](src/pregyp.ts) to handle platform-specific URLs
4. Test with packages that have binaries for the new platform

## Key Files Reference

| File | Purpose | Key Functions |
|------|---------|---------------|
| [index.ts](src/index.ts) | CLI entry point | Command-line parsing, option validation |
| [sync.ts](src/sync.ts) | Orchestration | `synchronize()` - main entry point |
| [resolve.ts](src/resolve.ts) | Dependency parsing | `dependenciesFromPackageLock()`, npm/yarn parsing |
| [download.ts](src/download.ts) | Package fetching | `downloadAll()`, metadata rewriting |
| [client.ts](src/client.ts) | HTTP operations | `fetchJsonWithCacheCloned()`, `fetchBinaryData()` |
| [metadata.ts](src/metadata.ts) | Tarball manipulation | `rewriteVersionMetadata()`, `extractTgz()` |
| [pregyp.ts](src/pregyp.ts) | Binary handling | `downloadPrebuiltBinaries()`, binary URL formatting |
| [integrity.ts](src/integrity.ts) | Verification | `verifyIntegrity()`, SHA1/SHA512 hashing |
| [types.d.ts](src/types.d.ts) | Type definitions | All interfaces and types |

## Example Execution Flow

```
User runs: registry-sync --root ./registry --manifest ./package-lock.json --localUrl http://localhost:8000

1. index.ts parses CLI arguments → CommandLineOptions
2. sync.ts calls synchronize()
3. resolve.ts parses lockfile → PackageWithId[]
4. resolve.ts loads cache, filters to new packages
5. download.ts downloads each package:
   - Fetch metadata from registry
   - Download tarball and verify integrity
   - Download pre-built binaries if present
   - Rewrite metadata to point to local URLs
   - Create index.json metadata file
6. resolve.ts updates cache with new packages
```

## Resources

- Repository: https://github.com/heikkipora/registry-sync
- NPM Package: https://www.npmjs.com/package/registry-sync
- Node.js Release Info: https://nodejs.org/en/download/releases/
- npm Registry API: https://github.com/npm/registry/blob/master/docs/REGISTRY-API.md
