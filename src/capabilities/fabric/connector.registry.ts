/**
 * HṚṢĪKEŚA (हृषीकेश) — Connector Registry
 *
 * FP-07: Registry for connectors spanning CLI, Browser, Software, MCP,
 * Local Tools, and REST APIs.
 */

import { ILogger } from '../../core/logging/logger.types.js';
import { UniversalCapability, CapabilityProtocol } from './capability.types.js';
import { IConnector } from './connector.interface.js';

export class ConnectorRegistry {
  private readonly connectors = new Map<string, IConnector>();
  private readonly logger?: ILogger;

  constructor(logger?: ILogger) {
    this.logger = logger?.child('ConnectorRegistry');
  }

  /**
   * Register a connector.
   */
  public register(connector: IConnector): void {
    this.connectors.set(connector.name, connector);
    this.logger?.info(`Registered connector '${connector.name}' for protocol '${connector.protocol}'`);
  }

  /**
   * Find a connector that can handle the given capability.
   */
  public findConnector(capability: UniversalCapability): IConnector | undefined {
    // 1. First search by canHandle
    for (const connector of this.connectors.values()) {
      if (connector.canHandle(capability)) {
        return connector;
      }
    }

    // 2. Fallback search by exact protocol match
    for (const connector of this.connectors.values()) {
      if (connector.protocol === capability.protocol) {
        return connector;
      }
    }

    return undefined;
  }

  /**
   * Get all registered connectors.
   */
  public getAll(): IConnector[] {
    return Array.from(this.connectors.values());
  }

  /**
   * Check if a connector exists for a protocol.
   */
  public hasProtocol(protocol: CapabilityProtocol): boolean {
    for (const connector of this.connectors.values()) {
      if (connector.protocol === protocol) return true;
    }
    return false;
  }
}
