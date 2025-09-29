#!/usr/bin/env python3
# ~/.config/i3/ws-router.py
#
# Keep specific workspace numbers on specific monitors across machines
# (works with DP-2-1 / DP-1-1 naming differences, docks, autorandr, etc.)
#
# Requires: python-i3ipc (Arch: pacman -S python-i3ipc; or pip install i3ipc)

import re
import i3ipc

# ---------------------------
# Policy: which workspaces go where
# ---------------------------
WS_PRIMARY = {1, 3, 5, 7, 9}        # primary monitor
WS_SECOND  = {2, 4, 6, 8, 10}       # second monitor (DP-*-1)
WS_THIRD   = {11}                   # third monitor (DP-*-2)

i3 = i3ipc.Connection()

# ---------------------------
# Helpers
# ---------------------------
def detect_outputs():
    """Return (primary, second, third) output names.
    Prefer DP-*-1 for 'second' and DP-*-2 for 'third'; fallback by left→right order."""
    outs = [o for o in i3.get_outputs() if o.active]
    primary = next((o.name for o in outs if o.primary), None)

    # Prefer explicit connector-name matches for docks/adapters across machines
    second = next((o.name for o in outs if re.match(r'^DP-.*-1$', o.name)), None)
    third  = next((o.name for o in outs if re.match(r'^DP-.*-2$', o.name)), None)

    # Fallback by x position (left→right) for anything we didn't detect
    others = sorted([o for o in outs if o.name != primary], key=lambda o: o.rect.x)

    if not second and len(others) >= 1:
        second = others[0].name
    if not third and len(others) >= 2:
        third = others[1].name

    return primary, second, third


def wsnum(wsname: str | None):
    """Extract leading integer workspace number from a workspace name."""
    if not wsname:
        return None
    m = re.match(r'^(\d+)', wsname)
    return int(m.group(1)) if m else None


def target_output(wsname: str | None, primary: str | None, second: str | None, third: str | None):
    """Decide which output a given workspace should live on."""
    n = wsnum(wsname)
    if n in WS_PRIMARY:
        return primary
    if n in WS_SECOND:
        return second
    if n in WS_THIRD:
        return third
    # default fallback
    return primary or second or third


def move_workspace_if_needed(wsname: str, primary: str | None, second: str | None, third: str | None):
    """Move workspace to its target output if it isn't already there; restore focus."""
    tgt = target_output(wsname, primary, second, third)
    if not tgt:
        return

    workspaces = i3.get_workspaces()
    w = next((w for w in workspaces if w.name == wsname), None)
    if not w:
        return
    if w.output == tgt:
        return

    cur = next((x.name for x in workspaces if x.focused), None)

    # Switch to the WS, move it, then go back
    i3.command(f'workspace "{wsname}"')
    i3.command(f'move workspace to output {tgt}')
    if cur and cur != wsname:
        i3.command(f'workspace "{cur}"')


# ---------------------------
# Initial placement + event wiring
# ---------------------------
primary, second, third = detect_outputs()

# Audit existing workspaces at startup
for w in i3.get_workspaces():
    move_workspace_if_needed(w.name, primary, second, third)


def on_ws(conn, ev):
    """Workspace events: focus, init, empty, rename, move, etc."""
    # ev.current can be None for some changes; be defensive
    name = getattr(getattr(ev, "current", None), "name", None)
    if name:
        move_workspace_if_needed(name, primary, second, third)


def on_window(conn, ev):
    """Window events: new/move/close → enforce the workspace’s placement."""
    ws = ev.container.workspace() if hasattr(ev, "container") else None
    name = ws.name if ws else None
    if name:
        move_workspace_if_needed(name, primary, second, third)


def on_output(conn, ev):
    """Outputs changed (dock/undock, autorandr, cable replug). Re-detect and re-place."""
    global primary, second, third
    primary, second, third = detect_outputs()
    for w in i3.get_workspaces():
        move_workspace_if_needed(w.name, primary, second, third)


# Subscribe to events
i3.on('workspace', on_ws)
i3.on('window', on_window)
# 'output' event exists on recent i3; if not, this will just never fire
try:
    i3.on('output', on_output)
except Exception:
    pass

i3.main()

