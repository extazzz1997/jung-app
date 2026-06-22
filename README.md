# jung-app — Telegram Mini App «Мой юнгианский профиль»

Статическая страница мини-аппа для [jung-bot](../jung-bot). Показывает пользователю
его юнгианский профиль: заполненность, разделы-гипотезы (тень, персона, паттерны…)
с уровнем уверенности и активные архетипы.

Данные тянутся с бэкенда бота (`GET /api/profile`) по подписанному Telegram
`initData`. Секретов на фронте нет.

## Файлы

- `index.html` — разметка + подключение Telegram SDK.
- `app.js` — загрузка профиля и рендер (чистый JS, без сборки).
- `styles.css` — стили, цвета из Telegram `themeParams` (свет/тьма).
- `config.js` — **единственное, что правится при деплое:** `API_BASE` (URL бэкенда).

## Деплой (GitHub Pages)

1. Создать публичный repo `jung-app`, запушить эти файлы.
2. Settings → Pages → Deploy from branch → `main` / root. Получить URL вида
   `https://<user>.github.io/jung-app/`.
3. Вписать в `config.js` → `API_BASE` публичный HTTPS-адрес бэкенда бота.
4. В `.env` бота задать `WEBAPP_URL` (= URL этой страницы) и
   `WEBAPP_ALLOWED_ORIGIN` (= `https://<user>.github.io`), перезапустить бота —
   он сам поставит кнопку-меню «Мой профиль».

## Важно про бэкенд

Бот крутится через launchd на ноуте и **публичного домена не имеет**. Чтобы страница
(на GitHub Pages, HTTPS) достучалась до `/api/profile`, бэкенду нужен HTTPS-туннель —
например Cloudflare Tunnel (`cloudflared`) или ngrok на `WEBAPP_PORT`. Адрес туннеля
и идёт в `API_BASE` + `WEBAPP_ALLOWED_ORIGIN` бэкенда.
