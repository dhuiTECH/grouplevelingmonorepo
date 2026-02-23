Start Web App	pnpm --filter web dev
Start Mobile (Expo)	pnpm --filter mobile start
Kill Stuck Servers	taskkill /F /IM node.exe
Fresh Install	pnpm install
Reset Everything	taskkill /F /IM node.exe; rm -r apps/web/.next; pnpm install