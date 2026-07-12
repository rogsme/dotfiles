import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { truncateToWidth, visibleWidth } from "@earendil-works/pi-tui";
import { isAbsolute, relative, resolve, sep } from "node:path";

const rgb = (r: number, g: number, b: number, text: string) =>
  `\x1b[38;2;${r};${g};${b}m${text}\x1b[39m`;

function shortCwd(cwd: string): string {
  const home = process.env.HOME;
  if (!home) return cwd;
  const path = relative(resolve(home), resolve(cwd));
  return path === "" ? "~" : path !== ".." && !path.startsWith(`..${sep}`) && !isAbsolute(path) ? `~${sep}${path}` : cwd;
}

function contextBar(percent: number, width: number): string {
  const filled = Math.round((percent / 100) * width);
  let bar = "";
  for (let i = 0; i < width; i++) {
    const t = width === 1 ? 1 : i / (width - 1);
    bar += i < filled
      ? rgb(Math.round(22 + 52 * t), Math.round(101 + 121 * t), Math.round(52 + 76 * t), "█")
      : rgb(18, 58, 38, "░");
  }
  return bar;
}

export default function greenFooter(pi: ExtensionAPI): void {
  pi.on("session_start", (_event, ctx) => {
    ctx.ui.setFooter((tui, _theme, footerData) => ({
      dispose: footerData.onBranchChange(() => tui.requestRender()),
      invalidate() {},
      render(width: number): string[] {
        if (width <= 0) return [""];

        const usage = ctx.getContextUsage();
        const knownPercent = usage?.percent;
        const percent = Math.max(0, Math.min(100, knownPercent ?? 0));
        const percentText = usage && knownPercent === null ? "?%" : `${Math.round(percent)}%`;
        const barWidth = width >= 100 ? 20 : width >= 70 ? 12 : width >= 45 ? 8 : 4;

        const context = `${contextBar(percent, barWidth)} ${rgb(74, 222, 128, percentText)}`;
        const divider = rgb(34, 120, 70, " • ");
        const mode = footerData.getExtensionStatuses().has("plan-mode")
          ? rgb(234, 179, 8, "plan")
          : rgb(74, 222, 128, "normal");
        const branch = footerData.getGitBranch();
        const git = branch ? divider + rgb(45, 150, 85, `git:${branch}`) : "";
        const reserved = visibleWidth(mode) + visibleWidth(context) + visibleWidth(git) + visibleWidth(divider) * 3;
        const remaining = Math.max(0, width - reserved);
        const cwdWidth = Math.min(40, Math.floor(remaining * 0.42));
        const modelWidth = Math.max(0, remaining - cwdWidth);

        const cwd = rgb(45, 150, 85, truncateToWidth(shortCwd(ctx.cwd), cwdWidth, "…"));
        const model = ctx.model?.id ?? "no-model";
        const effort = pi.getThinkingLevel();
        const modelText = truncateToWidth(`${model} · ${effort}`, modelWidth, "…");
        const split = modelText.lastIndexOf(" · ");
        const styledModel = split < 0
          ? rgb(52, 180, 100, modelText)
          : rgb(52, 180, 100, modelText.slice(0, split + 3)) + rgb(74, 222, 128, modelText.slice(split + 3));

        return [truncateToWidth(mode + divider + cwd + divider + styledModel + divider + context + git, width, "")];
      },
    }));
  });
}
