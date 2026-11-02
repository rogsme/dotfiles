import { execFile, spawn } from "node:child_process";

// xdg-open can run for as long as the browser it starts, so one still running after this many milliseconds counts as launched.
const LAUNCH_WAIT = 2000;
const DISPLAY_VARIABLES = ["DISPLAY", "WAYLAND_DISPLAY", "XAUTHORITY"];

function sessionEnvironment() {
  return new Promise((resolve, reject) => {
    execFile("systemctl", ["--user", "show-environment"], { timeout: LAUNCH_WAIT }, (error, stdout) => error ? reject(error) : resolve(stdout));
  });
}

// A service that starts before the desktop hands its children no display, and xdg-open then finds no browser. The user's systemd manager has the session's values.
export async function displayEnv(env = process.env, { platform = process.platform, readSession = sessionEnvironment } = {}) {
  if (platform !== "linux" || env.DISPLAY || env.WAYLAND_DISPLAY) return env;
  const session = await readSession().catch(() => "");
  const found = session.split("\n").map((line) => line.split(/=(.*)/s)).filter(([name, value]) => DISPLAY_VARIABLES.includes(name) && value);
  return found.length ? { ...env, ...Object.fromEntries(found) } : env;
}

function openerFor(platform, url) {
  if (platform === "darwin") return ["open", [url]];
  if (platform === "win32") return ["cmd", ["/c", "start", "", url]];
  return ["xdg-open", [url]];
}

// Resolves to whether the opener worked, not only whether it started: xdg-open starts and then exits 3 when it finds no browser.
export async function launch(url, { command, args, env = process.env, platform = process.platform, readSession, wait = LAUNCH_WAIT } = {}) {
  const [program, parameters] = command ? [command, args] : openerFor(platform, url);
  const openerEnv = await displayEnv(env, { platform, readSession });
  return new Promise((resolve) => {
    const child = spawn(program, parameters, { detached: true, stdio: "ignore", env: openerEnv });
    const timer = setTimeout(() => { child.unref(); resolve({ opened: true }); }, wait);
    const finish = (result) => { clearTimeout(timer); resolve(result); };
    child.once("error", (error) => finish({ opened: false, reason: `${program}: ${error.code || error.message}` }));
    child.once("exit", (code) => finish(code === 0 ? { opened: true } : { opened: false, reason: `${program} exited with code ${code}` }));
  });
}
