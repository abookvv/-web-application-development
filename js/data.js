// Демо-данные сайта. Сервера нет — все страницы берут данные отсюда.
// Изменения (новые заявки, смена статусов) страницы сохраняют в localStorage через Exp.save().
// Наполняет Вячеслав: ~15 заявок во всех статусах, 10 перевозчиков. Ниже — образец формата.

window.DATA = {
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

  truckTypes: ['Тент', 'Рефрижератор', 'Изотерм', 'Борт', 'Контейнер'],

  // Закрытый список причин потери (ТЗ, раздел 8.3)
  lossReasons: [
    'Не нашли машину под требования заявки',
    'Клиент не согласился с ценой',
    'Клиент отказался от перевозки',
    'Опоздали с ответом, клиент отдал заявку другому исполнителю',
    'Не совпали по срокам или условиям загрузки'
  ],

  // Заявки. Даты — 'ГГГГ-ММ-ДД', время создания — 'ГГГГ-ММ-ДДTЧЧ:ММ'. Суммы — в рублях, целые.
  orders: [
    { id: 1024, from: 'Санкт-Петербург', to: 'Москва', truckType: 'Тент', weightT: 20, loadDate: '2026-10-21', clientRate: 88000, cargo: 'Бытовая техника на паллетах', status: 'in_work', createdAt: '2026-10-25T18:03', logist: 'alexey', source: 'manual', carrierId: null, carrierRate: null, lossReason: null },
    { id: 1023, from: 'Москва', to: 'Казань', truckType: 'Тент', weightT: 20, loadDate: '2026-10-22', clientRate: 85000, cargo: 'Стройматериалы', status: 'new', createdAt: '2026-10-25T14:27', logist: 'alexey', source: 'ai', carrierId: null, carrierRate: null, lossReason: null },
    { id: 1022, from: 'Екатеринбург', to: 'Санкт-Петербург', truckType: 'Рефрижератор', weightT: 10, loadDate: '2026-10-23', clientRate: 92000, cargo: 'Молочная продукция, +2…+6 °C', status: 'carrier_chosen', createdAt: '2026-10-24T16:12', logist: 'alexey', source: 'manual', carrierId: 1, carrierRate: 81000, lossReason: null },
    { id: 1017, from: 'Краснодар', to: 'Москва', truckType: 'Изотерм', weightT: 10, loadDate: '2026-10-26', clientRate: 105000, cargo: 'Овощи', status: 'new', createdAt: '2026-10-12T10:40', logist: 'alexey', source: 'manual', carrierId: null, carrierRate: null, lossReason: null },
    { id: 1015, from: 'Тверь', to: 'Москва', truckType: 'Борт', weightT: 10, loadDate: '2026-10-15', clientRate: 42000, cargo: 'Металлопрокат', status: 'closed', createdAt: '2026-10-10T09:15', logist: 'alexey', source: 'manual', carrierId: 2, carrierRate: 36000, lossReason: null },
    { id: 1012, from: 'Москва', to: 'Казань', truckType: 'Тент', weightT: 20, loadDate: '2026-10-23', clientRate: 85000, cargo: 'Мебель', status: 'lost', createdAt: '2026-10-21T09:14', logist: 'alexey', source: 'manual', carrierId: null, carrierRate: null, lossReason: 'Опоздали с ответом, клиент отдал заявку другому исполнителю' },
    { id: 1011, from: 'Нижний Новгород', to: 'Самара', truckType: 'Тент', weightT: 5, loadDate: '2026-10-20', clientRate: 38000, cargo: 'Упаковка', status: 'cancelled', createdAt: '2026-10-18T11:02', logist: 'alexey', source: 'manual', carrierId: null, carrierRate: null, lossReason: null },
    { id: 1021, from: 'Ростов-на-Дону', to: 'Москва', truckType: 'Тент', weightT: 20, loadDate: '2026-10-20', clientRate: 78000, cargo: 'Зерно в мешках', status: 'in_work', createdAt: '2026-10-24T11:20', logist: 'maria', source: 'manual', carrierId: null, carrierRate: null, lossReason: null }
  ],

  // Собственная база перевозчиков (её загружает администратор)
  carriers: [
    { id: 1, name: 'ООО «ТрансЛайн»', inn: '7801234567', phone: '+7 921 555-12-34', truckTypes: ['Рефрижератор', 'Изотерм'], trips: 14, claims: 0, lastTrip: '2026-10-15', source: 'own' },
    { id: 2, name: 'ИП Кузнецов А. В.', inn: '502712345678', phone: '+7 916 222-33-44', truckTypes: ['Борт', 'Тент'], trips: 6, claims: 1, lastTrip: '2026-10-15', source: 'own' },
    { id: 3, name: 'ООО «Вектор»', inn: '', phone: '+7 903 111-22-33', truckTypes: ['Тент'], trips: 0, claims: 0, lastTrip: null, source: 'own' }
  ],

  carriersUpdatedAt: '2026-10-18T14:32'
};
