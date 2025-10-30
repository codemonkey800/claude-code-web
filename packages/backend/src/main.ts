import { ConfigService } from '@nestjs/config'
import { NestFactory } from '@nestjs/core'

import { AppModule } from './app.module'

import 'reflect-metadata'

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule)
  const configService = app.get(ConfigService)

  // Enable CORS for all origins (public API)
  app.enableCors({
    origin: '*',
  })

  const port = configService.get<number>('PORT', 8081)
  await app.listen(port, '0.0.0.0')

  // eslint-disable-next-line no-console
  console.log(`🚀 Backend server is running on:`)
  // eslint-disable-next-line no-console
  console.log(`   - Local:   http://localhost:${port}`)
  // eslint-disable-next-line no-console
  console.log(`   - Network: http://10.0.0.69:${port}`)
  // eslint-disable-next-line no-console
  console.log(`🔗 CORS enabled for all origins`)
}

bootstrap().catch(error => {
  console.error('❌ Failed to start application:', error)
  process.exit(1)
})
