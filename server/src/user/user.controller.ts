import { Controller, Get, Post, Patch, Body, UseGuards, Req } from '@nestjs/common';
import { UserService } from './user.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('user')
@UseGuards(JwtAuthGuard)
export class UserController {
  constructor(private userService: UserService) {}

  /**
   * GET /api/v1/user/settings
   * Get user settings
   */
  @Get('settings')
  async getSettings(@Req() req: any) {
    return this.userService.getSettings(req.user.sub);
  }

  /**
   * PATCH /api/v1/user/settings
   * Update user settings
   */
  @Patch('settings')
  async updateSettings(@Req() req: any, @Body() settings: any) {
    return this.userService.updateSettings(req.user.sub, settings);
  }

  /**
   * GET /api/v1/user/telegram
   * Get Telegram connection status
   */
  @Get('telegram')
  async getTelegramStatus(@Req() req: any) {
    return this.userService.getTelegramStatus(req.user.sub);
  }

  /**
   * POST /api/v1/user/telegram
   * Connect Telegram
   */
  @Post('telegram')
  async connectTelegram(
    @Req() req: any,
    @Body() body: { telegramId: number; username: string },
  ) {
    return this.userService.setTelegramConnection(
      req.user.sub,
      body.telegramId,
      body.username,
    );
  }
}
