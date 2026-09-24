import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { IdentityManager } from '../src/core/identity/identity.manager.js';

describe('Identity Subsystem', () => {
  test('should load official system identity with Sanskrit and international naming', () => {
    const identityManager = new IdentityManager();
    const system = identityManager.getSystemIdentity();

    assert.equal(system.name, 'HṚṢĪKEŚA');
    assert.equal(system.sanskrit, 'हृषीकेश');
    assert.equal(system.internationalSpelling, 'HRISHIKESHA');
    assert.equal(system.asciiAlias, 'HRISEKESA');
    assert.equal(system.version, '0.2.0');
  });

  test('should bind sole creator and root authority to Rushikesh Pattiwar', () => {
    const identityManager = new IdentityManager();
    const owner = identityManager.getOwnerIdentity();

    assert.equal(owner.fullName, 'Rushikesh Pattiwar');
    assert.equal(owner.subjectId, 'ROOT_RUSHIKESH');
    assert.ok(owner.authorizedPermissions.includes('*'));

    assert.equal(identityManager.isOwner('ROOT_RUSHIKESH'), true);
    assert.equal(identityManager.isOwner('SOMEONE_ELSE'), false);
  });

  test('should provide an authority context with initialization timestamp', () => {
    const identityManager = new IdentityManager();
    const context = identityManager.getAuthorityContext();

    assert.equal(context.isAuthorized, true);
    assert.ok(context.activeSince.length > 0);
    assert.equal(context.owner.fullName, 'Rushikesh Pattiwar');
  });

  test('should format visual banner cleanly', () => {
    const identityManager = new IdentityManager();
    const banner = identityManager.getFormattedBanner();

    assert.ok(banner.includes('HṚṢĪKEŚA'));
    assert.ok(banner.includes('हृषीकेश'));
    assert.ok(banner.includes('Rushikesh Pattiwar'));
  });
});
