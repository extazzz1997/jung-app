"use strict";

// Мини-апп «Мой юнгианский профиль». Тянет профиль с бэкенда бота по подписанному
// Telegram initData и рисует его дашбордом. Секретов на фронте нет: initData —
// подписанный токен, бэкенд проверяет подпись и сам ходит в Supabase.

const tg = window.Telegram ? window.Telegram.WebApp : null;

const STATUS_LABELS = {
  emerging: "намёк",
  working: "гипотеза",
  confirmed_by_user: "подтверждено",
};
const CONFIDENCE_LABELS = { low: "низкая", medium: "средняя", high: "высокая" };

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
}

function setView(node) {
  document.getElementById("app").replaceChildren(node);
}

function stateView(title, sub) {
  const wrap = el("section", "state");
  wrap.appendChild(el("div", "state-mark", "✦"));
  wrap.appendChild(el("p", "state-title", title));
  if (sub) wrap.appendChild(el("p", "muted", sub));
  return wrap;
}

// --- сеть -------------------------------------------------------------------

async function fetchProfile() {
  const base = (window.JUNG_CONFIG && window.JUNG_CONFIG.API_BASE) || "";
  const initData = tg && tg.initData ? tg.initData : "";
  if (!initData) throw new Error("no-init-data");

  const res = await fetch(base.replace(/\/$/, "") + "/api/profile", {
    headers: { Authorization: "tma " + initData },
  });
  if (res.status === 401) throw new Error("unauthorized");
  if (!res.ok) throw new Error("http-" + res.status);
  return (await res.json()).profile; // null, если профиля ещё нет
}

// --- кусочки UI -------------------------------------------------------------

function ring(percent) {
  const p = Math.max(0, Math.min(100, percent));
  const wrap = el("div", "ring");
  wrap.innerHTML = `
    <svg viewBox="0 0 80 80" class="ring-svg" aria-hidden="true">
      <defs>
        <linearGradient id="rg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="var(--accent)" />
          <stop offset="100%" stop-color="var(--accent-2)" />
        </linearGradient>
      </defs>
      <circle class="ring-track" cx="40" cy="40" r="34" />
      <circle class="ring-prog" cx="40" cy="40" r="34"
        stroke-dasharray="${(2 * Math.PI * 34).toFixed(1)}"
        stroke-dashoffset="${(2 * Math.PI * 34 * (1 - p / 100)).toFixed(1)}" />
    </svg>
    <div class="ring-label"><span class="ring-num">${p}%</span><span class="ring-cap">профиль</span></div>`;
  return wrap;
}

function statChip(value, label, tint) {
  const chip = el("div", "chip chip--" + tint);
  chip.appendChild(el("div", "chip-val", String(value)));
  chip.appendChild(el("div", "chip-label", label));
  return chip;
}

function confidencePill(confidence) {
  const pill = el("span", "pill pill--conf", "уверенность: " + (CONFIDENCE_LABELS[confidence] || "—"));
  pill.dataset.level = confidence || "";
  return pill;
}

function insightCard(item) {
  const card = el("article", "card");
  if (item.user_confirmed) card.classList.add("card--confirmed");

  const head = el("div", "card-head");
  head.appendChild(el("h3", "card-title", item.label || item.name));
  const st = el("span", "pill pill--status", STATUS_LABELS[item.status] || item.status);
  st.dataset.status = item.status;
  head.appendChild(st);
  card.appendChild(head);

  card.appendChild(el("p", "card-summary", item.summary));

  const meta = el("div", "card-meta");
  meta.appendChild(confidencePill(item.confidence));
  if (item.user_confirmed) meta.appendChild(el("span", "pill pill--ok", "✓ ты подтвердил"));
  if (item.evidence_count) meta.appendChild(el("span", "muted small", item.evidence_count + " набл."));
  card.appendChild(meta);
  return card;
}

function groupBlock(title, items) {
  const sec = el("section", "group");
  sec.appendChild(el("h2", "group-title", title));
  items.forEach((it) => sec.appendChild(insightCard(it)));
  return sec;
}

