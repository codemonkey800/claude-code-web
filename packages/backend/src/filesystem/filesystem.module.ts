import { Module } from '@nestjs/common'

import { FileSystemController } from './filesystem.controller'
import { FileSystemService } from './filesystem.service'

/**
 * Module for file system operations
 * Provides secure directory browsing, tree generation, and path validation
 * Exports FileSystemService for use throughout the application
 */
@Module({
  controllers: [FileSystemController],
  providers: [FileSystemService],
  exports: [FileSystemService],
})
export class FileSystemModule {}
