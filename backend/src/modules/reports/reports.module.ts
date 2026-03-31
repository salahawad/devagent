import { Module } from '@nestjs/common';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import { TenantConnectionService } from '../../database/tenant-connection.service';

@Module({
  controllers: [ReportsController],
  providers: [ReportsService, TenantConnectionService],
})
export class ReportsModule {}
