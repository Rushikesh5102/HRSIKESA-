/**
 * HṚṢĪKEŚA (हृषीकेश) — FP-06 LAN Network Helper & Interface Discovery
 *
 * Provides real host network interface discovery, primary LAN IPv4 resolution,
 * network quality tiering, and endpoint formatting for physical multi-worker fabric.
 */

import * as os from 'node:os';
import { NetworkTier } from './worker.transport.types.js';

export class LanNetworkHelper {
  /**
   * Retrieves all non-internal IPv4 addresses available on host network interfaces.
   */
  public static getLanIpv4Addresses(): string[] {
    const interfaces = os.networkInterfaces();
    const addresses: string[] = [];

    for (const name of Object.keys(interfaces)) {
      const ifaceList = interfaces[name];
      if (!ifaceList) continue;

      for (const iface of ifaceList) {
        if (iface.family === 'IPv4' && !iface.internal) {
          addresses.push(iface.address);
        }
      }
    }

    return addresses;
  }

  /**
   * Resolves the primary LAN IPv4 address for Machine A.
   * Prioritizes common private address blocks (192.168.x.x, 10.x.x.x, 172.16-31.x.x).
   * Falls back to '127.0.0.1' if disconnected from local network.
   */
  public static getPrimaryLanIpv4(): string {
    const addrs = this.getLanIpv4Addresses();
    if (addrs.length === 0) return '127.0.0.1';

    // 1. Prioritize 192.168.x.x (Standard home/office LAN)
    const homeLan = addrs.find((a) => a.startsWith('192.168.'));
    if (homeLan) return homeLan;

    // 2. Prioritize 10.x.x.x (Enterprise LAN)
    const entLan = addrs.find((a) => a.startsWith('10.'));
    if (entLan) return entLan;

    // 3. Prioritize 172.16-31.x.x
    const classB = addrs.find((a) => /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(a));
    if (classB) return classB;

    return addrs[0];
  }

  /**
   * Classifies network RTT latency into standard quality tiers.
   */
  public static determineNetworkTier(rttMs: number): NetworkTier {
    if (rttMs <= 2) return 'LOCAL';
    if (rttMs < 15) return 'EXCELLENT';
    if (rttMs < 45) return 'GOOD';
    if (rttMs < 120) return 'DEGRADED';
    return 'POOR';
  }

  /**
   * Formats a clean connection endpoint string (e.g. "192.168.1.14:4300").
   */
  public static formatLanEndpoint(host: string, port: number): string {
    const cleanHost = host === '0.0.0.0' ? this.getPrimaryLanIpv4() : host;
    return `${cleanHost}:${port}`;
  }

  /**
   * Validates whether an address belongs to private LAN or local loopback.
   */
  public static isLanOrLoopback(ip: string): boolean {
    if (!ip) return false;
    if (ip === '127.0.0.1' || ip === '::1' || ip === 'localhost') return true;
    if (ip.startsWith('192.168.') || ip.startsWith('10.')) return true;
    if (/^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(ip)) return true;
    return false;
  }
}
