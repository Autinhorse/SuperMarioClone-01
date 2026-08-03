// `npm run dev:local` —— 起 dev server，但连**本地 Supabase 栈**而不是生产。
//
// 为什么需要：`.env.local` 里写的是生产项目，所以裸跑 `npm run dev` 连的是生产库。
// 平时看真实数据没问题，但跑 m79/m81/m82 的联网段会往生产写测试数据（发布的关卡会
// 真的出现在 /explore 上，删除还是 ON DELETE CASCADE）。那几个测试自己有探测，
// 发现 :3000 不是本地栈就整段跳过 —— 于是不用这个脚本的话，它们永远是"跳过并 PASS"。
//
// 为什么是一个脚本文件而不是一行 npm script：
//   "dev:local": "node --env-file=.env.localstack node_modules/next/dist/bin/next dev"
// 看着能用，实际会报 `--env-file= is not allowed in NODE_OPTIONS` —— npm 会把脚本里
// node 的旗标搬进 NODE_OPTIONS，而 Node 明确禁止 --env-file 出现在那里（安全考虑）。
// 用 process.loadEnvFile() 就完全绕开了旗标这条路。

import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const envFile = fileURLToPath(new URL("../.env.localstack", import.meta.url));
process.loadEnvFile(envFile); // Node 21+

// Next 不会覆盖已经在 process.env 里的变量，所以上面这一行胜过 .env.local。
console.log(`[dev:local] Supabase = ${process.env.NEXT_PUBLIC_SUPABASE_URL}`);
if (!/127\.0\.0\.1|localhost|172\./.test(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "")) {
  // 防呆：这个脚本的全部意义就是"不要连生产"。指错了就别启动。
  console.error("[dev:local] 拒绝启动：这个地址看起来不是本地栈。检查 .env.localstack。");
  process.exit(1);
}

const bin = fileURLToPath(new URL("../node_modules/next/dist/bin/next", import.meta.url));
const child = spawn(process.execPath, [bin, "dev", ...process.argv.slice(2)], {
  stdio: "inherit",
});
child.on("exit", (code) => process.exit(code ?? 0));
