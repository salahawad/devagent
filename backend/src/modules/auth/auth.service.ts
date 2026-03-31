import { Injectable, ConflictException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { User } from '../../database/entities/system/user.entity';
import { Tenant } from '../../database/entities/system/tenant.entity';
import { TenantConnectionService } from '../../database/tenant-connection.service';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectRepository(Tenant) private tenantRepo: Repository<Tenant>,
    private jwtService: JwtService,
    private tenantConnection: TenantConnectionService,
  ) {}

  async signup(dto: { companyName: string; email: string; password: string; name?: string }) {
    // Check if email already exists
    const existing = await this.userRepo.findOne({ where: { email: dto.email } });
    if (existing) throw new ConflictException('Email already registered');

    // Create tenant
    const slug = dto.companyName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_|_$/g, '');
    const dbName = `tenant_${slug}`;

    const existingTenant = await this.tenantRepo.findOne({ where: { slug } });
    if (existingTenant) throw new ConflictException('Company name already taken');

    const tenant = this.tenantRepo.create({
      name: dto.companyName,
      slug,
      db_name: dbName,
    });
    await this.tenantRepo.save(tenant);

    // Provision tenant database
    await this.tenantConnection.createTenantDatabase(dbName);

    // Create admin user
    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = this.userRepo.create({
      tenant_id: tenant.id,
      email: dto.email,
      password_hash: passwordHash,
      name: dto.name || dto.email.split('@')[0],
      role: 'admin',
    });
    await this.userRepo.save(user);

    const token = this.jwtService.sign({
      sub: user.id,
      tenant_id: tenant.id,
      email: user.email,
      role: user.role,
    });

    return {
      token,
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
      tenant: { id: tenant.id, name: tenant.name, slug: tenant.slug },
    };
  }

  async login(dto: { email: string; password: string }) {
    const user = await this.userRepo.findOne({
      where: { email: dto.email },
      relations: ['tenant'],
    });
    if (!user) throw new UnauthorizedException('Invalid credentials');

    const valid = await bcrypt.compare(dto.password, user.password_hash);
    if (!valid) throw new UnauthorizedException('Invalid credentials');

    const token = this.jwtService.sign({
      sub: user.id,
      tenant_id: user.tenant_id,
      email: user.email,
      role: user.role,
    });

    return {
      token,
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
      tenant: { id: user.tenant.id, name: user.tenant.name, slug: user.tenant.slug },
    };
  }

  async me(userId: string) {
    const user = await this.userRepo.findOne({
      where: { id: userId },
      relations: ['tenant'],
    });
    if (!user) throw new UnauthorizedException('User not found');
    return {
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
      tenant: { id: user.tenant.id, name: user.tenant.name, slug: user.tenant.slug },
    };
  }
}
