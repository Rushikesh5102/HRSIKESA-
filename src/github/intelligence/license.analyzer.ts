/**
 * HṚṢĪKEŚA (हृषीकेश) — License Analyzer & Compatibility Engine
 *
 * Evaluates open-source software licenses for compatibility with HṚṢĪKEŚA integration,
 * flags viral copyleft restrictions, enforces attribution preservation, and flags for review.
 * NOTE: This tool performs technical and heuristic checks and does NOT constitute legal advice.
 */

import type { LicenseCompatibility, LicenseDetails } from '../types/github.types.js';

export class LicenseAnalyzer {
  /**
   * Detects and classifies a license from SPDX identifier or license text snippet.
   */
  public static analyzeLicense(spdxOrName?: string, rawText?: string): LicenseDetails {
    const raw = (spdxOrName || '').trim();
    const upper = raw.toUpperCase();

    // 1. Permissive Licenses
    if (upper === 'MIT' || upper.includes('MIT LICENSE')) {
      return {
        spdx: 'MIT',
        name: 'MIT License',
        compatibility: 'COMPATIBLE',
        commercialUse: true,
        modificationAllowed: true,
        distributionAllowed: true,
        copyleft: false,
        attributionRequired: true,
        notes: 'Highly permissive; requires license and copyright notice preservation.',
      };
    }

    if (upper === 'APACHE-2.0' || upper.includes('APACHE 2.0') || upper.includes('APACHE LICENSE 2.0')) {
      return {
        spdx: 'Apache-2.0',
        name: 'Apache License 2.0',
        compatibility: 'COMPATIBLE',
        commercialUse: true,
        modificationAllowed: true,
        distributionAllowed: true,
        copyleft: false,
        attributionRequired: true,
        notes: 'Permissive with explicit patent grant; requires NOTICE and attribution preservation.',
      };
    }

    if (upper === 'BSD-3-CLAUSE' || upper.includes('BSD 3-CLAUSE') || upper === 'BSD-2-CLAUSE') {
      const spdx = upper.includes('2') ? 'BSD-2-Clause' : 'BSD-3-Clause';
      return {
        spdx,
        name: `${spdx} License`,
        compatibility: 'COMPATIBLE',
        commercialUse: true,
        modificationAllowed: true,
        distributionAllowed: true,
        copyleft: false,
        attributionRequired: true,
        notes: 'Permissive; prohibits using author names for endorsement without permission.',
      };
    }

    if (upper === 'ISC') {
      return {
        spdx: 'ISC',
        name: 'ISC License',
        compatibility: 'COMPATIBLE',
        commercialUse: true,
        modificationAllowed: true,
        distributionAllowed: true,
        copyleft: false,
        attributionRequired: true,
        notes: 'Functionally equivalent to 2-Clause BSD / MIT.',
      };
    }

    if (upper === 'UNLICENSE' || upper.includes('PUBLIC DOMAIN')) {
      return {
        spdx: 'Unlicense',
        name: 'The Unlicense',
        compatibility: 'COMPATIBLE',
        commercialUse: true,
        modificationAllowed: true,
        distributionAllowed: true,
        copyleft: false,
        attributionRequired: false,
        notes: 'Public domain dedication; fully permissive.',
      };
    }

    // 2. Weak Copyleft Licenses
    if (upper.includes('LGPL') || upper.includes('MPL') || upper === 'MPL-2.0') {
      const spdx = upper.includes('MPL') ? 'MPL-2.0' : 'LGPL-3.0';
      return {
        spdx,
        name: spdx,
        compatibility: 'CONDITIONALLY_COMPATIBLE',
        commercialUse: true,
        modificationAllowed: true,
        distributionAllowed: true,
        copyleft: true,
        attributionRequired: true,
        notes: 'Weak copyleft: Modifications to library files must remain open; dynamic linking acceptable.',
      };
    }

    // 3. Strong Copyleft Licenses
    if (upper.includes('AGPL') || upper === 'AGPL-3.0') {
      return {
        spdx: 'AGPL-3.0',
        name: 'GNU Affero General Public License v3.0',
        compatibility: 'INCOMPATIBLE',
        commercialUse: true,
        modificationAllowed: true,
        distributionAllowed: true,
        copyleft: true,
        attributionRequired: true,
        notes: 'Strong network copyleft: Remote interaction triggers mandatory source code distribution.',
      };
    }

    if (upper.includes('GPL') || upper === 'GPL-3.0' || upper === 'GPL-2.0') {
      const spdx = upper.includes('2') ? 'GPL-2.0' : 'GPL-3.0';
      return {
        spdx,
        name: `GNU General Public License ${spdx.replace('GPL-', 'v')}`,
        compatibility: 'INCOMPATIBLE',
        commercialUse: true,
        modificationAllowed: true,
        distributionAllowed: true,
        copyleft: true,
        attributionRequired: true,
        requiresLegalReview: true,
        notes: 'Strong copyleft: Direct code incorporation requires derivative works to be released under GPL.',
      };
    }

    // 4. Creative Commons Non-Commercial / Restrictive
    if (upper.includes('CC-BY-NC') || upper.includes('NON-COMMERCIAL')) {
      return {
        spdx: 'CC-BY-NC',
        name: 'Creative Commons Non-Commercial',
        compatibility: 'INCOMPATIBLE',
        commercialUse: false,
        modificationAllowed: true,
        distributionAllowed: true,
        copyleft: false,
        attributionRequired: true,
        requiresLegalReview: true,
        notes: 'Prohibits commercial utilization.',
      };
    }

    // 5. Raw Text Inspection Fallback
    if (rawText) {
      const textUpper = rawText.toUpperCase();
      if (textUpper.includes('PERMISSION IS HEREBY GRANTED, FREE OF CHARGE') && textUpper.includes('MIT')) {
        return LicenseAnalyzer.analyzeLicense('MIT');
      }
      if (textUpper.includes('APACHE LICENSE') && textUpper.includes('VERSION 2.0')) {
        return LicenseAnalyzer.analyzeLicense('Apache-2.0');
      }
    }

    // 6. Unknown / Unspecified
    return {
      spdx: 'UNKNOWN',
      name: raw || 'Unknown License',
      compatibility: 'UNKNOWN',
      commercialUse: false,
      modificationAllowed: false,
      distributionAllowed: false,
      copyleft: false,
      attributionRequired: true,
      requiresLegalReview: true,
      notes: 'License could not be deterministically determined. Treat as proprietary/unlicensed until reviewed.',
    };
  }

  public static evaluateCompatibility(spdx: string, context?: string): LicenseCompatibility {
    if (context === 'DYNAMIC_CONNECTOR' && spdx.includes('LGPL')) {
      return 'CONDITIONALLY_COMPATIBLE';
    }
    if (context === 'LIBRARY' && spdx.includes('GPL') && !spdx.includes('LGPL')) {
      return 'INCOMPATIBLE';
    }
    const details = LicenseAnalyzer.analyzeLicense(spdx);
    return details.compatibility;
  }
}
