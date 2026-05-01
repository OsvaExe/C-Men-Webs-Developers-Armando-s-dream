/* ═══════════════════════════════════════════════
   TASKFLOW — shared.js  (versión multi-página)
   ═══════════════════════════════════════════════ */

const KEYS = {
  projects: 'tf_projects', tasks: 'tf_tasks',
  users: 'tf_users', theme: 'tf_theme', session: 'tf_session',
};
const COLORS = ['#5b6af0','#7ee8a2','#f0a05b','#f05b6a','#a05bf0','#5bc8f0','#f0e05b','#5bf0c8'];
const AVC    = ['#5b6af0','#7ee8a2','#f0a05b','#f05b6a','#a05bf0','#5bc8f0'];
function avColor(id) { let s=0; for(let i=0;i<id.length;i++) s+=id.charCodeAt(i); return AVC[s%AVC.length]; }

// ── SESIÓN ────────────────────────────────────
function getSession()    { try { return JSON.parse(localStorage.getItem(KEYS.session)) || null; } catch { return null; } }
function setSession(u)   { localStorage.setItem(KEYS.session, JSON.stringify(u)); }
function clearSession()  { localStorage.removeItem(KEYS.session); }

function checkAuth() {
  const s = getSession();
  if (!s) { window.location.href = 'login.html'; return; }
  const { users } = loadAll();
  if (!users.find(u => u.id === s.id)) { clearSession(); window.location.href = 'login.html'; }
}
function logout() { clearSession(); window.location.href = 'login.html'; }

// ── ALMACENAMIENTO ────────────────────────────
function loadAll() {
  function parse(k, d) {
    const raw = localStorage.getItem(k);
    if (raw === null) return d;
    try { const p = JSON.parse(raw); if (!Array.isArray(p)) throw new Error(); return p; }
    catch { localStorage.setItem(k+'_corrupted_backup', raw); console.warn(`[TaskFlow] Dato corrupto en "${k}".`); return d; }
  }
  return { projects: parse(KEYS.projects,[]), tasks: parse(KEYS.tasks,[]), users: parse(KEYS.users,[]) };
}
function saveProjects(d) { localStorage.setItem(KEYS.projects, JSON.stringify(d)); }
function saveTasks(d)    { localStorage.setItem(KEYS.tasks,    JSON.stringify(d)); }
function saveUsers(d)    { localStorage.setItem(KEYS.users,    JSON.stringify(d)); }

