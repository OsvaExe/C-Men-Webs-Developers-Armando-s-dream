/* ═══════════════════════════════════════════════
   TASKFLOW — shared.js
   Utilidades compartidas: storage, tema, toasts,
   navegación y datos de ejemplo.
   ═══════════════════════════════════════════════ */

// ── CLAVES DE ALMACENAMIENTO ──────────────────
const KEYS = {
  projects: 'tf_projects',
  tasks:    'tf_tasks',
  users:    'tf_users',
  theme:    'tf_theme',
  session:  'tf_session',
};

// ── SESIÓN ────────────────────────────────────
function getSession() {
  try { return JSON.parse(localStorage.getItem(KEYS.session)) || null; }
  catch { return null; }
}
function setSession(user) {
  localStorage.setItem(KEYS.session, JSON.stringify(user));
}
function clearSession() {
  localStorage.removeItem(KEYS.session);
}
// Redirige a login si no hay sesión activa.
function checkAuth() {
  if (!getSession()) { window.location.href = 'login.html'; }
}
function logout() {
  clearSession();
  window.location.href = 'login.html';
}

const COLORS = [
  '#5b6af0','#7ee8a2','#f0a05b','#f05b6a',
  '#a05bf0','#5bc8f0','#f0e05b','#5bf0c8',
];

// ── ALMACENAMIENTO ────────────────────────────
function loadAll() {
  const parse = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) || d; } catch { return d; } };
  return {
    projects: parse(KEYS.projects, []),
    tasks:    parse(KEYS.tasks,    []),
    users:    parse(KEYS.users,    []),
  };
}
function saveProjects(d) { localStorage.setItem(KEYS.projects, JSON.stringify(d)); }
function saveTasks(d)    { localStorage.setItem(KEYS.tasks,    JSON.stringify(d)); }
function saveUsers(d)    { localStorage.setItem(KEYS.users,    JSON.stringify(d)); }

// ── ID ÚNICO ──────────────────────────────────
function genId(prefix = 'id') {
  return prefix + '_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
}

