// Конфигурация фронтенда мини-аппа. Правится при деплое — не трогает app.js.
//
// API_BASE — публичный HTTPS-адрес aiohttp-бэкенда бота (эндпоинт /api/profile).
// Бот деплоится через launchd на ноуте и НЕ имеет публичного домена сам по себе —
// нужен HTTPS-туннель (Cloudflare Tunnel / ngrok) или reverse-proxy. Впиши его URL сюда.
// Пример: "https://jung-api.example.com"
window.JUNG_CONFIG = {
  API_BASE: "https://CHANGE-ME.example.com",
};
