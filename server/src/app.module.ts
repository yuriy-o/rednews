import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CalendarModule } from './calendar/calendar.module';
import { PrismaModule } from './common/prisma/prisma.module';
import { HealthController } from './health.controller';

// There is no AuthModule/UserModule: they were an unused, insecure (unverified
// Google ID token) auth stack — see AUDIT.md §1.1. Real auth/entitlements for both
// the extension and the site run on Supabase, not this API. The former src/auth
// and src/user source has been deleted (git history has it if ever needed); the
// Prisma models it used (User/UserSettings/Subscription/Alert/ActivityLog) are
// still in schema.prisma pending a separate explicit go-ahead to drop them from
// the live database.
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

