// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { AvatarMenu } from '../../src/components/AvatarMenu';
import type { AgentInfo, AppConfig } from '../../src/types';

vi.mock('../../src/i18n', () => ({
  useT: () => (key: string) => key,
}));

const config: AppConfig = {
  mode: 'api',
  apiKey: '',
  baseUrl: 'https://api.example.test',
  model: '',
  agentId: null,
  skillId: null,
  designSystemId: null,
};

const codexAgent: AgentInfo = {
  id: 'codex',
  name: 'Codex CLI',
  bin: 'codex',
  available: true,
  version: '0.80.0',
  models: [{ id: 'default', label: 'Default' }],
};

afterEach(() => {
  cleanup();
});

describe('AvatarMenu', () => {
  it('returns focus to the trigger when Escape closes the menu', () => {
    render(
      <AvatarMenu
        config={config}
        agents={[] as AgentInfo[]}
        daemonLive
        onModeChange={vi.fn()}
        onAgentChange={vi.fn()}
        onAgentModelChange={vi.fn()}
        onOpenSettings={vi.fn()}
        onRefreshAgents={vi.fn()}
      />,
    );

    const trigger = screen.getByRole('button', { name: 'avatar.title' });
    fireEvent.click(trigger);

    const apiItem = screen.getByRole('button', { name: /avatar.useApi/ });
    apiItem.focus();
    expect(document.activeElement).toBe(apiItem);

    fireEvent.keyDown(document, { key: 'Escape' });

    expect(screen.queryByRole('dialog', { name: 'avatar.title' })).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });

  it('uses dialog semantics because the popover contains form controls', () => {
    render(
      <AvatarMenu
        config={config}
        agents={[] as AgentInfo[]}
        daemonLive
        onModeChange={vi.fn()}
        onAgentChange={vi.fn()}
        onAgentModelChange={vi.fn()}
        onOpenSettings={vi.fn()}
        onRefreshAgents={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'avatar.title' }));

    expect(screen.getByRole('dialog', { name: 'avatar.title' })).toBeTruthy();
    expect(screen.queryByRole('menu')).toBeNull();
  });

  it('marks the current mode and selected agent with active state', () => {
    render(
      <AvatarMenu
        config={{ ...config, mode: 'daemon', agentId: 'codex' }}
        agents={[codexAgent]}
        daemonLive
        onModeChange={vi.fn()}
        onAgentChange={vi.fn()}
        onAgentModelChange={vi.fn()}
        onOpenSettings={vi.fn()}
        onRefreshAgents={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'avatar.title' }));

    const localMode = screen.getByRole('button', { name: /avatar.useLocal/ });
    const apiMode = screen.getByRole('button', { name: /avatar.useApi/ });
    const agent = screen.getByRole('button', { name: /Codex CLI/ });

    expect(localMode.getAttribute('aria-current')).toBe('true');
    expect(localMode.className).toContain('active');
    expect(apiMode.getAttribute('aria-current')).toBeNull();
    expect(agent.getAttribute('aria-current')).toBe('true');
    expect(agent.className).toContain('active');
  });

  it('closes the popover when clicking the already-active local CLI mode', () => {
    const onModeChange = vi.fn();
    render(
      <AvatarMenu
        config={{ ...config, mode: 'daemon', agentId: 'codex' }}
        agents={[codexAgent]}
        daemonLive
        onModeChange={onModeChange}
        onAgentChange={vi.fn()}
        onAgentModelChange={vi.fn()}
        onOpenSettings={vi.fn()}
        onRefreshAgents={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'avatar.title' }));
    fireEvent.click(screen.getByRole('button', { name: /avatar.useLocal/ }));

    expect(onModeChange).not.toHaveBeenCalled();
    expect(screen.queryByRole('dialog', { name: 'avatar.title' })).toBeNull();
  });

  it('opens settings when the active local CLI mode is offline', () => {
    const onOpenSettings = vi.fn();
    render(
      <AvatarMenu
        config={{ ...config, mode: 'daemon', agentId: 'codex' }}
        agents={[codexAgent]}
        daemonLive={false}
        onModeChange={vi.fn()}
        onAgentChange={vi.fn()}
        onAgentModelChange={vi.fn()}
        onOpenSettings={onOpenSettings}
        onRefreshAgents={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'avatar.title' }));
    fireEvent.click(screen.getByRole('button', { name: /avatar.useLocal/ }));

    expect(onOpenSettings).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('dialog', { name: 'avatar.title' })).toBeNull();
  });
});
