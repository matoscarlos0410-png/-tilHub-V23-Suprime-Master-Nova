/* =========================================================
   ÚTILHUB V23 — NOVA FLOW
   SCRIPT.JS
   ========================================================= */

"use strict";

/* =========================================================
   CONFIGURACIÓN
   ========================================================= */

const VERSION = "V23";
const STORAGE_KEY = "utilhub-v23";
const DICTIONARY_API =
  "https://api.dictionaryapi.dev/api/v2/entries/es/";
const DICTIONARY_TTL = 7 * 24 * 60 * 60 * 1000;

const $ = (selector, parent = document) =>
  parent.querySelector(selector);

const $$ = (selector, parent = document) =>
  [...parent.querySelectorAll(selector)];


/* =========================================================
   ESTADO
   ========================================================= */

const defaultState = {
  theme: "dark",
  motion: true,
  performance: "balanced",
  focus: false,

  novaMode: "cosmic",
  novaIntensity: 0.8,
  globalFx: true,
  scrollParallax: true,

  favorites: [],
  recent: [],

  notes: "",
  tasks: [],

  shopping: [],

  dictionaryRecent: [],

  settings: {}
};

let state = loadState();

let activeCategory = "all";
let currentTool = null;
let toastTimer = null;

let dictionaryCache = {};
let dictionaryRequests = new Map();


/* =========================================================
   CARGAR / GUARDAR ESTADO
   ========================================================= */

function loadState() {
  const sources = [
    "utilhub-v23",
    "utilhub-v22",
    "utilhub-v21",
    "utilhub-v20",
    "utilhub-v19",
    "utilhub-v18",
    "utilhub-v17",
    "utilhub-v15-advanced"
  ];

  for (const key of sources) {
    try {
      const raw = localStorage.getItem(key);

      if (!raw) continue;

      const saved = JSON.parse(raw);

      return {
        ...defaultState,
        ...saved,
        favorites: Array.isArray(saved.favorites)
          ? saved.favorites
          : [],
        recent: Array.isArray(saved.recent)
          ? saved.recent
          : [],
        tasks: Array.isArray(saved.tasks)
          ? saved.tasks
          : [],
        shopping: Array.isArray(saved.shopping)
          ? saved.shopping
          : []
      };
    } catch {
      /* continuar con valores por defecto */
    }
  }

  return { ...defaultState };
}


function saveState() {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(state)
    );
  } catch {
    showToast("No se pudieron guardar algunos cambios.");
  }
}


/* =========================================================
   UTILIDADES GENERALES
   ========================================================= */

function escapeHTML(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}


function normalizeText(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}


function formatNumber(value) {
  if (!Number.isFinite(Number(value))) return "—";

  return new Intl.NumberFormat("es-PE", {
    maximumFractionDigits: 8
  }).format(Number(value));
}


function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}


/* =========================================================
   TOAST
   ========================================================= */

function showToast(message) {
  const toast = $("#toast");

  if (!toast) return;

  toast.textContent = message;
  toast.classList.add("show");

  clearTimeout(toastTimer);

  toastTimer = setTimeout(() => {
    toast.classList.remove("show");
  }, 2800);
}


/* =========================================================
   HERRAMIENTAS
   ========================================================= */

const tools = [
  {
    id: "calculator",
    title: "Calculadora",
    icon: "🧮",
    category: "math",
    description: "Realiza operaciones matemáticas básicas."
  },

  {
    id: "percentage",
    title: "Porcentaje",
    icon: "％",
    category: "math",
    description: "Calcula porcentajes rápidamente."
  },

  {
    id: "discount",
    title: "Descuento",
    icon: "🏷️",
    category: "math",
    description: "Calcula precio final y ahorro."
  },

  {
    id: "rule3",
    title: "Regla de tres",
    icon: "📐",
    category: "math",
    description: "Resuelve reglas de tres simples."
  },

  {
    id: "average",
    title: "Promedio",
    icon: "📊",
    category: "math",
    description: "Calcula el promedio de varios números."
  },

  {
    id: "percentage-change",
    title: "Cambio porcentual",
    icon: "📈",
    category: "math",
    description: "Calcula cuánto aumentó o disminuyó un valor."
  },

  {
    id: "length",
    title: "Longitud",
    icon: "📏",
    category: "convert",
    description: "Convierte unidades de longitud."
  },

  {
    id: "weight",
    title: "Peso",
    icon: "⚖️",
    category: "convert",
    description: "Convierte unidades de peso."
  },

  {
    id: "volume",
    title: "Volumen",
    icon: "🧪",
    category: "convert",
    description: "Convierte unidades de volumen."
  },

  {
    id: "temperature",
    title: "Temperatura",
    icon: "🌡️",
    category: "convert",
    description: "Convierte Celsius, Fahrenheit y Kelvin."
  },

  {
    id: "timeconvert",
    title: "Tiempo",
    icon: "⏱️",
    category: "convert",
    description: "Convierte segundos, minutos y horas."
  },

  {
    id: "currency",
    title: "Monedas",
    icon: "💱",
    category: "convert",
    description: "Convierte monedas usando datos disponibles en línea."
  },

  {
    id: "age",
    title: "Edad",
    icon: "🎂",
    category: "time",
    description: "Calcula tu edad a partir de tu fecha de nacimiento."
  },

  {
    id: "datediff",
    title: "Diferencia de fechas",
    icon: "📅",
    category: "time",
    description: "Calcula los días entre dos fechas."
  },

  {
    id: "countdown",
    title: "Cuenta regresiva",
    icon: "⏳",
    category: "time",
    description: "Cuenta hasta una fecha determinada."
  },

  {
    id: "timer",
    title: "Temporizador",
    icon: "⏲️",
    category: "time",
    description: "Temporizador sencillo para tus actividades."
  },

  {
    id: "stopwatch",
    title: "Cronómetro",
    icon: "⏱️",
    category: "time",
    description: "Mide el tiempo con precisión."
  },

  {
    id: "clock",
    title: "Reloj",
    icon: "🕐",
    category: "time",
    description: "Consulta la hora actual."
  },

  {
    id: "focus",
    title: "Concentración",
    icon: "🎯",
    category: "organize",
    description: "Activa un espacio de concentración."
  },

  {
    id: "text",
    title: "Contador de texto",
    icon: "📝",
    category: "text",
    description: "Cuenta palabras, caracteres y líneas."
  },

  {
    id: "dictionary",
    title: "Diccionario",
    icon: "📖",
    category: "text",
    description: "Busca definiciones, ejemplos y sinónimos."
  },

  {
    id: "case",
    title: "Mayúsculas y minúsculas",
    icon: "🔠",
    category: "text",
    description: "Cambia rápidamente el formato de un texto."
  },

  {
    id: "slug",
    title: "Generador de slug",
    icon: "🔗",
    category: "text",
    description: "Convierte un título en un slug limpio."
  },

  {
    id: "notes",
    title: "Notas",
    icon: "📒",
    category: "organize",
    description: "Guarda notas directamente en tu navegador."
  },

  {
    id: "tasks",
    title: "Tareas",
    icon: "✅",
    category: "organize",
    description: "Organiza tus tareas pendientes."
  },

  {
    id: "shopping",
    title: "Lista de compras",
    icon: "🛒",
    category: "organize",
    description: "Crea y guarda una lista de compras."
  },

  {
    id: "food",
    title: "Buscar comida",
    icon: "🍔",
    category: "life",
    description: "Busca lugares y opciones de comida."
  },

  {
    id: "buy",
    title: "Buscar productos",
    icon: "🛍️",
    category: "life",
    description: "Busca productos en tiendas externas."
  },

  {
    id: "password",
    title: "Contraseña segura",
    icon: "🔐",
    category: "fun",
    description: "Genera una contraseña aleatoria."
  },

  {
    id: "random",
    title: "Número aleatorio",
    icon: "🎲",
    category: "fun",
    description: "Genera números aleatorios."
  },

  {
    id: "qr",
    title: "Código QR",
    icon: "▦",
    category: "fun",
    description: "Crea un código QR a partir de un texto o enlace."
  },

  {
    id: "area",
    title: "Área",
    icon: "📐",
    category: "math",
    description: "Calcula áreas de figuras comunes."
  },

  {
    id: "speed",
    title: "Velocidad",
    icon: "🚀",
    category: "math",
    description: "Calcula velocidad, distancia o tiempo."
  },

  {
    id: "tip",
    title: "Propina",
    icon: "💰",
    category: "math",
    description: "Calcula una propina y el total."
  },

  {
    id: "splitbill",
    title: "Dividir cuenta",
    icon: "🧾",
    category: "math",
    description: "Divide una cuenta entre varias personas."
  },

  {
    id: "base",
    title: "Conversor de bases",
    icon: "🔢",
    category: "math",
    description: "Convierte números entre diferentes bases."
  },

  {
    id: "color",
    title: "Colores",
    icon: "🎨",
    category: "fun",
    description: "Convierte colores HEX y RGB."
  },

  {
    id: "json",
    title: "Formateador JSON",
    icon: "{ }",
    category: "text",
    description: "Ordena y valida estructuras JSON."
  },

  {
    id: "calendar",
    title: "Calendario",
    icon: "🗓️",
    category: "time",
    description: "Consulta información de una fecha."
  }
];


/* =========================================================
   RENDER DE HERRAMIENTAS
   ========================================================= */

function renderTools() {
  const grid = $("#toolGrid");

  if (!grid) return;

  const query = normalizeText(
    $("#toolSearch")?.value || ""
  );

  const filtered = tools.filter(tool => {
    const categoryMatch =
      activeCategory === "all" ||
      tool.category === activeCategory;

    const text =
      normalizeText(
        `${tool.title} ${tool.description} ${tool.category}`
      );

    return categoryMatch && text.includes(query);
  });

  grid.innerHTML = filtered
    .map(toolCardHTML)
    .join("");

  const empty = $("#emptyTools");

  if (empty) {
    empty.hidden = filtered.length !== 0;
  }

  updateToolCount();
}


function toolCardHTML(tool) {
  const favorite =
    state.favorites.includes(tool.id);

  return `
    <article
      class="tool-card"
      data-tool-card="${escapeHTML(tool.id)}"
    >

      <button
        class="favorite-btn ${favorite ? "active" : ""}"
        type="button"
        data-favorite="${escapeHTML(tool.id)}"
        aria-label="Favorito"
        title="Favorito"
      >
        ${favorite ? "★" : "☆"}
      </button>

      <div class="tool-card-icon">
        ${tool.icon}
      </div>

      <h3>
        ${escapeHTML(tool.title)}
      </h3>

      <p>
        ${escapeHTML(tool.description)}
      </p>

      <div class="tool-card-footer">

        <span class="tool-category">
          ${escapeHTML(categoryName(tool.category))}
        </span>

        <span class="tool-open">
          Abrir →
        </span>

      </div>

    </article>
  `;
}


function categoryName(category) {
  const names = {
    math: "Matemática",
    convert: "Conversión",
    time: "Tiempo",
    text: "Texto",
    organize: "Organización",
    life: "Vida diaria",
    fun: "Utilidad"
  };

  return names[category] || "Herramienta";
}


/* =========================================================
   FAVORITOS
   ========================================================= */

function renderFavorites() {
  const grid = $("#favoritesGrid");

  if (!grid) return;

  const favoriteTools = state.favorites
    .map(id => tools.find(tool => tool.id === id))
    .filter(Boolean);

  grid.innerHTML = favoriteTools.length
    ? favoriteTools.map(toolCardHTML).join("")
    : `
      <div class="empty-state">
        <div class="empty-icon">☆</div>
        <h3>Aún no tienes favoritos</h3>
        <p>
          Pulsa la estrella de una herramienta para agregarla aquí.
        </p>
      </div>
    `;

  updateStats();
}


function toggleFavorite(id) {
  if (state.favorites.includes(id)) {
    state.favorites =
      state.favorites.filter(item => item !== id);

    showToast("Eliminado de favoritos.");
  } else {
    state.favorites.unshift(id);

    showToast("Agregado a favoritos.");
  }

  state.favorites =
    state.favorites.slice(0, 30);

  saveState();

  renderTools();
  renderFavorites();
}


/* =========================================================
   RECIENTES
   ========================================================= */

function addRecent(id) {
  state.recent =
    [id, ...state.recent.filter(item => item !== id)]
      .slice(0, 10);

  saveState();

  renderQuickTools();
  updateStats();
}


function renderQuickTools() {
  const wrapper = $("#quickTools");
  const grid = $("#quickToolsGrid");

  if (!wrapper || !grid) return;

  const recentTools = state.recent
    .map(id => tools.find(tool => tool.id === id))
    .filter(Boolean);

  wrapper.hidden = recentTools.length === 0;

  grid.innerHTML = recentTools
    .map(tool => `
      <button
        class="small-btn"
        type="button"
        data-open="${escapeHTML(tool.id)}"
      >
        ${tool.icon} ${escapeHTML(tool.title)}
      </button>
    `)
    .join("");
}


function clearRecent() {
  state.recent = [];

  saveState();

  renderQuickTools();

  updateStats();

  showToast("Historial reciente limpiado.");
}


/* =========================================================
   ESTADÍSTICAS
   ========================================================= */

function updateStats() {
  const favoriteCount = $("#favoriteCount");
  const recentCount = $("#recentCount");

  if (favoriteCount) {
    favoriteCount.textContent =
      state.favorites.length;
  }

  if (recentCount) {
    recentCount.textContent =
      state.recent.length;
  }
}


function updateToolCount() {
  const count = $("#toolCount");

  if (count) {
    count.textContent = tools.length;
  }
}


