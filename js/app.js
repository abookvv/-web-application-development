// Общий код всех страниц: сессия, проверка роли, шапка, хлебные крошки, хранение данных.
// Подключается после js/data.js. На странице нужно:
//   <body data-page="orders" data-roles="logist,manager">  — код страницы и кому она доступна
//   <header id="app-header"></header>                       — сюда рисуется шапка

(function () {
  var ROLES = {
    logist: {
      title: 'Логист',
      home: 'orders.html',
      menu: [['orders', 'Заявки', 'orders.html'], ['carriers', 'Перевозчики', 'carriers.html']]
    },
    manager: {
      title: 'Руководитель',
      home: 'manager.html',
      menu: [['manager', 'Панель', 'manager.html'], ['orders', 'Заявки', 'orders.html'], ['carriers', 'Перевозчики', 'carriers.html']]
    },
    admin: {
      title: 'Администратор',
      home: 'admin.html',
      menu: [['admin', 'Администрирование', 'admin.html']]
    }
  };

  // Карточка заявки — часть раздела «Заявки», в меню подсвечиваем его
  var MENU_PARENT = { order: 'orders' };

  var SESSION_KEY = 'exp_session';
  var STORE_PREFIX = 'exp_';

  function storageGet(key) {
    try { return localStorage.getItem(key); } catch (e) { return null; }
  }
  function storageSet(key, value) {
    try { localStorage.setItem(key, value); } catch (e) { /* приватный режим — работаем без сохранения */ }
  }
  function storageRemove(key) {
    try { localStorage.removeItem(key); } catch (e) { }
  }

  // Сотрудников ведёт администратор, поэтому берём сохранённый список, а не только data.js
  function findUser(login) {
    return load('users').find(function (u) { return u.login === login; }) || null;
  }

  function currentUser() {
    var login = storageGet(SESSION_KEY);
    var user = login ? findUser(login) : null;
    return user && user.active ? user : null;
  }

  // Вызывает страница входа после всех своих проверок (ошибки, блокировка — на login.html)
  function startSession(login) {
    storageSet(SESSION_KEY, login);
    location.href = ROLES[findUser(login).role].home;
  }

  function logout() {
    storageRemove(SESSION_KEY);
    location.href = 'login.html';
  }

  // Данные: сначала то, что сохранили страницы, иначе копия из data.js
  function load(name) {
    var saved = storageGet(STORE_PREFIX + name);
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { }
    }
    return JSON.parse(JSON.stringify(DATA[name]));
  }
  function save(name, value) {
    storageSet(STORE_PREFIX + name, JSON.stringify(value));
  }
  // Сбросить демо-данные к исходным (удобно на защите): Exp.resetData()
  function resetData() {
    ['orders', 'carriers', 'users'].forEach(function (n) { storageRemove(STORE_PREFIX + n); });
  }

  function money(n) {
    return Number(n).toLocaleString('ru-RU') + ' ₽';
  }
  function date(iso) {
    var p = iso.slice(0, 10).split('-');
    return p[2] + '.' + p[1] + '.' + p[0];
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  var LOGO = '<svg width="30" height="21" viewBox="0 0 30 21" fill="none" aria-hidden="true">' +
    '<path d="M1.5 2.5h16v12h-16z" stroke="#3b3b3b" stroke-width="1.6" stroke-linejoin="round"/>' +
    '<path d="M17.5 7h6l4 4.5v3h-10z" stroke="#3b3b3b" stroke-width="1.6" stroke-linejoin="round"/>' +
    '<circle cx="7.5" cy="16.5" r="2.4" fill="#fff" stroke="#3b3b3b" stroke-width="1.6"/>' +
    '<circle cx="22.5" cy="16.5" r="2.4" fill="#fff" stroke="#3b3b3b" stroke-width="1.6"/></svg>';

  function renderHeader(user, page) {
    var el = document.getElementById('app-header');
    if (!el) return;
    var role = ROLES[user.role];
    var active = MENU_PARENT[page] || page;
    var menu = role.menu.map(function (m) {
      var cls = 'menu__item' + (m[0] === active ? ' is-active' : '');
      var aria = m[0] === active ? ' aria-current="page"' : '';
      return '<a class="' + cls + '" href="' + m[2] + '"' + aria + '>' + m[1] + '</a>';
    }).join('');
    el.className = 'app-header';
    el.innerHTML =
      '<div class="app-header__left">' +
        '<a class="brand" href="' + role.home + '">' + LOGO + 'Экспедитор</a>' +
        '<nav class="menu" aria-label="Основное меню">' + menu + '</nav>' +
      '</div>' +
      '<div class="app-header__right">' +
        '<div class="user"><span class="user__name">' + escapeHtml(user.short) + '</span>' +
        '<span class="user__role">' + role.title + '</span></div>' +
        '<button class="logout" type="button">Выйти</button>' +
      '</div>';
    el.querySelector('.logout').addEventListener('click', logout);
  }

  // Хлебные крошки: Exp.crumbs([['Заявки', 'orders.html'], ['Санкт-Петербург → Москва']])
  function crumbs(items) {
    var el = document.getElementById('crumbs');
    if (!el) return;
    el.className = 'crumbs';
    el.setAttribute('aria-label', 'Хлебные крошки');
    el.innerHTML = items.map(function (it, i) {
      var last = i === items.length - 1;
      var part = last || !it[1]
        ? '<span class="crumbs__current">' + escapeHtml(it[0]) + '</span>'
        : '<a href="' + it[1] + '">' + escapeHtml(it[0]) + '</a>';
      return part + (last ? '' : '<span class="crumbs__sep">/</span>');
    }).join('');
  }

  // Проверка входа и роли — сразу при загрузке скрипта, до отрисовки страницы
  var body = document.body;
  var page = body.getAttribute('data-page');
  var allowed = (body.getAttribute('data-roles') || '').split(',').filter(Boolean);
  var user = currentUser();

  if (page === 'login') {
    if (user) location.replace(ROLES[user.role].home);
  } else if (!user) {
    location.replace('login.html');
  } else if (allowed.length && allowed.indexOf(user.role) === -1) {
    // Нет доступа к странице (например, администратор и заявки — НФТ-09): на свою главную
    location.replace(ROLES[user.role].home);
  } else {
    renderHeader(user, page);
  }

  window.Exp = {
    roles: ROLES,
    user: user,
    findUser: findUser,
    startSession: startSession,
    logout: logout,
    load: load,
    save: save,
    resetData: resetData,
    crumbs: crumbs,
    money: money,
    date: date,
    escapeHtml: escapeHtml
  };
})();