// --- сборка профиля ---------------------------------------------------------

function renderProfile(p) {
  const root = el("div", "profile");

  // верхняя строка: бренд + дата обновления
  const top = el("header", "topbar");
  const brand = el("div", "brand");
  brand.appendChild(el("div", "brand-kicker", "ЮНГИАНСКИЙ ПРОФИЛЬ"));
  brand.appendChild(el("div", "brand-name", p.pseudonym || "Аноним"));
  top.appendChild(brand);
  const upd = fmtDate(p.updated_at);
  if (upd) top.appendChild(el("div", "datepill", upd));
  root.appendChild(top);

  // герой: интро + кольцо заполненности
  const hero = el("section", "hero");
  const left = el("div", "hero-text");
  left.appendChild(el("h1", "hero-title", "Что я о тебе понял"));
  const c = p.completeness;
  left.appendChild(
    el(
      "p",
      "hero-sub",
      c.is_sufficient
        ? "Профиль сформирован — дальше он только углубляется в разговорах."
        : "Профиль ещё формируется. Чем больше говорим — тем точнее картина.",
    ),
  );
  if (!c.is_sufficient && c.missing && c.missing.length) {
    left.appendChild(el("p", "hero-missing", "Не хватает: " + c.missing.join(", ")));
  }
  hero.appendChild(left);
  hero.appendChild(ring(c.percent));
  root.appendChild(hero);

  // чипы-метрики
  const confirmed = p.sections.filter((s) => s.user_confirmed).length;
  const evidence = p.sections.reduce((n, s) => n + (s.evidence_count || 0), 0);
  const stats = el("section", "stats");
  stats.appendChild(statChip(p.sections.length, "раскрыто разделов", "ink"));
  stats.appendChild(statChip(p.archetypes ? p.archetypes.length : 0, "активных архетипов", "mint"));
  stats.appendChild(statChip(confirmed, "подтверждено тобой", "peach"));
  stats.appendChild(statChip(evidence, "наблюдений в основе", "peri"));
  root.appendChild(stats);

  // разделы
  const core = p.sections.filter((s) => s.group === "core");
  const enrichment = p.sections.filter((s) => s.group === "enrichment");
  if (core.length) root.appendChild(groupBlock("Основа", core));
  else
    root.appendChild(
      (() => {
        const s = el("section", "group");
        s.appendChild(el("h2", "group-title", "Основа"));
        s.appendChild(el("p", "muted small", "Базовые разделы пока пусты — расскажи о себе побольше."));
        return s;
      })(),
    );
  if (enrichment.length) root.appendChild(groupBlock("Глубинные слои", enrichment));
  if (p.archetypes && p.archetypes.length) root.appendChild(groupBlock("Активные архетипы", p.archetypes));

  const foot = el("footer", "footer");
  foot.appendChild(
    el("p", "muted small", "Это рабочие гипотезы, а не диагноз. Что-то не так — поправь меня в разговоре."),
  );
  root.appendChild(foot);
  return root;
}

function fmtDate(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d)) return null;
  const m = ["янв", "фев", "мар", "апр", "мая", "июн", "июл", "авг", "сен", "окт", "ноя", "дек"];
  return d.getDate() + " " + m[d.getMonth()];
}

function renderEmpty() {
  return stateView(
    "Профиль ещё пуст",
    "Мы пока толком не разговаривали. Напиши боту что-нибудь о себе — и я начну понимать.",
  );
}

// --- запуск -----------------------------------------------------------------

async function main() {
  if (tg) {
    tg.ready();
    tg.expand();
  }
  try {
    const profile = await fetchProfile();
    setView(profile ? renderProfile(profile) : renderEmpty());
  } catch (e) {
    const msg =
      e.message === "unauthorized"
        ? "Не удалось подтвердить, что это ты. Открой мини-апп из чата с ботом."
        : e.message === "no-init-data"
          ? "Эту страницу нужно открывать из Telegram — кнопкой «Мой профиль»."
          : "Не получилось загрузить профиль. Попробуй позже.";
    setView(stateView("Упс", msg));
  }
}

main();
