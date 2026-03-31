import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Integration } from '../../database/entities/system/integration.entity';
import { IntegrationFactory } from '../../integrations/integration.factory';
import { encrypt, decrypt } from '../../common/encryption';

@Injectable()
export class IntegrationsService {
  constructor(
    @InjectRepository(Integration) private repo: Repository<Integration>,
  ) {}

  async list(tenantId: string) {
    const integrations = await this.repo.find({ where: { tenant_id: tenantId } });
    // Mask tokens in response
    return integrations.map(i => ({
      ...i,
      config: { ...i.config, token: '***' },
    }));
  }

  async create(tenantId: string, dto: {
    provider: string;
    type: string;
    base_url: string;
    token: string;
    email?: string;
    group_id?: string;
    project_key?: string;
    workspace_id?: string;
  }) {
    const integration = this.repo.create({
      tenant_id: tenantId,
      provider: dto.provider,
      type: dto.type,
      config: {
        base_url: dto.base_url,
        token: encrypt(dto.token),
        email: dto.email,
        group_id: dto.group_id,
        project_key: dto.project_key,
        workspace_id: dto.workspace_id,
      },
    });
    return this.repo.save(integration);
  }

  async testConnection(id: string, tenantId: string) {
    const integration = await this.repo.findOne({ where: { id, tenant_id: tenantId } });
    if (!integration) throw new NotFoundException();

    const config: any = {
      ...integration.config,
      token: decrypt(integration.config.token),
    };

    let success = false;
    let detectedFields: any = null;

    if (integration.type === 'git') {
      const adapter = IntegrationFactory.getGitAdapter(integration.provider);
      success = await adapter.testConnection(config);
    } else {
      const adapter = IntegrationFactory.getPmAdapter(integration.provider);
      success = await adapter.testConnection(config);

      // Auto-detect field mapping (e.g. story points, sprint field IDs)
      if (success && adapter.detectFields) {
        try {
          detectedFields = await adapter.detectFields(config);
          integration.config = {
            ...integration.config,
            field_mapping: detectedFields,
          };
        } catch {
          // Detection failed — use defaults
        }
      }
    }

    integration.status = success ? 'connected' : 'error';
    await this.repo.save(integration);

    return { success, status: integration.status, detected_fields: detectedFields };
  }

  async delete(id: string, tenantId: string) {
    const result = await this.repo.delete({ id, tenant_id: tenantId });
    if (result.affected === 0) throw new NotFoundException();
    return { deleted: true };
  }

  async getDecryptedConfig(id: string) {
    const integration = await this.repo.findOne({ where: { id } });
    if (!integration) throw new NotFoundException();
    return {
      ...integration,
      config: {
        ...integration.config,
        token: decrypt(integration.config.token),
      },
    };
  }

  async getByTenant(tenantId: string) {
    return this.repo.find({ where: { tenant_id: tenantId } });
  }

  async updateLastSync(id: string) {
    await this.repo.update(id, { last_sync_at: new Date() });
  }
}
