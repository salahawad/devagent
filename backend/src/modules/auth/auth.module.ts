import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { User } from '../../database/entities/system/user.entity';
import { Tenant } from '../../database/entities/system/tenant.entity';
import { TenantConnectionService } from '../../database/tenant-connection.service';

@Module({
  imports: [TypeOrmModule.forFeature([User, Tenant])],
  controllers: [AuthController],
  providers: [AuthService, TenantConnectionService],
})
export class AuthModule {}
