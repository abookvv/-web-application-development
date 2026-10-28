/* js/order-logic.js — логика карточки заявки (вёрстку делает Таисия)
   Подключать после data.js и app.js. Всё — через window.OrderLogic.
   Для вёрстки главное: OrderLogic.view(orderId) и действия search / chooseCarrier / changeRate / close / cancel / markLost.
   ATI.SU — имитация: предложения генерируются, сервера нет. */
(function () {
  'use strict';

  var CFG = {
    SEARCH_DELAY: 1500,                       // мс «Идёт подбор…»
    // Рейтинг 0–100 (формула из ТЗ): стоимость 35 + опыт 20 + репутация 30 + тип машины 15
    RATING: { COST: 35, EXP: 20, REP: 30, TYPE: 15, REF_RATE: 75000, EXP_FULL_TRIPS: 20, CLAIMS_ZERO_SHARE: 0.25, NEUTRAL_REP: 15 },
    VERIFIED_MIN_TRIPS: 5,                    // «Проверенный»: своя база, от 5 рейсов, репутация не «Плохая»
    RATE_RATIO: [0.80, 0.95],                 // ставки предложений — доля от ставки клиента
    MAX_RATE: 10000000                        // ставка перевозчика: целое от 1 до 10 000 000 ₽
  };

  var STEPS = ['new', 'in_work', 'carrier_chosen', 'closed'];
  var SOURCE_LABEL = { ati: 'ATI.SU', own: 'Наша база' };
  var ATI_POOL = ['ООО «ТрансЮг»', 'ИП Фёдоров М. П.', 'ООО «Север-Авто»', 'ООО «Магистраль-Плюс»', 'ИП Григорьев Е. Н.',
    'ООО «ЕвроТранс»', 'ООО «Дальний Путь»', 'ИП Морозов И. С.', 'ООО «Лидер-Груз»', 'ООО «Сибирский тракт»'];
  var searching = {};
  var demo = { atiDown: false, empty: false }; // для показа: OrderLogic.demo.atiDown = true / .empty = true

  /* ---------- мелочи ---------- */
  function pad(n) { return String(n).padStart(2, '0'); }
  function nowIso() {
    var d = new Date();
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + 'T' + pad(d.getHours()) + ':' + pad(d.getMinutes());
  }
  function rnd(seed) { // mulberry32 — одинаковый seed даёт одинаковые предложения
    var t = seed >>> 0;
    return function () {
      t += 0x6D2B79F5;
      var r = Math.imul(t ^ t >>> 15, 1 | t);
      r = r + Math.imul(r ^ r >>> 7, 61 | r) ^ r;
      return ((r ^ r >>> 14) >>> 0) / 4294967296;
    };
  }
  function find(orders, id) {
    return orders.filter(function (o) { return String(o.id) === String(id); })[0] || null;
  }
  // Руководитель может вести заявку как логист, например когда логист заболел (US-13)
  function canAct() { return !!(Exp.user && (Exp.user.role === 'logist' || Exp.user.role === 'manager')); }
  function statusName(code) { return DATA.statuses[code]; }

  function addJournal(orderId, who, action, detail) {
    var j = Exp.load('journal') || [];
    var e = { at: nowIso(), orderId: orderId, who: who, action: action };
    if (detail) e.detail = detail;
    j.push(e);
    Exp.save('journal', j);
  }
  function changed(order) {
    document.dispatchEvent(new CustomEvent('order:changed', { detail: order }));
  }

  /* ---------- маржа, репутация, рейтинг ---------- */
  function calcMargin(clientRate, carrierRate) {
    var c = Number(clientRate), k = Number(carrierRate);
    if (!(c > 0) || !(k > 0)) return null;
    return { value: c - k, pct: Math.round((c - k) / c * 1000) / 10 };
  }

  // ФТ-64: Хорошая — претензий нет, Средняя — до 15%, Плохая — более 15%; без истории — «нет данных»
  function reputation(o) {
    var trips = Number(o.trips) || 0, claims = Number(o.claims) || 0;
    if (!trips) return { level: 'none', label: 'Нет данных', text: 'нет данных — нет истории', share: null };
    var share = claims / trips;
    var level = claims === 0 ? 'good' : share <= 0.15 ? 'mid' : 'bad';
    var label = { good: 'Хорошая', mid: 'Средняя', bad: 'Плохая' }[level];
    return { level: level, label: label, text: label + ', ' + claims + ' из ' + trips, share: share };
  }

  // Рейтинг 0–100 (формула из ТЗ):
  //   Стоимость  = 35 × 75 000 / ставка (не больше 35)
  //   Опыт       = 20 × min(рейсов / 20; 1)
  //   Репутация  = 30 × (1 − min(доля претензий / 0,25; 1)); без истории — нейтральные 15
  //   Тип машины = 15, если совпадает
  function calcRating(offer, order) {
    var R = CFG.RATING, trips = Number(offer.trips) || 0, parts = {};
    parts.cost = Number(offer.rate) > 0 ? Math.min(R.COST, R.COST * R.REF_RATE / Number(offer.rate)) : 0;
    parts.experience = R.EXP * Math.min(trips / R.EXP_FULL_TRIPS, 1);
    parts.reputation = trips > 0
      ? R.REP * (1 - Math.min(((Number(offer.claims) || 0) / trips) / R.CLAIMS_ZERO_SHARE, 1))
      : R.NEUTRAL_REP;
    parts.type = (!offer.truckTypes || offer.truckTypes.indexOf(order.truckType) >= 0) ? R.TYPE : 0;
    var total = 0;
    Object.keys(parts).forEach(function (k) { parts[k] = Math.round(parts[k]); total += parts[k]; });
    return { total: total, parts: parts };
  }

  // Строки для подсказки (i) «Как посчитан рейтинг»
  function explainRating(offer) {
    var R = CFG.RATING, p = offer.rating.parts, trips = Number(offer.trips) || 0;
    return [
      'Стоимость — ' + p.cost + ' из ' + R.COST + ': чем ниже ставка, тем выше балл (точка отсчёта — ' + Exp.money(R.REF_RATE) + ')',
      'Опыт — ' + p.experience + ' из ' + R.EXP + ': ' + trips + ' рейсов (полный балл от ' + R.EXP_FULL_TRIPS + ')',
      'Репутация — ' + p.reputation + ' из ' + R.REP + (trips
        ? ': претензий ' + (offer.claims || 0) + ' из ' + trips
        : ': нет истории, начислен нейтральный балл ' + R.NEUTRAL_REP),
      'Тип машины — ' + p.type + ' из ' + R.TYPE + (p.type ? ': тип совпадает с заявкой' : ': тип не совпадает с заявкой')
    ];
  }

  // Данные для подсказки (i) «О перевозчике»
  function carrierInfo(offer) {
    return {
      name: offer.name, sourceLabel: SOURCE_LABEL[offer.source], inn: offer.inn || null, phone: offer.phone || null,
      trips: Number(offer.trips) || 0, claims: Number(offer.claims) || 0, lastTrip: offer.lastTrip || null,
      reputation: reputation(offer)
    };
  }

  /* ---------- подбор (имитация ATI.SU + своя база) ---------- */
  function fakePhone(rand) {
    return '+7 (' + (900 + Math.floor(rand() * 99)) + ') ' + (100 + Math.floor(rand() * 899)) + '-' + pad(Math.floor(rand() * 100)) + '-' + pad(Math.floor(rand() * 100));
  }

  function generateOffers(order, run, carriers) {
    var rand = rnd(Number(order.id) * 1000 + run * 31 + 7);
    var lo = CFG.RATE_RATIO[0], hi = CFG.RATE_RATIO[1];
    function rate() { return Math.round(order.clientRate * (lo + rand() * (hi - lo)) / 1000) * 1000; }
    var offers = [];
    if (demo.empty) return offers;

    carriers.forEach(function (c) {
      if (c.source !== 'own' || (c.truckTypes || []).indexOf(order.truckType) < 0) return;
      var r = rate();
      if (run > 1 && rand() < 0.15) return; // при повторном подборе кто-то снял отклик
      offers.push({ key: 'own-' + c.id, source: 'own', carrierId: c.id, name: c.name, rate: r,
        trips: c.trips, claims: c.claims, lastTrip: c.lastTrip, inn: c.inn, phone: c.phone, truckTypes: c.truckTypes });
    });

    if (!demo.atiDown) {
      var pool = ATI_POOL.slice().sort(function () { return rand() - 0.5; });
      var n = 2 + Math.floor(rand() * 4); // 2–5 предложений с ATI.SU
      for (var i = 0; i < n; i++) {
        offers.push({ key: 'ati-' + run + '-' + i, source: 'ati', carrierId: null, name: pool[i], rate: rate(),
          trips: null, claims: null, lastTrip: null, inn: null, phone: fakePhone(rand), truckTypes: [order.truckType] });
      }
    }
    return offers;
  }

  // Рейтинг, метки, сортировка
  function rank(order) {
    var raw = order.offers || [];
    var list = raw.map(function (o) {
      var x = {}; Object.keys(o).forEach(function (k) { x[k] = o[k]; });
      x.sourceLabel = SOURCE_LABEL[o.source];
      x.truckType = order.truckType;
      x.margin = calcMargin(order.clientRate, o.rate);
      x.rating = calcRating(o, order);
      x.reputation = reputation(o);
      x.badges = [];
      return x;
    });
    if (!list.length) return list;

    var best = list.slice().sort(function (a, b) { return b.rating.total - a.rating.total || a.rate - b.rate; })[0];
    var minRate = Math.min.apply(null, list.map(function (x) { return x.rate; }));
    list.forEach(function (x) {
      if (x === best) x.badges.push('Рекомендуем');
      if (x.source === 'own' && (Number(x.trips) || 0) >= CFG.VERIFIED_MIN_TRIPS && x.reputation.level !== 'bad') x.badges.push('Проверенный');
      if (x.rate === minRate) x.badges.push('Самый дешёвый');
      x.isChosen = String(order.chosenKey || '') === x.key;
    });
    return sortOffers(list, 'rating', 'desc');
  }

  // По клику на заголовок «Ставка» / «Рейтинг»: key = 'rate' | 'rating', dir = 'asc' | 'desc'
  function sortOffers(list, key, dir) {
    var k = key === 'rate' ? function (x) { return x.rate; } : function (x) { return x.rating.total; };
    var s = dir === 'asc' ? 1 : -1;
    return list.slice().sort(function (a, b) { return s * (k(a) - k(b)) || a.rate - b.rate; });
  }

  /* ---------- действия ---------- */
  function guard(orderId, allowed) {
    if (!canAct()) return { ok: false, error: 'Менять заявки могут только логист и руководитель' };
    var orders = Exp.load('orders'), order = find(orders, orderId);
    if (!order) return { ok: false, error: 'Заявка не найдена' };
    if (allowed.indexOf(order.status) < 0)
      return { ok: false, error: 'В статусе «' + statusName(order.status) + '» это действие недоступно' };
    return { ok: true, orders: orders, order: order };
  }

  function offerCounts(offers) {
    var a = offers.filter(function (o) { return o.source === 'ati'; }).length;
    return { ati: a, own: offers.length - a };
  }

  // «Подобрать перевозчиков» / «Подобрать заново». Возвращает Promise; пока идёт — isSearching(id) === true.
  function search(orderId) {
    var g = guard(orderId, ['new', 'in_work']);
    if (!g.ok) return Promise.resolve(g);
    if (searching[orderId]) return Promise.resolve({ ok: false, error: 'Подбор уже идёт' });
    searching[orderId] = true;
    return new Promise(function (resolve) {
      setTimeout(function () {
        delete searching[orderId];
        var g2 = guard(orderId, ['new', 'in_work']);
        if (!g2.ok) { resolve(g2); return; }
        var o = g2.order, run = (o.searchRun || 0) + 1;
        o.offers = generateOffers(o, run, Exp.load('carriers'));
        o.searchRun = run;
        o.atiUnavailable = !!demo.atiDown && !demo.empty;
        o.chosenKey = null;
        if (o.status === 'new') o.status = 'in_work';
        Exp.save('orders', g2.orders);
        var c = offerCounts(o.offers), atiTxt = o.atiUnavailable ? 'недоступна' : c.ati;
        addJournal(o.id, 'system', o.offers.length
          ? 'Подбор: получено ' + o.offers.length + ' предложений (ATI.SU — ' + atiTxt + ', своя база — ' + c.own + ')'
          : 'Подбор: предложений не найдено (ATI.SU — ' + (o.atiUnavailable ? 'недоступна' : 0) + ', своя база — 0)');
        changed(o);
        resolve({ ok: true, order: o });
      }, CFG.SEARCH_DELAY);
    });
  }

  /* ---------- ставка перевозчика и маржа ---------- */
  function checkRate(rate) {
    var r = Number(rate);
    if (rate === '' || rate == null || !isFinite(r)) return 'Укажите ставку перевозчика';
    if (Math.round(r) !== r) return 'Ставка — целое число, без копеек';
    if (r < 1 || r > CFG.MAX_RATE) return 'Ставка должна быть от 1 до 10 000 000 ₽';
    return '';
  }
  function marginInfo(clientRate, rate) {
    var m = calcMargin(clientRate, rate);
    if (!m) return null;
    return { value: m.value, pct: m.pct,
      level: m.value > 0 ? 'positive' : m.value === 0 ? 'zero' : 'negative',
      nonPositive: m.value <= 0,
      warning: m.value <= 0 ? 'Маржа отрицательная или нулевая. Ставка перевозчика не ниже ставки клиента, на этой заявке компания не заработает' : null };
  }

  // Для окна «Выбрать перевозчика»: пересчёт маржи при вводе ставки (88 000 − 79 000 = 9 000 ₽, 10,2%)
  function previewChoice(orderId, offerKey, rate) {
    var o = find(Exp.load('orders'), orderId);
    if (!o) return { ok: false, error: 'Заявка не найдена' };
    var offer = rank(o).filter(function (x) { return x.key === offerKey; })[0];
    if (!offer) return { ok: false, error: 'Предложение не найдено' };
    var r = rate == null ? offer.rate : rate, err = checkRate(r);
    return { ok: true, offer: offer, clientRate: o.clientRate, rate: Number(r), rateError: err,
      margin: err ? null : marginInfo(o.clientRate, r) };
  }

  // «Подтвердить выбор». opts.rate — ставка, если договорились о другой; opts.confirmLoss — «Всё равно подтвердить»
  function chooseCarrier(orderId, offerKey, opts) {
    opts = opts || {};
    var g = guard(orderId, ['in_work']);
    if (!g.ok) return g;
    var o = g.order, ranked = rank(o);
    var offer = ranked.filter(function (x) { return x.key === offerKey; })[0];
    if (!offer) return { ok: false, error: 'Предложение не найдено. Подберите перевозчиков заново' };
    var rate = opts.rate == null ? offer.rate : Number(opts.rate), err = checkRate(rate);
    if (err) return { ok: false, error: err };
    var m = marginInfo(o.clientRate, rate);
    if (m.nonPositive && !opts.confirmLoss) return { ok: false, needsConfirm: true, error: m.warning, margin: m };
    var best = ranked.filter(function (x) { return x.badges.indexOf('Рекомендуем') >= 0; })[0];

    o.status = 'carrier_chosen';
    o.chosenKey = offer.key;
    o.carrierId = offer.carrierId;       // у перевозчика с ATI.SU id нет — он не из своей базы
    o.carrierName = offer.name;
    o.carrierPhone = offer.phone || null;
    o.carrierRate = rate;
    Exp.save('orders', g.orders);
    addJournal(o.id, Exp.user.login, 'Выбрал перевозчика: ' + offer.name + ', ставка ' + Exp.money(rate),
      'оценка на момент выбора: ' + offer.rating.total + ' · ' + (best === offer
        ? 'совпадает с рекомендацией'
        : 'не совпадает с рекомендацией (рекомендован ' + best.name + ', оценка ' + best.rating.total + ')') +
      (rate !== offer.rate ? ' · ставка изменена: в предложении было ' + Exp.money(offer.rate) : ''));
    changed(o);
    return { ok: true, order: o, margin: m };
  }

  // «Изменить ставку» в статусе «Перевозчик выбран»: маржа пересчитывается, прежнее значение — в журнал
  function changeRate(orderId, rate, opts) {
    opts = opts || {};
    var g = guard(orderId, ['carrier_chosen']);
    if (!g.ok) return g;
    var err = checkRate(rate);
    if (err) return { ok: false, error: err };
    var o = g.order, m = marginInfo(o.clientRate, rate), old = o.carrierRate;
    if (m.nonPositive && !opts.confirmLoss) return { ok: false, needsConfirm: true, error: m.warning, margin: m };
    o.carrierRate = Number(rate);
    Exp.save('orders', g.orders);
    addJournal(o.id, Exp.user.login, 'Изменил ставку перевозчика', 'было ' + Exp.money(old) + ' → стало ' + Exp.money(o.carrierRate));
    changed(o);
    return { ok: true, order: o, margin: m };
  }

  function close(orderId) {
    var g = guard(orderId, ['carrier_chosen']);
    if (!g.ok) return g;
    var o = g.order, m = calcMargin(o.clientRate, o.carrierRate);
    if (!m) return { ok: false, error: 'Нельзя закрыть заявку без ставки перевозчика' };
    o.status = 'closed';
    Exp.save('orders', g.orders);
    addJournal(o.id, Exp.user.login, 'Закрыл заявку', 'маржа: ' + Exp.money(m.value));
    changed(o);
    return { ok: true, order: o };
  }

  function cancel(orderId) { // доступна только в «Новая» и «В работе»
    var g = guard(orderId, ['new', 'in_work']);
    if (!g.ok) return g;
    var o = g.order, from = o.status;
    o.status = 'cancelled';
    Exp.save('orders', g.orders);
    addJournal(o.id, Exp.user.login, 'Отменил заявку', 'статус: «' + statusName(from) + '» → «' + statusName('cancelled') + '»');
    changed(o);
    return { ok: true, order: o };
  }

  function markLost(orderId, reason) {
    var g = guard(orderId, ['new', 'in_work', 'carrier_chosen']);
    if (!g.ok) return g;
    if (DATA.lossReasons.indexOf(reason) < 0) return { ok: false, error: 'Выберите причину из списка' };
    var o = g.order;
    o.status = 'lost';
    o.lossReason = reason;
    Exp.save('orders', g.orders);
    addJournal(o.id, Exp.user.login, 'Отметил заявку потерянной', 'причина: «' + reason + '»');
    changed(o);
    return { ok: true, order: o };
  }

  /* ---------- всё для вёрстки ---------- */
  function view(orderId) {
    var o = find(Exp.load('orders'), orderId);
    if (!o) return null;
    var offers = rank(o), st = o.status, act = canAct();
    var working = st === 'new' || st === 'in_work' || st === 'carrier_chosen';
    var idx = STEPS.indexOf(st), searched = (o.searchRun || 0) > 0;
    var own = !!(o.chosenKey && o.chosenKey.indexOf('own') === 0);
    var chosen = (st === 'carrier_chosen' || st === 'closed') && o.carrierRate ? {
      name: o.carrierName, source: own ? 'own' : 'ati', sourceLabel: own ? SOURCE_LABEL.own : SOURCE_LABEL.ati,
      phone: o.carrierPhone || null, clientRate: o.clientRate, carrierRate: o.carrierRate,
      margin: marginInfo(o.clientRate, o.carrierRate), offersCount: offers.length
    } : null;
    return {
      order: o,
      statusLabel: statusName(st),
      // для полосы статусов; у отменённых и потерянных полосы нет (steps = null)
      steps: idx < 0 ? null : STEPS.map(function (code, i) {
        return { code: code, label: statusName(code), state: i < idx ? 'done' : i === idx ? 'current' : 'todo' };
      }),
      searching: !!searching[o.id],
      hasSearched: searched,
      offers: offers,
      offersSummary: 'Найдено предложений: ' + offers.length + '. Лучшие по рейтингу вверху.',
      // плашка «ATI.SU недоступна»: счётчик считает только доступные предложения
      atiUnavailable: searched && !!o.atiUnavailable && offers.length > 0,
      atiNotice: { title: 'Данные ATI.SU в подбор не вошли', text: 'Биржа не ответила, показаны только перевозчики из вашей базы' },
      // «Подходящих предложений не нашлось»
      empty: searched && offers.length === 0,
      emptyText: 'ATI.SU и ваша база ответили, но ни одно предложение не подошло. Измените параметры заявки или подберите заново позже',
      chosen: chosen,                                   // блок «Выбранный перевозчик» (+ «Предложения при подборе (N)»)
      successMessage: chosen ? 'Перевозчик выбран: ' + chosen.name + ', ставка ' + Exp.money(chosen.carrierRate) : null,
      margin: chosen ? chosen.margin : null,
      can: {
        search: act && (st === 'new' || st === 'in_work') && !searching[o.id],
        choose: act && st === 'in_work' && offers.length > 0,
        changeRate: act && st === 'carrier_chosen',
        close: act && st === 'carrier_chosen',
        cancel: act && (st === 'new' || st === 'in_work'),   // в «Перевозчик выбран» кнопка скрыта
        lost: act && working,
        edit: act && working
      },
      lossReasons: DATA.lossReasons,
      journal: (Exp.load('journal') || []).filter(function (e) { return String(e.orderId) === String(o.id); })
        .sort(function (a, b) { return a.at < b.at ? -1 : 1; })
    };
  }

  window.OrderLogic = {
    CFG: CFG, demo: demo, view: view, search: search, isSearching: function (id) { return !!searching[id]; },
    previewChoice: previewChoice, chooseCarrier: chooseCarrier, changeRate: changeRate,
    close: close, cancel: cancel, markLost: markLost,
    sortOffers: sortOffers, explainRating: explainRating, carrierInfo: carrierInfo,
    calcMargin: calcMargin, calcRating: calcRating, reputation: reputation
  };
})();
