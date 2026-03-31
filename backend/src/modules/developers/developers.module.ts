import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DevelopersController } from './developers.controller';
import { DevelopersService } from './developers.service';
import { Integration } from '../../database/entities/system/integration.entity';
import { TenantConnectionService } from '../../database/tenant-connection.service';

@Module({
  imports: [TypeOrmModule.forFeature([Integration])],
  controllers: [DevelopersController],
  providers: [DevelopersService, TenantConnectionService],
})
export class DevelopersModule {}
