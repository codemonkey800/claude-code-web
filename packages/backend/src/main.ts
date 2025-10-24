import { NestFactory } from '@nestjs/core'

import { AppModule } from './app.module.js'

import 'reflect-metadata'

async function bootstrap() {
  const app = await NestFactory.create(AppModule)

  // Enable CORS for frontend communication
  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
  })

  const port = process.env.PORT || 3001
  await app.listen(port)

  // eslint-disable-next-line no-console
  console.log(`🚀 Backend server is running on: http://localhost:${port}`)
}

void bootstrap()
