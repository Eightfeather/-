import { main } from './main.mjs';

main().catch((err) => {
  console.error(err?.stack || err);
  process.exitCode = 1;
});