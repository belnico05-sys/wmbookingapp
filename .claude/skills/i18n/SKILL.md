---
name: i18n
description: How to add or change user-facing strings (Italian + English locales) and how to check for hardcoded strings. Use whenever UI text is added or modified.
---

# i18n workflow

UI languages: **Italian (primary)** and English. No user-facing string may be
hardcoded in components.

## Adding or changing a string

1. Add the key to **both** locale files, in the same position:
   - `src/locales/it.json`
   - `src/locales/en.json`
2. Use nested keys grouped by screen/feature, e.g. `booking.confirmTitle`,
   `machines.statusFree`.
3. In components, render via the hook:

   ```tsx
   const { t } = useTranslation();
   <h1>{t("booking.confirmTitle")}</h1>
   ```

4. For strings with values, use interpolation keys
   (`"slotLabel": "Ore {{start}}–{{end}}"`), never string concatenation.

Write the Italian text first (it's the primary audience), then a natural
English translation — not word-for-word.

## Checking for hardcoded strings

Before review, search JSX for literal text between tags and in common
attributes:

- Grep pattern over `src/**/*.tsx`: `>[A-Za-zÀ-ù][^<>{}]*<` (text between tags)
- Also check attributes: `(title|placeholder|aria-label|alt)="[A-Za-z]`
- **Also scan plain `src/**/*.ts` files** — user-facing strings hide in
  validation messages, toast/alert calls, error throws shown in the UI, and
  label/formatter helpers. Grep for quoted strings containing spaces or
  accented letters (e.g. `"[A-Za-zÀ-ù]+ [A-Za-zÀ-ù]`) and judge each hit:
  anything a user can read on screen must go through `t(...)`.

Whitelist: brand/proper names, units, and strings inside `t(...)` calls.

## Keeping locales in sync

After any locale edit, verify both files have the same key set (compare
sorted keys). A missing key in one locale is a bug — i18next would silently
fall back or show the raw key.
