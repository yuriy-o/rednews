import { Controller, Post, Body, UseGuards, Get, Req } from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  /**
   * POST /api/v1/auth/google
   * Validate Google OAuth ID token and return JWT
   */
  @Post('google')
  async googleAuth(@Body() body: { idToken: string }) {
    return this.authService.validateGoogleToken(body.idToken);
  }

  /**
   * GET /api/v1/auth/me
   * Get current authenticated user
   */
  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getCurrentUser(@Req() req: any) {
    const user = await this.authService.getUserById(req.user.sub);
    if (!user) {
      throw new Error('User not found');
    }
    return {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      plan: user.plan,
      trialEndsAt: user.subscription?.trialEndsAt,
    };
  }

  /**
   * POST /api/v1/auth/trial
   * Start 14-day free trial
   */
  @UseGuards(JwtAuthGuard)
  @Post('trial')
  async startTrial(@Req() req: any) {
    const subscription = await this.authService.startTrial(req.user.sub);
    return {
      plan: subscription.plan,
      trialEndsAt: subscription.trialEndsAt,
      currentPeriodEnd: subscription.currentPeriodEnd,
    };
  }
}
