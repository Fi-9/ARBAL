import { Controller, Get } from '@nestjs/common';

@Controller('version')
export class VersionController {
  @Get()
  getVersion() {
    const isProduction = process.env.NODE_ENV === 'production';
    if (isProduction) {
      return {
        status: 'OK',
        version: process.env.APP_VERSION || '1.0.0',
      };
    }
    return {
      status: 'OK',
      version: process.env.APP_VERSION || '1.0.0',
      build: process.env.APP_BUILD || 'development',
    };
  }
}