// ── UTILIDADES ────────────────────────────────
function genId(p='id') { return p+'_'+Date.now()+'_'+Math.random().toString(36).slice(2,6); }
function escHtml(str)  { return (str||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function formatDate(str) {
  if (!str) return '';
  const d = new Date(str+'T00:00:00');
  return d.toLocaleDateString('es-MX', { day:'2-digit', month:'short', year:'numeric' });
}
function isValidDate(str) { return !!str && !isNaN(new Date(str).getTime()); }
function projectProgress(pid) {
  const { tasks } = loadAll();
  const pt = tasks.filter(t => t.projectId === pid);
  if (!pt.length) return { total:0, done:0, pct:0 };
  const done = pt.filter(t => t.status === 'done').length;
  return { total: pt.length, done, pct: Math.round(done/pt.length*100) };
}

// ── TEMA ──────────────────────────────────────
function getTheme()    { return localStorage.getItem(KEYS.theme) || 'dark'; }
function applyTheme(t) { document.documentElement.setAttribute('data-theme',t); const b=document.getElementById('themeBtn'); if(b) b.textContent=t==='dark'?'🌙':'☀️'; localStorage.setItem(KEYS.theme,t); }
function initTheme()   { applyTheme(getTheme()); }
function toggleTheme() { applyTheme(getTheme()==='dark'?'light':'dark'); }

// ── TOASTS ────────────────────────────────────
function showToast(msg, type='info') {
  const wrap = document.getElementById('toastWrap');
  if (!wrap) return;
  const icons = { success:'✅', error:'🗑️', info:'ℹ️', warning:'⚠️' };
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  t.innerHTML = `<span>${icons[type]||''}</span>${escHtml(msg)}`;
  wrap.appendChild(t);
  setTimeout(() => t.remove(), 3100);
}

// ── ROLES ─────────────────────────────────────
function isAdmin() {
  const s = getSession(); if (!s) return false;
  const { users } = loadAll();
  const live = users.find(u => u.id === s.id);
  return live ? live.role === 'admin' : s.role === 'admin';
}
function getMyId() { const s = getSession(); return s ? s.id : null; }

function getVisibleProjects(projects, tasks) {
  if (isAdmin()) return projects;
  const myId = getMyId();
  return projects.filter(p => {
    if (p.createdBy === myId) return true;
    if (Array.isArray(p.assignedUsers) && p.assignedUsers.includes(myId)) return true;
    return tasks.some(t => {
      if (t.projectId !== p.id) return false;
      const at = Array.isArray(t.assignedTo) ? t.assignedTo : (t.assignedTo ? [t.assignedTo] : []);
      return at.includes(myId);
    });
  });
}
function getVisibleTasks(tasks) {
  if (isAdmin()) return tasks;
  const myId = getMyId();
  return tasks.filter(t => {
    const at = Array.isArray(t.assignedTo) ? t.assignedTo : (t.assignedTo ? [t.assignedTo] : []);
    return at.includes(myId);
  });
}

// ── NAV ───────────────────────────────────────
function initNav() {
  const page = window.location.pathname.split('/').pop() || 'dashboard.html';
  document.querySelectorAll('.nav-item').forEach(el => {
    if ((el.getAttribute('href') || '') === page) el.classList.add('active');
  });
  const btn = document.getElementById('themeBtn');
  if (btn) btn.addEventListener('click', toggleTheme);

  // Sidebar user
  const slot = document.getElementById('sidebarUser');
  if (slot) {
    const me = getSession();
    if (me) {
      const admin = me.role === 'admin';
      const ini = me.name.charAt(0).toUpperCase();
      slot.innerHTML = `<div class="sb-user-card">
        <div class="sb-avatar">${ini}</div>
        <div class="sb-user-info">
          <div class="sb-user-name">${escHtml(me.name)}</div>
          <div class="sb-user-role ${admin?'sb-admin':'sb-member'}">${admin?'🔐 Admin':'👤 Miembro'}</div>
        </div>
        <button class="sb-logout" onclick="logout()" title="Cerrar sesión">↩</button>
      </div>`;
    }
  }
  // Hamburger
  const ham = document.getElementById('hamburger');
  const sb  = document.querySelector('.sidebar');
  if (ham && sb) {
    ham.addEventListener('click', () => sb.classList.toggle('open'));
    document.addEventListener('click', e => {
      if (sb.classList.contains('open') && !sb.contains(e.target) && e.target !== ham)
        sb.classList.remove('open');
    });
  }
}

// ── PROTECCIÓN DE ADMIN ───────────────────────
function ensureAdmin() {
  const { users } = loadAll();
  if (!users.some(u => u.role === 'admin')) {
    users.unshift({ id:'u_admin', name:'Administrador', username:'admin', password:'admin123', role:'admin' });
    saveUsers(users);
  }
}

// ── MIGRACIONES ───────────────────────────────
function migrateUsers() {
  const { users } = loadAll(); let ch = false;
  const up = users.map(u => {
    if (!u.username || !u.password) { ch = true; return { ...u,
      username: u.username || u.name.toLowerCase().split(' ')[0].normalize('NFD').replace(/[\u0300-\u036f]/g,''),
      password: u.password || '1234' }; }
    return u;
  });
  if (ch) saveUsers(up);
}
function migrateTasks() {
  const { tasks } = loadAll(); let ch = false;
  const up = tasks.map(t => { if (!Array.isArray(t.assignedTo)) { ch=true; return {...t, assignedTo: t.assignedTo?[t.assignedTo]:[]}; } return t; });
  if (ch) saveTasks(up);
}
function migrateProjects() {
  const { projects, users } = loadAll();
  const fa = users.find(u => u.role === 'admin'); let ch = false;
  const up = projects.map(p => {
    const n = { ...p,
      name: p.name || p.title || 'Proyecto sin nombre',
      desc: p.desc ?? p.description ?? '',
      assignedUsers: Array.isArray(p.assignedUsers) ? p.assignedUsers : (Array.isArray(p.members) ? p.members : []),
      dueDate: p.dueDate || p.deadline || '',
      status: p.status || 'active',
      color: p.color || COLORS[0],
      createdBy: p.createdBy || (fa ? fa.id : null),
    };
    if (n.name!==p.name||n.desc!==p.desc||n.dueDate!==p.dueDate||n.status!==p.status||n.color!==p.color||n.createdBy!==p.createdBy||!Array.isArray(p.assignedUsers)) ch=true;
    return n;
  });
  if (ch) saveProjects(up);
}

// ── SEED DATA ─────────────────────────────────
function seedData() {
  ensureAdmin(); migrateUsers(); migrateTasks(); migrateProjects();
  const data = loadAll();
  if (data.projects.length) return;

  const projects = [
    { id:'p_1', name:'Rediseño Sitio Web',  desc:'Actualizar identidad visual y arquitectura de información del sitio corporativo.', status:'active', dueDate:'2025-06-30', color:COLORS[0], assignedUsers:['u_1','u_2','u_3'], createdBy:'u_1', createdAt:new Date().toISOString() },
    { id:'p_2', name:'App Móvil v2.0',       desc:'Nueva versión con mensajería en tiempo real y notificaciones push.',               status:'active', dueDate:'2025-08-15', color:COLORS[1], assignedUsers:['u_1','u_2'],       createdBy:'u_1', createdAt:new Date().toISOString() },
    { id:'p_3', name:'Campaña Marketing Q2', desc:'Estrategia de contenido y pauta publicitaria para el segundo trimestre.',          status:'paused', dueDate:'2025-05-31', color:COLORS[2], assignedUsers:['u_1','u_3'],       createdBy:'u_1', createdAt:new Date().toISOString() },
  ];
  const users = [
    { id:'u_1', name:'Ana García',    username:'ana',  password:'1234', role:'admin'  },
    { id:'u_2', name:'Luis Martínez', username:'luis', password:'1234', role:'member' },
    { id:'u_3', name:'Sara López',    username:'sara', password:'1234', role:'member' },
  ];
  const today = new Date();
  const dt = n => { const d=new Date(today); d.setDate(d.getDate()+n); return d.toISOString().slice(0,10); };
  const tasks = [
    { id:'t_1', projectId:'p_1', name:'Wireframes de pantallas principales', desc:'Diseñar los flujos principales en Figma.', status:'done',        priority:'high',   assignedTo:['u_1','u_2'], dueDate:dt(-20), createdAt:new Date().toISOString() },
    { id:'t_2', projectId:'p_1', name:'Sistema de colores y tipografía',      desc:'',                                        status:'done',        priority:'medium', assignedTo:['u_2'],       dueDate:dt(-10), createdAt:new Date().toISOString() },
    { id:'t_3', projectId:'p_1', name:'Componente Header responsivo',         desc:'Incluir menú hamburger en móvil.',        status:'in_progress', priority:'high',   assignedTo:['u_1','u_3'], dueDate:dt(5),   createdAt:new Date().toISOString() },
    { id:'t_4', projectId:'p_1', name:'Pruebas de usabilidad',                desc:'',                                        status:'pending',     priority:'medium', assignedTo:['u_3'],       dueDate:dt(20),  createdAt:new Date().toISOString() },
    { id:'t_5', projectId:'p_2', name:'Diseño de base de datos',              desc:'',                                        status:'done',        priority:'high',   assignedTo:['u_2'],       dueDate:dt(-15), createdAt:new Date().toISOString() },
    { id:'t_6', projectId:'p_2', name:'API de autenticación JWT',             desc:'',                                        status:'in_progress', priority:'high',   assignedTo:['u_1','u_2'], dueDate:dt(8),   createdAt:new Date().toISOString() },
    { id:'t_7', projectId:'p_2', name:'Pantalla de mensajes',                 desc:'Chat en tiempo real con WebSockets.',     status:'pending',     priority:'medium', assignedTo:['u_3'],       dueDate:dt(25),  createdAt:new Date().toISOString() },
    { id:'t_8', projectId:'p_3', name:'Definir KPIs de campaña',              desc:'',                                        status:'done',        priority:'high',   assignedTo:['u_1'],       dueDate:dt(-30), createdAt:new Date().toISOString() },
    { id:'t_9', projectId:'p_3', name:'Crear contenido para redes sociales',  desc:'',                                        status:'in_progress', priority:'medium', assignedTo:['u_2','u_3'], dueDate:dt(3),   createdAt:new Date().toISOString() },
  ];
  saveProjects(projects); saveTasks(tasks); saveUsers(users);
}