/* =========================================================
   ABRIR HERRAMIENTA
   ========================================================= */

function openTool(id) {
  const tool = tools.find(item => item.id === id);

  if (!tool) return;

  currentTool = id;

  addRecent(id);

  const panel = $("#toolPanel");
  const title = $("#toolPanelTitle");
  const icon = $("#toolPanelIcon");
  const category = $("#toolPanelCategory");
  const content = $("#toolContent");

  if (!panel || !content) return;

  title.textContent = tool.title;
  icon.textContent = tool.icon;
  category.textContent =
    categoryName(tool.category);

  content.innerHTML =
    toolTemplate(id);

  panel.classList.add("open");
  panel.setAttribute("aria-hidden", "false");

  document.body.style.overflow = "hidden";

  setupTool(id);

  requestAnimationFrame(() => {
    const firstInput =
      content.querySelector(
        "input:not([type='hidden']), textarea, select"
      );

    if (firstInput && id !== "dictionary") {
      firstInput.focus();
    }
  });
}


function closeTool() {
  const panel = $("#toolPanel");

  if (!panel) return;

  panel.classList.remove("open");
  panel.setAttribute("aria-hidden", "true");

  document.body.style.overflow = "";

  currentTool = null;
}


/* =========================================================
   TEMPLATES DE HERRAMIENTAS
   ========================================================= */

function toolTemplate(id) {

  switch (id) {

    case "calculator":
      return `
        <div class="tool-form">
          <label>
            Expresión
            <input id="calcInput"
              type="text"
              placeholder="Ejemplo: 25 * 4 + 10"
              autocomplete="off">
          </label>

          <button id="calcBtn">
            Calcular
          </button>

          <div id="calcResult"></div>
        </div>
      `;


    case "percentage":
      return `
        <div class="tool-form">
          <label>
            Número
            <input id="percentNumber"
              type="number"
              placeholder="200">
          </label>

          <label>
            Porcentaje
            <input id="percentValue"
              type="number"
              placeholder="15">
          </label>

          <button id="percentBtn">
            Calcular
          </button>

          <div id="percentResult"></div>
        </div>
      `;


    case "discount":
      return `
        <div class="tool-form">
          <label>
            Precio
            <input id="discountPrice"
              type="number"
              min="0">
          </label>

          <label>
            Descuento (%)
            <input id="discountPercent"
              type="number"
              min="0">
          </label>

          <button id="discountBtn">
            Calcular descuento
          </button>

          <div id="discountResult"></div>
        </div>
      `;


    case "rule3":
      return `
        <div class="tool-form">
          <label>A
            <input id="r3a" type="number">
          </label>

          <label>B
            <input id="r3b" type="number">
          </label>

          <label>C
            <input id="r3c" type="number">
          </label>

          <button id="r3Btn">
            Resolver
          </button>

          <div id="r3Result"></div>
        </div>
      `;


    case "average":
      return `
        <div class="tool-form">
          <label>
            Números separados por coma
            <input id="avgInput"
              placeholder="10, 15, 20, 25">
          </label>

          <button id="avgBtn">
            Calcular promedio
          </button>

          <div id="avgResult"></div>
        </div>
      `;


    case "percentage-change":
      return `
        <div class="tool-form">
          <label>
            Valor inicial
            <input id="changeOld" type="number">
          </label>

          <label>
            Valor final
            <input id="changeNew" type="number">
          </label>

          <button id="changeBtn">
            Calcular
          </button>

          <div id="changeResult"></div>
        </div>
      `;


    case "length":
      return converterTemplate(
        "Longitud",
        [
          ["m", "Metros"],
          ["km", "Kilómetros"],
          ["cm", "Centímetros"],
          ["mm", "Milímetros"],
          ["ft", "Pies"],
          ["in", "Pulgadas"]
        ]
      );


    case "weight":
      return converterTemplate(
        "Peso",
        [
          ["kg", "Kilogramos"],
          ["g", "Gramos"],
          ["mg", "Miligramos"],
          ["lb", "Libras"]
        ]
      );


    case "volume":
      return converterTemplate(
        "Volumen",
        [
          ["l", "Litros"],
          ["ml", "Mililitros"],
          ["m3", "Metros cúbicos"],
          ["gal", "Galones"]
        ]
      );


    case "temperature":
      return `
        <div class="tool-form">

          <label>
            Valor
            <input id="tempValue"
              type="number">
          </label>

          <label>
            Desde
            <select id="tempFrom">
              <option value="c">Celsius</option>
              <option value="f">Fahrenheit</option>
              <option value="k">Kelvin</option>
            </select>
          </label>

          <label>
            Hacia
            <select id="tempTo">
              <option value="f">Fahrenheit</option>
              <option value="c">Celsius</option>
              <option value="k">Kelvin</option>
            </select>
          </label>

          <button id="tempBtn">
            Convertir
          </button>

          <div id="tempResult"></div>
        </div>
      `;


    case "timeconvert":
      return `
        <div class="tool-form">

          <label>
            Cantidad
            <input id="timeValue"
              type="number">
          </label>

          <label>
            Desde
            <select id="timeFrom">
              <option value="seconds">Segundos</option>
              <option value="minutes">Minutos</option>
              <option value="hours">Horas</option>
              <option value="days">Días</option>
            </select>
          </label>

          <label>
            Hacia
            <select id="timeTo">
              <option value="minutes">Minutos</option>
              <option value="seconds">Segundos</option>
              <option value="hours">Horas</option>
              <option value="days">Días</option>
            </select>
          </label>

          <button id="timeConvertBtn">
            Convertir
          </button>

          <div id="timeConvertResult"></div>
        </div>
      `;


    case "currency":
      return `
        <div class="tool-form">

          <label>
            Cantidad
            <input id="currencyAmount"
              type="number"
              value="1">
          </label>

          <label>
            Desde
            <select id="currencyFrom">
              <option value="USD">USD</option>
              <option value="PEN">PEN</option>
              <option value="EUR">EUR</option>
            </select>
          </label>

          <label>
            Hacia
            <select id="currencyTo">
              <option value="PEN">PEN</option>
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
            </select>
          </label>

          <button id="currencyBtn">
            Convertir
          </button>

          <div id="currencyResult"></div>
        </div>
      `;


    case "dictionary":
      return `
        <div class="dictionary-box">

          <div class="dictionary-search">

            <input
              id="dictionaryInput"
              type="search"
              placeholder="Escribe una palabra..."
              autocomplete="off"
              spellcheck="true"
            >

            <button id="dictionaryBtn">
              Buscar
            </button>

          </div>

          <div
            id="dictionaryResult"
            aria-live="polite"
          >
            <div class="result-box">
              Escribe una palabra para comenzar.
            </div>
          </div>

        </div>
      `;


    case "text":
      return `
        <div class="tool-form">

          <label>
            Texto
            <textarea
              id="textCounter"
              placeholder="Escribe o pega tu texto..."
            ></textarea>
          </label>

          <div id="textStats"
               class="result-box">
            0 palabras · 0 caracteres
          </div>

        </div>
      `;


    case "case":
      return `
        <div class="tool-form">

          <label>
            Texto
            <textarea
              id="caseInput"
              placeholder="Escribe un texto..."
            ></textarea>
          </label>

          <button data-case="upper">
            MAYÚSCULAS
          </button>

          <button data-case="lower">
            minúsculas
          </button>

          <button data-case="title">
            Tipo Título
          </button>

          <button data-case="sentence">
            Primera letra
          </button>

        </div>
      `;


    case "slug":
      return `
        <div class="tool-form">

          <label>
            Texto
            <input
              id="slugInput"
              placeholder="Mi nuevo artículo">
          </label>

          <div
            id="slugResult"
            class="result-box"
          ></div>

        </div>
      `;


    case "notes":
      return `
        <div class="tool-form">

          <label>
            Tus notas
            <textarea
              id="notesInput"
              placeholder="Escribe aquí..."
            ></textarea>
          </label>

          <button id="saveNotesBtn">
            Guardar nota
          </button>

          <div id="notesStatus"></div>

        </div>
      `;


    case "tasks":
      return `
        <div class="tool-form">

          <label>
            Nueva tarea
            <input
              id="taskInput"
              placeholder="Ejemplo: estudiar">
          </label>

          <button id="addTaskBtn">
            Agregar tarea
          </button>

          <div id="tasksList"></div>

        </div>
      `;


    case "shopping":
      return `
        <div class="tool-form">

          <label>
            Producto
            <input
              id="shoppingInput"
              placeholder="Ejemplo: arroz">
          </label>

          <button id="addShoppingBtn">
            Agregar
          </button>

          <div id="shoppingList"></div>

        </div>
      `;


    case "food":
      return `
        <div class="tool-form">

          <label>
            ¿Qué comida buscas?
            <input
              id="foodInput"
              placeholder="Pizza, hamburguesa, pollo...">
          </label>

          <button id="foodSearchBtn">
            Buscar comida
          </button>

          <div id="foodResult"></div>

        </div>
      `;


    case "buy":
      return `
        <div class="tool-form">

          <label>
            Producto
            <input
              id="buyInput"
              placeholder="Ejemplo: audífonos">
          </label>

          <button id="buySearchBtn">
            Buscar productos
          </button>

          <div id="buyResult"></div>

        </div>
      `;


    case "password":
      return `
        <div class="tool-form">

          <label>
            Longitud
            <input
              id="passwordLength"
              type="number"
              min="8"
              max="128"
              value="16">
          </label>

          <button id="passwordBtn">
            Generar contraseña
          </button>

          <div
            id="passwordResult"
            class="result-box"
          ></div>

        </div>
      `;


    case "random":
      return `
        <div class="tool-form">

          <label>
            Mínimo
            <input
              id="randomMin"
              type="number"
              value="1">
          </label>

          <label>
            Máximo
            <input
              id="randomMax"
              type="number"
              value="100">
          </label>

          <button id="randomBtn">
            Generar
          </button>

          <div
            id="randomResult"
            class="result-box"
          ></div>

        </div>
      `;


    case "qr":
      return `
        <div class="tool-form">

          <label>
            Texto o enlace
            <input
              id="qrInput"
              placeholder="https://ejemplo.com">
          </label>

          <button id="qrBtn">
            Crear QR
          </button>

          <div id="qrResult"></div>

        </div>
      `;


    case "area":
      return `
        <div class="tool-form">

          <label>
            Figura
            <select id="areaShape">
              <option value="square">Cuadrado</option>
              <option value="rectangle">Rectángulo</option>
              <option value="triangle">Triángulo</option>
              <option value="circle">Círculo</option>
            </select>
          </label>

          <label>
            Medida A
            <input id="areaA" type="number">
          </label>

          <label>
            Medida B
            <input id="areaB" type="number">
          </label>

          <button id="areaBtn">
            Calcular área
          </button>

          <div id="areaResult"></div>

        </div>
      `;


    case "speed":
      return `
        <div class="tool-form">

          <label>
            Distancia
            <input id="speedDistance" type="number">
          </label>

          <label>
            Tiempo
            <input id="speedTime" type="number">
          </label>

          <button id="speedBtn">
            Calcular velocidad
          </button>

          <div id="speedResult"></div>

        </div>
      `;


    case "tip":
      return `
        <div class="tool-form">

          <label>
            Cuenta
            <input id="tipBill" type="number">
          </label>

          <label>
            Propina (%)
            <input id="tipPercent"
              type="number"
              value="10">
          </label>

          <button id="tipBtn">
            Calcular
          </button>

          <div id="tipResult"></div>

        </div>
      `;


    case "splitbill":
      return `
        <div class="tool-form">

          <label>
            Total
            <input id="splitTotal" type="number">
          </label>

          <label>
            Personas
            <input
              id="splitPeople"
              type="number"
              min="1"
              value="2">
          </label>

          <button id="splitBtn">
            Dividir
          </button>

          <div id="splitResult"></div>

        </div>
      `;


    case "base":
      return `
        <div class="tool-form">

          <label>
            Número
            <input id="baseInput"
              placeholder="1010">
          </label>

          <label>
            Base de origen
            <input
              id="baseFrom"
              type="number"
              min="2"
              max="36"
              value="2">
          </label>

          <label>
            Base destino
            <input
              id="baseTo"
              type="number"
              min="2"
              max="36"
              value="10">
          </label>

          <button id="baseBtn">
            Convertir
          </button>

          <div id="baseResult"></div>

        </div>
      `;


    case "color":
      return `
        <div class="tool-form">

          <label>
            Color HEX
            <input
              id="colorInput"
              type="text"
              value="#6ee7ff"
              placeholder="#6ee7ff">
          </label>

          <button id="colorBtn">
            Convertir
          </button>

          <div id="colorResult"></div>

        </div>
      `;


    case "json":
      return `
        <div class="tool-form">

          <label>
            JSON
            <textarea
              id="jsonInput"
              placeholder='{"nombre":"ÚtilHub"}'
            ></textarea>
          </label>

          <button id="jsonBtn">
            Formatear JSON
          </button>

          <div id="jsonResult"></div>

        </div>
      `;


    case "timer":
      return `
        <div class="tool-form">

          <label>
            Minutos
            <input
              id="timerMinutes"
              type="number"
              min="1"
              value="5">
          </label>

          <button id="timerStart">
            Iniciar
          </button>

          <button id="timerStop">
            Detener
          </button>

          <div
            id="timerDisplay"
            class="result-box"
          >
            05:00
          </div>

        </div>
      `;


    case "stopwatch":
      return `
        <div class="tool-form">

          <button id="stopwatchStart">
            Iniciar
          </button>

          <button id="stopwatchStop">
            Detener
          </button>

          <button id="stopwatchReset">
            Reiniciar
          </button>

          <div
            id="stopwatchDisplay"
            class="result-box"
          >
            00:00.00
          </div>

        </div>
      `;


    case "clock":
      return `
        <div class="result-box">
          <div
            id="clockDisplay"
            class="result-value"
          ></div>

          <p id="clockDate"></p>
        </div>
      `;


    case "age":
      return `
        <div class="tool-form">

          <label>
            Fecha de nacimiento
            <input
              id="birthDate"
              type="date">
          </label>

          <button id="ageBtn">
            Calcular edad
          </button>

          <div id="ageResult"></div>

        </div>
      `;


    case "datediff":
      return `
        <div class="tool-form">

          <label>
            Fecha inicial
            <input id="dateA" type="date">
          </label>

          <label>
            Fecha final
            <input id="dateB" type="date">
          </label>

          <button id="dateDiffBtn">
            Calcular
          </button>

          <div id="dateDiffResult"></div>

        </div>
      `;


    case "countdown":
      return `
        <div class="tool-form">

          <label>
            Fecha y hora
            <input
              id="countdownDate"
              type="datetime-local">
          </label>

          <button id="countdownBtn">
            Iniciar cuenta
          </button>

          <div
            id="countdownResult"
            class="result-box"
          ></div>

        </div>
      `;


    case "calendar":
      return `
        <div class="tool-form">

          <label>
            Fecha
            <input
              id="calendarDate"
              type="date">
          </label>

          <button id="calendarBtn">
            Consultar
          </button>

          <div id="calendarResult"></div>

        </div>
      `;


    case "focus":
      return `
        <div class="tool-form">

          <div class="result-box">
            El modo concentración reduce las distracciones
            visuales de ÚtilHub.
          </div>

          <button id="focusToolBtn">
            Activar concentración
          </button>

        </div>
      `;


    default:
      return `
        <div class="result-box">
          Esta herramienta todavía está siendo preparada.
        </div>
      `;
  }
}


