import { Injectable, NestMiddleware, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Request, Response, NextFunction } from 'express';
import { Tenant } from '../../database/entities/system/tenant.entity';
import { TenantConnectionService } from '../../database/tenant-connection.service';

@Injectable()
export class TenantMiddleware implements NestMiddleware {
  constructor(
    private jwtService: JwtService,
    @InjectRepository(Tenant) private tenantRepo: Repository<Tenant>,
    private tenantConnectionService: TenantConnectionService,
  ) {}

  async use(req: Request, res: Response, next: NextFunction) {
    // Skip auth routes — they don't need tenant context
    if (req.originalUrl.startsWith('/api/auth')) {
      return next();
    }

    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing token');
    }

    try {
      const token = authHeader.split(' ')[1];
      const payload = this.jwtService.verify(token);
      const tenant = await this.tenantRepo.findOne({ where: { id: payload.tenant_id } });
      if (!tenant) throw new UnauthorizedException('Tenant not found');

      const tenantDs = await this.tenantConnectionService.getConnection(tenant.db_name);

      (req as any).user = payload;
      (req as any).tenant = tenant;
      (req as any).tenantConnection = tenantDs;
      next();
    } catch (err) {
      throw new UnauthorizedException('Invalid token');
    }
  }
}
