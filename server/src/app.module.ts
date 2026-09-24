import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { CalendarModule } from './calendar/calendar.module';
import { UserModule } from './user/user.module';
import { PrismaModule } from './common/prisma/prisma.module';
import { HealthController } from './health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      // Load .env.local in development, .env in production
      envFilePath: process.env.NODE_ENV === 'production' ? '.env' : '.env.local',
      // Throw if required env vars are missing
      expandVariables: true,
    }),
    PrismaModule,
    AuthModule,
    CalendarModule,
    UserModule,
  ],
  controllers: [HealthController],
  providers: [],
})
export class AppModule {}