/* =========================================================
   CONVERSORES
   ========================================================= */

function converterTemplate(name, units) {
  return `
    <div class="tool-form">

      <label>
        Cantidad
        <input
          id="converterValue"
          type="number"
          value="1">
      </label>

      <label>
        Desde
        <select id="converterFrom">
          ${units.map(
            ([value, label]) =>
              `<option value="${value}">
                ${label}
              </option>`
          ).join("")}
        </select>
      </label>

      <label>
        Hacia
        <select id="converterTo">
          ${units.map(
            ([value, label]) =>
              `<option value="${value}">
                ${label}
              </option>`
          ).join("")}
        </select>
      </label>

      <button id="converterBtn">
        Convertir
      </button>

      <div
        id="converterResult"
        class="result-box"
      ></div>

    </div>
  `;
}


const conversionTables = {
  length: {
    m: 1,
    km: 1000,
    cm: 0.01,
    mm: 0.001,
    ft: 0.3048,
    in: 0.0254
  },

  weight: {
    kg: 1,
    g: 0.001,
    mg: 0.000001,
    lb: 0.45359237
  },

  volume: {
    l: 1,
    ml: 0.001,
    m3: 1000,
    gal: 3.785411784
  }
};


/* =========================================================
   SEGURIDAD PARA CALCULADORA
   ========================================================= */

function safeCalculate(expression) {

  let text = String(expression || "")
    .trim()
    .replaceAll(",", ".")
    .replaceAll("×", "*")
    .replaceAll("÷", "/");

  if (!text) {
    throw new Error("Escribe una operación.");
  }

  if (text.length > 100) {
    throw new Error("La operación es demasiado larga.");
  }

  if (!/^[0-9+\-*/().%\s]+$/.test(text)) {
    throw new Error(
      "Solo se permiten números y operaciones básicas."
    );
  }

  text = text.replace(
    /(\d+(?:\.\d+)?)%/g,
    "($1/100)"
  );

  /*
   * Se utiliza el motor matemático únicamente después
   * de validar estrictamente los caracteres permitidos.
   */
  const result = Function(
    `"use strict"; return (${text})`
  )();

  if (!Number.isFinite(result)) {
    throw new Error("El resultado no es válido.");
  }

  return result;
}


/* =========================================================
   CONFIGURAR HERRAMIENTA
   ========================================================= */

function setupTool(id) {

  switch (id) {

    case "calculator":
      setupCalculator();
      break;

    case "percentage":
      setupPercentage();
      break;

    case "discount":
      setupDiscount();
      break;

    case "rule3":
      setupRule3();
      break;

    case "average":
      setupAverage();
      break;

    case "percentage-change":
      setupPercentageChange();
      break;

    case "length":
    case "weight":
    case "volume":
      setupConverter(id);
      break;

    case "temperature":
      setupTemperature();
      break;

    case "timeconvert":
      setupTimeConverter();
      break;

    case "currency":
      setupCurrency();
      break;

    case "dictionary":
      setupDictionary();
      break;

    case "text":
      setupTextCounter();
      break;

    case "case":
      setupCaseConverter();
      break;

    case "slug":
      setupSlug();
      break;

    case "notes":
      setupNotes();
      break;

    case "tasks":
      setupTasks();
      break;

    case "shopping":
      setupShopping();
      break;

    case "food":
      setupFood();
      break;

    case "buy":
      setupBuy();
      break;

    case "password":
      setupPassword();
      break;

    case "random":
      setupRandom();
      break;

    case "qr":
      setupQR();
      break;

    case "area":
      setupArea();
      break;

    case "speed":
      setupSpeed();
      break;

    case "tip":
      setupTip();
      break;

    case "splitbill":
      setupSplitBill();
      break;

    case "base":
      setupBase();
      break;

    case "color":
      setupColor();
      break;

    case "json":
      setupJSON();
      break;

    case "timer":
      setupTimer();
      break;

    case "stopwatch":
      setupStopwatch();
      break;

    case "clock":
      setupClock();
      break;

    case "age":
      setupAge();
      break;

    case "datediff":
      setupDateDiff();
      break;

    case "countdown":
      setupCountdown();
      break;

    case "calendar":
      setupCalendar();
      break;

    case "focus":
      setupFocusTool();
      break;
  }
}


/* =========================================================
   CALCULADORA
   ========================================================= */

function setupCalculator() {
  const input = $("#calcInput");
  const button = $("#calcBtn");
  const result = $("#calcResult");

  const calculate = () => {
    try {
      const value =
        safeCalculate(input.value);

      result.innerHTML = `
        <div class="result-box">
          <strong>Resultado</strong>
          <div class="result-value">
            ${formatNumber(value)}
          </div>
        </div>
      `;
    } catch (error) {
      result.innerHTML = `
        <div class="error-box">
          ${escapeHTML(error.message)}
        </div>
      `;
    }
  };

  button.addEventListener("click", calculate);

  input.addEventListener("keydown", event => {
    if (event.key === "Enter") {
      calculate();
    }
  });
}


/* =========================================================
   PORCENTAJE
   ========================================================= */

function setupPercentage() {
  $("#percentBtn").addEventListener(
    "click",
    () => {
      const number =
        Number($("#percentNumber").value);

      const percent =
        Number($("#percentValue").value);

      if (!Number.isFinite(number) ||
          !Number.isFinite(percent)) {
        return showToast("Completa los valores.");
      }

      const result =
        number * percent / 100;

      $("#percentResult").innerHTML = `
        <div class="result-box">
          <strong>Resultado</strong>
          <div class="result-value">
            ${formatNumber(result)}
          </div>
        </div>
      `;
    }
  );
}


/* =========================================================
   DESCUENTO
   ========================================================= */

function setupDiscount() {
  $("#discountBtn").addEventListener(
    "click",
    () => {

      const price =
        Number($("#discountPrice").value);

      const percent =
        Number($("#discountPercent").value);

      if (
        !Number.isFinite(price) ||
        !Number.isFinite(percent) ||
        price < 0 ||
        percent < 0
      ) {
        return showToast("Introduce valores válidos.");
      }

      const saving =
        price * percent / 100;

      const finalPrice =
        price - saving;

      $("#discountResult").innerHTML = `
        <div class="result-box">
          <p>Ahorro: <strong>${formatNumber(saving)}</strong></p>
          <div class="result-value">
            ${formatNumber(finalPrice)}
          </div>
        </div>
      `;
    }
  );
}


/* =========================================================
   REGLA DE TRES
   ========================================================= */

function setupRule3() {
  $("#r3Btn").addEventListener(
    "click",
    () => {

      const a = Number($("#r3a").value);
      const b = Number($("#r3b").value);
      const c = Number($("#r3c").value);

      if (![a, b, c].every(Number.isFinite) || a === 0) {
        return showToast("Introduce valores válidos.");
      }

      const x = (b * c) / a;

      $("#r3Result").innerHTML = `
        <div class="result-box">
          <strong>Resultado</strong>
          <div class="result-value">
            ${formatNumber(x)}
          </div>
        </div>
      `;
    }
  );
}


/* =========================================================
   PROMEDIO
   ========================================================= */

function setupAverage() {
  $("#avgBtn").addEventListener(
    "click",
    () => {

      const numbers =
        $("#avgInput").value
          .split(",")
          .map(Number)
          .filter(Number.isFinite);

      if (!numbers.length) {
        return showToast("Escribe varios números.");
      }

      const average =
        numbers.reduce((a, b) => a + b, 0)
        / numbers.length;

      $("#avgResult").innerHTML = `
        <div class="result-box">
          <strong>Promedio</strong>
          <div class="result-value">
            ${formatNumber(average)}
          </div>
        </div>
      `;
    }
  );
}


/* =========================================================
   CAMBIO PORCENTUAL
   ========================================================= */

function setupPercentageChange() {
  $("#changeBtn").addEventListener(
    "click",
    () => {

      const oldValue =
        Number($("#changeOld").value);

      const newValue =
        Number($("#changeNew").value);

      if (
        !Number.isFinite(oldValue) ||
        !Number.isFinite(newValue) ||
        oldValue === 0
      ) {
        return showToast("Introduce valores válidos.");
      }

      const change =
        ((newValue - oldValue) / oldValue) * 100;

      $("#changeResult").innerHTML = `
        <div class="result-box">
          <strong>Cambio</strong>
          <div class="result-value">
            ${formatNumber(change)}%
          </div>
        </div>
      `;
    }
  );
}


/* =========================================================
   CONVERSORES
   ========================================================= */

function setupConverter(type) {
  $("#converterBtn").addEventListener(
    "click",
    () => {

      const value =
        Number($("#converterValue").value);

      const from =
        $("#converterFrom").value;

      const to =
        $("#converterTo").value;

      if (!Number.isFinite(value)) {
        return showToast("Introduce una cantidad válida.");
      }

      const table =
        conversionTables[type];

      const result =
        value * table[from] / table[to];

      $("#converterResult").innerHTML = `
        <strong>Resultado</strong>
        <div class="result-value">
          ${formatNumber(result)}
        </div>
      `;
    }
  );
}


/* =========================================================
   TEMPERATURA
   ========================================================= */

function setupTemperature() {
  $("#tempBtn").addEventListener(
    "click",
    () => {

      const value =
        Number($("#tempValue").value);

      const from =
        $("#tempFrom").value;

      const to =
        $("#tempTo").value;

      if (!Number.isFinite(value)) {
        return showToast("Introduce una temperatura.");
      }

      let celsius;

      if (from === "c") {
        celsius = value;
      } else if (from === "f") {
        celsius = (value - 32) * 5 / 9;
      } else {
        celsius = value - 273.15;
      }

      let result;

      if (to === "c") {
        result = celsius;
      } else if (to === "f") {
        result = celsius * 9 / 5 + 32;
      } else {
        result = celsius + 273.15;
      }

      $("#tempResult").innerHTML = `
        <strong>Resultado</strong>
        <div class="result-value">
          ${formatNumber(result)}
        </div>
      `;
    }
  );
}


/* =========================================================
   CONVERSIÓN DE TIEMPO
   ========================================================= */

function setupTimeConverter() {

  const factor = {
    seconds: 1,
    minutes: 60,
    hours: 3600,
    days: 86400
  };

  $("#timeConvertBtn").addEventListener(
    "click",
    () => {

      const value =
        Number($("#timeValue").value);

      const from =
        $("#timeFrom").value;

      const to =
        $("#timeTo").value;

      if (!Number.isFinite(value)) {
        return showToast("Introduce una cantidad.");
      }

      const result =
        value * factor[from] / factor[to];

      $("#timeConvertResult").innerHTML = `
        <strong>Resultado</strong>
        <div class="result-value">
          ${formatNumber(result)}
        </div>
      `;
    }
  );
}


/* =========================================================
   MONEDAS
   ========================================================= */

