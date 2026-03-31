import { Controller, Get, Patch, Post, Param, Body } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { DevelopersService } from './developers.service';
import { CurrentTenant, CurrentUser } from '../../common/decorators/current-tenant.decorator';

@Controller('developers')
export class DevelopersController {
  constructor(private service: DevelopersService) {}

  @Get()
  list(@CurrentTenant() tenantDs: DataSource) {
    return this.service.list(tenantDs);
  }

  @Get('all')
  listAll(@CurrentTenant() tenantDs: DataSource) {
    return this.service.listAll(tenantDs);
  }

  @Get('fetch')
  fetchFromSources(@CurrentUser() user: any, @CurrentTenant() tenantDs: DataSource) {
    return this.service.fetchFromSources(user.tenant_id, tenantDs);
  }

  @Patch(':id')
  update(
    @CurrentTenant() tenantDs: DataSource,
    @Param('id') id: string,
    @Body() body: { is_tracked?: boolean; role?: string; display_name?: string },
  ) {
    return this.service.update(tenantDs, id, body);
  }

  @Post('link')
  async link(
    @CurrentTenant() tenantDs: DataSource,
    @Body() body: { primary_id: string; secondary_ids: string[] },
  ) {
    const result = await this.service.link(tenantDs, body.primary_id, body.secondary_ids);
    // Auto-reassociate data after linking
    await this.service.reassociate(tenantDs);
    return result;
  }

  @Post(':id/unlink')
  async unlink(
    @CurrentTenant() tenantDs: DataSource,
    @Param('id') id: string,
  ) {
    const result = await this.service.unlink(tenantDs, id);
    await this.service.reassociate(tenantDs);
    return result;
  }

  @Post('reassociate')
  reassociate(@CurrentTenant() tenantDs: DataSource) {
    return this.service.reassociate(tenantDs);
  }
}
