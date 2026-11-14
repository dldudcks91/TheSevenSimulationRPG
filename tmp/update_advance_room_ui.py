from pathlib import Path

root = Path(__file__).resolve().parents[1]
p = root / 'src/ui/app.js'
s = p.read_text(encoding='utf-8')
start = s.index('function renderLibrary(main) {')
end = s.index('/** 공통 머리', start)
s = s[:start] + '''function renderLibrary(main) {
    const page = el('div', 'char-stack page c-lib');
    page.appendChild(heroStrip(pickHero));
    const h = heroById(state.heroUid);
    const col = el('div', 'page-stack c-lib-col');
    col.appendChild(libraryAdvanceEntry(h));
    const p = el('div', 'panel page fill lib-panel');
    libHead(p, h);
    p.appendChild(bookSections(h));
    col.appendChild(p);
    page.appendChild(col);
    main.appendChild(page);
}

/** 전직의 방 입구 — 잠겨도 목표와 실제 갈래를 볼 수 있다. */
function advanceStatus(A) {
    if (A.hero.advance) return t('tr.room.done', { name: L(A.branches.find(b => b.id === A.hero.advance).name) });
    if (A.hero.working) return t('tr.err.working');
    if (!A.open) return needText('advance');
    if (A.err === 'level') return t('tr.room.level', { n: A.need.need });
    return A.err ? t(`tr.err.${A.err}`) : t('tr.room.ready');
}

function openAdvanceMastery(back = null) {
    state.modalBack = back;
    openModal('skill');
}

function libraryAdvanceEntry(h) {
    const entry = el('div', 'lib-entry');
    const A = h ? SYS.game.advanceState(G, h.uid, now()) : null;
    if (h) {
        const info = el('div', 'lib-entry-info');
        const name = el('b');
        name.textContent = `${L(h.name)} · Lv.${h.level}`;
        info.appendChild(name);
        const status = el('span', `lib-entry-status${!A.err ? ' ready' : ''}`);
        status.textContent = advanceStatus(A);
        info.appendChild(status);
        entry.appendChild(info);
    }
    const actions = el('div', 'lib-entry-actions');
    const enter = el('button', 'btn sm lib-advance-open', t('tr.room.title'));
    enter.disabled = !h;
    enter.onclick = () => { state.advSel = null; state.advPreview = {}; state.modalBack = null; openModal('advance'); };
    actions.appendChild(enter);
    if (A?.hero.advance) {
        const mastery = el('button', 'btn sm primary lib-mastery-open', t('ch.skill.go'));
        mastery.onclick = () => openAdvanceMastery();
        actions.appendChild(mastery);
    }
    entry.appendChild(actions);
    return entry;
}

''' + s[end:]
start = s.index('/** 전직 탭 — 소제목')
end = s.index('/** 전직 막대', start)
s = s[:start] + '''/** 전직의 방 — 비교는 조회만, 확정만 advanceStart를 부른다 (ADR-1174). */
function advanceRoomBody() {
    const h = heroById(state.heroUid);
    const A = SYS.game.advanceState(G, h.uid, now());
    const wrap = el('div', 'advance-room');
    const identity = el('div', 'advance-room-hero');
    identity.textContent = `${L(h.name)} · ${className(h.cls)} · Lv.${h.level}`;
    wrap.appendChild(identity);
    const selected = state.advSel?.uid === h.uid ? A.branches.find(b => b.id === state.advSel.branch) : null;
    const current = A.branches.find(b => b.id === (A.hero.advance ?? A.hero.working?.branch));
    const branch = current ?? selected ?? A.branches[0];
    if (!branch) return wrap;

    const content = el('div', 'advance-room-content');
    const paths = el('div', 'advance-room-paths');
    paths.setAttribute('aria-label', t('tr.room.paths'));
    // 완료 후에는 확정한 갈래만 표시한다. 미리보기 중 영웅의 갈래를 변경하지 않는다.
    for (const br of current ? [current] : A.branches) {
        const card = el('button', `advance-path${br.id === branch.id ? ' on' : ''}`);
        card.type = 'button';
        card.dataset.branch = br.id;
        card.setAttribute('aria-pressed', String(br.id === branch.id));
        card.innerHTML = `<b>${L(br.name)}</b><span>${L(br.desc)}</span>`;
        const color = D.advanceRows.find(a => a.advance_id === br.id)?.color_hex;
        if (color) card.style.setProperty('--path-color', color);
        card.onclick = () => {
            if (current) return;
            state.advSel = { uid: h.uid, branch: br.id };
            render();
            document.querySelector(`.advance-path[data-branch="${br.id}"]`)?.focus({ preventScroll: true });
        };
        paths.appendChild(card);
    }
    content.appendChild(paths);
    const preview = el('div', 'advance-room-preview');
    preview.appendChild(el('div', 'advance-room-preview-label', t('tr.room.preview')));
    // 모바일에서도 선택한 갈래 설명을 노드 바로 위에서 읽는다.
    preview.appendChild(el('p', 'advance-room-desc', L(branch.desc)));
    const data = D.advanceRows.find(a => a.advance_id === branch.id);
    const pick = branch.skills.includes(state.advPreview[branch.id]) ? state.advPreview[branch.id]
        : (current && branch.skills.includes(A.hero.skill) ? A.hero.skill : branch.skills[0]);
    preview.appendChild(codexAdvanceBoard(data, { id: h.cls }, branch.skills, {
        pick,
        onPick: id => {
            state.advPreview[branch.id] = id;
            render();
            document.querySelector(`.advance-room [data-advskill="${id}"]`)?.focus({ preventScroll: true });
        },
    }));
    const detail = el('div', 'advance-room-skill');
    detail.appendChild(el('b', '', L(skillInfo(pick).name)));
    detail.appendChild(el('div', '', skillLineHtml({ id: pick }, {}, ' · ')));
    preview.appendChild(detail);
    content.appendChild(preview);
    wrap.appendChild(content);

    const footer = el('div', 'advance-room-footer');
    if (A.hero.advance) {
        footer.appendChild(el('b', '', advanceStatus(A)));
        footer.appendChild(el('span', 'muted', t('tr.room.next')));
        const go = el('button', 'btn primary advance-mastery-open', t('ch.skill.go'));
        go.onclick = () => openAdvanceMastery('advance');
        footer.appendChild(go);
    } else if (A.hero.working) {
        const w = A.hero.working;
        const progress = el('div', 'tr-adv-work');
        progress.innerHTML = `<b>${advanceStatus(A)}</b><i class="tr-adv-bar"><b data-advbar="${h.uid}" style="width:${(w.frac * 100).toFixed(1)}%"></b></i>`
            + `<span data-advleft="${h.uid}">${t('tr.adv.left', { t: fmtDuration(Math.max(0, w.until - now())) })}</span>`;
        footer.appendChild(progress);
    } else {
        const selection = el('b', 'advance-room-selection');
        selection.textContent = selected ? t('tr.room.selected', { name: L(selected.name) }) : t('tr.room.choose');
        footer.appendChild(selection);
        const requirements = el('div', 'advance-room-requirements');
        requirements.appendChild(el('span', '', t('tr.adv.level', A.need)));
        if (!A.open) requirements.appendChild(el('span', 'no', needText('advance')));
        requirements.appendChild(el('span', 'advance-room-cost', costText({ res: 'gold', need: A.gold.need, have: A.gold.have })));
        requirements.appendChild(el('span', '', D.balance.advance_hours > 0
            ? t('tr.room.duration', { t: fmtDuration(D.balance.advance_hours * 3600000) }) : t('tr.room.instant')));
        footer.appendChild(requirements);
        footer.appendChild(el('span', 'muted advance-room-warning', t('tr.room.irreversible')));
        if (A.err && A.err !== 'unbuilt') footer.appendChild(el('span', 'advance-room-reason', advanceStatus(A)));
        const go = el('button', 'btn primary tr-adv-go', t('tr.adv.go'));
        go.disabled = !selected || !!A.err;
        go.onclick = () => {
            const result = SYS.game.advanceStart(G, h.uid, selected.id, now());
            if (!result.ok) { flashErr('tr', result.err, 'advance'); render(); return; }
            state.advSel = null;
            const completed = SYS.game.advanceState(G, h.uid, now()).hero.advance;
            flash(completed ? 'tr.room.done' : 'tr.adv.started', { name: completed ? L(selected.name) : L(h.name), b: L(selected.name) });
            save();
            render();
        };
        footer.appendChild(go);
    }
    wrap.appendChild(footer);
    return wrap;
}

''' + s[end:]
s = s.replace("function codexAdvanceBoard(a, c, skills) {", "function codexAdvanceBoard(a, c, skills, options = {}) {")
s = s.replace("const pick = skills.includes(state.cxAdvPick[a.advance_id]) ? state.cxAdvPick[a.advance_id] : skills[0];", "const requested = options.pick ?? state.cxAdvPick[a.advance_id];\n    const pick = skills.includes(requested) ? requested : skills[0];")
old = '''const cell = id => `<div class="sk-cell icon-only${id === pick ? ' taken' : ' swap'}" data-advskill="${id}" aria-label="${L(skillInfo(id).name)}">'''
new = '''const cell = id => `<div class="sk-cell icon-only${id === pick ? ' taken' : ' swap'}" role="button" tabindex="0" aria-pressed="${id === pick}" data-advskill="${id}" aria-label="${L(skillInfo(id).name)}">'''
assert old in s
s = s.replace(old, new, 1)
old = "sc.onclick = () => { state.cxAdvPick[a.advance_id] = sc.dataset.advskill; render(); };"
new = """sc.onclick = () => {
            if (options.onPick) options.onPick(sc.dataset.advskill);
            else { state.cxAdvPick[a.advance_id] = sc.dataset.advskill; render(); }
        };
        sc.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); sc.click(); } };"""
assert old in s
s = s.replace(old, new, 1)
s = s.replace("// `&lib=` — 도서관의 폴더 탭(스킬북 · 전직)을 고른 채 연다 (§10 · §17 · ADR-1165)", "// 기존 `&lib=adv`는 전직의 방을 연다. 기본 도서관은 책 관리다 (ADR-1174).")
s = s.replace("if (['book', 'adv'].includes(lib)) state.libTab = lib;", "if (lib === 'adv') state.modal = 'advance';")
s = s.replace('/** 공통 머리 — 두 탭이 같은 자리 (§17 · ADR-1165):', '/** 기본 책 관리 화면의 스킬정보 (§17 · ADR-1174):')
s = s.replace('/** 스킬북 탭 — 스킬 업그레이드', '/** 기본 책 관리 — 스킬 업그레이드')
p.write_text(s, encoding='utf-8', newline='')
