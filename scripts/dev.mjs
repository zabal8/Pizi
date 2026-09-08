import { spawn } from "node:child_process";

const isWindows = process.platform === "win32";

const command = isWindows ? "cmd.exe" : "npm";
const clientArgs = isWindows
  ? ["/c", "npm run dev --workspace client"]
  : ["run", "dev", "--workspace", "client"];

const serverArgs = isWindows
  ? ["/c", "npm run dev --workspace server"]
  : ["run", "dev", "--workspace", "server"];

const client = spawn(command, clientArgs, {
  stdio: "inherit",
  windowsVerbatimArguments: false,
});

const server = spawn(command, serverArgs, {
  stdio: "inherit",
  windowsVerbatimArguments: false,
});

function stop() {
  client.kill();
  server.kill();
}

process.on("SIGINT", stop);
process.on("SIGTERM", stop);
