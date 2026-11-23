import asyncio, sys
from playwright.async_api import async_playwright
URL = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:4173"
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path="/usr/bin/google-chrome", args=["--no-sandbox"])
        pg = await b.new_page(viewport={"width":1300,"height":1000})
        errs=[]
        pg.on("pageerror", lambda e: errs.append(str(e)))
        pg.on("console", lambda m: errs.append("console:"+m.text) if m.type=="error" else None)
        await pg.goto(URL)
        await pg.wait_for_selector("text=Payroll admin", timeout=30000)
        btns = pg.locator("button", has_text="Register issuer")
        await btns.nth(0).click(); await pg.wait_for_timeout(400)
        await pg.click("text=Issue payslip"); await pg.wait_for_timeout(600)
        await pg.click("text=Alice: prove income"); await pg.wait_for_timeout(800)
        ok = await pg.locator(".ok").all_inner_texts()
        await pg.fill(".verifier input", "5000")
        await pg.click("text=new")
        await pg.click("text=Alice: prove income"); await pg.wait_for_timeout(800)
        bad = await pg.locator(".bad").all_inner_texts()
        log = await pg.locator(".log").inner_text()
        print("OK:", ok); print("BAD:", bad); print("LOG:", log); print("ERRS:", errs)
        await pg.screenshot(path="/tmp/ns-shot.png", full_page=True)
        await b.close()
asyncio.run(main())
