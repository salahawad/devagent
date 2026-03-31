import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { IntegrationsController } from './integrations.controller';
import { IntegrationsService } from './integrations.service';
import { Integration } from '../../database/entities/system/integration.entity';
import { TenantConnectionService } from '../../database/tenant-connection.service';

@Module({
  imports: [TypeOrmModule.forFeature([Integration])],
  controllers: [IntegrationsController],
  providers: [IntegrationsService, TenantConnectionService],
  exports: [IntegrationsService],
})
export class IntegrationsModule {}
