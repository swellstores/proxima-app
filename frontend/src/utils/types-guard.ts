import type { ThemePageTemplateConfig } from '@swell/apps-sdk';

export function isPageContentRecord(
  pageContent: unknown,
  sectionId?: string,
): pageContent is Record<string, string> {
  return Boolean(sectionId && typeof pageContent === 'object' && pageContent);
}

export function isTemplateConfig(obj: unknown): obj is ThemePageTemplateConfig {
  return Boolean(
    typeof obj === 'object' &&
    obj &&
    'sections' in obj &&
    typeof obj.sections === 'object'
  );
}
