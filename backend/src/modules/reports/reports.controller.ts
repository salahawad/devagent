import { Controller, Get } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { ReportsService } from './reports.service';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';

@Controller('reports')
export class ReportsController {
  constructor(private service: ReportsService) {}

  @Get('overview')
  overview(@CurrentTenant() ds: DataSource) { return this.service.overview(ds); }

  @Get('health')
  health(@CurrentTenant() ds: DataSource) { return this.service.health(ds); }

  @Get('developers')
  developers(@CurrentTenant() ds: DataSource) { return this.service.developers(ds); }

  @Get('quality')
  quality(@CurrentTenant() ds: DataSource) { return this.service.quality(ds); }

  @Get('jira')
  jira(@CurrentTenant() ds: DataSource) { return this.service.jira(ds); }

  @Get('velocity')
  velocity(@CurrentTenant() ds: DataSource) { return this.service.velocity(ds); }

  @Get('cycle-time')
  cycleTime(@CurrentTenant() ds: DataSource) { return this.service.cycleTime(ds); }

  @Get('blockers')
  blockers(@CurrentTenant() ds: DataSource) { return this.service.blockers(ds); }

  @Get('patterns')
  patterns(@CurrentTenant() ds: DataSource) { return this.service.patterns(ds); }

  @Get('traceability')
  traceability(@CurrentTenant() ds: DataSource) { return this.service.traceability(ds); }

  @Get('cicd')
  cicd(@CurrentTenant() ds: DataSource) { return this.service.cicd(ds); }

  @Get('bus-factor')
  busFactor(@CurrentTenant() ds: DataSource) { return this.service.busFactor(ds); }

  @Get('mr-health')
  mrHealth(@CurrentTenant() ds: DataSource) { return this.service.mrHealth(ds); }

  @Get('recommendations')
  recommendations(@CurrentTenant() ds: DataSource) { return this.service.recommendations(ds); }
}
