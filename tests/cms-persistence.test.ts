import assert from 'node:assert/strict';
import test from 'node:test';
import { defaultLandingConfig } from '../src/data/defaultConfig';
import { normalizeLandingConfig } from '../src/utils/configDefaults';

test('an explicitly empty category navigation stays empty after repeated reload normalization', () => {
  const saved = normalizeLandingConfig({
    ...defaultLandingConfig,
    websiteSettings: {
      ...defaultLandingConfig.websiteSettings!,
      navigation: { ...defaultLandingConfig.websiteSettings!.navigation!, items: [] },
    },
  });
  assert.deepEqual(saved.websiteSettings?.navigation?.items, []);
  assert.deepEqual(normalizeLandingConfig(JSON.parse(JSON.stringify(saved))).websiteSettings?.navigation?.items, []);
});

test('saved content, hero CTA, and section settings survive serialization and normalization', () => {
  const original = normalizeLandingConfig({
    ...defaultLandingConfig,
    heroCtaPrimary: 'Nhận Báo Phí Miễn Phí',
    sections: [{
      ...defaultLandingConfig.sections[0],
      title: 'Bài viết đã chỉnh',
      enabled: true,
      design: { ...defaultLandingConfig.sections[0].design, backgroundColor: '#123456' },
    }],
  });
  const restored = normalizeLandingConfig(JSON.parse(JSON.stringify(original)));
  assert.equal(restored.heroCtaPrimary, 'Nhận Báo Phí Miễn Phí');
  assert.equal(restored.sections[0].title, 'Bài viết đã chỉnh');
  assert.equal(restored.sections[0].design?.backgroundColor, '#123456');
});
