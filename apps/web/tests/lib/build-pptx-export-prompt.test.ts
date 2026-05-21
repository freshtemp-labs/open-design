import { describe, expect, it } from 'vitest';

import { buildPptxExportPrompt } from '../../src/lib/build-pptx-export-prompt';

describe('buildPptxExportPrompt', () => {
  it('builds an availability-safe prompt for deck HTML exports', () => {
    const prompt = buildPptxExportPrompt('Quarterly Plan.html');

    expect(prompt).toContain('Export @Quarterly Plan.html as an editable PPTX file titled "Quarterly Plan".');
    expect(prompt).toContain('`Quarterly Plan.pptx`');
    expect(prompt).toContain('Use any PPTX-capable toolchain that is actually available in this environment.');
    expect(prompt).toContain('Do not refuse solely because a specific library, skill, or verifier is unavailable.');
    expect(prompt).toContain('Only report that export is impossible if no available toolchain here can write a PPTX file at all.');
    expect(prompt).toContain('Do not claim the fidelity is verified if you could not run a real validation step.');
  });

  it('does not require the old python-only audit flow', () => {
    const prompt = buildPptxExportPrompt('deck.html');

    expect(prompt).not.toContain('skills/pptx-html-fidelity-audit');
    expect(prompt).not.toContain('verify_layout.py');
    expect(prompt).not.toContain('mandatory gate');
    expect(prompt).not.toContain('Use python-pptx');
  });
});