// ── UTILIDADES ────────────────────────────────
function escHtml(str) {
  return (str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function formatDate(str) {
  if (!str) return '';
  const d = new Date(str + 'T00:00:00');
  return d.toLocaleDateString('es-MX', { day:'2-digit', month:'short', year:'numeric' });
}

function projectProgress(projectId) {
  const { tasks } = loadAll();
  const pt = tasks.filter(t => t.projectId === projectId);
  if (!pt.length) return { total: 0, done: 0, pct: 0 };
  const done = pt.filter(t => t.status === 'done').length;
  return { total: pt.length, done, pct: Math.round((done / pt.length) * 100) };
}

// ── TEMA ──────────────────────────────────────
function getTheme() { return localStorage.getItem(KEYS.theme) || 'dark'; }

function applyTheme(t) {
  document.documentElement.setAttribute('data-theme', t);
  const btn = document.getElementById('themeBtn');
  if (btn) btn.textContent = t === 'dark' ? '🌙' : '☀️';
  localStorage.setItem(KEYS.theme, t);
}

function initTheme() { applyTheme(getTheme()); }

function toggleTheme() { applyTheme(getTheme() === 'dark' ? 'light' : 'dark'); }

// ── TOASTS ───────────────────────────────────
function showToast(msg, type = 'info') {
  const wrap = document.getElementById('toastWrap');
  if (!wrap) return;
  const icons = { success: '✅', error: '🗑️', info: 'ℹ️', warning: '⚠️' };
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  t.innerHTML = `<span>${icons[type] || ''}</span>${escHtml(msg)}`;
  wrap.appendChild(t);
  setTimeout(() => t.remove(), 3100);
}

// ── NAV ───────────────────────────────────────
function initNav() {
  // Marca el nav-item activo según el archivo actual
  const page = window.location.pathname.split('/').pop() || 'dashboard.html';
  document.querySelectorAll('.nav-item').forEach(el => {
    if ((el.getAttribute('href') || '') === page) el.classList.add('active');
  });

  // Tema
  const btn = document.getElementById('themeBtn');
  if (btn) btn.addEventListener('click', toggleTheme);

  // Usuario actual en el sidebar
  const userSlot = document.getElementById('sidebarUser');
  if (userSlot) {
    const me = getSession();
    if (me) {
      const isAdmin = me.role === 'admin';
      const initial = me.name.charAt(0).toUpperCase();
      userSlot.innerHTML = `
        <div class="sb-user-card">
          <div class="sb-avatar">${initial}</div>
          <div class="sb-user-info">
            <div class="sb-user-name">${escHtml(me.name)}</div>
            <div class="sb-user-role ${isAdmin ? 'sb-admin' : 'sb-member'}">
              ${isAdmin ? '🔐 Admin' : '👤 Miembro'}
            </div>
          </div>
          <button class="sb-logout" onclick="logout()" title="Cerrar sesión">↩</button>
        </div>`;
    }
  }

  // Hamburger mobile
  const ham     = document.getElementById('hamburger');
  const sidebar = document.querySelector('.sidebar');
  if (ham && sidebar) {
    ham.addEventListener('click', () => sidebar.classList.toggle('open'));
    document.addEventListener('click', e => {
      if (sidebar.classList.contains('open') && !sidebar.contains(e.target) && e.target !== ham)
        sidebar.classList.remove('open');
    });
  }
}

// ── PROTECCIÓN DE ADMIN ───────────────────────
// Se ejecuta en cada carga. Si no existe ningún usuario con
// role:'admin', lo recrea automáticamente.
function ensureAdmin() {
  const { users } = loadAll();
  const hasAdmin = users.some(u => u.role === 'admin');
  if (!hasAdmin) {
    users.unshift({ id: 'u_admin', name: 'Administrador', username: 'admin', password: 'admin123', role: 'admin' });
    saveUsers(users);
  }
}

// ── DATOS DE EJEMPLO ──────────────────────────
function seedData() {
  const data = loadAll();
  ensureAdmin(); // siempre verificar que exista un admin
  if (data.projects.length) return; // ya hay datos

  const projects = [
    { id:'p_1', name:'Rediseño Sitio Web',    desc:'Actualizar identidad visual y arquitectura de información del sitio corporativo.', status:'active',   dueDate:'2025-06-30', color:COLORS[0], createdAt: new Date().toISOString() },
    { id:'p_2', name:'App Móvil v2.0',         desc:'Nueva versión con mensajería en tiempo real y notificaciones push.',               status:'active',   dueDate:'2025-08-15', color:COLORS[1], createdAt: new Date().toISOString() },
    { id:'p_3', name:'Campaña Marketing Q2',   desc:'Estrategia de contenido y pauta publicitaria para el segundo trimestre.',          status:'paused',   dueDate:'2025-05-31', color:COLORS[2], createdAt: new Date().toISOString() },
  ];

  const users = [
    { id:'u_1', name:'Ana García',    username:'ana',  password:'1234', role:'admin'  },
    { id:'u_2', name:'Luis Martínez', username:'luis', password:'1234', role:'member' },
    { id:'u_3', name:'Sara López',    username:'sara', password:'1234', role:'member' },
  ];

  const today = new Date();
  const dt = (plusDays) => {
    const d = new Date(today);
    d.setDate(d.getDate() + plusDays);
    return d.toISOString().slice(0, 10);
  };

  const tasks = [
    { id:'t_1', projectId:'p_1', name:'Wireframes de pantallas principales', desc:'Diseñar los flujos principales en Figma.', status:'done',        priority:'high',   assignedTo:'u_1', dueDate: dt(-20), createdAt: new Date().toISOString() },
    { id:'t_2', projectId:'p_1', name:'Sistema de colores y tipografía',      desc:'',                                        status:'done',        priority:'medium', assignedTo:'u_2', dueDate: dt(-10), createdAt: new Date().toISOString() },
    { id:'t_3', projectId:'p_1', name:'Componente Header responsivo',         desc:'Incluir menú hamburger en móvil.',        status:'in_progress', priority:'high',   assignedTo:'u_1', dueDate: dt(5),   createdAt: new Date().toISOString() },
    { id:'t_4', projectId:'p_1', name:'Pruebas de usabilidad',                desc:'',                                        status:'pending',     priority:'medium', assignedTo:'u_3', dueDate: dt(20),  createdAt: new Date().toISOString() },
    { id:'t_5', projectId:'p_2', name:'Diseño de base de datos',              desc:'',                                        status:'done',        priority:'high',   assignedTo:'u_2', dueDate: dt(-15), createdAt: new Date().toISOString() },
    { id:'t_6', projectId:'p_2', name:'API de autenticación JWT',             desc:'',                                        status:'in_progress', priority:'high',   assignedTo:'u_1', dueDate: dt(8),   createdAt: new Date().toISOString() },
    { id:'t_7', projectId:'p_2', name:'Pantalla de mensajes',                 desc:'Chat en tiempo real con WebSockets.',     status:'pending',     priority:'medium', assignedTo:'u_3', dueDate: dt(25),  createdAt: new Date().toISOString() },
    { id:'t_8', projectId:'p_3', name:'Definir KPIs de campaña',              desc:'',                                        status:'done',        priority:'high',   assignedTo:'u_1', dueDate: dt(-30), createdAt: new Date().toISOString() },
    { id:'t_9', projectId:'p_3', name:'Crear contenido para redes sociales',  desc:'',                                        status:'in_progress', priority:'medium', assignedTo:'u_2', dueDate: dt(3),   createdAt: new Date().toISOString() },
  ];

  saveProjects(projects);
  saveTasks(tasks);
  saveUsers(users);
}
