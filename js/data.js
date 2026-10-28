// Демо-данные сайта. Сервера нет — все страницы берут данные отсюда.
// Изменения (новые заявки, смена статусов) страницы сохраняют в localStorage через Exp.save().
// Наполнено: 19 заявок во всех статусах у четырёх логистов, 10 перевозчиков, журнал действий по заявкам.

window.DATA = {
  // «Сегодня» для демо. Данные ниже статичны, поэтому панель руководителя считает периоды
  // (день / неделя / месяц) от этой даты, а не от часов компьютера. Заявки, созданные позже, считаются сегодняшними.
  today: '2026-10-26',

  // Учётные записи для входа. Пароль у всех демо-пользователей: 1234
  users: [
    { login: 'alexey', password: '1234', name: 'Смирнов Алексей', short: 'Алексей', role: 'logist', active: true },
    { login: 'maria', password: '1234', name: 'Ковалёва Мария', short: 'Мария', role: 'logist', active: true },
    { login: 'dmitry', password: '1234', name: 'Орлов Дмитрий', short: 'Дмитрий', role: 'logist', active: true },
    { login: 'olga', password: '1234', name: 'Петрова Ольга', short: 'Ольга', role: 'logist', active: true },
    { login: 'oleg', password: '1234', name: 'Волков Олег', short: 'Олег', role: 'manager', active: true },
    { login: 'irina', password: '1234', name: 'Белова Ирина', short: 'Ирина', role: 'admin', active: true },
    { login: 'sergey', password: '1234', name: 'Никитин Сергей', short: 'Сергей', role: 'logist', active: false }
  ],

  // Статусы заявки: код → подпись. Вкладки списка: рабочие / закрытые / отменённые и потерянные (ФТ-58)
  statuses: {
    new: 'Новая',
    in_work: 'В работе',
    carrier_chosen: 'Перевозчик выбран',
    closed: 'Закрыта',
    cancelled: 'Отменена',
    lost: 'Потеряна'
  },
  tabs: {
    work: ['new', 'in_work', 'carrier_chosen'],
    closed: ['closed'],
    lost: ['cancelled', 'lost']
  },

  // Типы машин — список из ФТ-62
  truckTypes: ['Тент', 'Рефрижератор', 'Изотерм', 'Борт', 'Цистерна', 'Самосвал', 'Трал'],

  // Закрытый список причин потери (ТЗ, раздел 8.3)
  lossReasons: [
    'Не нашли машину под требования заявки',
    'Клиент не согласился с ценой',
    'Клиент отказался от перевозки',
    'Опоздали с ответом, клиент отдал заявку другому исполнителю',
    'Не совпали по срокам или условиям загрузки'
  ],

  // Заявки. Даты — 'ГГГГ-ММ-ДД', время создания — 'ГГГГ-ММ-ДДTЧЧ:ММ'. Суммы — в рублях, целые.
  // logist — логин из users; source: 'manual' — вручную, 'ai' — из текста или файла; carrierId — из carriers.
  orders: [
    { id: 1024, from: 'Санкт-Петербург', to: 'Москва', truckType: 'Тент', weightT: 20, loadDate: '2026-10-21', clientRate: 88000, cargo: 'Бытовая техника на паллетах', status: 'in_work', createdAt: '2026-10-25T18:03', logist: 'alexey', source: 'manual', carrierId: null, carrierRate: null, lossReason: null },
    { id: 1023, from: 'Москва', to: 'Казань', truckType: 'Тент', weightT: 20, loadDate: '2026-10-22', clientRate: 85000, cargo: 'Стройматериалы', status: 'new', createdAt: '2026-10-25T14:27', logist: 'alexey', source: 'ai', carrierId: null, carrierRate: null, lossReason: null },
    { id: 1022, from: 'Екатеринбург', to: 'Санкт-Петербург', truckType: 'Рефрижератор', weightT: 10, loadDate: '2026-10-23', clientRate: 92000, cargo: 'Молочная продукция, +2…+6 °C', status: 'carrier_chosen', createdAt: '2026-10-24T16:12', logist: 'alexey', source: 'manual', carrierId: 1, carrierRate: 81000, lossReason: null },
    { id: 1021, from: 'Ростов-на-Дону', to: 'Москва', truckType: 'Тент', weightT: 20, loadDate: '2026-10-20', clientRate: 78000, cargo: 'Зерно в мешках', status: 'in_work', createdAt: '2026-10-24T11:20', logist: 'maria', source: 'manual', carrierId: null, carrierRate: null, lossReason: null },
    { id: 1020, from: 'Новосибирск', to: 'Москва', truckType: 'Тент', weightT: 20, loadDate: '2026-10-27', clientRate: 95000, cargo: 'Промышленное оборудование', status: 'new', createdAt: '2026-10-14T12:10', logist: 'maria', source: 'manual', carrierId: null, carrierRate: null, lossReason: null },
    { id: 1019, from: 'Казань', to: 'Санкт-Петербург', truckType: 'Тент', weightT: 20, loadDate: '2026-10-19', clientRate: 80000, cargo: 'Керамическая плитка', status: 'carrier_chosen', createdAt: '2026-10-13T09:05', logist: 'olga', source: 'manual', carrierId: 3, carrierRate: 71000, lossReason: null },
    { id: 1018, from: 'Самара', to: 'Москва', truckType: 'Борт', weightT: 10, loadDate: '2026-10-24', clientRate: 70000, cargo: 'Металлоконструкции', status: 'in_work', createdAt: '2026-10-13T15:30', logist: 'dmitry', source: 'manual', carrierId: null, carrierRate: null, lossReason: null },
    { id: 1017, from: 'Краснодар', to: 'Москва', truckType: 'Изотерм', weightT: 10, loadDate: '2026-10-26', clientRate: 105000, cargo: 'Овощи', status: 'new', createdAt: '2026-10-12T10:40', logist: 'alexey', source: 'manual', carrierId: null, carrierRate: null, lossReason: null },
    { id: 1015, from: 'Тверь', to: 'Москва', truckType: 'Борт', weightT: 10, loadDate: '2026-10-15', clientRate: 42000, cargo: 'Металлопрокат', status: 'closed', createdAt: '2026-10-10T09:15', logist: 'alexey', source: 'manual', carrierId: 2, carrierRate: 36000, lossReason: null },
    { id: 1014, from: 'Москва', to: 'Нижний Новгород', truckType: 'Тент', weightT: 20, loadDate: '2026-10-09', clientRate: 52000, cargo: 'Бытовая химия', status: 'closed', createdAt: '2026-10-06T10:20', logist: 'dmitry', source: 'manual', carrierId: 5, carrierRate: 45000, lossReason: null },
    { id: 1012, from: 'Москва', to: 'Казань', truckType: 'Тент', weightT: 20, loadDate: '2026-10-23', clientRate: 85000, cargo: 'Мебель', status: 'lost', createdAt: '2026-10-21T09:14', logist: 'alexey', source: 'manual', carrierId: null, carrierRate: null, lossReason: 'Опоздали с ответом, клиент отдал заявку другому исполнителю' },
    { id: 1011, from: 'Нижний Новгород', to: 'Самара', truckType: 'Тент', weightT: 5, loadDate: '2026-10-20', clientRate: 38000, cargo: 'Упаковка', status: 'cancelled', createdAt: '2026-10-18T11:02', logist: 'alexey', source: 'manual', carrierId: null, carrierRate: null, lossReason: null },
    { id: 1010, from: 'Санкт-Петербург', to: 'Великий Новгород', truckType: 'Борт', weightT: 10, loadDate: '2026-10-22', clientRate: 28000, cargo: 'Кирпич на поддонах', status: 'closed', createdAt: '2026-10-20T09:40', logist: 'maria', source: 'manual', carrierId: 2, carrierRate: 24000, lossReason: null },
    { id: 1009, from: 'Пермь', to: 'Екатеринбург', truckType: 'Цистерна', weightT: 20, loadDate: '2026-10-24', clientRate: 64000, cargo: 'Технические масла', status: 'lost', createdAt: '2026-10-20T10:05', logist: 'olga', source: 'manual', carrierId: null, carrierRate: null, lossReason: 'Опоздали с ответом, клиент отдал заявку другому исполнителю' },
    { id: 1008, from: 'Москва', to: 'Санкт-Петербург', truckType: 'Тент', weightT: 20, loadDate: '2026-10-23', clientRate: 89000, cargo: 'Офисная мебель', status: 'closed', createdAt: '2026-10-21T11:25', logist: 'olga', source: 'manual', carrierId: 1, carrierRate: 78000, lossReason: null },
    { id: 1007, from: 'Челябинск', to: 'Екатеринбург', truckType: 'Самосвал', weightT: 15, loadDate: '2026-10-23', clientRate: 41000, cargo: 'Щебень', status: 'lost', createdAt: '2026-10-22T10:30', logist: 'dmitry', source: 'manual', carrierId: null, carrierRate: null, lossReason: 'Клиент не согласился с ценой' },
    { id: 1006, from: 'Москва', to: 'Краснодар', truckType: 'Рефрижератор', weightT: 20, loadDate: '2026-10-25', clientRate: 118000, cargo: 'Охлаждённая рыба, 0…+4 °C', status: 'lost', createdAt: '2026-10-23T09:50', logist: 'maria', source: 'ai', carrierId: null, carrierRate: null, lossReason: 'Не нашли машину под требования заявки' },
    { id: 1005, from: 'Санкт-Петербург', to: 'Мурманск', truckType: 'Трал', weightT: 20, loadDate: '2026-10-26', clientRate: 142000, cargo: 'Экскаватор', status: 'lost', createdAt: '2026-10-22T14:05', logist: 'alexey', source: 'manual', carrierId: null, carrierRate: null, lossReason: 'Не совпали по срокам или условиям загрузки' },
    { id: 1004, from: 'Москва', to: 'Тула', truckType: 'Тент', weightT: 20, loadDate: '2026-10-22', clientRate: 38000, cargo: 'Упакованная одежда', status: 'closed', createdAt: '2026-10-20T16:50', logist: 'alexey', source: 'manual', carrierId: 4, carrierRate: 33000, lossReason: null }
  ],

  // Собственная база перевозчиков (её загружает администратор).
  // trips — выполнено рейсов, claims — претензий (репутация считается по их доле, ФТ-64), lastTrip — дата последнего рейса.
  // У ООО «Вектор» нет ИНН, у ООО «Волга-Карго» нет рейсов — это нужно для проверки пустых значений.
  carriers: [
    { id: 1, name: 'ТрансЛогистик', inn: '7801234567', phone: '+7 (812) 555-01-23', truckTypes: ['Тент', 'Рефрижератор', 'Изотерм'], trips: 15, claims: 0, lastTrip: '2026-09-28', source: 'own' },
    { id: 2, name: 'ИП Кузнецов Р. А.', inn: '780412345678', phone: '+7 (921) 400-12-45', truckTypes: ['Борт', 'Тент'], trips: 22, claims: 0, lastTrip: '2026-10-14', source: 'own' },
    { id: 3, name: 'ООО «Балт-Экспресс»', inn: '7802456789', phone: '+7 (812) 600-77-10', truckTypes: ['Тент', 'Изотерм'], trips: 12, claims: 1, lastTrip: '2026-10-02', source: 'own' },
    { id: 4, name: 'ИП Сидоров А. В.', inn: '781012345678', phone: '+7 (911) 234-56-78', truckTypes: ['Тент'], trips: 10, claims: 1, lastTrip: '2026-09-05', source: 'own' },
    { id: 5, name: 'ООО «Волга-Транзит»', inn: '1655123456', phone: '+7 (843) 211-33-44', truckTypes: ['Тент', 'Борт'], trips: 8, claims: 2, lastTrip: '2026-08-12', source: 'own' },
    { id: 6, name: 'ИП Назаров Д. К.', inn: '165512345678', phone: '+7 (903) 765-43-21', truckTypes: ['Тент', 'Самосвал'], trips: 5, claims: 1, lastTrip: '2026-06-20', source: 'own' },
    { id: 7, name: 'ООО «Рефтранс-Норд»', inn: '7810234567', phone: '+7 (812) 777-00-99', truckTypes: ['Рефрижератор', 'Изотерм'], trips: 5, claims: 2, lastTrip: '2026-04-10', source: 'own' },
    { id: 8, name: 'ООО «Волга-Карго»', inn: '1655234567', phone: '+7 (843) 222-10-10', truckTypes: ['Тент'], trips: 0, claims: 0, lastTrip: null, source: 'own' },
    { id: 9, name: 'ООО «Вектор»', inn: '', phone: '+7 (903) 111-22-33', truckTypes: ['Тент'], trips: 0, claims: 0, lastTrip: null, source: 'own' },
    { id: 10, name: 'ИП Лебедев К. С.', inn: '366512345678', phone: '+7 (473) 255-66-77', truckTypes: ['Тент', 'Борт'], trips: 3, claims: 0, lastTrip: '2026-09-18', source: 'own' }
  ],

  carriersUpdatedAt: '2026-10-18T14:32',

  // Журнал действий по заявкам (ФТ-27–ФТ-29): одна запись — одно действие.
  // at — 'ГГГГ-ММ-ДДTЧЧ:ММ', orderId — номер заявки, who — логин сотрудника или 'system',
  // action — что сделано, detail — необязательная вторая строка (старое → новое значение, причина, оценка перевозчика).
  journal: [
    { at: '2026-10-25T18:03', orderId: 1024, who: 'alexey', action: 'Создал заявку (способ: вручную)' },
    { at: '2026-10-25T18:09', orderId: 1024, who: 'system', action: 'Подбор: получено 6 предложений (ATI.SU — 4, своя база — 2)' },

    { at: '2026-10-25T14:27', orderId: 1023, who: 'alexey', action: 'Создал заявку (способ: из текста или файла)', detail: 'после разбора изменил: ставка клиента, было 83 000 ₽ → стало 85 000 ₽' },

    { at: '2026-10-24T16:12', orderId: 1022, who: 'alexey', action: 'Создал заявку (способ: вручную)' },
    { at: '2026-10-24T16:19', orderId: 1022, who: 'system', action: 'Подбор: получено 7 предложений (ATI.SU — 4, своя база — 3)' },
    { at: '2026-10-25T10:30', orderId: 1022, who: 'alexey', action: 'Выбрал перевозчика: ТрансЛогистик, ставка 81 000 ₽', detail: 'оценка на момент выбора: 88 · совпадает с рекомендацией' },

    { at: '2026-10-24T11:20', orderId: 1021, who: 'maria', action: 'Создал заявку (способ: вручную)' },
    { at: '2026-10-24T11:26', orderId: 1021, who: 'system', action: 'Подбор: получено 5 предложений (ATI.SU — 3, своя база — 2)' },

    { at: '2026-10-14T12:10', orderId: 1020, who: 'maria', action: 'Создал заявку (способ: вручную)' },

    { at: '2026-10-13T09:05', orderId: 1019, who: 'olga', action: 'Создал заявку (способ: вручную)' },
    { at: '2026-10-13T09:12', orderId: 1019, who: 'system', action: 'Подбор: получено 6 предложений (ATI.SU — 4, своя база — 2)' },
    { at: '2026-10-13T14:20', orderId: 1019, who: 'olga', action: 'Выбрал перевозчика: ООО «Балт-Экспресс», ставка 71 000 ₽', detail: 'оценка на момент выбора: 74 · не совпадает с рекомендацией (рекомендован ТрансЛогистик, оценка 86)' },

    { at: '2026-10-13T15:30', orderId: 1018, who: 'dmitry', action: 'Создал заявку (способ: вручную)' },
    { at: '2026-10-13T15:37', orderId: 1018, who: 'system', action: 'Подбор: получено 5 предложений (ATI.SU — 3, своя база — 2)' },

    { at: '2026-10-12T10:40', orderId: 1017, who: 'alexey', action: 'Создал заявку (способ: вручную)' },

    { at: '2026-10-10T09:15', orderId: 1015, who: 'alexey', action: 'Создал заявку (способ: вручную)' },
    { at: '2026-10-10T09:22', orderId: 1015, who: 'system', action: 'Подбор: получено 6 предложений (ATI.SU — 4, своя база — 2)' },
    { at: '2026-10-10T11:05', orderId: 1015, who: 'alexey', action: 'Выбрал перевозчика: ИП Кузнецов Р. А., ставка 36 000 ₽', detail: 'оценка на момент выбора: 91 · совпадает с рекомендацией' },
    { at: '2026-10-15T17:40', orderId: 1015, who: 'alexey', action: 'Закрыл заявку', detail: 'маржа: 6 000 ₽' },

    { at: '2026-10-06T10:20', orderId: 1014, who: 'dmitry', action: 'Создал заявку (способ: вручную)' },
    { at: '2026-10-06T10:27', orderId: 1014, who: 'system', action: 'Подбор: получено 8 предложений (ATI.SU — 5, своя база — 3)' },
    { at: '2026-10-06T13:10', orderId: 1014, who: 'dmitry', action: 'Выбрал перевозчика: ООО «Волга-Транзит», ставка 45 000 ₽', detail: 'оценка на момент выбора: 72 · совпадает с рекомендацией' },
    { at: '2026-10-09T18:25', orderId: 1014, who: 'dmitry', action: 'Закрыл заявку', detail: 'маржа: 7 000 ₽' },

    { at: '2026-10-21T09:14', orderId: 1012, who: 'alexey', action: 'Создал заявку (способ: вручную)' },
    { at: '2026-10-21T09:21', orderId: 1012, who: 'system', action: 'Подбор: получено 7 предложений (ATI.SU — 5, своя база — 2)' },
    { at: '2026-10-21T10:02', orderId: 1012, who: 'alexey', action: 'Изменил ставку клиента', detail: 'было 80 000 ₽ → стало 85 000 ₽' },
    { at: '2026-10-21T15:40', orderId: 1012, who: 'system', action: 'Обновил предложения: 2 перевозчика сняли отклик' },
    { at: '2026-10-22T11:05', orderId: 1012, who: 'alexey', action: 'Отметил заявку потерянной', detail: 'причина: «Опоздали с ответом, клиент отдал заявку другому исполнителю»' },

    { at: '2026-10-18T11:02', orderId: 1011, who: 'alexey', action: 'Создал заявку (способ: вручную)' },
    { at: '2026-10-18T11:40', orderId: 1011, who: 'alexey', action: 'Отменил заявку', detail: 'статус: «Новая» → «Отменена»' },

    { at: '2026-10-20T09:40', orderId: 1010, who: 'maria', action: 'Создал заявку (способ: вручную)' },
    { at: '2026-10-20T09:46', orderId: 1010, who: 'system', action: 'Подбор: получено 5 предложений (ATI.SU — 2, своя база — 3)' },
    { at: '2026-10-20T10:30', orderId: 1010, who: 'maria', action: 'Выбрал перевозчика: ИП Кузнецов Р. А., ставка 24 000 ₽', detail: 'оценка на момент выбора: 82 · совпадает с рекомендацией' },
    { at: '2026-10-22T18:10', orderId: 1010, who: 'maria', action: 'Закрыл заявку', detail: 'маржа: 4 000 ₽' },

    { at: '2026-10-20T10:05', orderId: 1009, who: 'olga', action: 'Создал заявку (способ: вручную)' },
    { at: '2026-10-20T10:11', orderId: 1009, who: 'system', action: 'Подбор: получено 5 предложений (ATI.SU — 4, своя база — 1)' },
    { at: '2026-10-20T16:30', orderId: 1009, who: 'system', action: 'Обновил предложения: 1 перевозчик снял отклик' },
    { at: '2026-10-21T09:50', orderId: 1009, who: 'olga', action: 'Отметил заявку потерянной', detail: 'причина: «Опоздали с ответом, клиент отдал заявку другому исполнителю»' },

    { at: '2026-10-21T11:25', orderId: 1008, who: 'olga', action: 'Создал заявку (способ: вручную)' },
    { at: '2026-10-21T11:31', orderId: 1008, who: 'system', action: 'Подбор: получено 6 предложений (ATI.SU — 4, своя база — 2)' },
    { at: '2026-10-21T12:15', orderId: 1008, who: 'olga', action: 'Выбрал перевозчика: ТрансЛогистик, ставка 78 000 ₽', detail: 'оценка на момент выбора: 95 · совпадает с рекомендацией' },
    { at: '2026-10-23T18:30', orderId: 1008, who: 'olga', action: 'Закрыл заявку', detail: 'маржа: 11 000 ₽' },

    { at: '2026-10-22T10:30', orderId: 1007, who: 'dmitry', action: 'Создал заявку (способ: вручную)' },
    { at: '2026-10-22T10:36', orderId: 1007, who: 'system', action: 'Подбор: получено 6 предложений (ATI.SU — 4, своя база — 2)' },
    { at: '2026-10-22T12:10', orderId: 1007, who: 'dmitry', action: 'Изменил ставку клиента', detail: 'было 44 000 ₽ → стало 41 000 ₽' },
    { at: '2026-10-22T16:45', orderId: 1007, who: 'dmitry', action: 'Отметил заявку потерянной', detail: 'причина: «Клиент не согласился с ценой»' },

    { at: '2026-10-23T09:50', orderId: 1006, who: 'maria', action: 'Создал заявку (способ: из текста или файла)' },
    { at: '2026-10-23T09:57', orderId: 1006, who: 'system', action: 'Подбор: предложений не найдено (ATI.SU — 0, своя база — 0)' },
    { at: '2026-10-23T14:20', orderId: 1006, who: 'maria', action: 'Отметил заявку потерянной', detail: 'причина: «Не нашли машину под требования заявки»' },

    { at: '2026-10-22T14:05', orderId: 1005, who: 'alexey', action: 'Создал заявку (способ: вручную)' },
    { at: '2026-10-22T14:12', orderId: 1005, who: 'system', action: 'Подбор: получено 5 предложений (ATI.SU — 3, своя база — 2)' },
    { at: '2026-10-22T17:30', orderId: 1005, who: 'alexey', action: 'Изменил дату загрузки', detail: 'было 24.10.2026 → стало 26.10.2026' },
    { at: '2026-10-23T11:15', orderId: 1005, who: 'alexey', action: 'Отметил заявку потерянной', detail: 'причина: «Не совпали по срокам или условиям загрузки»' },

    { at: '2026-10-20T16:50', orderId: 1004, who: 'alexey', action: 'Создал заявку (способ: вручную)' },
    { at: '2026-10-20T16:55', orderId: 1004, who: 'system', action: 'Подбор: получено 5 предложений (ATI.SU — 3, своя база — 2)' },
    { at: '2026-10-20T17:30', orderId: 1004, who: 'alexey', action: 'Выбрал перевозчика: ИП Сидоров А. В., ставка 33 000 ₽', detail: 'оценка на момент выбора: 77 · совпадает с рекомендацией' },
    { at: '2026-10-22T19:00', orderId: 1004, who: 'alexey', action: 'Закрыл заявку', detail: 'маржа: 5 000 ₽' }
  ]
};
