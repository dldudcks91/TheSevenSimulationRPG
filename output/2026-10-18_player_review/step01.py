T0 = page.evaluate("Date.now()") - 5000
log = []
def note(label):
    entry = {"label":label,"user_seconds":round((page.evaluate("Date.now()")-T0)/1000,2),"text":page.locator("body").inner_text(),"save":page.evaluate("JSON.parse(localStorage.getItem('thesevensim.save'))")}
    log.append(entry)
    (OUT/"play_log.json").write_text(json.dumps(log,ensure_ascii=False,indent=2),encoding="utf-8")
    print("NOTE",label,entry["user_seconds"],flush=True)

def tick(seconds):
    page.mouse.move(1550,970)
    page.clock.run_for(int(seconds*1000))

def press(selector):
    node = page.locator(selector).first
    box = node.bounding_box()
    if not box:
        raise ValueError(selector)
    page.mouse.click(box["x"]+box["width"]/2,box["y"]+box["height"]/2)

tick(30)
press('.ng-actions .primary')
for i in range(5):
    note('prologue_'+str(i))
    tick(18)
    press('.pro-actions .primary')
    tick(1)
note('first_world')
shot('02_world_start')
show()
