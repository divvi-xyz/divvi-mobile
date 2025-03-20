import { readFileSync } from 'fs'
import path from 'path'

const rootDir = path.resolve(__dirname, '..') // Move up to project root
const packagePaths: string[] = [
  path.join(rootDir, 'package.json'),
  path.join(rootDir, 'packages/@divvi/mobile/package.json'),
  path.join(rootDir, 'apps/example/package.json'),
]

interface Dependencies {
  [key: string]: string
}

function getDependencies(packagePath: string): Dependencies {
  try {
    const packageJson = JSON.parse(readFileSync(packagePath, 'utf8')) as {
      dependencies?: Dependencies
      devDependencies?: Dependencies
    }

    return {
      ...packageJson.dependencies,
      ...packageJson.devDependencies,
    }
  } catch (error) {
    console.error(`❌ Error reading ${packagePath}:`, error)
    return {}
  }
}

function compareAllDependencies(packagePaths: string[]): void {
  const allDeps: Dependencies[] = packagePaths.map(getDependencies)
  const depVersions: Map<string, Set<string>> = new Map()

  allDeps.forEach((deps: Dependencies) => {
    Object.entries(deps).forEach(([dep, version]) => {
      if (!depVersions.has(dep)) {
        depVersions.set(dep, new Set())
      }
      depVersions.get(dep)?.add(version)
    })
  })

  const mismatches = [...depVersions.entries()].filter(([_, versions]) => versions.size > 1)

  if (mismatches.length === 0) {
    console.log('✅ All shared dependencies use the same version.')
  } else {
    console.log('❌ Version mismatches found:')
    mismatches.forEach(([dep, versions]) => {
      console.log(`- ${dep}: ${[...versions].join(' | ')}`)
    })
    console.log('⚠️  Please ensure all shared dependencies use the same version.')
    throw new Error('Dependency version mismatches found.')
  }
}

compareAllDependencies(packagePaths)
