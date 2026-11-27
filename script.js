/*
 * MIK.COM — простой сайт расписания.
 * Расписание загружается из schedule.json.
 * Тема и обои сохраняются локально в браузере.
 */

const WALLPAPERS = [
  "assets/backgrounds/ingush-mountains.jpg",
  "assets/backgrounds/dark-bg.jpg",
  "assets/backgrounds/light-bg.jpg",
  "assets/backgrounds/IMG_1492.jpeg",
  "images/dark-bg.jpg",
  "images/dark-bg1.jpg"
];

const els = {
  body: document.body,
  menuBtn: document.getElementById("menuBtn"),
  sidePanel: document.getElementById("sidePanel"),
  overlay: document.getElementById("menuOverlay"),
  closePanel: document.getElementById("closePanel"),
  themeSwitch: document.getElementById("themeSwitch"),
  todayDate: document.getElementById("todayDate"),
  todayDay: document.getElementById("todayDay"),
  clockTime: document.getElementById("clockTime"),
  clockDate: document.getElementById("clockDate"),
  scheduleSubtitle: document.getElementById("scheduleSubtitle"),
  scheduleContainer: document.getElementById("scheduleContainer"),
  currentWeekLabel: document.getElementById("currentWeekLabel"),
  wallpaperGrid: document.getElementById("wallpaperGrid"),
  wallpaperInput: document.getElementById("wallpaperInput")
};

const state = {
  schedule: null,
  week: Number(localStorage.getItem("mik-week") || 1)
};

function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "'": "&#039;",
    '"': "&quot;"
  }[char]));
}

function updateDateTime() {
  const now = new Date();
  const dateOptions = {
    weekday: "short",
    day: "numeric",
    month: "long"
  };

  els.clockTime.textContent = now.toLocaleTimeString("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  });
  els.clockDate.textContent = now.toLocaleDateString("ru-RU", dateOptions);
  els.todayDate.textContent = now.toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "long"
  });
  els.todayDay.textContent = now.toLocaleDateString("ru-RU", {
    weekday: "long"
  });
}

function saveWeek() {
  localStorage.setItem("mik-week", String(state.week));
}

function renderWeekControls() {
  els.currentWeekLabel.textContent = state.week + " неделя";
  els.scheduleSubtitle.textContent =
    state.week + " неделя · " +
    new Date().toLocaleDateString("ru-RU", {
      weekday: "long",
      day: "numeric",
      month: "long"
    });
}

function renderSchedule(data) {
  state.schedule = data;
  const weeks = Array.isArray(data.weeks) ? data.weeks : [];
  const week = weeks.find(item => Number(item.weekNumber) === state.week) || weeks[0];

  if (!week) {
    els.scheduleContainer.innerHTML = '<div class="empty-state">Расписание пока пустое.</div>';
    return;
  }

  state.week = Number(week.weekNumber);
  saveWeek();
  renderWeekControls();
  els.scheduleContainer.innerHTML = "";

  const weekTitle = document.createElement("div");
  weekTitle.className = "week-title";
  weekTitle.textContent = state.week + " НЕДЕЛЯ";
  els.scheduleContainer.appendChild(weekTitle);

  (week.days || []).forEach(day => {
    const card = document.createElement("article");
    card.className = "day-card";
    card.innerHTML =
      '<div class="day-header">' + escapeHtml(day.name || "") + '</div>' +
      '<div class="day-content"></div>';

    const content = card.querySelector(".day-content");

    if (day.emptyMessage) {
      const message = document.createElement("div");
      message.className = "online";
      message.textContent = day.emptyMessage;
      content.appendChild(message);
    } else {
      (day.lessons || []).forEach(lesson => {
        const row = document.createElement("div");
        row.className = "lesson";

        const info = document.createElement("div");
        info.className = "lesson-info";

        const number = document.createElement("div");
        number.className = "lesson-number";
        number.textContent = (lesson.number || "") + ") " + (lesson.subject || "");
        info.appendChild(number);

        if (lesson.type) {
          const type = document.createElement("div");
          type.className = "lesson-name";
          type.textContent = lesson.type;
          info.appendChild(type);
        }

        if (lesson.teacher) {
          const teacher = document.createElement("div");
          teacher.className = "teacher";
          teacher.textContent = lesson.teacher;
          info.appendChild(teacher);
        }

        const room = document.createElement("div");
        room.className = "classroom";
        room.textContent = lesson.room || "—";

        row.append(info, room);
        content.appendChild(row);
      });
    }

    els.scheduleContainer.appendChild(card);
  });

  requestAnimationFrame(() => {
    document.querySelectorAll(".week-title, .day-card").forEach((element, index) => {
      window.setTimeout(() => element.classList.add("show"), index * 55);
    });
  });
}

function changeWeek(direction) {
  if (!state.schedule) return;
  const weeks = state.schedule.weeks || [];
  const index = weeks.findIndex(item => Number(item.weekNumber) === state.week);
  const next = weeks[index + direction];

  if (!next) return;
  state.week = Number(next.weekNumber);
  saveWeek();
  renderSchedule(state.schedule);
}

function applyTheme() {
  const isLight = localStorage.getItem("mik-theme") === "light";
  els.body.classList.toggle("light", isLight);
  els.body.classList.toggle("dark", !isLight);
  els.themeSwitch.classList.toggle("on", isLight);
  els.themeSwitch.setAttribute("aria-checked", String(isLight));
}

