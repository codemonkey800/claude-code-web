import { readFile } from 'node:fs/promises'
import { dirname, join, relative, sep } from 'node:path'

import { getErrorMessage } from '@claude-code-web/shared'
import { Logger } from '@nestjs/common'
import ignore, { type Ignore } from 'ignore'

/**
 * Manages gitignore file parsing and path filtering
 * Loads .gitignore files from a directory hierarchy and provides methods
 * to check if paths should be excluded based on gitignore rules
 */
export class GitignoreManager {
  private readonly logger = new Logger(GitignoreManager.name)
  // Cache of compiled ignore instances per directory
  private readonly ignoreCache = new Map<string, Ignore>()

  /**
   * Creates a new GitignoreManager
   * @param allowedBaseDir - The base directory that serves as the root boundary
   */
  constructor(private readonly allowedBaseDir: string) {
    this.logger.log(
      `GitignoreManager initialized with base directory: ${allowedBaseDir}`,
    )
  }

  /**
   * Load and parse .gitignore files from the specified directory up to the allowed base directory
   * Results are cached for performance
   *
   * @param dirPath - The directory to start loading gitignores from
   */
  async loadGitignores(dirPath: string): Promise<void> {
    // Check if we already have this directory cached
    if (this.ignoreCache.has(dirPath)) {
      this.logger.debug(`Using cached gitignore for: ${dirPath}`)
      return
    }

    this.logger.debug(`Loading gitignores for: ${dirPath}`)

    // Create a new ignore instance
    const ig = ignore()

    // Walk up the directory tree to collect all .gitignore files
    const gitignoreFiles: Array<{ path: string; content: string }> = []
    let currentDir = dirPath

    while (currentDir.startsWith(this.allowedBaseDir)) {
      const gitignorePath = join(currentDir, '.gitignore')

      try {
        const content = await readFile(gitignorePath, 'utf-8')
        gitignoreFiles.push({ path: gitignorePath, content })
        this.logger.debug(`Found .gitignore at: ${gitignorePath}`)
      } catch (error) {
        // .gitignore doesn't exist at this level, continue
        const errorMessage = getErrorMessage(error)
        if (!errorMessage.includes('ENOENT')) {
          // Log non-existence errors
          this.logger.warn(
            `Error reading .gitignore at ${gitignorePath}: ${errorMessage}`,
          )
        }
      }

      // Move to parent directory
      const parentDir = dirname(currentDir)
      if (parentDir === currentDir) {
        // Reached filesystem root
        break
      }
      currentDir = parentDir
    }

    // Add rules from all found .gitignore files
    // Process in reverse order so that closer .gitignore files take precedence
    for (const { path, content } of gitignoreFiles.reverse()) {
      try {
        ig.add(content)
        this.logger.debug(`Added rules from: ${path}`)
      } catch (error) {
        this.logger.warn(
          `Failed to parse .gitignore at ${path}: ${getErrorMessage(error)}`,
        )
      }
    }

    // Cache the compiled ignore instance
    this.ignoreCache.set(dirPath, ig)
    this.logger.debug(
      `Cached gitignore for ${dirPath} with ${gitignoreFiles.length} files`,
    )
  }

  /**
   * Check if a file or directory should be ignored based on loaded gitignore rules
   *
   * @param filePath - Absolute path to the file or directory to check
   * @param baseDir - The directory that was used to load gitignores (usually the browsing directory)
   * @param isDirectory - Whether the path is a directory (needed to match patterns with trailing slashes)
   * @returns True if the path should be ignored, false otherwise
   */
  isIgnored(filePath: string, baseDir: string, isDirectory = false): boolean {
    const ig = this.ignoreCache.get(baseDir)
    if (!ig) {
      // No gitignore rules loaded for this directory
      this.logger.debug(
        `No gitignore cache for ${baseDir}, not filtering ${filePath}`,
      )
      return false
    }

    // Get the relative path from the base directory
    // The ignore library expects Unix-style paths with forward slashes
    let relativePath = relative(baseDir, filePath).split(sep).join('/')

    if (!relativePath || relativePath === '.') {
      // Don't ignore the base directory itself
      return false
    }

    // Add trailing slash for directories to match gitignore patterns like "node_modules/"
    // The ignore library requires this for proper directory matching
    if (isDirectory && !relativePath.endsWith('/')) {
      relativePath += '/'
    }

    const ignored = ig.ignores(relativePath)
    if (ignored) {
      this.logger.debug(`Path ignored by gitignore: ${relativePath}`)
    }

    return ignored
  }

  /**
   * Clear the gitignore cache
   * Useful for testing or when you want to force a reload
   */
  clearCache(): void {
    const cacheSize = this.ignoreCache.size
    this.ignoreCache.clear()
    this.logger.log(`Cleared gitignore cache (${cacheSize} entries)`)
  }

  /**
   * Get the current cache size (for debugging/monitoring)
   */
  getCacheSize(): number {
    return this.ignoreCache.size
  }
}
