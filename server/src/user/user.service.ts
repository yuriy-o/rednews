import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

@Injectable()
export class UserService {
  constructor(private prisma: PrismaService) {}

  async updateSettings(userId: string, settings: any) {
    return this.prisma.userSettings.update({
      where: { userId },
      data: settings,
    });
  }

  async getSettings(userId: string) {
    return this.prisma.userSettings.findUnique({
      where: { userId },
    });
  }

  async getTelegramStatus(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    return {
      connected: user?.telegramConnected || false,
      username: user?.telegramUsername,
    };
  }

  async setTelegramConnection(userId: string, telegramId: number, username: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        telegramId,
        telegramUsername: username,
        telegramConnected: true,
      },
    });
  }
}