function toggleTheme() {
  const isLight = !els.body.classList.contains("light");
  els.body.classList.toggle("light", isLight);
  els.body.classList.toggle("dark", !isLight);
  els.themeSwitch.classList.toggle("on", isLight);
  els.themeSwitch.setAttribute("aria-checked", String(isLight));
  localStorage.setItem("mik-theme", isLight ? "light" : "dark");
}

function setWallpaper(url) {
  document.body.style.setProperty("--wallpaper", 'url("' + url + '")');
  localStorage.setItem("mik-wallpaper", url);
  renderWallpapers();
}

function chooseRandomWallpaper() {
  const previous = localStorage.getItem("mik-last-random-wallpaper");
  const options = WALLPAPERS.filter(url => url !== previous);
  const wallpaper = options[Math.floor(Math.random() * options.length)] || WALLPAPERS[0];
  localStorage.setItem("mik-last-random-wallpaper", wallpaper);
  setWallpaper(wallpaper);
}

function loadWallpaper() {
  const custom = localStorage.getItem("mik-custom-wallpaper");
  if (custom) {
    setWallpaper(custom);
    return;
  }

  const saved = localStorage.getItem("mik-wallpaper");
  if (saved && (WALLPAPERS.includes(saved) || saved.startsWith("data:image/"))) {
    setWallpaper(saved);
    return;
  }

  chooseRandomWallpaper();
}

function renderWallpapers() {
  const current = localStorage.getItem("mik-wallpaper");
  els.wallpaperGrid.innerHTML = WALLPAPERS.map((url, index) =>
    '<button class="wallpaper-card ' + (current === url ? "active" : "") +
    '" type="button" data-wallpaper="' + url + '">' +
    '<img src="' + url + '" alt="Вариант обоев ' + (index + 1) + '" loading="lazy">' +
    '<span>Обои ' + (index + 1) + '</span></button>'
  ).join("");
}

function openMenu() {
  els.sidePanel.classList.add("open");
  els.overlay.classList.add("visible");
  els.menuBtn.classList.add("open");
  els.menuBtn.setAttribute("aria-expanded", "true");
  els.sidePanel.setAttribute("aria-hidden", "false");
}

function closeMenu() {
  els.sidePanel.classList.remove("open");
  els.overlay.classList.remove("visible");
  els.menuBtn.classList.remove("open");
  els.menuBtn.setAttribute("aria-expanded", "false");
  els.sidePanel.setAttribute("aria-hidden", "true");
}

function showSection(name) {
  document.querySelectorAll(".app-section").forEach(section => {
    section.classList.remove("active-section");
  });

  const section = document.getElementById(name + "Section");
  if (section) section.classList.add("active-section");

  document.querySelectorAll(".menu-item[data-section]").forEach(button => {
    button.classList.toggle("active", button.dataset.section === name);
  });

  closeMenu();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function setupEvents() {
  els.menuBtn.addEventListener("click", () => {
    els.sidePanel.classList.contains("open") ? closeMenu() : openMenu();
  });

  els.closePanel.addEventListener("click", closeMenu);
  els.overlay.addEventListener("click", closeMenu);
  els.themeSwitch.addEventListener("click", toggleTheme);

  document.getElementById("prevWeek").addEventListener("click", () => changeWeek(-1));
  document.getElementById("nextWeek").addEventListener("click", () => changeWeek(1));

  document.querySelectorAll("[data-section]").forEach(button => {
    button.addEventListener("click", () => showSection(button.dataset.section));
  });

  els.wallpaperGrid.addEventListener("click", event => {
    const button = event.target.closest("[data-wallpaper]");
    if (!button) return;
    localStorage.removeItem("mik-custom-wallpaper");
    setWallpaper(button.dataset.wallpaper);
  });

  els.wallpaperInput.addEventListener("change", event => {
    const file = event.target.files && event.target.files[0];
    if (!file || !file.type.startsWith("image/")) return;

    const reader = new FileReader();
    reader.onload = () => {
      const image = String(reader.result);
      localStorage.setItem("mik-custom-wallpaper", image);
      setWallpaper(image);
    };
    reader.readAsDataURL(file);
    event.target.value = "";
  });

  document.getElementById("resetWallpaper").addEventListener("click", () => {
    localStorage.removeItem("mik-custom-wallpaper");
    localStorage.removeItem("mik-wallpaper");
    chooseRandomWallpaper();
  });

  let touchStartX = null;
  els.sidePanel.addEventListener("touchstart", event => {
    touchStartX = event.touches[0].clientX;
  }, { passive: true });

  els.sidePanel.addEventListener("touchend", event => {
    if (touchStartX !== null && event.changedTouches[0].clientX - touchStartX < -60) {
      closeMenu();
    }
    touchStartX = null;
  }, { passive: true });
}

async function boot() {
  applyTheme();
  loadWallpaper();
  updateDateTime();
  window.setInterval(updateDateTime, 30000);
  setupEvents();

  try {
    const response = await fetch("schedule.json", { cache: "no-cache" });
    if (!response.ok) throw new Error("HTTP " + response.status);
    const schedule = await response.json();
    renderSchedule(schedule);
  } catch (error) {
    console.error("Не удалось загрузить расписание:", error);
    els.scheduleContainer.innerHTML =
      '<div class="empty-state">Не удалось загрузить расписание. Проверь подключение и файл schedule.json.</div>';
  }
}

boot();
