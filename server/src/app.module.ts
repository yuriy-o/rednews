import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CalendarModule } from './calendar/calendar.module';
import { PrismaModule } from './common/prisma/prisma.module';
import { HealthController } from './health.controller';

// AuthModule and UserModule are intentionally NOT wired in: they were an unused,
// insecure (unverified Google ID token) auth stack — see AUDIT.md §1.1. Real
// auth/entitlements for both the extension and the site run on Supabase, not this
// API. The source under src/auth and src/user is disconnected here (unreachable —
// Nest never registers their controllers) pending a decision on physically
// deleting those files and their Prisma models (User/UserSettings/Subscription/
// Alert/ActivityLog); that step needs a separate explicit go-ahead.
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
    CalendarModule,
  ],
  controllers: [HealthController],
  providers: [],
})
export class AppModule {}

