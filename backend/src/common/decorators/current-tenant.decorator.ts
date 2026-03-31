import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { DataSource } from 'typeorm';

export const CurrentTenant = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): DataSource => {
    const request = ctx.switchToHttp().getRequest();
    return request.tenantConnection;
  },
);

export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);

export const TenantInfo = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.tenant;
  },
);
