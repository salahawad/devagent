import { Controller, Get, Patch, Body } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TenantInfo } from '../../common/decorators/current-tenant.decorator';
import { Tenant } from '../../database/entities/system/tenant.entity';

@Controller('tenants')
export class TenantsController {
  constructor(@InjectRepository(Tenant) private tenantRepo: Repository<Tenant>) {}

  @Get('current')
  getCurrent(@TenantInfo() tenant: Tenant) {
    return tenant;
  }

  @Patch('current')
  async update(@TenantInfo() tenant: Tenant, @Body() body: { name?: string }) {
    if (body.name) tenant.name = body.name;
    return this.tenantRepo.save(tenant);
  }
}
