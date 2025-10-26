import path from 'node:path'

/**
 * Custom ESLint rule to prevent parent directory imports (../)
 * and auto-fix them to absolute imports from src/
 */
export default {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Disallow parent directory imports and convert them to absolute imports from src/',
      category: 'Best Practices',
      recommended: true,
    },
    fixable: 'code',
    schema: [],
    messages: {
      noParentImport:
        'Parent directory imports are not allowed. Use absolute imports from src/ instead.',
    },
  },

  create(context) {
    return {
      ImportDeclaration(node) {
        const importPath = node.source.value

        // Check if this is a parent directory import
        if (!importPath.startsWith('../')) {
          return
        }

        context.report({
          node: node.source,
          messageId: 'noParentImport',
          fix(fixer) {
            const filename = context.getFilename()

            // Don't try to fix if filename is not available
            if (!filename || filename === '<input>') {
              return null
            }

            try {
              // Get the directory of the current file
              const currentDir = path.dirname(filename)

              // Find the src directory by going up from current file
              const srcIndex = currentDir.indexOf('/src/')
              if (srcIndex === -1) {
                // If we can't find src directory, don't auto-fix
                return null
              }

              // Resolve the import path relative to current directory
              const resolvedPath = path.join(currentDir, importPath)

              // Get the path after the src directory
              const resolvedSrcIndex = resolvedPath.indexOf('/src/')
              if (resolvedSrcIndex === -1) {
                // Import goes outside of src directory, don't auto-fix
                return null
              }

              const absoluteFromSrc = resolvedPath.substring(
                resolvedSrcIndex + 5,
              ) // +5 to skip '/src/'
              const newImportPath = `src/${absoluteFromSrc}`

              // Replace the import path, preserving quotes
              const quote = node.source.raw[0]
              return fixer.replaceText(
                node.source,
                `${quote}${newImportPath}${quote}`,
              )
            } catch {
              // If anything goes wrong with path resolution, don't auto-fix
              return null
            }
          },
        })
      },
    }
  },
}
