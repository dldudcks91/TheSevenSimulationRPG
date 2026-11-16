import asyncio, sys
sys.argv = ['x']
exec(open(__file__.replace('debug_duel.py','run_duel.py'),encoding='utf-8').read().split('async def main')[0])
async def dbg():
    async with async_playwright() as p:
        b = await p.chromium.launch(channel='msedge', headless=True)
        pg = await b.new_page(); logs = []
        pg.on('pageerror', lambda e: logs.append('PAGEERR ' + str(e)[:300]))
        pg.on('console', lambda m: logs.append('CONSOLE ' + m.text[:200]))
        pg.on('requestfailed', lambda r: logs.append('REQFAIL ' + r.url))
        pg.on('response', lambda r: logs.append(f'RESP {r.status} {r.url} {r.headers.get("content-type")}'))
        await pg.goto(f'http://127.0.0.1:{server.server_port}/dev/class_duel.html?n=2&cls=priest&lv=15')
        for i in range(12):
            await asyncio.sleep(5)
            t = await pg.title()
            if t != 'running': break
        print('title', t); print('\n'.join(logs[:20])); print((await pg.locator('#out').inner_text())[:600])
        await b.close()
asyncio.run(dbg()); server.shutdown()
