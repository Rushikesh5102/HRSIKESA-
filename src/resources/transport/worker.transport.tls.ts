/**
 * HṚṢĪKEŚA (हृषीकेश) — FP-04 Worker Transport TLS & Certificate Manager
 *
 * Provides pure-JS self-signed X.509 certificate generation, RSA 2048 keypair management,
 * and SHA-256 fingerprint verification for physical LAN TLS 1.3 transport.
 * Zero external OpenSSL CLI dependencies; 100% native Node.js 24 runtime support.
 */

import * as crypto from 'node:crypto';

export interface TlsKeyPair {
  readonly certPem: string;
  readonly keyPem: string;
  readonly fingerprint: string;
  readonly commonName: string;
  readonly expiresAt: string;
}

export class TlsCertificateManager {
  /**
   * Generates a self-signed development/LAN X.509 certificate and private key.
   */
  public static generateSelfSignedCertificate(commonName = 'hrisekesa-worker-transport', validDays = 365): TlsKeyPair {
    const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
      modulusLength: 2048,
    });

    const spkiDer = publicKey.export({ type: 'spki', format: 'der' });

    // SHA256withRSAEncryption OID 1.2.840.113549.1.1.11
    const sigAlg = this.asn1Seq([
      this.asn1Oid([0x2a, 0x86, 0x48, 0x86, 0xf7, 0x0d, 0x01, 0x01, 0x0b]),
      Buffer.from([0x05, 0x00]), // NULL parameters
    ]);

    // Subject/Issuer: CN=<commonName>
    const name = this.asn1Seq([
      this.asn1Set([
        this.asn1Seq([
          this.asn1Oid([0x55, 0x04, 0x03]), // id-at-commonName
          this.asn1PrintableString(commonName),
        ]),
      ]),
    ]);

    const notBeforeDate = new Date(Date.now() - 60000);
    const notAfterDate = new Date(Date.now() + validDays * 24 * 3600 * 1000);
    const validity = this.asn1Seq([
      this.asn1UtcTime(notBeforeDate),
      this.asn1UtcTime(notAfterDate),
    ]);

    const serialNumber = this.asn1Integer(Math.floor(Date.now() / 1000));

    // TBSCertificate structure
    const tbs = this.asn1Seq([
      serialNumber,
      sigAlg,
      name,
      validity,
      name,
      spkiDer,
    ]);

    // Sign TBSCertificate
    const signer = crypto.createSign('SHA256');
    signer.update(tbs);
    const signature = signer.sign(privateKey);
    const bitStringSig = Buffer.concat([
      Buffer.from([0x03]),
      this.asn1Length(signature.length + 1),
      Buffer.from([0x00]), // 0 unused bits
      signature,
    ]);

    const certDer = this.asn1Seq([tbs, sigAlg, bitStringSig]);

    const base64Cert = certDer.toString('base64');
    const certLines = base64Cert.match(/.{1,64}/g) || [base64Cert];
    const certPem = `-----BEGIN CERTIFICATE-----\n${certLines.join('\n')}\n-----END CERTIFICATE-----\n`;
    const keyPem = privateKey.export({ type: 'pkcs8', format: 'pem' }) as string;

    const fingerprint = this.computeFingerprint(certPem);

    return {
      certPem,
      keyPem,
      fingerprint,
      commonName,
      expiresAt: notAfterDate.toISOString(),
    };
  }

  /**
   * Computes a standardized SHA-256 fingerprint for a certificate.
   */
  public static computeFingerprint(certPem: string): string {
    const clean = certPem
      .replace(/-----BEGIN CERTIFICATE-----/, '')
      .replace(/-----END CERTIFICATE-----/, '')
      .replace(/\s+/g, '');
    const der = Buffer.from(clean, 'base64');
    const hash = crypto.createHash('sha256').update(der).digest('hex').toUpperCase();
    return hash.match(/.{1,2}/g)?.join(':') || hash;
  }

  // --- ASN.1 DER Encoding Helpers ---

  private static asn1Length(len: number): Buffer {
    if (len < 128) {
      return Buffer.from([len]);
    }
    const bytes: number[] = [];
    let temp = len;
    while (temp > 0) {
      bytes.unshift(temp & 0xff);
      temp >>= 8;
    }
    return Buffer.from([0x80 | bytes.length, ...bytes]);
  }

  private static asn1Seq(items: Buffer[]): Buffer {
    const body = Buffer.concat(items);
    return Buffer.concat([Buffer.from([0x30]), this.asn1Length(body.length), body]);
  }

  private static asn1Set(items: Buffer[]): Buffer {
    const body = Buffer.concat(items);
    return Buffer.concat([Buffer.from([0x31]), this.asn1Length(body.length), body]);
  }

  private static asn1Oid(oidBytes: number[]): Buffer {
    const body = Buffer.from(oidBytes);
    return Buffer.concat([Buffer.from([0x06]), this.asn1Length(body.length), body]);
  }

  private static asn1Integer(num: number): Buffer {
    const bytes: number[] = [];
    let temp = num;
    while (temp > 0) {
      bytes.unshift(temp & 0xff);
      temp >>= 8;
    }
    if (bytes.length === 0) bytes.push(0);
    // If high bit set, pad with leading zero to ensure positive
    if (bytes[0] & 0x80) bytes.unshift(0);
    const body = Buffer.from(bytes);
    return Buffer.concat([Buffer.from([0x02]), this.asn1Length(body.length), body]);
  }

  private static asn1PrintableString(str: string): Buffer {
    const body = Buffer.from(str, 'ascii');
    return Buffer.concat([Buffer.from([0x13]), this.asn1Length(body.length), body]);
  }

  private static asn1UtcTime(date: Date): Buffer {
    const pad = (n: number) => String(n).padStart(2, '0');
    const timeStr =
      String(date.getUTCFullYear()).slice(2) +
      pad(date.getUTCMonth() + 1) +
      pad(date.getUTCDate()) +
      pad(date.getUTCHours()) +
      pad(date.getUTCMinutes()) +
      pad(date.getUTCSeconds()) +
      'Z';
    const body = Buffer.from(timeStr, 'ascii');
    return Buffer.concat([Buffer.from([0x17]), this.asn1Length(body.length), body]);
  }
}
