import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, expect, it, vi } from 'vitest';
import { Modal } from '../src/components/ui.jsx';
import { LangProvider } from '../src/i18n.jsx';

afterEach(() => vi.unstubAllGlobals());

it.each([
  ['fr', 'Fermer'],
  ['ar', 'إغلاق'],
])('renders the shared dialog with a localized close label (%s)', (lang, closeLabel) => {
  vi.stubGlobal('localStorage', { getItem: () => lang });

  const markup = renderToStaticMarkup(createElement(
    LangProvider,
    null,
    createElement(Modal, { title: 'Dialog title', onClose: vi.fn() }, 'Dialog content'),
  ));

  expect(markup).toContain('role="dialog"');
  expect(markup).toContain('Dialog content');
  expect(markup).toContain(`aria-label="${closeLabel}"`);
});
