/* MIK.COM: current-day helper, direct week selection, sharing and offline support. */
(() => {
  const dayNames = ["ВОСКРЕСЕНЬЕ", "ПОНЕДЕЛЬНИК", "ВТОРНИК", "СРЕДА", "ЧЕТВЕРГ", "ПЯТНИЦА", "СУББОТА"];
  const $ = (selector, root = document) => root.querySelector(selector);
  const classicKey = "mik-classic-mode";
  let scheduleData = null;

  function mountExtras() {
    const dateTime = $(".date-time");
    const heading = $(".section-heading");
    if (dateTime && heading && !document.body.classList.contains("classic-mode")) {
      heading.insertAdjacentElement("afterend", dateTime);
    }

    const container = $("#scheduleContainer");
    if (container && !$("#todayOverview")) {
      const overview = document.createElement("div");
      overview.className = "today-overview";
      overview.id = "todayOverview";
      overview.innerHTML = '<div><small>СЕГОДНЯ</small><strong>Загружаем расписание…</strong><p>Подсказка по текущему дню</p></div><span class="today-mark">МИК-25</span>';
      container.insertAdjacentElement("beforebegin", overview);
    }

    const weekControls = $(".week-controls");
    if (weekControls && !$("#weekSelect")) {
      const select = document.createElement("select");
      select.id = "weekSelect";
      select.className = "week-select";
      select.setAttribute("aria-label", "Выбрать неделю");
      select.innerHTML = '<option value="1">1 неделя</option><option value="2">2 неделя</option>';
      const label = $("#currentWeekLabel");
      if (label) label.insertAdjacentElement("afterend", select);
      else weekControls.append(select);
      select.addEventListener("change", () => {
        const current = Number($("#weekSelect").value);
        const labelNow = $("#currentWeekLabel");
        const displayed = labelNow ? Number((labelNow.textContent.match(/\d+/) || [1])[0]) : Number($("#weekSelect").dataset.current || 1);
        const prev = $("#prevWeek"), next = $("#nextWeek");
        if (current > displayed) next?.click();
        if (current < displayed) prev?.click();
      });
    }

    if (!$("#quickActions")) {
      const actions = document.createElement("div");
      actions.className = "quick-actions";
      actions.id = "quickActions";
      actions.innerHTML = '<button type="button" id="shareSchedule">↗ Поделиться расписанием</button><button type="button" id="installApp">＋ На главный экран</button>';
      const overview = $("#todayOverview");
      overview?.insertAdjacentElement("afterend", actions);
      $("#shareSchedule")?.addEventListener("click", shareSchedule);
      $("#installApp")?.addEventListener("click", installApp);
    }

    if (!$("#connectionStatus")) {
      const status = document.createElement("p");
      status.className = "connection-status";
      status.id = "connectionStatus";
      status.textContent = navigator.onLine ? "Онлайн · расписание будет доступно и без сети после первой загрузки" : "Офлайн · используется сохранённая версия";
      $("#quickActions")?.insertAdjacentElement("afterend", status);
    }
  }

  function updateConnection() {
    const status = $("#connectionStatus");
    if (!status) return;
    status.textContent = navigator.onLine
      ? "Онлайн · офлайн-копия обновится при подключении"
      : "Офлайн · показываем сохранённое расписание";
    status.classList.toggle("offline", !navigator.onLine);
  }

  function currentDaySchedule() {
    if (!scheduleData) return null;
    const dayName = dayNames[new Date().getDay()];
    const weeks = scheduleData.weeks || [];
    const selectedWeek = Number(localStorage.getItem("mik-week") || 1);
    const week = weeks.find(item => Number(item.weekNumber) === selectedWeek) || weeks[0];
    return { dayName, day: (week?.days || []).find(item => String(item.name).toUpperCase() === dayName) };
  }

  function updateTodayOverview() {
    const result = currentDaySchedule();
    const overview = $("#todayOverview");
    if (!overview || !result) return;
    const title = $("strong", overview);
    const description = $("p", overview);
    if (!result.day) {
      title.textContent = "Сегодня занятий нет";
      description.textContent = "В расписании на этот день пар не найдено.";
      return;
    }
    const lessons = result.day.lessons || [];
    const first = lessons.find(lesson => lesson.subject && !/нет|смотришь/i.test(lesson.subject));
    title.textContent = first ? "Первая пара: " + first.subject : (result.day.emptyMessage || "Занятий нет");
    description.textContent = first
      ? [first.type, first.room ? "аудитория " + first.room : ""].filter(Boolean).join(" · ") + " — точное время начала пока не указано"
      : "По расписанию на сегодня занятий не указано.";
  }

  function highlightToday() {
    const today = dayNames[new Date().getDay()];
    document.querySelectorAll(".day-card").forEach(card => {
      const header = $(".day-header", card);
      card.classList.toggle("today-card", Boolean(header && header.textContent.trim().toUpperCase() === today));
    });
    updateTodayOverview();
  }

  function syncWeekSelect() {
    const select = $("#weekSelect");
    const label = $("#currentWeekLabel");
    if (!select) return;
    const current = label ? Number((label.textContent.match(/\d+/) || [1])[0]) : Number(localStorage.getItem("mik-week") || 1);
    select.value = String(current);
    select.dataset.current = String(current);
  }

  async function shareSchedule() {
    const shareData = { title: "МИК.COM — расписание", text: "Расписание группы МИК-25", url: location.href };
    try {
      if (navigator.share) await navigator.share(shareData);
      else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(location.href);
        const button = $("#shareSchedule");
        if (button) { button.textContent = "✓ Ссылка скопирована"; setTimeout(() => button.textContent = "↗ Поделиться расписанием", 1800); }
      } else {
        window.prompt("Скопируй ссылку на расписание:", location.href);
      }
    } catch (error) {
      if (error.name !== "AbortError") console.error("Share failed:", error);
    }
  }

  let installPrompt = null;
  window.addEventListener("beforeinstallprompt", event => {
    event.preventDefault();
    installPrompt = event;
  });

  async function installApp() {
    if (installPrompt) {
      installPrompt.prompt();
      await installPrompt.userChoice;
      installPrompt = null;
      return;
    }
    const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
    alert(isIOS
      ? 'Чтобы установить MIK.COM на iPhone: нажми «Поделиться» в Safari, затем «На экран Домой» и подтверди добавление.'
      : 'Открой меню браузера и выбери «Установить приложение» или «Добавить на главный экран».');
  }

  function setupClassicToggle() {
    const button = $("#classicModeToggle");
    const enabled = localStorage.getItem(classicKey) === "1";
    document.body.classList.toggle("classic-mode", enabled);
    if (button) {
      button.innerHTML = enabled
        ? "<span>↗</span> Включить новые функции"
        : "<span>↩</span> Вернуть прежний вид";
      button.addEventListener("click", () => {
        const next = !document.body.classList.contains("classic-mode");
        document.body.classList.toggle("classic-mode", next);
        localStorage.setItem(classicKey, next ? "1" : "0");
        button.innerHTML = next
          ? "<span>↗</span> Включить новые функции"
          : "<span>↩</span> Вернуть прежний вид";
        if (!next) mountExtras();
      });
    }
  }

  function watchScheduleRender() {
    const container = $("#scheduleContainer");
    if (!container) return;
    const observer = new MutationObserver(() => {
      highlightToday();
      syncWeekSelect();
    });
    observer.observe(container, { childList: true, subtree: true });
  }

  async function startOfflineSupport() {
    if ("serviceWorker" in navigator) {
      try { await navigator.serviceWorker.register("./service-worker.js"); }
      catch (error) { console.warn("Service worker registration failed:", error); }
    }
  }

  async function init() {
    setupClassicToggle();
    mountExtras();
    watchScheduleRender();
    updateConnection();
    window.addEventListener("online", updateConnection);
    window.addEventListener("offline", updateConnection);
    try {
      const response = await fetch("./schedule.json");
      if (response.ok) scheduleData = await response.json();
    } catch (_) { /* The service worker may provide the cached schedule. */ }
    updateTodayOverview();
    highlightToday();
    syncWeekSelect();
    startOfflineSupport();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();