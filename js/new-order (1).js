/* js/new-order.js — экран «Новая заявка» (Figma, колонка 2). Подключается в orders.html после app.js.
   Открывается по #new-order-btn или [data-new-order]: список скрывается, на его месте — форма.
   Две вкладки: «Заполнить вручную» и «Из текста или файла (ИИ)». Настоящего ИИ нет — разбор имитируется.
   После сохранения открывается карточка заявки (order.html?id=…). */
(function () {
  'use strict';

  var CFG = { PARSE_DELAY: 1800, MAX_WEIGHT: 40, MAX_RATE: 10000000, NOTES_MAX: 500,
              FILE_MAX_MB: 10, FILE_EXT: ['pdf', 'docx', 'xlsx', 'txt'] };

  var REQUIRED = ['from', 'to', 'loadDate', 'truckType', 'weightT', 'clientRate'];
  var FIELDS = [
    { key: 'from',       label: 'Пункт отправления', short: 'откуда' },
    { key: 'to',         label: 'Пункт назначения',  short: 'куда' },
    { key: 'loadDate',   label: 'Дата загрузки',     short: 'дата загрузки', hint: 'Когда машина должна быть на погрузке' },
    { key: 'truckType',  label: 'Тип машины',        short: 'тип машины' },
    { key: 'weightT',    label: 'Вес груза, т',      short: 'вес', hint: 'Вес всего груза в тоннах' },
    { key: 'clientRate', label: 'Ставка клиента, ₽', short: 'ставка клиента', hint: 'Целое число, без копеек' },
    { key: 'notes',      label: 'Дополнительные условия', short: 'доп. условия' }
  ];
  var F = {}; FIELDS.forEach(function (f) { F[f.key] = f; });

  // Для файлов не-TXT настоящего чтения нет — подставляем пример (имитация)
  var DEMO_SAMPLE = 'Добрый день! Нужна фура, СПб — Москва, погрузка 3 ноября, ставка 88 000, погрузка до 12:00, нужны ремни и коники';
  var ALIASES = { 'спб': 'Санкт-Петербург', 'питер': 'Санкт-Петербург', 'мск': 'Москва', 'екб': 'Екатеринбург', 'нск': 'Новосибирск', 'нн': 'Нижний Новгород' };
  var MONTHS = { 'января': 1, 'февраля': 2, 'марта': 3, 'апреля': 4, 'мая': 5, 'июня': 6, 'июля': 7, 'августа': 8, 'сентября': 9, 'октября': 10, 'ноября': 11, 'декабря': 12 };
  var TRUCKS = [['Тент', /тент/i], ['Рефрижератор', /рефрижератор|(?<![\p{L}])реф(?![\p{L}])/iu], ['Изотерм', /изотерм/i],
    ['Борт', /бортов|(?<![\p{L}])борт(?![\p{L}])/iu], ['Цистерна', /цистерн/i], ['Самосвал', /самосвал/i], ['Трал', /(?<![\p{L}])трал(?![\p{L}])/iu]];

  var S = null; // состояние открытого экрана

  /* ---------- утилиты ---------- */
  function esc(s) { return Exp.escapeHtml(String(s)); }
  function $(sel) { return S.view.querySelector(sel); }
  function $$(sel) { return Array.prototype.slice.call(S.view.querySelectorAll(sel)); }
  function pad(n) { return String(n).padStart(2, '0'); }
  function nowIso() {
    var d = new Date();
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + 'T' + pad(d.getHours()) + ':' + pad(d.getMinutes());
  }
  function today() { return (window.DATA && DATA.today) || nowIso().slice(0, 10); }
  function field(key) { return $('[data-field="' + key + '"]'); }
  function ctl(key) { return $('[name="' + key + '"]'); }

  /* ---------- стили ---------- */
  var CSS = [
    '.no-tabs{display:flex;gap:24px;border-bottom:1px solid var(--line)}',
    '.no-tab{display:inline-flex;align-items:center;gap:8px;min-height:42px;padding:0 2px;border:0;border-bottom:2px solid transparent;background:none;color:var(--mute);cursor:pointer}',
    '.no-tab[aria-selected=true]{border-bottom-color:var(--dark);color:var(--ink);font-weight:600}',
    '.no-ai{display:inline-block;padding:1px 6px;border-radius:3px;background:var(--dark);color:#fff;font-size:10px;font-weight:600;letter-spacing:.03em}',
    '.no-card{padding:20px 24px}',
    '.no-grid{display:grid;grid-template-columns:1fr 1fr;gap:18px 20px}',
    '.no-row3{grid-column:1/-1;display:grid;grid-template-columns:1fr auto 1fr;gap:10px;align-items:start}',
    '.no-swap{margin-top:24px;width:36px;height:38px;border:1px solid var(--line);border-radius:var(--radius);background:#fff;cursor:pointer}',
    '.no-swap:hover{border-color:var(--dark)}',
    '.no-wide{grid-column:1/-1}',
    '.no-field label{display:flex;align-items:center;gap:6px;margin-bottom:4px;font-weight:600;font-size:13px}',
    '.no-field input,.no-field select,.no-field textarea,.no-source{width:100%;height:38px;padding:0 12px;border:1px solid var(--line);border-radius:var(--radius);background:#fff}',
    '.no-field textarea,.no-source{height:auto;padding:10px 12px;resize:vertical}',
    '.no-field input:hover,.no-field select:hover,.no-field textarea:hover{border-color:var(--dark)}',
    '.no-hint,.no-note{margin-top:4px;font-size:12px;color:var(--mute)}',
    '.no-err{margin-top:4px;font-size:12px;color:#a4170c;font-weight:600}',
    '.no-err:empty,.no-note:empty{display:none}',
    '.no-field.is-error input,.no-field.is-error select,.no-field.is-error textarea{border:2px solid #a4170c}',
    '.no-field.is-uncertain input,.no-field.is-uncertain select{border:2px dashed var(--dark);background:#fafafa}',
    '.no-field.is-missing input,.no-field.is-missing select{border-style:dashed}',
    '.no-count{text-align:right;font-size:12px;color:var(--mute)}',
    '.no-actions{display:flex;justify-content:space-between;margin-top:22px}',
    '.no-banner{padding:10px 14px;margin-bottom:16px;border:1px solid var(--line);border-radius:var(--radius);background:var(--soft);font-size:13px}',
    '.no-banner strong{display:block}',
    '.no-or{display:flex;align-items:center;gap:12px;margin:14px 0;color:var(--mute);font-size:12px}',
    '.no-or::before,.no-or::after{content:"";flex:1;border-top:1px solid var(--line-2)}',
    '.no-drop{padding:24px;border:2px dashed var(--line);border-radius:var(--radius);text-align:center}',
    '.no-drop.is-over{border-color:var(--dark);background:var(--soft)}',
    '.no-file{display:flex;justify-content:space-between;align-items:center;margin-top:10px;padding:8px 12px;border:1px solid var(--line);border-radius:var(--radius)}',
    '.no-center{text-align:center;padding:48px 24px}',
    '.no-spin{width:34px;height:34px;margin:0 auto 14px;border:3px dashed var(--dark);border-radius:50%;animation:no-r 1.2s linear infinite}',
    '@keyframes no-r{to{transform:rotate(360deg)}}',
    '.no-skel{max-width:420px;height:34px;margin:10px auto;background:var(--soft);border-radius:var(--radius)}',
    '.no-icon{display:inline-flex;align-items:center;justify-content:center;width:36px;height:36px;margin-bottom:10px;border:2px solid var(--dark);border-radius:50%;font-weight:600}',
    '.no-split{display:grid;grid-template-columns:300px 1fr;gap:16px;align-items:start}',
    '.no-src{white-space:pre-wrap;line-height:1.6}',
    '.no-mark{background:none;text-decoration:underline;text-decoration-thickness:2px;text-underline-offset:3px}',
    '.no-overlay{position:fixed;inset:0;z-index:100;display:flex;align-items:center;justify-content:center;padding:16px;background:rgba(0,0,0,.5)}',
    '.no-dialog{position:relative;width:360px;max-width:100%;padding:28px 24px 22px;border-radius:var(--radius);background:#fff;text-align:center}',
    '.no-dialog p{margin:6px 0 18px}',
    '.no-dbtns{display:flex;flex-direction:column;gap:8px}',
    '.no-x{position:absolute;top:8px;right:12px;border:0;background:none;font-size:22px;cursor:pointer}',
    '@media(max-width:720px){.no-grid,.no-split{grid-template-columns:1fr}.no-row3{grid-template-columns:1fr}.no-swap{margin:0;width:100%}}'
  ].join('');

  /* ---------- шаблон ---------- */
  function controlHtml(f) {
    var id = 'id="no-' + f.key + '" name="' + f.key + '" aria-describedby="no-d-' + f.key + '"';
    switch (f.key) {
      case 'from': case 'to':
        return '<input ' + id + ' type="text" list="no-cities" autocomplete="off" placeholder="Например, Санкт-Петербург">';
      case 'loadDate': return '<input ' + id + ' type="date" min="' + today() + '">';
      case 'truckType':
        return '<select ' + id + '><option value="">Выберите тип машины</option>' +
          DATA.truckTypes.map(function (t) { return '<option>' + esc(t) + '</option>'; }).join('') + '</select>';
      case 'weightT': return '<input ' + id + ' type="number" step="0.1" min="0" inputmode="decimal" placeholder="Например, 20">';
      case 'clientRate': return '<input ' + id + ' type="number" step="1" min="1" inputmode="numeric" placeholder="Например, 88000">';
      default: return '<textarea ' + id + ' rows="3" maxlength="' + CFG.NOTES_MAX + '" placeholder="Например, погрузка до 12:00, нужны ремни и коники"></textarea>' +
        '<div class="no-count" data-el="count">0/' + CFG.NOTES_MAX + '</div>';
    }
  }
  function fieldHtml(f, cls) {
    return '<div class="no-field ' + (cls || '') + '" data-field="' + f.key + '">' +
      '<label for="no-' + f.key + '">' + f.label + (REQUIRED.indexOf(f.key) >= 0 ? ' <span aria-hidden="true">*</span>' : '') +
      ' <span class="no-ai" data-el="badge" hidden>ИИ</span></label>' + controlHtml(f) +
      '<div class="no-hint" id="no-d-' + f.key + '">' + (f.hint || '') + '</div>' +
      '<div class="no-note" data-el="note"></div><div class="no-err" data-el="err" role="alert"></div></div>';
  }
  function formHtml() {
    return '<form class="no-form" novalidate>' +
      '<div class="no-banner" data-el="ai-banner" hidden><strong>ИИ разобрал заявку. Проверьте данные</strong><span data-el="ai-count"></span></div>' +
      '<div class="no-grid"><div class="no-row3">' + fieldHtml(F.from) +
      '<button type="button" class="no-swap" data-act="swap" aria-label="Поменять пункты местами">⇄</button>' + fieldHtml(F.to) + '</div>' +
      fieldHtml(F.loadDate) + fieldHtml(F.truckType) + fieldHtml(F.weightT) + fieldHtml(F.clientRate) + fieldHtml(F.notes, 'no-wide') + '</div>' +
      '<div class="no-actions"><button type="button" class="btn" data-act="cancel">Отмена</button>' +
      '<button type="submit" class="btn btn--primary" data-el="save">Сохранить заявку</button></div>' +
      '<datalist id="no-cities"></datalist></form>';
  }
  function viewHtml() {
    return '<nav id="crumbs"></nav>' +
      '<div class="page-head"><div><h1>Новая заявка</h1><p class="muted" data-el="sub"></p></div></div>' +
      '<div class="no-tabs" role="tablist">' +
        '<button type="button" class="no-tab" role="tab" data-tab="manual">Заполнить вручную</button>' +
        '<button type="button" class="no-tab" role="tab" data-tab="text">Из текста или файла <span class="no-ai">ИИ</span></button></div>' +
      '<section class="card no-card" data-pane="manual"><div data-slot="manual"></div></section>' +
      '<div data-pane="text">' +
        '<section class="card no-card" data-stage="input">' +
          '<label for="no-source"><strong>Текст заявки</strong></label>' +
          '<textarea id="no-source" class="no-source" rows="6" placeholder="Вставьте письмо, сообщение из мессенджера или заметку"></textarea>' +
          '<div class="no-or">или</div>' +
          '<div class="no-drop" data-el="drop"><div><strong>Перетащите файл сюда</strong></div>' +
            '<p><button type="button" class="btn" data-act="pick">Выбрать файл</button></p>' +
            '<div class="muted">PDF, DOCX, XLSX, TXT, до ' + CFG.FILE_MAX_MB + ' МБ</div>' +
            '<input type="file" data-el="file" accept=".pdf,.docx,.xlsx,.txt" hidden></div>' +
          '<div class="no-err" data-el="file-err" role="alert"></div>' +
          '<div class="no-file" data-el="file-chip" hidden><span data-el="file-name"></span><button type="button" class="btn" data-act="unfile">Убрать</button></div>' +
          '<div class="no-banner" style="margin-top:16px">ИИ только предлагает значения. Заявка создаётся после вашей проверки и нажатия «Сохранить заявку».</div>' +
          '<div class="no-actions"><button type="button" class="btn" data-act="cancel">Отмена</button>' +
          '<button type="button" class="btn btn--primary" data-act="parse" disabled>Разобрать заявку</button></div></section>' +
        '<section class="card no-card no-center" data-stage="parsing" hidden><div class="no-spin"></div>' +
          '<h2>ИИ разбирает заявку…</h2><p class="muted">Обычно это занимает несколько секунд</p>' +
          '<div class="no-skel"></div><div class="no-skel"></div><div class="no-skel"></div>' +
          '<button type="button" class="btn" data-act="abort">Отменить разбор</button></section>' +
        '<section class="card no-card no-center" data-stage="fail" hidden><div class="no-icon">!</div><h2>Не удалось разобрать заявку</h2>' +
          '<p class="muted">Сервис разбора недоступен или в тексте не нашлось данных заявки.<br>Введённый текст сохранён.</p>' +
          '<button type="button" class="btn btn--primary" data-act="retry">Повторить</button> ' +
          '<button type="button" class="btn" data-act="manual">Заполнить вручную</button></section>' +
        '<div class="no-split" data-stage="result" hidden>' +
          '<section class="card no-card"><h3>Исходный текст</h3><p class="no-src" data-el="src"></p>' +
            '<button type="button" class="btn" data-act="other">← Ввести другой текст</button></section>' +
          '<section class="card no-card" data-slot="result"></section></div>' +
      '</div>';
  }

  /* ---------- открытие / закрытие ---------- */
  function open() {
    if (S) return;
    var host = document.querySelector('main.page');
    if (!host) return;
    S = { host: host, tab: 'manual', stage: 'input', aiOrig: {}, token: 0, file: null, fileText: '', title: document.title };
    if (!document.getElementById('no-styles')) {
      var st = document.createElement('style'); st.id = 'no-styles'; st.textContent = CSS; document.head.appendChild(st);
    }
    S.view = document.createElement('main');
    S.view.className = 'page'; S.view.id = 'no-view';
    S.view.innerHTML = viewHtml();
    host.hidden = true;
    host.parentNode.insertBefore(S.view, host.nextSibling);

    S.form = document.createElement('div');
    S.form.innerHTML = formHtml();
    S.form = S.form.firstChild;
    var cities = {};
    (Exp.load('orders') || []).forEach(function (o) { cities[o.from] = 1; cities[o.to] = 1; });
    S.form.querySelector('#no-cities').innerHTML = Object.keys(cities).map(function (c) { return '<option value="' + esc(c) + '">'; }).join('');

    Exp.crumbs([['Заявки', 'orders.html'], ['Новая заявка']]);
    document.title = 'Новая заявка — Экспедитор';
    bind();
    render();
    ctl('from').focus();
    window.scrollTo(0, 0);
  }

  function closeView() {
    if (!S) return;
    S.token++;
    S.view.remove();
    S.host.hidden = false;
    document.title = S.title;
    S = null;
  }

  /* ---------- привязка событий ---------- */
  function bind() {
    S.view.addEventListener('click', function (e) {
      var t = e.target.closest('[data-tab],[data-act]');
      if (!t) return;
      if (t.dataset.tab) { S.tab = t.dataset.tab; render(); return; }
      var act = t.dataset.act;
      if (act === 'cancel') confirmLeave(closeView);
      else if (act === 'swap') {
        var a = ctl('from'), b = ctl('to'), x = a.value; a.value = b.value; b.value = x;
        clearMark('from'); clearMark('to');
      }
      else if (act === 'pick') $('[data-el=file]').click();
      else if (act === 'unfile') setFile(null);
      else if (act === 'parse') startParse();
      else if (act === 'abort') { S.token++; S.stage = 'input'; render(); }
      else if (act === 'retry') startParse();
      else if (act === 'manual') { S.tab = 'manual'; render(); }
      else if (act === 'other') { S.stage = 'input'; S.tab = 'text'; render(); }
    });

    S.form.addEventListener('submit', function (e) { e.preventDefault(); save(); });
    S.form.addEventListener('input', function (e) {
      var key = e.target.name;
      if (!key) return;
      clearMark(key); setError(key, '');
      if (key === 'notes') S.form.querySelector('[data-el=count]').textContent = e.target.value.length + '/' + CFG.NOTES_MAX;
    });
    S.form.addEventListener('change', function (e) { if (e.target.name) { clearMark(e.target.name); setError(e.target.name, ''); } });

    $('#no-source').addEventListener('input', updateParseBtn);
    var drop = $('[data-el=drop]');
    $('[data-el=file]').addEventListener('change', function (e) { setFile(e.target.files[0] || null); e.target.value = ''; });
    ['dragenter', 'dragover'].forEach(function (n) { drop.addEventListener(n, function (e) { e.preventDefault(); drop.classList.add('is-over'); }); });
    ['dragleave', 'drop'].forEach(function (n) { drop.addEventListener(n, function (e) { e.preventDefault(); drop.classList.remove('is-over'); }); });
    drop.addEventListener('drop', function (e) { if (e.dataTransfer.files[0]) setFile(e.dataTransfer.files[0]); });

    // уход через меню шапки или крошку «Заявки»
    S.onDocClick = function (e) {
      if (!S) return;
      var a = e.target.closest('#app-header a, #crumbs a');
      if (!a) return;
      var inCrumbs = !!a.closest('#crumbs');
      if (!inCrumbs && !dirty()) return;               // обычный переход
      e.preventDefault();
      confirmLeave(function () { if (inCrumbs) closeView(); else { S.leaving = true; location.href = a.href; } });
    };
    document.addEventListener('click', S.onDocClick, true);
    S.onUnload = function (e) { if (S && dirty() && !S.leaving) { e.preventDefault(); e.returnValue = ''; } };
    window.addEventListener('beforeunload', S.onUnload);
  }

  function render() {
    var manual = S.tab === 'manual';
    $$('.no-tab').forEach(function (b) { b.setAttribute('aria-selected', String(b.dataset.tab === S.tab)); });
    $('[data-pane=manual]').hidden = !manual;
    $('[data-pane=text]').hidden = manual;
    $('[data-el=sub]').textContent = manual ? 'Заполните основные данные заявки'
      : 'Вставьте текст или загрузите файл — ИИ заполнит форму, а вы проверите';
    $$('[data-stage]').forEach(function (s) { s.hidden = s.dataset.stage !== S.stage; });
    var slot = (!manual && S.stage === 'result') ? $('[data-slot=result]') : $('[data-slot=manual]');
    if (S.form.parentNode !== slot) slot.appendChild(S.form);
    S.form.querySelector('[data-el=ai-banner]').hidden = !(S.stage === 'result' && !manual);
    updateParseBtn();
  }

  /* ---------- значения и проверка ---------- */
  function values() {
    var v = {};
    FIELDS.forEach(function (f) { v[f.key] = ctl(f.key).value.trim(); });
    return v;
  }
  function dirty() {
    if (!S) return false;
    return FIELDS.some(function (f) { return ctl(f.key).value.trim() !== ''; }) ||
      $('#no-source').value.trim() !== '' || !!S.file;
  }

  function validate(v) {
    var e = {};
    if (!v.from) e.from = 'Укажите пункт отправления';
    if (!v.to) e.to = 'Укажите пункт назначения';
    else if (v.from && v.from.toLowerCase() === v.to.toLowerCase()) e.to = 'Пункты отправления и назначения совпадают';
    if (!v.loadDate) e.loadDate = 'Укажите дату загрузки';
    else if (v.loadDate < today()) e.loadDate = 'Дата загрузки не может быть в прошлом';
    if (!v.truckType) e.truckType = 'Выберите тип машины из списка';
    if (!v.weightT) e.weightT = 'Укажите вес груза';
    else if (!(+v.weightT > 0) || +v.weightT > CFG.MAX_WEIGHT) e.weightT = 'Вес должен быть от 0,1 до ' + CFG.MAX_WEIGHT + ' т';
    if (!v.clientRate) e.clientRate = 'Укажите ставку клиента';
    else if (Math.round(+v.clientRate) !== +v.clientRate) e.clientRate = 'Ставка — целое число, без копеек';
    else if (+v.clientRate < 1 || +v.clientRate > CFG.MAX_RATE) e.clientRate = 'Ставка должна быть от 1 до 10 000 000 ₽';
    if (v.notes.length > CFG.NOTES_MAX) e.notes = 'Не больше ' + CFG.NOTES_MAX + ' символов';
    return e;
  }

  function setError(key, msg) {
    var box = field(key);
    box.classList.toggle('is-error', !!msg);
    box.querySelector('[data-el=err]').textContent = msg ? 'ⓘ ' + msg : '';
    ctl(key).setAttribute('aria-invalid', msg ? 'true' : 'false');
  }

  /* ---------- пометки ИИ ---------- */
  function mark(key, note, kind) {
    var box = field(key);
    box.querySelector('[data-el=badge]').hidden = (kind === 'missing');
    box.classList.toggle('is-uncertain', kind === 'uncertain');
    box.classList.toggle('is-missing', kind === 'missing');
    box.querySelector('[data-el=note]').textContent = note ? 'ⓘ ' + note : '';
  }
  function clearMark(key) {
    var box = field(key);
    box.querySelector('[data-el=badge]').hidden = true;
    box.classList.remove('is-uncertain', 'is-missing');
    box.querySelector('[data-el=note]').textContent = '';
  }

  /* ---------- имитация разбора ---------- */
  function nominative(word) {
    var t = word.toLowerCase();
    if (ALIASES[t]) return ALIASES[t];
    var found = null, cities = {};
    (Exp.load('orders') || []).forEach(function (o) { cities[o.from] = 1; cities[o.to] = 1; });
    Object.keys(cities).forEach(function (c) {
      var cl = c.toLowerCase();
      if (found && found.toLowerCase() === t) return;
      if (cl === t) { found = c; return; }
      var n = Math.max(4, Math.min(cl.length, t.length) - 2);
      if (!found && Math.abs(cl.length - t.length) <= 3 && cl.slice(0, n) === t.slice(0, n)) found = c;
    });
    return found;
  }
  function resolveCity(raw) { // → { name, used } : used — сколько текста реально взято
    var words = raw.trim().split(/\s+/);
    for (var n = words.length; n >= 1; n--) {
      var cand = words.slice(0, n).join(' '), hit = nominative(cand);
      if (hit) return { name: hit, used: cand };
    }
    var cap = [words[0]];                                  // неизвестный город: берём слова с заглавной («Нижний Новгород»)
    for (var i = 1; i < words.length && /^[А-ЯЁ]/.test(words[i]); i++) cap.push(words[i]);
    return { name: cap.join(' '), used: cap.join(' ') };
  }

  function parseText(src) {
    var res = { values: {}, spans: {}, notes: {} }, m;
    function span(key, from, len) { (res.spans[key] = res.spans[key] || []).push([from, from + len]); }
    function inGroup(m, g, key) { span(key, m.index + m[0].indexOf(g), g.length); }

    m = src.match(/(?<![\p{L}])(?:[Ии]з|[Оо]т)\s+([А-ЯЁ][\p{L}.\- ]{1,30}?)\s+(?:в|до)\s+([А-ЯЁ][\p{L}.\- ]{1,30})/u) ||
        src.match(/([А-ЯЁ][\p{L}\-]+(?: [А-ЯЁ][\p{L}\-]+)?)\s*(?:→|->|\s[—–-]\s)\s*([А-ЯЁ][\p{L}\-]+(?: [А-ЯЁ][\p{L}\-]+)?)/u);
    if (m) {
      var a = resolveCity(m[1]), b = resolveCity(m[2]);
      res.values.from = a.name; res.values.to = b.name;
      inGroup(m, a.used, 'from'); inGroup(m, b.used, 'to');
    }

    var tr = TRUCKS.filter(function (t) { return t[1].test(src) && DATA.truckTypes.indexOf(t[0]) >= 0; })[0];
    if (tr) { res.values.truckType = tr[0]; m = src.match(tr[1]); span('truckType', m.index, m[0].length); }
    else if ((m = src.match(/(?<![\p{L}])(?:евро)?фур\p{L}*/iu))) {
      res.values.truckType = 'Тент'; span('truckType', m.index, m[0].length);
      res.notes.truckType = 'Проверьте: в тексте «' + m[0] + '», выбран «Тент»';
    }

    if ((m = src.match(/(\d+(?:[.,]\d+)?)\s*(?:тонн\p{L}*|т(?![\p{L}]))/u))) { res.values.weightT = m[1].replace(',', '.'); span('weightT', m.index, m[0].length); }

    if ((m = src.match(/(\d{2})\.(\d{2})\.(\d{4})/))) { res.values.loadDate = m[3] + '-' + m[2] + '-' + m[1]; span('loadDate', m.index, m[0].length); }
    else if ((m = src.match(/(\d{1,2})\s+(января|февраля|марта|апреля|мая|июня|июля|августа|сентября|октября|ноября|декабря)(?:\s+(\d{4}))?/i))) {
      res.values.loadDate = (m[3] || today().slice(0, 4)) + '-' + pad(MONTHS[m[2].toLowerCase()]) + '-' + pad(m[1]);
      span('loadDate', m.index, m[0].length);
    }

    if ((m = src.match(/ставк\p{L}*\s*[:—-]?\s*(\d[\d \u00a0]*)/iu)) || (m = src.match(/(\d[\d \u00a0]{2,})\s*(?:₽|руб|р\.)/i))) {
      res.values.clientRate = m[1].replace(/[ \u00a0]/g, ''); span('clientRate', m.index, m[0].trim().length);
    }

    var notes = [];
    if ((m = src.match(/(?:доп\.?\s*)?условия\s*[:—-]\s*([^\n]+)/i))) { notes.push(m[1].trim()); inGroup(m, m[1], 'notes'); }
    else {
      var re = /погрузк\p{L}*\s+до\s+\d{1,2}[:.]\d{2}|нужн(?:ы|о)\s+[^.\n!,]+/giu;
      while ((m = re.exec(src))) { notes.push(m[0].trim()); span('notes', m.index, m[0].length); }
    }
    if (notes.length) res.values.notes = notes.join(', ').replace(/^./, function (c) { return c.toUpperCase(); });
    return res;
  }

  function onlyRequired(vals) { return REQUIRED.filter(function (k) { return vals[k]; }).length; }

  function highlight(src, spans) {
    var list = [];
    Object.keys(spans).forEach(function (k) { spans[k].forEach(function (s) { list.push(s); }); });
    list.sort(function (a, b) { return a[0] - b[0]; });
    var out = '', pos = 0;
    list.forEach(function (s) {
      if (s[0] < pos) return;
      out += esc(src.slice(pos, s[0])) + '<mark class="no-mark">' + esc(src.slice(s[0], s[1])) + '</mark>';
      pos = s[1];
    });
    return out + esc(src.slice(pos));
  }

  function sourceText() { return $('#no-source').value.trim() || S.fileText || ''; }

  function startParse() {
    var src = sourceText();
    if (!src) return;
    var token = ++S.token;
    S.stage = 'parsing'; render();
    setTimeout(function () {
      if (!S || token !== S.token) return;                      // отменили разбор
      var res = parseText(src);
      if (NewOrder.simulateFailure || onlyRequired(res.values) < 2) { S.stage = 'fail'; render(); return; }
      applyResult(res, src);
    }, CFG.PARSE_DELAY);
  }

  function applyResult(res, src) {
    FIELDS.forEach(function (f) { ctl(f.key).value = ''; clearMark(f.key); setError(f.key, ''); });
    S.aiOrig = {};
    FIELDS.forEach(function (f) {
      var val = res.values[f.key];
      if (val) {
        ctl(f.key).value = val;
        S.aiOrig[f.key] = ctl(f.key).value;
        mark(f.key, res.notes[f.key] || '', res.notes[f.key] ? 'uncertain' : 'ok');
        field(f.key).querySelector('[data-el=badge]').hidden = false;
      } else if (REQUIRED.indexOf(f.key) >= 0) {
        mark(f.key, 'Не нашли в тексте — укажите вручную', 'missing');
      }
    });
    S.form.querySelector('[data-el=count]').textContent = ctl('notes').value.length + '/' + CFG.NOTES_MAX;
    S.form.querySelector('[data-el=ai-count]').textContent =
      'Заполнено ' + onlyRequired(res.values) + ' из ' + REQUIRED.length + ' обязательных полей. Отмечены поля, где нужна ваша проверка';
    $('[data-el=src]').innerHTML = highlight(src, res.spans);
    S.stage = 'result'; S.tab = 'text'; render();
  }

  /* ---------- файл ---------- */
  function updateParseBtn() {
    var b = S.view.querySelector('[data-act=parse]');
    if (b) b.disabled = !($('#no-source').value.trim() || S.file);
  }
  function setFile(f) {
    var err = $('[data-el=file-err]');
    err.textContent = '';
    if (!f) { S.file = null; S.fileText = ''; }
    else {
      var ext = (f.name.split('.').pop() || '').toLowerCase();
      if (CFG.FILE_EXT.indexOf(ext) < 0) { err.textContent = 'ⓘ Формат не поддерживается. Загрузите PDF, DOCX, XLSX или TXT'; return; }
      if (f.size > CFG.FILE_MAX_MB * 1048576) { err.textContent = 'ⓘ Файл больше ' + CFG.FILE_MAX_MB + ' МБ'; return; }
      S.file = f;
      if (ext === 'txt') {
        var rd = new FileReader();
        rd.onload = function () { S.fileText = String(rd.result || ''); };
        rd.readAsText(f);
      } else S.fileText = DEMO_SAMPLE;
    }
    $('[data-el=file-chip]').hidden = !S.file;
    $('[data-el=file-name]').textContent = S.file ? S.file.name : '';
    updateParseBtn();
  }

  /* ---------- «Уйти без сохранения?» ---------- */
  function confirmLeave(onLeave) {
    if (!dirty()) { onLeave(); return; }
    if (S.dialog) return;
    var o = document.createElement('div');
    o.className = 'no-overlay';
    o.innerHTML = '<div class="no-dialog" role="alertdialog" aria-modal="true" aria-labelledby="no-dt">' +
      '<button type="button" class="no-x" data-d="stay" aria-label="Остаться">×</button><div class="no-icon">!</div>' +
      '<h2 id="no-dt">Уйти без сохранения?</h2><p class="muted">Введённые данные не сохранятся.</p>' +
      '<div class="no-dbtns"><button type="button" class="btn btn--primary" data-d="stay">Остаться</button>' +
      '<button type="button" class="btn" data-d="leave">Уйти</button></div></div>';
    document.body.appendChild(o);
    S.dialog = o;
    function done() { document.removeEventListener('keydown', onKey); o.remove(); if (S) S.dialog = null; }
    function onKey(e) { if (e.key === 'Escape') done(); }
    document.addEventListener('keydown', onKey);
    o.addEventListener('click', function (e) {
      var d = e.target.closest('[data-d]');
      if (d && d.dataset.d === 'leave') { done(); onLeave(); }
      else if ((d && d.dataset.d === 'stay') || e.target === o) done();   // крестик = «Остаться»
    });
    o.querySelector('[data-d=stay].btn').focus();
  }

  /* ---------- сохранение ---------- */
  function nextId(list) {
    return list.reduce(function (m, o) { return Math.max(m, Number(o.id) || 0); }, 1000) + 1;
  }
  function fmt(key, val) {
    if (key === 'clientRate') return Exp.money(val);
    if (key === 'loadDate') return Exp.date(val);
    if (key === 'weightT') return val + ' т';
    return val || '—';
  }
  // «после разбора изменил: ставка клиента, было 83 000 ₽ → стало 85 000 ₽»
  function aiChanges(v) {
    var parts = [];
    FIELDS.forEach(function (f) {
      if (S.aiOrig[f.key] !== undefined && String(S.aiOrig[f.key]) !== String(v[f.key]))
        parts.push(f.short + ', было ' + fmt(f.key, S.aiOrig[f.key]) + ' → стало ' + fmt(f.key, v[f.key]));
    });
    return parts.length ? 'после разбора изменил: ' + parts.join('; ') : '';
  }

  function save() {
    var v = values(), errs = validate(v), first = null;
    FIELDS.forEach(function (f) { setError(f.key, errs[f.key]); if (errs[f.key] && !first) first = f.key; });
    if (first) { ctl(first).focus(); return; }

    var btn = S.form.querySelector('[data-el=save]');
    btn.disabled = true; btn.textContent = 'Сохранение…';          // защита от двойного клика

    var list = Exp.load('orders') || [], fromAi = Object.keys(S.aiOrig).length > 0;
    var order = {
      id: nextId(list), from: v.from, to: v.to, truckType: v.truckType,
      weightT: +v.weightT, loadDate: v.loadDate, clientRate: +v.clientRate,
      cargo: '', notes: v.notes, status: 'new', createdAt: nowIso(),
      logist: Exp.user.login, source: fromAi ? 'ai' : 'manual',
      carrierId: null, carrierRate: null, lossReason: null
    };
    Exp.save('orders', [order].concat(list));

    var journal = Exp.load('journal') || [];
    var entry = { at: order.createdAt, orderId: order.id, who: Exp.user.login,
      action: 'Создал заявку (способ: ' + (fromAi ? 'из текста или файла' : 'вручную') + ')' };
    var detail = fromAi ? aiChanges(v) : '';
    if (detail) entry.detail = detail;
    journal.push(entry);
    Exp.save('journal', journal);

    document.dispatchEvent(new CustomEvent('orders:changed', { detail: order }));
    S.leaving = true;
    location.href = 'order.html?id=' + order.id;                    // Figma: после сохранения — карточка «Новая»
  }

  document.addEventListener('click', function (e) {
    var t = e.target.closest && e.target.closest('#new-order-btn, [data-new-order]');
    if (t) { e.preventDefault(); open(); }
  });

  var NewOrder = { open: open, parseText: parseText, validate: validate, simulateFailure: false };
  window.NewOrder = NewOrder;
})();
