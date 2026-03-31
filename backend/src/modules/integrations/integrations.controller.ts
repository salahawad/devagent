import { Controller, Get, Post, Delete, Body, Param } from '@nestjs/common';
import { IntegrationsService } from './integrations.service';
import { CurrentUser } from '../../common/decorators/current-tenant.decorator';

@Controller('integrations')
export class IntegrationsController {
  constructor(private service: IntegrationsService) {}

  @Get()
  list(@CurrentUser() user: any) {
    return this.service.list(user.tenant_id);
  }

  @Post()
  create(@CurrentUser() user: any, @Body() body: {
    provider: string;
    type: string;
    base_url: string;
    token: string;
    email?: string;
    group_id?: string;
    project_key?: string;
    workspace_id?: string;
  }) {
    return this.service.create(user.tenant_id, body);
  }

  @Post(':id/test')
  test(@Param('id') id: string, @CurrentUser() user: any) {
    return this.service.testConnection(id, user.tenant_id);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: any) {
    return this.service.delete(id, user.tenant_id);
  }
}
