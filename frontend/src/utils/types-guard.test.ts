import { isPageContentRecord, isTemplateConfig } from './types-guard';

describe('#isPageContentRecord', () => {
  it('should return true for valid page content record', () => {
    const content = { sectionId: 'section1', key: 'value' };

    expect(isPageContentRecord(content, 'section1')).toStrictEqual(true);
  });

  it('should return false for invalid page content record', () => {
    expect(isPageContentRecord({ sectionId: 'section1' })).toStrictEqual(false);
    expect(isPageContentRecord(123, 'section1')).toStrictEqual(false);
    expect(isPageContentRecord(null, 'section1')).toStrictEqual(false);
    expect(isPageContentRecord(undefined, 'section1')).toStrictEqual(false);
    expect(isPageContentRecord('invalid', 'section1')).toStrictEqual(false);
    expect(isPageContentRecord({})).toStrictEqual(false);
    expect(isPageContentRecord(['key', 'value'], 'section1')).toStrictEqual(
      false,
    );
  });
});

describe('#isTemplateConfig', () => {
  it('should return true for valid template config', () => {
    const config = { sections: {} };

    expect(isTemplateConfig(config)).toStrictEqual(true);
  });

  it('should return false for invalid template config', () => {
    const config = {};

    expect(isTemplateConfig(config)).toStrictEqual(false);
    expect(isTemplateConfig(123)).toStrictEqual(false);
    expect(isTemplateConfig(null)).toStrictEqual(false);
    expect(isTemplateConfig(undefined)).toStrictEqual(false);
    expect(isTemplateConfig('invalid')).toStrictEqual(false);
    expect(isTemplateConfig(['sections'])).toStrictEqual(false);
    expect(isTemplateConfig({ sections: 'invalid' })).toStrictEqual(false);
    expect(isTemplateConfig({ sections: null })).toStrictEqual(false);
    expect(isTemplateConfig({ sections: undefined })).toStrictEqual(false);
    expect(isTemplateConfig({ sections: 123 })).toStrictEqual(false);
    expect(isTemplateConfig({ sections: [] })).toStrictEqual(false);
  });
});
