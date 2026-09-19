import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../common/prisma/prisma.service';

export interface JwtPayload {
  sub: string;
  email: string;
  iat: number;
  exp: number;
}

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async validateGoogleToken(idToken: string) {
    try {
      // Verify Google ID token
      // In production: use google-auth-library
      const decoded = this.jwtService.decode(idToken) as any;

      if (!decoded?.email) {
        throw new Error('Invalid token');
      }

      // Find or create user
      let user = await this.prisma.user.findUnique({
        where: { email: decoded.email },
      });

      if (!user) {
        user = await this.prisma.user.create({
          data: {
            email: decoded.email,
            googleId: decoded.sub,
            displayName: decoded.name,
            avatar: decoded.picture,
            lastLoginAt: new Date(),
            settings: {
              create: {},
            },
          },
          include: { settings: true },
        });
      } else {
        // Update last login
        user = await this.prisma.user.update({
          where: { id: user.id },
          data: { lastLoginAt: new Date() },
          include: { settings: true },
        });
      }

      // Generate JWT
      const token = this.jwtService.sign({
        sub: user.id,
        email: user.email,
      });

      return {
        accessToken: token,
        user: {
          id: user.id,
          email: user.email,
          displayName: user.displayName,
          plan: user.plan,
        },
      };
    } catch (error) {
      throw new Error('Google token validation failed');
    }
  }

  async validateJwt(token: string): Promise<JwtPayload> {
    try {
      return this.jwtService.verify(token) as JwtPayload;
    } catch (error) {
      throw new Error('Invalid JWT token');
    }
  }

  async getUserById(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      include: { settings: true, subscription: true },
    });
  }

  async startTrial(userId: string) {
    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + 14); // 14-day trial

    return this.prisma.subscription.upsert({
      where: { userId },
      create: {
        userId,
        plan: 'PREMIUM',
        trialEndsAt,
        currentPeriodEnd: trialEndsAt,
      },
      update: {
        trialEndsAt,
        plan: 'PREMIUM',
      },
    });
  }
}
