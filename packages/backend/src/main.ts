import { ConfigService } from '@nestjs/config'
import { NestFactory } from '@nestjs/core'

import { AppModule } from './app.module'

import 'reflect-metadata'

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule)
  const configService = app.get(ConfigService)

  // Enable CORS for frontend communication
  const frontendUrl = configService.get<string>('FRONTEND_URL')
  app.enableCors({
    origin: frontendUrl,
    credentials: true,
  })

  const port = configService.get<number>('PORT', 8081)
  await app.listen(port)

  // eslint-disable-next-line no-console
  console.log(`🚀 Backend server is running on: http://localhost:${port}`)
  // eslint-disable-next-line no-console
  console.log(`🔗 CORS enabled for: ${frontendUrl}`)
}

bootstrap().catch(error => {
  console.error('❌ Failed to start application:', error)
  process.exit(1)
})
