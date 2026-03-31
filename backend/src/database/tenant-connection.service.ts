import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Developer } from './entities/tenant/developer.entity';
import { Repository } from './entities/tenant/repository.entity';
import { Commit } from './entities/tenant/commit.entity';
import { MergeRequest } from './entities/tenant/merge-request.entity';
import { Pipeline } from './entities/tenant/pipeline.entity';
import { Issue } from './entities/tenant/issue.entity';
import { IssueTransition } from './entities/tenant/issue-transition.entity';
import { Sprint } from './entities/tenant/sprint.entity';
import { MetricSnapshot } from './entities/tenant/metric-snapshot.entity';
import { BusFactor } from './entities/tenant/bus-factor.entity';
import { HealthIndicator } from './entities/tenant/health-indicator.entity';

const TENANT_ENTITIES = [
  Developer, Repository, Commit, MergeRequest, Pipeline,
  Issue, IssueTransition, Sprint, MetricSnapshot, BusFactor, HealthIndicator,
];

@Injectable()
export class TenantConnectionService implements OnModuleDestroy {
  private connections = new Map<string, DataSource>();

  async getConnection(dbName: string): Promise<DataSource> {
    if (this.connections.has(dbName)) {
      const ds = this.connections.get(dbName)!;
      if (ds.isInitialized) return ds;
    }

    const ds = new DataSource({
      type: 'postgres',
      host: process.env.POSTGRES_HOST || 'localhost',
      port: parseInt(process.env.POSTGRES_PORT || '5432'),
      username: process.env.POSTGRES_USER || 'devagent',
      password: process.env.POSTGRES_PASSWORD,
      database: dbName,
      entities: TENANT_ENTITIES,
      synchronize: true, // auto-create tables for tenant DBs
    });

    await ds.initialize();
    this.connections.set(dbName, ds);
    return ds;
  }

  async createTenantDatabase(dbName: string): Promise<void> {
    const adminDs = new DataSource({
      type: 'postgres',
      host: process.env.POSTGRES_HOST || 'localhost',
      port: parseInt(process.env.POSTGRES_PORT || '5432'),
      username: process.env.POSTGRES_USER || 'devagent',
      password: process.env.POSTGRES_PASSWORD,
      database: 'postgres',
    });

    await adminDs.initialize();
    // Check if DB already exists
    const result = await adminDs.query(
      `SELECT 1 FROM pg_database WHERE datname = $1`, [dbName],
    );
    if (result.length === 0) {
      await adminDs.query(`CREATE DATABASE "${dbName}"`);
    }
    await adminDs.destroy();

    // Initialize the tenant connection (creates tables via synchronize)
    await this.getConnection(dbName);
  }

  async onModuleDestroy() {
    for (const [, ds] of this.connections) {
      if (ds.isInitialized) await ds.destroy();
    }
  }
}
