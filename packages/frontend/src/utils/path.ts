/**
 * Get the relative path from basePath to fullPath
 * @param fullPath - The full absolute path
 * @param basePath - The base path to calculate relative to
 * @returns The relative path, or empty string if fullPath equals basePath
 */
export function getRelativePath(fullPath: string, basePath: string): string {
  // Normalize paths by removing trailing slashes
  const normalizedFull = fullPath.replace(/\/+$/, '')
  const normalizedBase = basePath.replace(/\/+$/, '')

  // If paths are equal, return empty string
  if (normalizedFull === normalizedBase) {
    return ''
  }

  // Check if fullPath starts with basePath
  if (!normalizedFull.startsWith(normalizedBase)) {
    // Path is not under basePath, return original path
    return fullPath
  }

  // Get the relative portion
  // Add 1 to skip the trailing slash after basePath
  const relative = normalizedFull.slice(normalizedBase.length + 1)

  return relative
}
