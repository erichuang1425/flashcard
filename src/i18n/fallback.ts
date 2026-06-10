/**
 * Translate a dynamically-built key (e.g. `achievement.${id}.title`), falling
 * back to the source text when no entry exists. `t` returns the key itself for
 * unknown keys, so this keeps user-defined or newly added content readable
 * instead of leaking raw translation keys into the UI.
 */
export const translateOr = (
  t: (key: string) => string,
  key: string,
  fallback: string
): string => {
  const translated = t(key);
  return translated === key ? fallback : translated;
};
