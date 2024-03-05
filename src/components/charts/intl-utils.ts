import { isObject } from 'lodash-es';

type InternalIntlPropType = {
  locales?: string | string[];
  options?: Intl.DateTimeFormatOptions;
};
export type IntlPropType = InternalIntlPropType | string | string[];

export const DefaultIntlProp: InternalIntlPropType = {
  locales: (navigator.languages as string[]) || navigator.language,
  options: { dateStyle: 'short', timeStyle: 'short' },
};

export const DefaultFormatter = new Intl.DateTimeFormat(
  DefaultIntlProp.locales,
  DefaultIntlProp.options
);

const DefaultDateIntlProp: InternalIntlPropType = {
  locales: (navigator.languages as string[]) || navigator.language,
  options: { dateStyle: 'full' },
};
export const DefaultDateFormatter = new Intl.DateTimeFormat(
  DefaultDateIntlProp.locales,
  DefaultDateIntlProp.options
);

export function mergeIntlProp(
  target: IntlPropType,
  source: IntlPropType
): InternalIntlPropType {
  const _target: InternalIntlPropType = isObject(target)
    ? (target as Record<string, unknown>)
    : { locales: target };
  const _source: InternalIntlPropType = isObject(source)
    ? (source as Record<string, unknown>)
    : { locales: source };

  return {
    locales: _source.locales || _target.locales || DefaultIntlProp.locales,
    options: {
      ...DefaultIntlProp.options,
      ..._target.options,
      ..._source.options,
    },
  };
}
