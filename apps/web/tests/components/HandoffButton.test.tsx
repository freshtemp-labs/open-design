// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { HandoffButton } from '../../src/components/HandoffButton';
import { I18nProvider, type Locale } from '../../src/i18n';
import { copyToClipboard } from '../../src/lib/copy-to-clipboard';
import { fetchHostEditors, openProjectInEditor } from '../../src/providers/registry';

vi.mock('../../src/providers/registry', () => ({
  fetchHostEditors: vi.fn(),
  openProjectInEditor: vi.fn(),
}));

vi.mock('../../src/lib/copy-to-clipboard', () => ({
  copyToClipboard: vi.fn(),
}));

const mockedFetchHostEditors = vi.mocked(fetchHostEditors);
const mockedOpenProjectInEditor = vi.mocked(openProjectInEditor);
const mockedCopyToClipboard = vi.mocked(copyToClipboard);

function renderHandoff(locale: Locale = 'zh-CN') {
  render(
    <I18nProvider initial={locale}>
      <HandoffButton
        projectId="proj-abc"
        projectName="Acme Dashboard"
        projectDir="/Users/bryan/projects/acme"
      />
    </I18nProvider>,
  );
}

describe('HandoffButton', () => {
  beforeEach(() => {
    mockedFetchHostEditors.mockResolvedValue({
      platform: 'darwin',
      editors: [
        { id: 'cursor', label: 'Cursor', available: true },
        { id: 'vscode', label: 'VS Code', available: false },
      ],
    });
    mockedOpenProjectInEditor.mockResolvedValue({
      ok: true,
      editorId: 'cursor',
      path: '/Users/bryan/projects/acme',
    });
    mockedCopyToClipboard.mockResolvedValue(true);
  });

  afterEach(() => {
    cleanup();
    window.localStorage.clear();
    vi.clearAllMocks();
  });

  it('opens the handoff menu from the main trigger without launching an editor', async () => {
    renderHandoff();

    fireEvent.click(await screen.findByTestId('handoff-trigger'));

    expect(screen.getByTestId('handoff-menu')).not.toBeNull();
    expect(mockedOpenProjectInEditor).not.toHaveBeenCalled();

    fireEvent.click(screen.getByTestId('handoff-menu-item-cursor'));

    await waitFor(() => {
      expect(mockedOpenProjectInEditor).toHaveBeenCalledWith('proj-abc', 'cursor');
    });
  });

  it('copies a framework-specific code agent prompt with the project path', async () => {
    renderHandoff();

    fireEvent.click(await screen.findByTestId('handoff-trigger'));
    fireEvent.click(screen.getByRole('tab', { name: 'Code agent' }));
    fireEvent.click(screen.getByTestId('handoff-agent-target-react'));

    await waitFor(() => {
      expect(mockedCopyToClipboard).toHaveBeenCalledTimes(1);
    });
    const prompt = mockedCopyToClipboard.mock.calls[0]?.[0] ?? '';
    expect(prompt).toContain('/Users/bryan/projects/acme');
    expect(prompt).toContain('Framework: React');
    expect(prompt).toContain('Project ID: proj-abc');
    expect(screen.getByTestId('handoff-agent-copy-status').textContent).toContain('Prompt copied');
  });

  it('shows framework icons for every code agent target', async () => {
    renderHandoff();

    fireEvent.click(await screen.findByTestId('handoff-trigger'));
    fireEvent.click(screen.getByRole('tab', { name: 'Code agent' }));

    for (const target of ['react', 'vue', 'svelte', 'solid']) {
      expect(screen.getByTestId(`handoff-framework-icon-${target}`)).toBeTruthy();
    }
  });

  it('localizes the primary handoff label', async () => {
    renderHandoff('en');

    const trigger = await screen.findByTestId('handoff-trigger');
    expect(trigger.getAttribute('title')).toBe('Hand off');
    expect(trigger.textContent).toContain('Hand off');
  });

  it('localizes the unavailable editor section', async () => {
    renderHandoff('zh-CN');

    fireEvent.click(await screen.findByTestId('handoff-caret'));

    expect(await screen.findByText('未安装')).toBeTruthy();
    expect(screen.getByTestId('handoff-menu-item-vscode').getAttribute('title'))
      .toBe('VS Code - 未在 $PATH 中检测到');
  });
});
