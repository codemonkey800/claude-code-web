import { plainToClass } from 'class-transformer'
import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsUrl,
  Min,
  validateSync,
} from 'class-validator'

export const DEFAULT_MAX_EVENT_LISTENERS = 100

enum Environment {
  Development = 'development',
  Production = 'production',
  Test = 'test',
}

enum LogLevel {
  Log = 'log',
  Error = 'error',
  Warn = 'warn',
  Debug = 'debug',
  Verbose = 'verbose',
}

export class EnvironmentVariables {
  @IsEnum(Environment)
  NODE_ENV: Environment = Environment.Development

  @IsNumber()
  PORT: number = 8081

  @IsUrl({ require_tld: false })
  FRONTEND_URL: string = 'http://localhost:8080'

  @IsOptional()
  @IsEnum(LogLevel)
  LOG_LEVEL?: LogLevel

  @IsOptional()
  @IsNumber()
  @Min(1)
  MAX_EVENT_LISTENERS?: number = DEFAULT_MAX_EVENT_LISTENERS
}

export function validate(config: Record<string, unknown>) {
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
