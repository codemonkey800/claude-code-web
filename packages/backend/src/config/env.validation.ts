import { plainToClass, Transform, Type } from 'class-transformer'
import {
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  Min,
  validateSync,
} from 'class-validator'

export const DEFAULT_MAX_EVENT_LISTENERS = 100
export const DEFAULT_FS_ALLOWED_BASE_DIR = '~'
export const DEFAULT_FS_DEFAULT_PAGE_SIZE = 100
export const DEFAULT_FS_MAX_PAGE_SIZE = 500
export const DEFAULT_FS_SHOW_HIDDEN_FILES = false
export const DEFAULT_CLAUDE_SUBPROCESS_KILL_TIMEOUT = 5000
export const DEFAULT_CLAUDE_QUERY_TIMEOUT = 300000 // 5 minutes

enum Environment {
  Development = 'development',
  Production = 'production',
  Test = 'test',
}

export class EnvironmentVariables {
  @IsEnum(Environment)
  NODE_ENV: Environment = Environment.Development

  @IsNumber()
  PORT: number = 8081

  @IsUrl({ require_tld: false })
  FRONTEND_URL: string = 'http://localhost:8080'

  @IsOptional()
  @IsNumber()
  @Min(1)
  MAX_EVENT_LISTENERS?: number = DEFAULT_MAX_EVENT_LISTENERS

  @IsOptional()
  @IsString()
  FS_ALLOWED_BASE_DIR?: string = DEFAULT_FS_ALLOWED_BASE_DIR

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(500)
  FS_DEFAULT_PAGE_SIZE?: number = DEFAULT_FS_DEFAULT_PAGE_SIZE

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(1000)
  FS_MAX_PAGE_SIZE?: number = DEFAULT_FS_MAX_PAGE_SIZE

  @IsOptional()
  @Transform(({ value }) => value === 'true')
  @IsBoolean()
  FS_SHOW_HIDDEN_FILES?: boolean = DEFAULT_FS_SHOW_HIDDEN_FILES

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1000)
  @Max(30000)
  CLAUDE_SUBPROCESS_KILL_TIMEOUT?: number =
    DEFAULT_CLAUDE_SUBPROCESS_KILL_TIMEOUT

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(30000)
  @Max(600000)
  CLAUDE_QUERY_TIMEOUT?: number = DEFAULT_CLAUDE_QUERY_TIMEOUT
}

export function validate(
  config: Record<string, unknown>,
): EnvironmentVariables {
  const validatedConfig = plainToClass(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  })

  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  })

  if (errors.length > 0) {
    throw new Error(errors.toString())
  }

  return validatedConfig
}
