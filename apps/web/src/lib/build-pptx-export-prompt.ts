export function buildPptxExportPrompt(fileName: string): string {
  const baseTitle = fileName.replace(/\.html?$/i, '') || fileName;

  return (
    `Export @${fileName} as an editable PPTX file titled "${baseTitle}".\n\n` +
    `Save it in the current project folder (this conversation's working directory) as ` +
    `\`${baseTitle}.pptx\`.\n\n` +
    `Use any PPTX-capable toolchain that is actually available in this environment. ` +
    `Prefer preserving slide structure, editable text, layout, colors, and fonts over ` +
    `producing a rasterized screenshot deck. If multiple approaches are available, choose ` +
    `the one that keeps the output most editable.\n\n` +
    `Do not refuse solely because a specific library, skill, or verifier is unavailable. ` +
    `If \`python-pptx\`, PptxGenJS, or a PPTX verification helper is missing, try another ` +
    `available approach instead. Only report that export is impossible if no available ` +
    `toolchain here can write a PPTX file at all.\n\n` +
    `After creating the file, run whatever lightweight validation is possible in this ` +
    `environment and report: (1) the on-disk path, (2) whether the deck remains editable ` +
    `or fell back to mostly images, and (3) a 1-line fidelity summary. Do not claim the ` +
    `fidelity is verified if you could not run a real validation step.`
  );
}
