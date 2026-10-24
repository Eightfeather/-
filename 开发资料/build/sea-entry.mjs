import { ASSETS } from './assets.gen.mjs';
import { setAssets } from '../src/assets.mjs';
import { main } from '../src/main.mjs';
setAssets(ASSETS);
main().catch((err) => { console.error(err?.stack || err); process.exitCode = 1; });
