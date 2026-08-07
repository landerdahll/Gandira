import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const root = new URL('../', import.meta.url);
const read = path => readFile(new URL(path, root), 'utf8');
const [context, api, navbar, producerLayout, staffLayout, organizationLayout, members, adminOrganizations] = await Promise.all([
  read('src/lib/organization-context.tsx'), read('src/lib/api.ts'), read('src/components/layout/navbar.tsx'),
  read('src/app/producer/layout.tsx'), read('src/app/(staff)/layout.tsx'), read('src/app/organization/layout.tsx'),
  read('src/app/organization/members/page.tsx'), read('src/app/admin/organizations/page.tsx'),
]);

test('explicit organization selection is persisted and sent to scoped APIs', () => {
  assert.match(context, /pago-active-organization-id/);
  assert.match(context, /selectOrganization/);
  assert.match(api, /X-Organization-Id/);
  assert.match(organizationLayout, /Selecione uma organização/);
  assert.match(organizationLayout, /selectOrganization/);
});

test('administrative menus and layouts derive access from organization memberships', () => {
  assert.match(navbar, /canManageEvents/);
  assert.match(navbar, /canCheckIn/);
  assert.doesNotMatch(navbar, /\{isProducer &&/);
  assert.doesNotMatch(navbar, /\{isStaff &&/);
  assert.match(producerLayout, /canManageEvents/);
  assert.match(staffLayout, /canCheckIn/);
});

test('team and super-admin organization interfaces use friendly labels and explicit actions', () => {
  assert.match(members, /PRODUCER">Produtor/);
  assert.match(members, /STAFF">Staff/);
  assert.match(members, /Convidar membro/);
  assert.match(adminOrganizations, /Nova organização/);
  assert.match(adminOrganizations, /Desativar/);
});
