/**
 * HṚṢĪKEŚA (हृषीकेश) — Provider Adapter Registry
 *
 * FP-12: Central registry for provider adapters.
 */

import { ILogger } from '../../core/logging/logger.types.js';
import { ServiceProvider } from '../types/account.types.js';
import { IProviderAdapter } from './provider.adapter.interface.js';

export class ProviderAdapterRegistry {
  private readonly adapters = new Map<string, IProviderAdapter>();

  constructor(private readonly logger: ILogger) {}

  public registerAdapter(adapter: IProviderAdapter): void {
    if (this.adapters.has(adapter.providerId)) {
      this.logger.warn(`ProviderAdapterRegistry: Overwriting adapter for provider "${adapter.providerId}"`);
    }
    this.adapters.set(adapter.providerId, adapter);
    this.logger.debug(`ProviderAdapterRegistry: Registered adapter for "${adapter.providerId}"`);
  }

  public getAdapter(providerId: string): IProviderAdapter | undefined {
    return this.adapters.get(providerId);
  }

  public hasAdapter(providerId: string): boolean {
    return this.adapters.has(providerId);
  }

  public listAdapters(): IProviderAdapter[] {
    return Array.from(this.adapters.values());
  }

  public listProviderDefinitions(): ServiceProvider[] {
    return Array.from(this.adapters.values()).map(a => a.providerDefinition);
  }

  public getProviderDefinition(providerId: string): ServiceProvider | undefined {
    const adapter = this.adapters.get(providerId);
    return adapter?.providerDefinition;
  }
}