async function setupCurrency() {

  $("#currencyBtn").addEventListener(
    "click",
    async () => {

      const amount =
        Number($("#currencyAmount").value);

      const from =
        $("#currencyFrom").value;

      const to =
        $("#currencyTo").value;

      if (
        !Number.isFinite(amount) ||
        amount < 0
      ) {
        return showToast("Introduce una cantidad válida.");
      }

      const result = $("#currencyResult");

      result.innerHTML =
        `<div class="result-box">Consultando...</div>`;

      try {

        if (from === to) {
          result.innerHTML = `
            <div class="result-box">
              <div class="result-value">
                ${formatNumber(amount)} ${to}
              </div>
            </div>
          `;

          return;
        }

        const controller =
          new AbortController();

        const timeout =
          setTimeout(
            () => controller.abort(),
            7000
          );

        const response =
          await fetch(
            `https://api.frankfurter.app/latest?amount=${encodeURIComponent(amount)}&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
            {
              signal: controller.signal
            }
          );

        clearTimeout(timeout);

        if (!response.ok) {
          throw new Error("No se pudo consultar la moneda.");
        }

        const data =
          await response.json();

        const converted =
          data?.rates?.[to];

        if (!Number.isFinite(converted)) {
          throw new Error("No se recibió una conversión válida.");
        }

        result.innerHTML = `
          <div class="result-box">
            <div class="result-value">
              ${formatNumber(converted)} ${to}
            </div>
          </div>
        `;

      } catch {
        result.innerHTML = `
          <div class="error-box">
            No se pudo obtener la conversión.
            Comprueba tu conexión e inténtalo nuevamente.
          </div>
        `;
      }
    }
  );
}


/* =========================================================
   DICCIONARIO V23
   ========================================================= */

function setupDictionary() {

  const input = $("#dictionaryInput");
  const button = $("#dictionaryBtn");

  if (!input || !button) return;

  const search = () => {
    searchDictionary(input.value);
  };

  button.addEventListener("click", search);

  input.addEventListener("keydown", event => {
    if (event.key === "Enter") {
      event.preventDefault();
      search();
    }
  });

  /*
   * Si ya había una palabra reciente, no hacemos una
   * consulta automática. Así el usuario controla la búsqueda.
   */
}


function normalizeDictionaryWord(value) {
  return String(value || "")
    .normalize("NFC")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}


async function searchDictionary(rawWord) {

  const input =
    $("#dictionaryInput");

  const result =
    $("#dictionaryResult");

  const word =
    normalizeDictionaryWord(rawWord);

  if (!word) {
    result.innerHTML = `
      <div class="error-box">
        Escribe una palabra para buscar.
      </div>
    `;

    return;
  }

  /*
   * Para evitar URLs inesperadas o entradas enormes.
   */
  if (word.length > 80) {
    result.innerHTML = `
      <div class="error-box">
        La palabra o expresión es demasiado larga.
      </div>
    `;

    return;
  }

  if (input) {
    input.value = word;
  }

  /*
   * CACHE EN MEMORIA / LOCALSTORAGE
   */
  const cached =
    getDictionaryCache(word);

  if (cached) {
    renderDictionary(cached);
    return;
  }

  /*
   * Si ya existe una petición para esa palabra,
   * reutilizamos la misma promesa.
   */
  if (dictionaryRequests.has(word)) {

    result.innerHTML = `
      <div class="result-box">
        Buscando <strong>${escapeHTML(word)}</strong>...
      </div>
    `;

    try {
      const data =
        await dictionaryRequests.get(word);

      renderDictionary(data);

    } catch {
      renderDictionaryError(
        "No se pudo completar la búsqueda."
      );
    }

    return;
  }

  result.innerHTML = `
    <div class="result-box">
      Buscando
      <strong>${escapeHTML(word)}</strong>...
    </div>
  `;

  const controller =
    new AbortController();

  const timeout =
    setTimeout(
      () => controller.abort(),
      7000
    );

  const request = fetch(
    DICTIONARY_API +
    encodeURIComponent(word),
    {
      method: "GET",
      headers: {
        Accept: "application/json"
      },
      signal: controller.signal
    }
  )
    .then(async response => {

      if (!response.ok) {

        if (response.status === 404) {
          throw new Error(
            "WORD_NOT_FOUND"
          );
        }

        throw new Error(
          "REQUEST_FAILED"
        );
      }

      const data =
        await response.json();

      if (!Array.isArray(data) || !data.length) {
        throw new Error(
          "INVALID_RESPONSE"
        );
      }

      return data;
    })
    .then(data => {

      saveDictionaryCache(word, data);

      if (
        !state.dictionaryRecent.includes(word)
      ) {
        state.dictionaryRecent.unshift(word);

        state.dictionaryRecent =
          state.dictionaryRecent.slice(0, 20);

        saveState();
      }

      return data;
    })
    .finally(() => {
      clearTimeout(timeout);
      dictionaryRequests.delete(word);
    });

  dictionaryRequests.set(word, request);

  try {

    const data =
      await request;

    renderDictionary(data);

  } catch (error) {

    if (error.name === "AbortError") {
      renderDictionaryError(
        "La búsqueda tardó demasiado. Comprueba tu conexión e inténtalo nuevamente."
      );

      return;
    }

    if (error.message === "WORD_NOT_FOUND") {
      renderDictionaryError(
        `No encontramos "${word}" en el diccionario.`
      );

      return;
    }

    if (!navigator.onLine) {
      renderDictionaryError(
        "No hay conexión a Internet. El diccionario necesita conexión para buscar palabras nuevas."
      );

      return;
    }

    renderDictionaryError(
      "No se pudo consultar el diccionario. Inténtalo nuevamente."
    );
  }
}


/* =========================================================
   CACHE DEL DICCIONARIO
   ========================================================= */

function getDictionaryCache(word) {

  const memory =
    dictionaryCache[word];

  if (memory &&
      Date.now() - memory.time < DICTIONARY_TTL) {

    return memory.data;
  }

  try {

    const raw =
      localStorage.getItem(
        `utilhub-dictionary-${word}`
      );

    if (!raw) return null;

    const saved =
      JSON.parse(raw);

    if (
      !saved ||
      Date.now() - saved.time > DICTIONARY_TTL
    ) {
      localStorage.removeItem(
        `utilhub-dictionary-${word}`
      );

      return null;
    }

    dictionaryCache[word] = saved;

    return saved.data;

  } catch {
    return null;
  }
}


function saveDictionaryCache(word, data) {

  const record = {
    time: Date.now(),
    data
  };

  dictionaryCache[word] = record;

  try {
    localStorage.setItem(
      `utilhub-dictionary-${word}`,
      JSON.stringify(record)
    );
  } catch {
    /*
     * Si el almacenamiento está lleno,
     * la herramienta sigue funcionando.
     */
  }
}


/* =========================================================
   MOSTRAR DICCIONARIO
   ========================================================= */

function renderDictionary(data) {

  const result =
    $("#dictionaryResult");

  if (!result) return;

  const entry =
    data[0];

  const word =
    entry.word || "Palabra";

  const phonetic =
    entry.phonetic ||
    entry.phonetics?.find(
      item => item.text
    )?.text ||
    "";

  const meanings =
    Array.isArray(entry.meanings)
      ? entry.meanings
      : [];

  let html = `
    <div class="dictionary-result">

      <div>
        <div class="dictionary-word">
          ${escapeHTML(word)}
        </div>

        ${
          phonetic
            ? `<div class="dictionary-phonetic">
                ${escapeHTML(phonetic)}
              </div>`
            : ""
        }
      </div>
  `;

  let totalDefinitions = 0;

  for (const meaning of meanings) {

    const part =
      meaning.partOfSpeech ||
      "Definición";

    const definitions =
      Array.isArray(meaning.definitions)
        ? meaning.definitions
        : [];

    if (!definitions.length) continue;

    html += `
      <section class="dictionary-definition">

        <div class="dictionary-part">
          ${escapeHTML(part)}
        </div>
    `;

    for (const definition of definitions) {

      if (totalDefinitions >= 12) break;

      totalDefinitions++;

      html += `
        <p>
          ${escapeHTML(
            definition.definition ||
            "Sin definición disponible."
          )}
        </p>
      `;

      /*
       * ESTE ES EL EJEMPLO SOLICITADO.
       * Solo se muestra si la API realmente lo entrega.
       */
      if (definition.example) {
        html += `
          <div class="dictionary-example">
            Ejemplo:
            “${escapeHTML(definition.example)}”
          </div>
        `;
      }
    }

    const synonyms = [
      ...(meaning.synonyms || []),
      ...definitions.flatMap(
        definition =>
          definition.synonyms || []
      )
    ];

    const uniqueSynonyms =
      [...new Set(synonyms)]
        .slice(0, 15);

    if (uniqueSynonyms.length) {

      html += `
        <div class="dictionary-part"
             style="margin-top:15px;">
          Sinónimos
        </div>

        <div class="dictionary-synonyms">
          ${uniqueSynonyms
            .map(
              synonym =>
                `<span class="dictionary-synonym">
                  ${escapeHTML(synonym)}
                </span>`
            )
            .join("")}
        </div>
      `;
    }

    html += `</section>`;
  }

  /*
   * Si la API devolvió la palabra pero sin definiciones.
   */
  if (totalDefinitions === 0) {

    html += `
      <div class="result-box">
        La palabra fue encontrada,
        pero no tiene una definición disponible.
      </div>
    `;
  }

  html += `</div>`;

  result.innerHTML = html;
}


function renderDictionaryError(message) {

  const result =
    $("#dictionaryResult");

  if (!result) return;

  result.innerHTML = `
    <div class="error-box">
      ${escapeHTML(message)}
    </div>
  `;
}


/* =========================================================
   CONTADOR DE TEXTO
   ========================================================= */

function setupTextCounter() {

  const input =
    $("#textCounter");

  const stats =
    $("#textStats");

  const update = () => {

    const text =
      input.value;

    const words =
      text.trim()
        ? text.trim().split(/\s+/).length
        : 0;

    const chars =
      text.length;

    const charsNoSpaces =
      text.replace(/\s/g, "").length;

    const lines =
      text ? text.split(/\n/).length : 0;

    stats.innerHTML = `
      <strong>${words}</strong> palabras ·
      <strong>${chars}</strong> caracteres ·
      <strong>${charsNoSpaces}</strong> sin espacios ·
      <strong>${lines}</strong> líneas
    `;
  };

  input.addEventListener("input", update);
}


/* =========================================================
   MAYÚSCULAS / MINÚSCULAS
   ========================================================= */

function setupCaseConverter() {

  const input =
    $("#caseInput");

  $$("[data-case]").forEach(button => {

    button.addEventListener(
      "click",
      () => {

        const mode =
          button.dataset.case;

        if (mode === "upper") {
          input.value =
            input.value.toUpperCase();
        }

        if (mode === "lower") {
          input.value =
            input.value.toLowerCase();
        }

        if (mode === "title") {
          input.value =
            input.value.toLowerCase()
              .replace(
                /(^|\s)\S/g,
                char => char.toUpperCase()
              );
        }

        if (mode === "sentence") {
          input.value =
            input.value
              .toLowerCase()
              .replace(
                /^./,
                char => char.toUpperCase()
              );
        }
      }
    );
  });
}


/* =========================================================
   SLUG
   ========================================================= */

function setupSlug() {

  const input =
    $("#slugInput");

  const result =
    $("#slugResult");

  const update = () => {

    const slug =
      normalizeText(input.value)
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "");

    result.innerHTML =
      escapeHTML(slug || "—");
  };

  input.addEventListener(
    "input",
    update
  );
}


/* =========================================================
   NOTAS
   ========================================================= */

function setupNotes() {

  const input =
    $("#notesInput");

  input.value =
    state.notes || "";

  $("#saveNotesBtn").addEventListener(
    "click",
    () => {

      state.notes =
        input.value;

      saveState();

      $("#notesStatus").innerHTML = `
        <div class="success-box">
          Nota guardada correctamente.
        </div>
      `;
    }
  );
}


/* =========================================================
   TAREAS
   ========================================================= */

function setupTasks() {

  renderTasks();

  $("#addTaskBtn").addEventListener(
    "click",
    addTask
  );

  $("#taskInput").addEventListener(
    "keydown",
    event => {
      if (event.key === "Enter") {
        event.preventDefault();
        addTask();
      }
    }
  );
}


function addTask() {

  const input =
    $("#taskInput");

  const text =
    input.value.trim();

  if (!text) {
    return showToast("Escribe una tarea.");
  }

  state.tasks.push({
    id: crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random()}`,

    text,
    done: false
  });

  input.value = "";

  saveState();

  renderTasks();
}


function renderTasks() {

  const list =
    $("#tasksList");

  if (!list) return;

  list.innerHTML =
    state.tasks.length
      ? state.tasks.map(task => `
        <div class="result-box"
             style="display:flex;gap:10px;align-items:center;">

          <input
            type="checkbox"
            data-task-toggle="${escapeHTML(task.id)}"
            ${task.done ? "checked" : ""}
          >

          <span style="
            flex:1;
            ${task.done
              ? "text-decoration:line-through;opacity:.5;"
              : ""}
          ">
            ${escapeHTML(task.text)}
          </span>

          <button
            type="button"
            data-task-delete="${escapeHTML(task.id)}"
          >
            ×
          </button>

        </div>
      `).join("")
      : `
        <div class="result-box">
          No tienes tareas todavía.
        </div>
      `;

  $$("[data-task-toggle]", list)
    .forEach(box => {

      box.addEventListener(
        "change",
        () => {

          const task =
            state.tasks.find(
              item =>
                item.id === box.dataset.taskToggle
            );

          if (task) {
            task.done = box.checked;
            saveState();
            renderTasks();
          }
        }
      );
    });

  $$("[data-task-delete]", list)
    .forEach(button => {

      button.addEventListener(
        "click",
        () => {

          state.tasks =
            state.tasks.filter(
              task =>
                task.id !== button.dataset.taskDelete
            );

          saveState();

          renderTasks();
        }
      );
    });
}


/* =========================================================
   LISTA DE COMPRAS
   ========================================================= */

function setupShopping() {

  renderShopping();

  $("#addShoppingBtn")
    .addEventListener(
      "click",
      addShopping
    );

  $("#shoppingInput")
    .addEventListener(
      "keydown",
      event => {
        if (event.key === "Enter") {
          event.preventDefault();
          addShopping();
        }
      }
    );
}


function addShopping() {

  const input =
    $("#shoppingInput");

  const text =
    input.value.trim();

  if (!text) {
    return showToast("Escribe un producto.");
  }

  state.shopping.push({
    id: Date.now() + Math.random(),
    text,
    done: false
  });

  input.value = "";

  saveState();

  renderShopping();
}


function renderShopping() {

  const list =
    $("#shoppingList");

  if (!list) return;

  list.innerHTML =
    state.shopping.length
      ? state.shopping.map(item => `
        <div class="result-box"
             style="display:flex;gap:10px;align-items:center;">

          <input
            type="checkbox"
            data-shopping-toggle="${item.id}"
            ${item.done ? "checked" : ""}
          >

          <span style="flex:1;">
            ${escapeHTML(item.text)}
          </span>

          <button
            type="button"
            data-shopping-delete="${item.id}"
          >
            ×
          </button>

        </div>
      `).join("")
      : `
        <div class="result-box">
          Tu lista está vacía.
        </div>
      `;

  $$("[data-shopping-toggle]", list)
    .forEach(box => {

      box.addEventListener(
        "change",
        () => {

          const item =
            state.shopping.find(
              x =>
                String(x.id) ===
                box.dataset.shoppingToggle
            );

          if (item) {
            item.done = box.checked;
            saveState();
          }
        }
      );
    });

  $$("[data-shopping-delete]", list)
    .forEach(button => {

      button.addEventListener(
        "click",
        () => {

          state.shopping =
            state.shopping.filter(
              x =>
                String(x.id) !==
                button.dataset.shoppingDelete
            );

          saveState();

          renderShopping();
        }
      );
    });
}


/* =========================================================
   COMIDA
   ========================================================= */

function setupFood() {

  $("#foodSearchBtn")
    .addEventListener(
      "click",
      () => {

        const query =
          $("#foodInput").value.trim();

        if (!query) {
          return showToast("Escribe qué comida buscas.");
        }

        const encoded =
          encodeURIComponent(query);

        $("#foodResult").innerHTML = `
          <div class="result-box">

            <strong>
              Buscar "${escapeHTML(query)}"
            </strong>

            <p style="margin-top:10px;">
              Puedes buscar opciones y realizar
              el pedido directamente con el establecimiento.
            </p>

            <div style="
              display:flex;
              flex-wrap:wrap;
              gap:8px;
              margin-top:15px;
            ">

              <a
                href="https://www.google.com/search?q=${encoded}+restaurante"
                target="_blank"
                rel="noopener noreferrer"
                class="primary-btn"
              >
                Buscar restaurantes
              </a>

              <a
                href="https://www.google.com/maps/search/${encoded}+restaurante"
                target="_blank"
                rel="noopener noreferrer"
                class="secondary-btn"
              >
                Ver en Maps
              </a>

            </div>

          </div>
        `;
      }
    );
}


/* =========================================================
   COMPRAS
   ========================================================= */

function setupBuy() {

  $("#buySearchBtn")
    .addEventListener(
      "click",
      () => {

        const query =
          $("#buyInput").value.trim();

        if (!query) {
          return showToast("Escribe un producto.");
        }

        const encoded =
          encodeURIComponent(query);

        $("#buyResult").innerHTML = `
          <div class="result-box">

            <strong>
              Buscar "${escapeHTML(query)}"
            </strong>

            <p style="margin-top:10px;">
              La compra se realiza directamente
              en la tienda que elijas.
            </p>

            <div style="
              display:flex;
              flex-wrap:wrap;
              gap:8px;
              margin-top:15px;
            ">

              <a
                href="https://www.google.com/search?tbm=shop&q=${encoded}"
                target="_blank"
                rel="noopener noreferrer"
                class="primary-btn"
              >
                Google Shopping
              </a>

              <a
                href="https://listado.mercadolibre.com.pe/${encoded}"
                target="_blank"
                rel="noopener noreferrer"
                class="secondary-btn"
              >
                Mercado Libre
              </a>

            </div>

          </div>
        `;
      }
    );
}


/* =========================================================
   CONTRASEÑA
   ========================================================= */

function setupPassword() {

  $("#passwordBtn")
    .addEventListener(
      "click",
      () => {

        const length =
          clamp(
            Number($("#passwordLength").value) || 16,
            8,
            128
          );

        const chars =
          "ABCDEFGHJKLMNPQRSTUVWXYZ" +
          "abcdefghijkmnopqrstuvwxyz" +
          "23456789!@#$%^&*()-_=+";

        const array =
          new Uint32Array(length);

        crypto.getRandomValues(array);

        let password = "";

        for (let i = 0; i < length; i++) {
          password +=
            chars[array[i] % chars.length];
        }

        $("#passwordResult").innerHTML = `
          <strong>Contraseña generada</strong>

          <div
            class="result-value"
            style="word-break:break-all;"
          >
            ${escapeHTML(password)}
          </div>

          <button
            id="copyPassword"
            style="margin-top:15px;"
          >
            Copiar
          </button>
        `;

        $("#copyPassword")
          .addEventListener(
            "click",
            async () => {

              try {
                await navigator.clipboard.writeText(
                  password
                );

                showToast("Contraseña copiada.");
              } catch {
                showToast("No se pudo copiar.");
              }
            }
          );
      }
    );
}


/* =========================================================
   ALEATORIO
   ========================================================= */

function setupRandom() {

  $("#randomBtn")
    .addEventListener(
      "click",
      () => {

        const min =
          Number($("#randomMin").value);

        const max =
          Number($("#randomMax").value);

        if (
          !Number.isInteger(min) ||
          !Number.isInteger(max) ||
          min > max
        ) {
          return showToast("Rango inválido.");
        }

        const array =
          new Uint32Array(1);

        crypto.getRandomValues(array);

        const random =
          min +
          (array[0] %
            (max - min + 1));

        $("#randomResult").innerHTML = `
          <strong>Número</strong>
          <div class="result-value">
            ${random}
          </div>
        `;
      }
    );
}


/* =========================================================
   QR
   ========================================================= */

function setupQR() {

  $("#qrBtn")
    .addEventListener(
      "click",
      () => {

        const value =
          $("#qrInput").value.trim();

        if (!value) {
          return showToast("Escribe un texto o enlace.");
        }

        const encoded =
          encodeURIComponent(value);

        $("#qrResult").innerHTML = `
          <div class="result-box"
               style="text-align:center;">

            <img
              src="https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=${encoded}"
              alt="Código QR generado"
              width="280"
              height="280"
              style="
                margin:auto;
                border-radius:12px;
              "
            >

          </div>
        `;
      }
    );
}


/* =========================================================
   ÁREA
   ========================================================= */

function setupArea() {

  $("#areaBtn")
    .addEventListener(
      "click",
      () => {

        const shape =
          $("#areaShape").value;

        const a =
          Number($("#areaA").value);

        const b =
          Number($("#areaB").value);

        let result;

        if (!Number.isFinite(a) || a < 0) {
          return showToast("Introduce una medida válida.");
        }

        if (shape === "square") {
          result = a * a;
        }

        if (shape === "rectangle") {
          if (!Number.isFinite(b)) {
            return showToast("Completa ambas medidas.");
          }

          result = a * b;
        }

        if (shape === "triangle") {
          if (!Number.isFinite(b)) {
            return showToast("Completa ambas medidas.");
          }

          result = (a * b) / 2;
        }

        if (shape === "circle") {
          result = Math.PI * a * a;
        }

        $("#areaResult").innerHTML = `
          <strong>Área</strong>
          <div class="result-value">
            ${formatNumber(result)}
          </div>
        `;
      }
    );
}


/* =========================================================
   VELOCIDAD
   ========================================================= */

function setupSpeed() {

  $("#speedBtn")
    .addEventListener(
      "click",
      () => {

        const distance =
          Number($("#speedDistance").value);

        const time =
          Number($("#speedTime").value);

        if (
          !Number.isFinite(distance) ||
          !Number.isFinite(time) ||
          time <= 0
        ) {
          return showToast("Introduce valores válidos.");
        }

        const speed =
          distance / time;

        $("#speedResult").innerHTML = `
          <strong>Velocidad</strong>
          <div class="result-value">
            ${formatNumber(speed)}
          </div>
        `;
      }
    );
}


/* =========================================================
   PROPINA
   ========================================================= */

function setupTip() {

  $("#tipBtn")
    .addEventListener(
      "click",
      () => {

        const bill =
          Number($("#tipBill").value);

        const percent =
          Number($("#tipPercent").value);

        if (
          !Number.isFinite(bill) ||
          !Number.isFinite(percent)
        ) {
          return showToast("Introduce valores válidos.");
        }

        const tip =
          bill * percent / 100;

        const total =
          bill + tip;

        $("#tipResult").innerHTML = `
          <div class="result-box">

            Propina:
            <strong>${formatNumber(tip)}</strong>

            <div class="result-value">
              Total: ${formatNumber(total)}
            </div>

          </div>
        `;
      }
    );
}


/* =========================================================
   DIVIDIR CUENTA
   ========================================================= */

function setupSplitBill() {

  $("#splitBtn")
    .addEventListener(
      "click",
      () => {

        const total =
          Number($("#splitTotal").value);

        const people =
          Number($("#splitPeople").value);

        if (
          !Number.isFinite(total) ||
          !Number.isInteger(people) ||
          people <= 0
        ) {
          return showToast("Introduce valores válidos.");
        }

        const each =
          total / people;

        $("#splitResult").innerHTML = `
          <strong>Cada persona paga</strong>

          <div class="result-value">
            ${formatNumber(each)}
          </div>
        `;
      }
    );
}


/* =========================================================
   BASES NUMÉRICAS
   ========================================================= */

function setupBase() {

  $("#baseBtn")
    .addEventListener(
      "click",
      () => {

        const input =
          $("#baseInput").value.trim();

        const from =
          Number($("#baseFrom").value);

        const to =
          Number($("#baseTo").value);

        if (
          !input ||
          from < 2 ||
          from > 36 ||
          to < 2 ||
          to > 36
        ) {
          return showToast("Bases inválidas.");
        }

        try {

          const decimal =
            parseInt(input, from);

          if (!Number.isFinite(decimal)) {
            throw new Error();
          }

          const result =
            decimal.toString(to).toUpperCase();

          $("#baseResult").innerHTML = `
            <strong>Resultado</strong>

            <div class="result-value">
              ${escapeHTML(result)}
            </div>
          `;

        } catch {
          $("#baseResult").innerHTML = `
            <div class="error-box">
              El número no corresponde a la base indicada.
            </div>
          `;
        }
      }
    );
}


/* =========================================================
   COLORES
   ========================================================= */

function setupColor() {

  $("#colorBtn")
    .addEventListener(
      "click",
      () => {

        let hex =
          $("#colorInput")
            .value
            .trim();

        if (!/^#?[0-9a-fA-F]{6}$/.test(hex)) {
          return showToast("Usa un color HEX de 6 caracteres.");
        }

        hex =
          hex.replace("#", "");

        const r =
          parseInt(hex.slice(0, 2), 16);

        const g =
          parseInt(hex.slice(2, 4), 16);

        const b =
          parseInt(hex.slice(4, 6), 16);

        $("#colorResult").innerHTML = `
          <div class="result-box">

            <div style="
              width:100%;
              height:100px;
              border-radius:12px;
              background:#${hex};
              border:1px solid rgba(255,255,255,.15);
              margin-bottom:15px;
            "></div>

            <strong>
              RGB(${r}, ${g}, ${b})
            </strong>

            <div class="result-value">
              #${hex.toUpperCase()}
            </div>

          </div>
        `;
      }
    );
}


/* =========================================================
   JSON
   ========================================================= */

function setupJSON() {

  $("#jsonBtn")
    .addEventListener(
      "click",
      () => {

        try {

          const data =
            JSON.parse(
              $("#jsonInput").value
            );

          const formatted =
            JSON.stringify(
              data,
              null,
              2
            );

          $("#jsonResult").innerHTML = `
            <div class="result-box">

              <pre style="
                white-space:pre-wrap;
                overflow:auto;
                color:var(--text);
              ">${escapeHTML(formatted)}</pre>

            </div>
          `;

        } catch {
          $("#jsonResult").innerHTML = `
            <div class="error-box">
              El JSON no es válido.
            </div>
          `;
        }
      }
    );
}


/* =========================================================
   TEMPORIZADOR
   ========================================================= */

let timerInterval = null;
let timerEnd = 0;

function setupTimer() {

  const display =
    $("#timerDisplay");

  const update = () => {

    const remaining =
      Math.max(
        0,
        timerEnd - Date.now()
      );

    const seconds =
      Math.ceil(remaining / 1000);

    const minutes =
      Math.floor(seconds / 60);

    const secs =
      seconds % 60;

    display.textContent =
      `${String(minutes).padStart(2, "0")}:` +
      `${String(secs).padStart(2, "0")}`;

    if (remaining <= 0) {

      clearInterval(timerInterval);

      timerInterval = null;

      showToast("Temporizador terminado.");
    }
  };


  $("#timerStart")
    .addEventListener(
      "click",
      () => {

        const minutes =
          Number($("#timerMinutes").value);

        if (
          !Number.isFinite(minutes) ||
          minutes <= 0
        ) {
          return showToast("Introduce los minutos.");
        }

        clearInterval(timerInterval);

        timerEnd =
          Date.now() +
          minutes * 60 * 1000;

        timerInterval =
          setInterval(update, 250);

        update();
      }
    );


  $("#timerStop")
    .addEventListener(
      "click",
      () => {

        clearInterval(timerInterval);

        timerInterval = null;

        showToast("Temporizador detenido.");
      }
    );
}


/* =========================================================
   CRONÓMETRO
   ========================================================= */

let stopwatchInterval = null;
let stopwatchStart = 0;
let stopwatchElapsed = 0;

function setupStopwatch() {

  const display =
    $("#stopwatchDisplay");

  const update = () => {

    const elapsed =
      stopwatchElapsed +
      (
        stopwatchInterval
          ? Date.now() - stopwatchStart
          : 0
      );

    const seconds =
      Math.floor(elapsed / 1000);

    const minutes =
      Math.floor(seconds / 60);

    const secs =
      seconds % 60;

    const centiseconds =
      Math.floor(
        (elapsed % 1000) / 10
      );

    display.textContent =
      `${String(minutes).padStart(2, "0")}:` +
      `${String(secs).padStart(2, "0")}.` +
      `${String(centiseconds).padStart(2, "0")}`;
  };


  $("#stopwatchStart")
    .addEventListener(
      "click",
      () => {

        if (stopwatchInterval) return;

        stopwatchStart =
          Date.now();

        stopwatchInterval =
          setInterval(update, 40);
      }
    );


  $("#stopwatchStop")
    .addEventListener(
      "click",
      () => {

        if (!stopwatchInterval) return;

        stopwatchElapsed +=
          Date.now() - stopwatchStart;

        clearInterval(stopwatchInterval);

        stopwatchInterval = null;

        update();
      }
    );


  $("#stopwatchReset")
    .addEventListener(
      "click",
      () => {

        clearInterval(stopwatchInterval);

        stopwatchInterval = null;
        stopwatchStart = 0;
        stopwatchElapsed = 0;

        update();
      }
    );
}


/* =========================================================
   RELOJ
   ========================================================= */

function setupClock() {

  const display =
    $("#clockDisplay");

  const date =
    $("#clockDate");

  const update = () => {

    const now = new Date();

    display.textContent =
      now.toLocaleTimeString(
        "es-PE",
        {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit"
        }
      );

    date.textContent =
      now.toLocaleDateString(
        "es-PE",
        {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric"
        }
      );
  };

  update();

  const interval =
    setInterval(() => {

      if (!currentTool ||
          currentTool !== "clock") {

        clearInterval(interval);

        return;
      }

      update();

    }, 1000);
}


/* =========================================================
   EDAD
   ========================================================= */

function setupAge() {

  $("#ageBtn")
    .addEventListener(
      "click",
      () => {

        const value =
          $("#birthDate").value;

        if (!value) {
          return showToast("Selecciona tu fecha.");
        }

        const birth =
          new Date(`${value}T00:00:00`);

        const today =
          new Date();

        if (birth > today) {
          return showToast("La fecha no puede ser futura.");
        }

        let years =
          today.getFullYear() -
          birth.getFullYear();

        const month =
          today.getMonth() -
          birth.getMonth();

        if (
          month < 0 ||
          (
            month === 0 &&
            today.getDate() < birth.getDate()
          )
        ) {
          years--;
        }

        $("#ageResult").innerHTML = `
          <strong>Edad</strong>
          <div class="result-value">
            ${years} años
          </div>
        `;
      }
    );
}


/* =========================================================
   DIFERENCIA DE FECHAS
   ========================================================= */

function setupDateDiff() {

  $("#dateDiffBtn")
    .addEventListener(
      "click",
      () => {

        const a =
          new Date(
            `${$("#dateA").value}T00:00:00`
          );

        const b =
          new Date(
            `${$("#dateB").value}T00:00:00`
          );

        if (
          Number.isNaN(a.getTime()) ||
          Number.isNaN(b.getTime())
        ) {
          return showToast("Selecciona ambas fechas.");
        }

        const days =
          Math.abs(
            Math.round(
              (b - a) /
              86400000
            )
          );

        $("#dateDiffResult").innerHTML = `
          <strong>Diferencia</strong>
          <div class="result-value">
            ${days} días
          </div>
        `;
      }
    );
}


/* =========================================================
   CUENTA REGRESIVA
   ========================================================= */

let countdownInterval = null;

function setupCountdown() {

  $("#countdownBtn")
    .addEventListener(
      "click",
      () => {

        const value =
          $("#countdownDate").value;

        if (!value) {
          return showToast("Selecciona una fecha.");
        }

        const target =
          new Date(value).getTime();

        clearInterval(countdownInterval);

        const update = () => {

          const difference =
            target - Date.now();

          if (difference <= 0) {

            $("#countdownResult").textContent =
              "¡Llegó el momento!";

            clearInterval(countdownInterval);

            return;
          }

          const days =
            Math.floor(
              difference / 86400000
            );

          const hours =
            Math.floor(
              (difference % 86400000) /
              3600000
            );

          const minutes =
            Math.floor(
              (difference % 3600000) /
              60000
            );

          const seconds =
            Math.floor(
              (difference % 60000) /
              1000
            );

          $("#countdownResult").innerHTML = `
            <div class="result-value">
              ${days}d ${hours}h
              ${minutes}m ${seconds}s
            </div>
          `;
        };

        update();

        countdownInterval =
          setInterval(update, 1000);
      }
    );
}


/* =========================================================
   CALENDARIO
   ========================================================= */

function setupCalendar() {

  $("#calendarBtn")
    .addEventListener(
      "click",
      () => {

        const value =
          $("#calendarDate").value;

        if (!value) {
          return showToast("Selecciona una fecha.");
        }

        const date =
          new Date(`${value}T00:00:00`);

        const weekday =
          date.toLocaleDateString(
            "es-PE",
            { weekday: "long" }
          );

        const day =
          date.getDate();

        const month =
          date.toLocaleDateString(
            "es-PE",
            { month: "long" }
          );

        const year =
          date.getFullYear();

        $("#calendarResult").innerHTML = `
          <div class="result-box">

            <strong>
              ${escapeHTML(weekday)}
            </strong>

            <div class="result-value">
              ${day} de
              ${escapeHTML(month)}
              de ${year}
            </div>

          </div>
        `;
      }
    );
}


/* =========================================================
   MODO CONCENTRACIÓN
   ========================================================= */

function setupFocusTool() {

  $("#focusToolBtn")
    .addEventListener(
      "click",
      () => {

        state.focus =
          !state.focus;

        document.body.classList.toggle(
          "focus-mode",
          state.focus
        );

        saveState();

        $("#focusToolBtn").textContent =
          state.focus
            ? "Desactivar concentración"
            : "Activar concentración";
      }
    );
}


/* =========================================================
   CATEGORÍAS
   ========================================================= */

function setupCategories() {

  $$("#categories .category-btn")
    .forEach(button => {

      button.addEventListener(
        "click",
        () => {

          activeCategory =
            button.dataset.category;

          $$("#categories .category-btn")
            .forEach(btn =>
              btn.classList.remove("active")
            );

          button.classList.add("active");

          renderTools();
        }
      );
    });
}


/* =========================================================
   BUSCADOR
   ========================================================= */

function setupSearch() {

  const input =
    $("#toolSearch");

  if (!input) return;

  input.addEventListener(
    "input",
    renderTools
  );

  document.addEventListener(
    "keydown",
    event => {

      if (
        event.ctrlKey &&
        event.key.toLowerCase() === "k"
      ) {

        event.preventDefault();

        input.focus();
      }

      if (
        event.key === "Escape" &&
        currentTool
      ) {
        closeTool();
      }
    }
  );
}


/* =========================================================
   EVENTOS GENERALES
   ========================================================= */

function setupGlobalEvents() {

  document.addEventListener(
    "click",
    event => {

      const favorite =
        event.target.closest(
          "[data-favorite]"
        );

      if (favorite) {
        event.stopPropagation();

        toggleFavorite(
          favorite.dataset.favorite
        );

        return;
      }


      const open =
        event.target.closest(
          "[data-open]"
        );

      if (open) {

        openTool(
          open.dataset.open
        );

        return;
      }


      const card =
        event.target.closest(
          "[data-tool-card]"
        );

      if (card) {

        openTool(
          card.dataset.toolCard
        );
      }
    }
  );


  $("#closeTool")
    ?.addEventListener(
      "click",
      closeTool
    );


  $$(".toolPanelBackdrop")
    .forEach(backdrop =>
      backdrop.addEventListener(
        "click",
        closeTool
      )
    );


  $("#clearRecentBtn")
    ?.addEventListener(
      "click",
      clearRecent
    );


  $("#exploreBtn")
    ?.addEventListener(
      "click",
      () => {
        $("#herramientas")
          ?.scrollIntoView({
            behavior: "smooth"
          });
      }
    );


  $("#novaBtn")
    ?.addEventListener(
      "click",
      () => {
        $("#novaPanel")
          ?.scrollIntoView({
            behavior: "smooth"
          });
      }
    );
}


/* =========================================================
   TEMA
   ========================================================= */

function setupTheme() {

  document.body.classList.toggle(
    "light-theme",
    state.theme === "light"
  );

  $("#themeBtn")
    ?.addEventListener(
      "click",
      () => {

        state.theme =
          state.theme === "dark"
            ? "light"
            : "dark";

        document.body.classList.toggle(
          "light-theme",
          state.theme === "light"
        );

        saveState();
      }
    );
}


/* =========================================================
   ANIMACIONES NOVA FLOW — 100 MODOS
   ========================================================= */

const novaModes = [
  "cosmic",
  "aurora",
  "pulse",
  "matrix",
  "nebula",
  "waves",
  "starfield",
  "vortex",
  "firefly",
  "rain",
  "grid",
  "spiral",
  "orbit",
  "plasma",
  "dna",
  "snow",
  "lightning",
  "galaxy",
  "comet",
  "quantum",
  "solar",
  "meteor",
  "bubbles",
  "hexgrid",
  "ripples",
  "sparks",
  "petals",
  "constellation",
  "tunnel",
  "rings",
  "glitch",
  "spectrum",
  "fractal",
  "satellites",
  "electric",
  "chrono",
  "particles",
  "mandala",
  "eclipse",
  "crystal",
  "prism",
  "ink",
  "lava",
  "ocean",
  "desert",
  "forest",
  "ember",
  "smoke",
  "vortex2",
  "magnetic",
  "kaleido",
  "clockwork",
  "circuit",
  "radar",
  "sonar",
  "topography",
  "blueprint",
  "binary",
  "rainbows",
  "aurora2",
  "cometstorm",
  "firestorm",
  "snowstorm",
  "sandstorm",
  "leafstorm",
  "swarm",
  "flock",
  "wavegrid",
  "moire",
  "hologram",
  "neonlines",
  "ribbon",
  "galaxy2",
  "supernova",
  "wormhole",
  "stardust",
  "portal",
  "heartbeat",
  "equalizer",
  "infinity",

  /* V23 */
  "aurora-boreal",
  "deep-space",
  "star-pulse",
  "quantum-dust",
  "cosmic-rings",
  "solar-flare",
  "moonlight",
  "dark-matter",
  "gravity-well",
  "asteroid-field",
  "space-dust",
  "energy-flow",
  "neon-pulse",
  "cyber-rain",
  "digital-storm",
  "laser-grid",
  "techno-wave",
  "infinity-tunnel",
  "cosmic-portal",
  "nova-core"
];

const novaLabels = {
  "aurora-boreal": "Aurora Boreal",
  "deep-space": "Deep Space",
  "star-pulse": "Star Pulse",
  "quantum-dust": "Quantum Dust",
  "cosmic-rings": "Cosmic Rings",
  "solar-flare": "Solar Flare",
  "moonlight": "Moonlight",
  "dark-matter": "Dark Matter",
  "gravity-well": "Gravity Well",
  "asteroid-field": "Asteroid Field",
  "space-dust": "Space Dust",
  "energy-flow": "Energy Flow",
  "neon-pulse": "Neon Pulse",
  "cyber-rain": "Cyber Rain",
  "digital-storm": "Digital Storm",
  "laser-grid": "Laser Grid",
  "techno-wave": "Techno Wave",
  "infinity-tunnel": "Infinity Tunnel",
  "cosmic-portal": "Cosmic Portal",
  "nova-core": "NOVA Core"
};


/* =========================================================
   CANVAS NOVA
   ========================================================= */

const canvas =
  $("#nova");

const ctx =
  canvas?.getContext(
    "2d",
    { alpha: true }
  );

let dpr = 1;

let novaWidth = window.innerWidth;
let novaHeight = window.innerHeight;

let pointerX = novaWidth / 2;
let pointerY = novaHeight / 2;

let smoothX = pointerX;
let smoothY = pointerY;

let scrollTarget = 0;
let smoothScroll = 0;

let novaParticles = [];

let lastFrame = performance.now();
let frameCounter = 0;
let fpsTime = lastFrame;


/* =========================================================
   RESIZE CANVAS
   ========================================================= */

function resizeCanvas() {

  if (!canvas || !ctx) return;

  novaWidth =
    window.innerWidth;

  novaHeight =
    window.innerHeight;

  dpr =
    Math.min(
      window.devicePixelRatio || 1,
      2
    );

  canvas.width =
    Math.max(
      1,
      Math.floor(novaWidth * dpr)
    );

  canvas.height =
    Math.max(
      1,
      Math.floor(novaHeight * dpr)
    );

  canvas.style.width =
    `${novaWidth}px`;

  canvas.style.height =
    `${novaHeight}px`;

  ctx.setTransform(
    dpr,
    0,
    0,
    dpr,
    0,
    0
  );

  createParticles();
}


/* =========================================================
   PARTICULAS
   ========================================================= */

function particleCount() {

  if (state.performance === "high") {
    return 220;
  }

  if (state.performance === "performance") {
    return 70;
  }

  return 130;
}


function createParticles() {

  const count =
    particleCount();

  novaParticles =
    Array.from(
      { length: count },
      () => ({
        x: Math.random() * novaWidth,
        y: Math.random() * novaHeight,

        vx:
          (Math.random() - 0.5) *
          0.5,

        vy:
          (Math.random() - 0.5) *
          0.5,

        size:
          Math.random() * 2.2 + 0.4,

        phase:
          Math.random() *
          Math.PI * 2,

        speed:
          Math.random() * 0.02 + 0.004
      })
    );
}


/* =========================================================
   POINTER
   ========================================================= */

window.addEventListener(
  "pointermove",
  event => {

    pointerX =
      event.clientX;

    pointerY =
      event.clientY;

    if (
      state.scrollParallax &&
      state.globalFx
    ) {

      document.documentElement
        .style
        .setProperty(
          "--nova-x",
          `${(pointerX / novaWidth) * 100}%`
        );

      document.documentElement
        .style
        .setProperty(
          "--nova-y",
          `${(pointerY / novaHeight) * 100}%`
        );
    }
  },
  { passive: true }
);


window.addEventListener(
  "scroll",
  () => {
    scrollTarget =
      window.scrollY;
  },
  { passive: true }
);


/* =========================================================
   HELPERS CANVAS
   ========================================================= */

function rgba(r, g, b, a) {
  return `rgba(${r},${g},${b},${a})`;
}


function drawParticleField(
  time,
  options = {}
) {

  const {
    count = novaParticles.length,
    radius = 1,
    drift = 1
  } = options;

  const intensity =
    state.novaIntensity;

  for (
    let i = 0;
    i < Math.min(count, novaParticles.length);
    i++
  ) {

    const p =
      novaParticles[i];

    p.x +=
      p.vx * drift;

    p.y +=
      p.vy * drift;

    if (p.x < -20) p.x = novaWidth + 20;
    if (p.x > novaWidth + 20) p.x = -20;

    if (p.y < -20) p.y = novaHeight + 20;
    if (p.y > novaHeight + 20) p.y = -20;

    const pulse =
      0.5 +
      Math.sin(
        time * p.speed +
        p.phase
      ) * 0.5;

    ctx.beginPath();

    ctx.arc(
      p.x,
      p.y,
      p.size * radius,
      0,
      Math.PI * 2
    );

    ctx.fillStyle =
      rgba(
        110,
        231,
        255,
        (0.15 + pulse * 0.55) *
        intensity
      );

    ctx.fill();
  }
}


function drawConnections(distance = 110) {

  const max =
    Math.min(
      novaParticles.length,
      state.performance === "high"
        ? 180
        : state.performance === "balanced"
          ? 110
          : 60
    );

  for (let i = 0; i < max; i++) {

    const a =
      novaParticles[i];

    for (let j = i + 1; j < max; j++) {

      const b =
        novaParticles[j];

      const dx =
        a.x - b.x;

      const dy =
        a.y - b.y;

      const d =
        Math.sqrt(
          dx * dx + dy * dy
        );

      if (d < distance) {

        const alpha =
          (1 - d / distance) *
          0.18 *
          state.novaIntensity;

        ctx.strokeStyle =
          rgba(
            124,
            92,
            255,
            alpha
          );

        ctx.lineWidth = 0.7;

        ctx.beginPath();

        ctx.moveTo(
          a.x,
          a.y
        );

        ctx.lineTo(
          b.x,
          b.y
        );

        ctx.stroke();
      }
    }
  }
}


function drawGlow(
  x,
  y,
  radius,
  r,
  g,
  b,
  alpha
) {

  const gradient =
    ctx.createRadialGradient(
      x,
      y,
      0,
      x,
      y,
      radius
    );

  gradient.addColorStop(
    0,
    rgba(r, g, b, alpha)
  );

  gradient.addColorStop(
    1,
    rgba(r, g, b, 0)
  );

  ctx.fillStyle =
    gradient;

  ctx.beginPath();

  ctx.arc(
    x,
    y,
    radius,
    0,
    Math.PI * 2
  );

  ctx.fill();
}


/* =========================================================
   MODOS NOVA
   ========================================================= */

function drawNovaMode(mode, time) {

  const intensity =
    state.novaIntensity;

  const cx =
    novaWidth / 2 +
    (smoothX - novaWidth / 2) *
    0.04;

  const cy =
    novaHeight / 2 +
    (smoothY - novaHeight / 2) *
    0.04;

  switch (mode) {

    case "matrix":
    case "cyber-rain":
    case "digital-storm":
      drawDigitalRain(time, intensity);
      break;

    case "waves":
    case "wavegrid":
    case "techno-wave":
      drawWaves(time, intensity);
      break;

    case "aurora":
    case "aurora2":
    case "aurora-boreal":
      drawAurora(time, intensity);
      break;

    case "rings":
    case "cosmic-rings":
    case "infinity":
      drawRings(time, intensity);
      break;

    case "vortex":
    case "vortex2":
    case "gravity-well":
    case "wormhole":
      drawVortex(time, intensity);
      break;

    case "galaxy":
    case "galaxy2":
    case "deep-space":
    case "stardust":
      drawGalaxy(time, intensity);
      break;

    case "solar":
    case "solar-flare":
    case "supernova":
    case "nova-core":
      drawSolar(time, intensity);
      break;

    case "grid":
    case "hexgrid":
    case "laser-grid":
      drawGrid(time, intensity);
      break;

    case "rain":
    case "snow":
    case "cyber-rain":
      drawRain(time, intensity);
      break;

    case "comet":
    case "meteor":
    case "asteroid-field":
    case "cometstorm":
      drawSpaceObjects(time, intensity);
      break;

    case "firefly":
    case "ember":
    case "firestorm":
      drawFireflies(time, intensity);
      break;

    case "smoke":
    case "ink":
    case "nebula":
      drawNebula(time, intensity);
      break;

    case "plasma":
    case "electric":
    case "energy-flow":
      drawPlasma(time, intensity);
      break;

    case "pulse":
    case "heartbeat":
    case "star-pulse":
    case "neon-pulse":
      drawPulse(time, intensity);
      break;

    case "portal":
    case "cosmic-portal":
    case "infinity-tunnel":
      drawPortal(time, intensity);
      break;

    default:
      drawCosmic(time, intensity);
      break;
  }

  /*
   * Glow global para modos que no necesitan
   * un dibujo completamente diferente.
   */
  if (
    state.globalFx &&
    mode !== "matrix"
  ) {

    drawGlow(
      cx,
      cy,
      Math.min(
        novaWidth,
        novaHeight
      ) * 0.35,
      110,
      231,
      255,
      0.025 * intensity
    );
  }
}


/* =========================================================
   COSMIC
   ========================================================= */

function drawCosmic(time, intensity) {

  drawParticleField(
    time,
    {
      radius: 1,
      drift: 1
    }
  );

  drawConnections(100);

  const cx =
    novaWidth / 2;

  const cy =
    novaHeight / 2;

  const radius =
    Math.min(
      novaWidth,
      novaHeight
    ) * 0.25;

  drawGlow(
    cx,
    cy,
    radius,
    124,
    92,
    255,
    0.05 * intensity
  );
}


/* =========================================================
   AURORA
   ========================================================= */

function drawAurora(time, intensity) {

  for (let band = 0; band < 5; band++) {

    ctx.beginPath();

    for (
      let x = -50;
      x <= novaWidth + 50;
      x += 14
    ) {

      const y =
        novaHeight * (
          0.25 +
          band * 0.13
        ) +
        Math.sin(
          x * 0.004 +
          time * 0.0007 +
          band
        ) * 70;

      if (x === -50) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }

    ctx.strokeStyle =
      rgba(
        80,
        230,
        210,
        0.045 * intensity
      );

    ctx.lineWidth = 45;

    ctx.stroke();
  }

  drawParticleField(
    time,
    {
      radius: 0.7,
      drift: 0.5
    }
  );
}


/* =========================================================
   WAVES
   ========================================================= */

function drawWaves(time, intensity) {

  for (let row = 0; row < 14; row++) {

    ctx.beginPath();

    for (
      let x = -20;
      x <= novaWidth + 20;
      x += 14
    ) {

      const y =
        row * 70 +
        Math.sin(
          x * 0.012 +
          time * 0.002 +
          row * 0.5
        ) * 24;

      if (x === -20) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }

    ctx.strokeStyle =
      rgba(
        110,
        231,
        255,
        0.06 * intensity
      );

    ctx.lineWidth = 1;

    ctx.stroke();
  }
}


/* =========================================================
   RINGS
   ========================================================= */

function drawRings(time, intensity) {

  const cx =
    novaWidth / 2;

  const cy =
    novaHeight / 2;

  const base =
    Math.min(
      novaWidth,
      novaHeight
    ) * 0.12;

  for (let i = 0; i < 14; i++) {

    const radius =
      base +
      i * 35 +
      Math.sin(
        time * 0.001 +
        i
      ) * 8;

    ctx.beginPath();

    ctx.arc(
      cx,
      cy,
      radius,
      0,
      Math.PI * 2
    );

    ctx.strokeStyle =
      rgba(
        110,
        231,
        255,
        (0.035 + i * 0.001) *
        intensity
      );

    ctx.lineWidth = 1;

    ctx.stroke();
  }
}


/* =========================================================
   VORTEX
   ========================================================= */

function drawVortex(time, intensity) {

  const cx =
    novaWidth / 2;

  const cy =
    novaHeight / 2;

  for (let i = 0; i < 500; i++) {

    const angle =
      i * 0.14 +
      time * 0.0006;

    const distance =
      (i * 1.7) %
      (Math.min(
        novaWidth,
        novaHeight
      ) * 0.48);

    const x =
      cx +
      Math.cos(angle) *
      distance;

    const y =
      cy +
      Math.sin(angle) *
      distance;

    ctx.fillStyle =
      rgba(
        124,
        92,
        255,
        0.12 * intensity
      );

    ctx.fillRect(
      x,
      y,
      1.4,
      1.4
    );
  }
}


/* =========================================================
   GALAXY
   ========================================================= */

function drawGalaxy(time, intensity) {

  const cx =
    novaWidth / 2;

  const cy =
    novaHeight / 2;

  for (let i = 0; i < 700; i++) {

    const radius =
      Math.sqrt(i / 700) *
      Math.min(
        novaWidth,
        novaHeight
      ) *
      0.55;

    const arm =
      i % 5;

    const angle =
      radius * 0.012 +
      arm *
      (Math.PI * 2 / 5) +
      time * 0.00015;

    const x =
      cx +
      Math.cos(angle) *
      radius;

    const y =
      cy +
      Math.sin(angle) *
      radius *
      0.45;

    ctx.fillStyle =
      rgba(
        190,
        210,
        255,
        0.12 * intensity
      );

    ctx.fillRect(
      x,
      y,
      1.3,
      1.3
    );
  }
}


/* =========================================================
   SOLAR / NOVA CORE
   ========================================================= */

function drawSolar(time, intensity) {

  const cx =
    novaWidth / 2;

  const cy =
    novaHeight / 2;

  const pulse =
    1 +
    Math.sin(time * 0.003) *
    0.08;

  drawGlow(
    cx,
    cy,
    230 * pulse,
    255,
    100,
    70,
    0.055 * intensity
  );

  drawGlow(
    cx,
    cy,
    120 * pulse,
    255,
    180,
    70,
    0.08 * intensity
  );

  ctx.beginPath();

  ctx.arc(
    cx,
    cy,
    55 * pulse,
    0,
    Math.PI * 2
  );

  ctx.fillStyle =
    rgba(
      255,
      190,
      100,
      0.08 * intensity
    );

  ctx.fill();

  drawParticleField(
    time,
    {
      radius: 1.5,
      drift: 1.8
    }
  );
}


/* =========================================================
   GRID
   ========================================================= */

function drawGrid(time, intensity) {

  const spacing = 55;

  const offset =
    (time * 0.025) % spacing;

  ctx.lineWidth = 1;

  for (
    let x = -spacing + offset;
    x < novaWidth + spacing;
    x += spacing
  ) {

    ctx.strokeStyle =
      rgba(
        110,
        231,
        255,
        0.045 * intensity
      );

    ctx.beginPath();

    ctx.moveTo(x, 0);
    ctx.lineTo(x, novaHeight);

    ctx.stroke();
  }

  for (
    let y = -spacing + offset;
    y < novaHeight + spacing;
    y += spacing
  ) {

    ctx.beginPath();

    ctx.moveTo(0, y);
    ctx.lineTo(novaWidth, y);

    ctx.stroke();
  }
}


/* =========================================================
   RAIN
   ========================================================= */

function drawRain(time, intensity) {

  for (
    let i = 0;
    i < novaParticles.length;
    i++
  ) {

    const p =
      novaParticles[i];

    p.y +=
      2 +
      p.size *
      1.8;

    if (p.y > novaHeight + 30) {
      p.y = -30;
      p.x = Math.random() * novaWidth;
    }

    ctx.strokeStyle =
      rgba(
        110,
        231,
        255,
        0.1 * intensity
      );

    ctx.lineWidth =
      Math.max(
        0.5,
        p.size * 0.5
      );

    ctx.beginPath();

    ctx.moveTo(
      p.x,
      p.y
    );

    ctx.lineTo(
      p.x - 2,
      p.y + 14 + p.size * 6
    );

    ctx.stroke();
  }
}


/* =========================================================
   ESPACIO / METEOROS
   ========================================================= */

function drawSpaceObjects(time, intensity) {

  for (
    let i = 0;
    i < novaParticles.length;
    i++
  ) {

    const p =
      novaParticles[i];

    p.x +=
      1.2 +
      p.size * 0.2;

    p.y +=
      0.35;

    if (p.x > novaWidth + 100) {
      p.x = -100;
      p.y = Math.random() * novaHeight;
    }

    ctx.strokeStyle =
      rgba(
        180,
        220,
        255,
        0.1 * intensity
      );

    ctx.lineWidth =
      Math.max(1, p.size);

    ctx.beginPath();

    ctx.moveTo(
      p.x,
      p.y
    );

    ctx.lineTo(
      p.x - 25,
      p.y - 8
    );

    ctx.stroke();
  }
}


/* =========================================================
   FIREFLIES
   ========================================================= */

function drawFireflies(time, intensity) {

  for (
    let i = 0;
    i < novaParticles.length;
    i++
  ) {

    const p =
      novaParticles[i];

    p.x +=
      Math.sin(
        time * 0.001 +
        p.phase
      ) * 0.4;

    p.y +=
      Math.cos(
        time * 0.0012 +
        p.phase
      ) * 0.4;

    const glow =
      0.5 +
      Math.sin(
        time * 0.004 +
        p.phase
      ) * 0.5;

    ctx.beginPath();

    ctx.arc(
      p.x,
      p.y,
      p.size * 2,
      0,
      Math.PI * 2
    );

    ctx.fillStyle =
      rgba(
        255,
        210,
        80,
        glow *
        0.35 *
        intensity
      );

    ctx.fill();
  }
}


/* =========================================================
   NEBULA
   ========================================================= */

function drawNebula(time, intensity) {

  for (let i = 0; i < 7; i++) {

    const x =
      novaWidth *
      (0.1 + i * 0.15);

    const y =
      novaHeight *
      (
        0.25 +
        Math.sin(
          time * 0.0004 + i
        ) * 0.18
      );

    drawGlow(
      x,
      y,
      190,
      130,
      90,
      255,
      0.025 * intensity
    );
  }

  drawParticleField(
    time,
    {
      radius: 1.2,
      drift: 0.35
    }
  );
}


/* =========================================================
   PLASMA
   ========================================================= */

function drawPlasma(time, intensity) {

  for (let i = 0; i < 8; i++) {

    ctx.beginPath();

    for (
      let x = 0;
      x <= novaWidth;
      x += 15
    ) {

      const y =
        novaHeight / 2 +
        Math.sin(
          x * 0.008 +
          time * 0.002 +
          i
        ) * 80 +
        Math.sin(
          x * 0.017 -
          time * 0.001
        ) * 30;

      if (x === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }

    ctx.strokeStyle =
      rgba(
        110,
        231,
        255,
        0.035 * intensity
      );

    ctx.lineWidth = 2;

    ctx.stroke();
  }
}


/* =========================================================
   PULSE
   ========================================================= */

function drawPulse(time, intensity) {

  const cx =
    novaWidth / 2;

  const cy =
    novaHeight / 2;

  const radius =
    100 +
    Math.sin(time * 0.004) *
    45;

  ctx.beginPath();

  ctx.arc(
    cx,
    cy,
    radius,
    0,
    Math.PI * 2
  );

  ctx.strokeStyle =
    rgba(
      110,
      231,
      255,
      0.18 * intensity
    );

  ctx.lineWidth = 2;

  ctx.stroke();

  drawParticleField(
    time,
    {
      radius: 1,
      drift: 0.8
    }
  );
}


/* =========================================================
   PORTAL
   ========================================================= */

function drawPortal(time, intensity) {

  const cx =
    novaWidth / 2;

  const cy =
    novaHeight / 2;

  for (let i = 0; i < 20; i++) {

    const radius =
      30 + i * 22;

    const rotation =
      time * 0.0005 +
      i * 0.15;

    ctx.save();

    ctx.translate(
      cx,
      cy
    );

    ctx.rotate(rotation);

    ctx.beginPath();

    ctx.ellipse(
      0,
      0,
      radius,
      radius * 0.4,
      0,
      0,
      Math.PI * 2
    );

    ctx.strokeStyle =
      rgba(
        124,
        92,
        255,
        0.035 * intensity
      );

    ctx.stroke();

    ctx.restore();
  }
}


/* =========================================================
   ANIMACIÓN PRINCIPAL
   ========================================================= */

function novaFrame(time) {

  if (!ctx || !canvas) return;

  const delta =
    Math.min(
      40,
      time - lastFrame
    );

  lastFrame = time;

  smoothX +=
    (pointerX - smoothX) *
    0.035;

  smoothY +=
    (pointerY - smoothY) *
    0.035;

  smoothScroll +=
    (scrollTarget - smoothScroll) *
    0.04;

  ctx.clearRect(
    0,
    0,
    novaWidth,
    novaHeight
  );

  if (
    state.motion &&
    !window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches
  ) {

    drawNovaMode(
      state.novaMode,
      time
    );

  } else {

    /*
     * Modo estático ligero.
     */
    drawParticleField(
      0,
      {
        count:
          Math.min(
            45,
            novaParticles.length
          ),
        radius: 0.6,
        drift: 0
      }
    );
  }


  /*
   * Parallax global.
   */
  if (state.scrollParallax) {

    canvas.style.transform =
      `translate3d(
        ${(smoothX - novaWidth / 2) * 0.003}px,
        ${-smoothScroll * 0.012}px,
        0
      )`;
  }


  /*
   * FPS.
   */
  frameCounter++;

  if (
    time - fpsTime >= 1000
  ) {

    const fps =
      Math.round(
        frameCounter /
        ((time - fpsTime) / 1000)
      );

    const fpsElement =
      $("#fps");

    if (fpsElement) {
      fpsElement.textContent =
        `${clamp(fps, 0, 120)} FPS`;
    }

    frameCounter = 0;
    fpsTime = time;
  }


  requestAnimationFrame(
    novaFrame
  );
}


/* =========================================================
   MODOS NOVA — UI
   ========================================================= */

function setupNovaModes() {

  const container =
    $("#novaModes");

  if (!container) return;

  /*
   * Mantiene los botones existentes de index.html,
   * pero añade automáticamente los 100 modos.
   */

  container.innerHTML =
    novaModes.map(mode => `
      <button
        class="novaMode ${
          mode === state.novaMode
            ? "active"
            : ""
        }"
        type="button"
        data-mode="${escapeHTML(mode)}"
      >
        ${escapeHTML(
          novaLabels[mode] ||
          mode
            .replaceAll("-", " ")
            .replace(/\b\w/g, char =>
              char.toUpperCase()
            )
        )}
      </button>
    `).join("");


  $$(".novaMode", container)
    .forEach(button => {

      button.addEventListener(
        "click",
        () => {

          const mode =
            button.dataset.mode;

          if (!novaModes.includes(mode)) {
            return;
          }

          state.novaMode =
            mode;

          saveState();

          $$(".novaMode", container)
            .forEach(btn =>
              btn.classList.toggle(
                "active",
                btn === button
              )
            );

          updateNovaName();
        }
      );
    });


  updateNovaName();
}


function updateNovaName() {

  const element =
    $("#novaModeName");

  if (!element) return;

  element.textContent =
    novaLabels[state.novaMode] ||
    state.novaMode
      .replaceAll("-", " ")
      .replace(/\b\w/g, char =>
        char.toUpperCase()
      );
}


/* =========================================================
   CONTROLES NOVA
   ========================================================= */

function setupNovaControls() {

  const intensity =
    $("#novaIntensity");

  if (intensity) {

    intensity.value =
      state.novaIntensity;

    intensity.addEventListener(
      "input",
      () => {

        state.novaIntensity =
          Number(intensity.value);

        saveState();
      }
    );
  }


  const performance =
    $("#performanceSelect");

  if (performance) {

    performance.value =
      state.performance;

    performance.addEventListener(
      "change",
      () => {

        state.performance =
          performance.value;

        createParticles();

        saveState();
      }
    );
  }


  const globalFx =
    $("#globalFxBtn");

  if (globalFx) {

    globalFx.classList.toggle(
      "active",
      state.globalFx
    );

    globalFx.addEventListener(
      "click",
      () => {

        state.globalFx =
          !state.globalFx;

        globalFx.classList.toggle(
          "active",
          state.globalFx
        );

        saveState();
      }
    );
  }


  const parallax =
    $("#parallaxBtn");

  if (parallax) {

    parallax.classList.toggle(
      "active",
      state.scrollParallax
    );

    parallax.addEventListener(
      "click",
      () => {

        state.scrollParallax =
          !state.scrollParallax;

        parallax.classList.toggle(
          "active",
          state.scrollParallax
        );

        document.body.classList.toggle(
          "parallax-disabled",
          !state.scrollParallax
        );

        saveState();
      }
    );
  }
}


/* =========================================================
   BOTÓN DE MOVIMIENTO
   ========================================================= */

function setupMotion() {

  document.body.classList.toggle(
    "nova-disabled",
    !state.motion
  );

  $("#motionBtn")
    ?.addEventListener(
      "click",
      () => {

        state.motion =
          !state.motion;

        document.body.classList.toggle(
          "nova-disabled",
          !state.motion
        );

        saveState();

        showToast(
          state.motion
            ? "NOVA FLOW activado."
            : "NOVA FLOW pausado."
        );
      }
    );
}


/* =========================================================
   FOCUS
   ========================================================= */

function setupFocus() {

  document.body.classList.toggle(
    "focus-mode",
    state.focus
  );

  $("#focusBtn")
    ?.addEventListener(
      "click",
      () => {

        state.focus =
          !state.focus;

        document.body.classList.toggle(
          "focus-mode",
          state.focus
        );

        saveState();

        showToast(
          state.focus
            ? "Modo concentración activado."
            : "Modo concentración desactivado."
        );
      }
    );
}


/* =========================================================
   IMPORTAR / EXPORTAR
   ========================================================= */

function setupDataTools() {

  $("#exportBtn")
    ?.addEventListener(
      "click",
      () => {

        const blob =
          new Blob(
            [
              JSON.stringify(
                state,
                null,
                2
              )
            ],
            {
              type: "application/json"
            }
          );

        const url =
          URL.createObjectURL(blob);

        const link =
          document.createElement("a");

        link.href = url;

        link.download =
          "utilhub-v23-datos.json";

        link.click();

        URL.revokeObjectURL(url);

        showToast("Datos exportados.");
      }
    );


  $("#importBtn")
    ?.addEventListener(
      "click",
      () => {
        $("#importFile")?.click();
      }
    );


  $("#importFile")
    ?.addEventListener(
      "change",
      async event => {

        const file =
          event.target.files?.[0];

        if (!file) return;

        try {

          const text =
            await file.text();

          const imported =
            JSON.parse(text);

          state = {
            ...defaultState,
            ...imported
          };

          saveState();

          applyState();

          renderAll();

          showToast(
            "Datos importados correctamente."
          );

        } catch {
          showToast(
            "El archivo no es válido."
          );
        }

        event.target.value = "";
      }
    );
}


/* =========================================================
   CONEXIÓN
   ========================================================= */

function setupConnectionStatus() {

  const update = () => {

    const online =
      navigator.onLine;

    const element =
      $("#connectionStatus");

    if (!element) return;

    element.textContent =
      online
        ? "Conectado"
        : "Sin conexión";

    element.classList.toggle(
      "offline",
      !online
    );
  };

  window.addEventListener(
    "online",
    update
  );

  window.addEventListener(
    "offline",
    update
  );

  update();
}


/* =========================================================
   PWA
   ========================================================= */

function registerServiceWorker() {

  if (
    "serviceWorker" in navigator
  ) {

    window.addEventListener(
      "load",
      () => {

        navigator.serviceWorker
          .register("./sw.js")
          .catch(() => {
            /*
             * ÚtilHub continúa funcionando
             * aunque el SW no pueda instalarse.
             */
          });
      }
    );
  }
}


/* =========================================================
   APLICAR ESTADO
   ========================================================= */

function applyState() {

  document.body.classList.toggle(
    "light-theme",
    state.theme === "light"
  );

  document.body.classList.toggle(
    "nova-disabled",
    !state.motion
  );

  document.body.classList.toggle(
    "focus-mode",
    state.focus
  );

  document.body.classList.toggle(
    "parallax-disabled",
    !state.scrollParallax
  );
}


/* =========================================================
   RENDER GENERAL
   ========================================================= */

function renderAll() {

  renderTools();

  renderFavorites();

  renderQuickTools();

  updateStats();

  updateToolCount();

  updateNovaName();
}


/* =========================================================
   INICIO
   ========================================================= */

function init() {

  applyState();

  setupTheme();

  setupMotion();

  setupFocus();

  setupCategories();

  setupSearch();

  setupGlobalEvents();

  setupDataTools();

  setupConnectionStatus();

  setupNovaModes();

  setupNovaControls();

  renderAll();

  registerServiceWorker();

  resizeCanvas();

  window.addEventListener(
    "resize",
    resizeCanvas,
    { passive: true }
  );

  requestAnimationFrame(
    novaFrame
  );
}


/* =========================================================
   INICIAR
   ========================================================= */

if (
  document.readyState === "loading"
) {

  document.addEventListener(
    "DOMContentLoaded",
    init,
    { once: true }
  );

} else {
  init();
}


/* =========================================================
   ÚTILHUB V23 — FIN
   ========================================================= */
