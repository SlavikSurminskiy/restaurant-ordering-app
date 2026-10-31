// Writes the package.json of the migration image (libs/database/Dockerfile): only the Prisma CLI,
// at the version from the root package.json, so the image never needs its own version bump.
// Usage: node migrate-package-json.mjs <root package.json> <output package.json>
import { readFileSync, writeFileSync } from 'node:fs';

const [rootPackageJsonPath, outputPath] = process.argv.slice(2);

const rootPackageJson = JSON.parse(readFileSync(rootPackageJsonPath, 'utf8'));

const packageJson = {
  name: 'restaurant-migrate',
  private: true,
  packageManager: rootPackageJson.packageManager,
  dependencies: { prisma: rootPackageJson.devDependencies.prisma },
};

writeFileSync(outputPath, `${JSON.stringify(packageJson, null, 2)}\n`);
