import { Controller, Get, Patch, Post, Body } from '@nestjs/common';
import { SyncService } from './sync.service';
import { CurrentUser } from '../../common/decorators/current-tenant.decorator';

@Controller('sync')
export class SyncController {
  constructor(private service: SyncService) {}

  @Get('settings')
  getSettings(@CurrentUser() user: any) {
    return this.service.getSettings(user.tenant_id);
  }

  @Patch('settings')
  updateFrequency(@CurrentUser() user: any, @Body() body: { sync_frequency_minutes: number }) {
    return this.service.updateFrequency(user.tenant_id, body.sync_frequency_minutes);
  }

  @Post('trigger')
  trigger(@CurrentUser() user: any) {
    return this.service.triggerSync(user.tenant_id);
  }

  @Get('jobs')
  getJobs(@CurrentUser() user: any) {
    return this.service.getJobs(user.tenant_id);
  }
}
