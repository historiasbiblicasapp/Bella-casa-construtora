/* =====================================================
   Painel Administrativo — Serviços & Planos
   ===================================================== */

const SUPABASE_URL = 'https://jwlbwgzaukwjhuqhoewl.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp3bGJ3Z3phdWt3amh1cWhvZXdsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE0Mjk5MTQsImV4cCI6MjEwNzAwNTkxNH0.4_oeh6OMjUQKLMqKZ1iuxJG6bOEQukAnbKiCm7gH_gM';

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let adminUser = null;
let adminProfile = null;
let allClients = [];

const CATEGORY_LABELS = {
  reforma: 'Reforma', pintura: 'Pintura', manutencao_equipamentos: 'Manutenção Equip.',
  jardinagem: 'Jardinagem', construcao: 'Construção', ampliacao: 'Ampliação',
  limpeza: 'Limpeza', reparos_geral: 'Reparos Gerais', eletrica: 'Elétrica',
  telhado: 'Telhado', drywall_gesso: 'Drywall/Gesso', locacao_mao_obra: 'Locação M.O.'
};

const STATUS_LABELS = {
  pending: 'Pendente', analyzing: 'Em análise', quoted: 'Orçado',
  accepted: 'Aceito', rejected: 'Recusado', completed: 'Concluído',
  active: 'Ativa', paused: 'Pausada', cancelled: 'Cancelada', expired: 'Expirada'
};

// =====================================================
// Init
// =====================================================
document.addEventListener('DOMContentLoaded', async () => {
  const { data: { session } } = await supabase.auth.getSession();
  if (session) {
    await checkAdminAccess(session.user);
  } else {
    // Sem sessão: redireciona para o app para fazer login
    showGate('Faça login no app com uma conta master/admin e depois acesse /admin.html');
  }

  supabase.auth.onAuthStateChange(async (event, session) => {
    if (event === 'SIGNED_IN' && session) {
      await checkAdminAccess(session.user);
    } else if (event === 'SIGNED_OUT') {
      window.location.href = 'index.html';
    }
  });
});

async function checkAdminAccess(user) {
  adminUser = user;
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (error || !profile || !['admin', 'master'].includes(profile.role)) {
    showGate('Acesso negado. Sua conta não possui permissão de administrador.');
    await supabase.auth.signOut();
    return;
  }

  adminProfile = profile;
  document.getElementById('admin-gate').classList.add('hidden');
  document.getElementById('admin-app').classList.remove('hidden');
  document.getElementById('admin-user-info').textContent = profile.full_name || profile.email;
  document.getElementById('admin-role-badge').textContent = profile.role;
  adminNav('dashboard');
}

function showGate(msg) {
  document.getElementById('admin-gate').classList.remove('hidden');
  document.getElementById('admin-app').classList.add('hidden');
  const err = document.getElementById('gate-error');
  err.textContent = msg;
  err.style.display = 'block';
}

async function adminLogout() {
  await supabase.auth.signOut();
  window.location.href = 'index.html';
}

function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open');
}

// =====================================================
// Navegação
// =====================================================
const SECTION_TITLES = {
  dashboard: 'Dashboard',
  clientes: 'Clientes',
  orcamentos: 'Orçamentos',
  assinaturas: 'Assinaturas',
  planos: 'Planos de Mensalidade',
  historico: 'Histórico de Serviços',
  parceiros: 'Parceiros',
  galeria: 'Galeria de Serviços',
  pagamentos: 'Pagamentos'
};

function adminNav(section) {
  document.querySelectorAll('.admin-section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.sidebar-item').forEach(i => i.classList.remove('active'));
  document.getElementById(`sec-${section}`)?.classList.add('active');
  document.querySelector(`[data-section="${section}"]`)?.classList.add('active');
  document.getElementById('section-title').textContent = SECTION_TITLES[section] || section;
  document.getElementById('sidebar')?.classList.remove('open');

  const loaders = {
    dashboard: loadDashboard,
    clientes: loadClients,
    orcamentos: loadAdminBudgets,
    assinaturas: loadSubscriptions,
    planos: loadAdminPlans,
    historico: loadAdminHistory,
    parceiros: loadAdminPartners,
    galeria: loadAdminGallery,
    pagamentos: loadAdminPayments
  };
  loaders[section]?.();
}

// =====================================================
// Dashboard
// =====================================================
async function loadDashboard() {
  const [clients, budgets, subs] = await Promise.all([
    supabase.from('profiles').select('id, full_name, email, created_at, role').eq('role', 'client'),
    supabase.from('budget_requests').select('id, status, title, category, created_at, profiles(full_name)').order('created_at', { ascending: false }).limit(10),
    supabase.from('subscriptions').select('id, status, monthly_value')
  ]);

  const clientCount = clients.data?.length || 0;
  const pendingBudgets = (budgets.data || []).filter(b => ['pending', 'analyzing'].includes(b.status)).length;
  const activeSubs = (subs.data || []).filter(s => s.status === 'active');
  const revenue = activeSubs.reduce((sum, s) => sum + Number(s.monthly_value || 0), 0);

  document.getElementById('stat-clients').textContent = clientCount;
  document.getElementById('stat-budgets').textContent = pendingBudgets;
  document.getElementById('stat-subs').textContent = activeSubs.length;
  document.getElementById('stat-revenue').textContent = 'R$ ' + revenue.toFixed(2);

  // Recent budgets
  const recentEl = document.getElementById('dash-recent-budgets');
  if (budgets.data?.length) {
    recentEl.innerHTML = `<table class="admin-table"><thead><tr>
      <th>Cliente</th><th>Serviço</th><th>Status</th><th>Data</th>
    </tr></thead><tbody>
      ${budgets.data.map(b => `<tr>
        <td>${b.profiles?.full_name || '—'}</td>
        <td>${CATEGORY_LABELS[b.category] || b.title || b.category}</td>
        <td><span class="badge badge-${badgeClass(b.status)}">${STATUS_LABELS[b.status] || b.status}</span></td>
        <td>${fmtDate(b.created_at)}</td>
      </tr>`).join('')}
    </tbody></table>`;
  } else {
    recentEl.innerHTML = '<div class="empty-table">Nenhum orçamento ainda</div>';
  }

  // New clients (7 days)
  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();
  const newClients = (clients.data || []).filter(c => c.created_at >= weekAgo);
  const newEl = document.getElementById('dash-new-clients');
  if (newClients.length) {
    newEl.innerHTML = `<table class="admin-table"><thead><tr>
      <th>Nome</th><th>E-mail</th><th>Cadastro</th>
    </tr></thead><tbody>
      ${newClients.map(c => `<tr>
        <td>${c.full_name || '—'}</td>
        <td>${c.email}</td>
        <td>${fmtDate(c.created_at)}</td>
      </tr>`).join('')}
    </tbody></table>`;
  } else {
    newEl.innerHTML = '<div class="empty-table">Nenhum cliente novo nos últimos 7 dias</div>';
  }
}

// =====================================================
// Clientes
// =====================================================
async function loadClients() {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false });

  allClients = data || [];
  renderClientsTable(allClients);
}

function filterClients() {
  const q = (document.getElementById('search-clients')?.value || '').toLowerCase();
  const filtered = allClients.filter(c =>
    (c.full_name || '').toLowerCase().includes(q) ||
    (c.email || '').toLowerCase().includes(q) ||
    (c.cpf || '').includes(q.replace(/\D/g, ''))
  );
  renderClientsTable(filtered);
}

function renderClientsTable(list) {
  const el = document.getElementById('clients-table');
  if (!list.length) {
    el.innerHTML = '<div class="empty-table">Nenhum cliente encontrado</div>';
    return;
  }
  el.innerHTML = `<table class="admin-table"><thead><tr>
    <th>Nome</th><th>E-mail</th><th>CPF</th><th>Role</th><th>Docs</th><th>Facial</th><th>Cadastro</th><th>Ações</th>
  </tr></thead><tbody>
    ${list.map(c => `<tr>
      <td>${c.full_name || '—'}</td>
      <td>${c.email}</td>
      <td>${c.cpf || '—'}</td>
      <td><span class="badge badge-${c.role === 'client' ? 'pending' : 'active'}">${c.role}</span></td>
      <td>${c.documents_status || 'pending'}</td>
      <td>${c.facial_recognition_status || 'pending'}</td>
      <td>${fmtDate(c.created_at)}</td>
      <td class="actions">
        <button onclick="viewClient('${c.id}')">Ver</button>
        ${adminProfile?.role === 'master' && c.role === 'client' ? `<button onclick="promoteAdmin('${c.id}')">Tornar Admin</button>` : ''}
        ${adminProfile?.role === 'master' && c.role === 'admin' ? `<button class="danger" onclick="demoteClient('${c.id}')">Remover Admin</button>` : ''}
      </td>
    </tr>`).join('')}
  </tbody></table>`;
}

async function viewClient(id) {
  const c = allClients.find(x => x.id === id);
  if (!c) return;

  const [{ data: props }, { data: subs }, { data: budgets }] = await Promise.all([
    supabase.from('properties').select('*').eq('user_id', id),
    supabase.from('subscriptions').select('*, subscription_plans(name)').eq('user_id', id),
    supabase.from('budget_requests').select('*').eq('user_id', id).order('created_at', { ascending: false }).limit(5)
  ]);

  openAdminModal(`
    <div class="modal-header"><h2>${c.full_name || c.email}</h2>
    <button class="modal-close" onclick="closeAdminModal()">×</button></div>
    <p class="text-sm text-muted">${c.email} · CPF: ${c.cpf || '—'} · Tel: ${c.phone || '—'}</p>
    <p class="text-sm mt-1">Role: <strong>${c.role}</strong> · Docs: ${c.documents_status} · Facial: ${c.facial_recognition_status}</p>
    <h3 class="mt-2" style="font-size:1rem">Imóveis (${props?.length || 0})</h3>
    ${(props || []).map(p => `<div class="card" style="padding:10px;margin:6px 0">
      ${p.name || p.property_type} — inspeção: ${p.inspection_status}
    </div>`).join('') || '<p class="text-muted text-sm">Nenhum</p>'}
    <h3 class="mt-2" style="font-size:1rem">Assinaturas (${subs?.length || 0})</h3>
    ${(subs || []).map(s => `<div class="card" style="padding:10px;margin:6px 0">
      ${s.subscription_plans?.name || 'Plano'} — R$ ${Number(s.monthly_value||0).toFixed(2)} — ${s.status}
    </div>`).join('') || '<p class="text-muted text-sm">Nenhuma</p>'}
    <h3 class="mt-2" style="font-size:1rem">Últimos orçamentos</h3>
    ${(budgets || []).map(b => `<div class="card" style="padding:10px;margin:6px 0">
      ${CATEGORY_LABELS[b.category] || b.category} — ${STATUS_LABELS[b.status]} — ${fmtDate(b.created_at)}
    </div>`).join('') || '<p class="text-muted text-sm">Nenhum</p>'}
  `);
}

async function promoteAdmin(id) {
  if (!confirm('Tornar este usuário administrador?')) return;
  const { error } = await supabase.from('profiles').update({ role: 'admin' }).eq('id', id);
  if (error) alert(error.message); else { alert('Usuário promovido a admin'); loadClients(); }
}

async function demoteClient(id) {
  if (!confirm('Remover permissão de admin?')) return;
  const { error } = await supabase.from('profiles').update({ role: 'client' }).eq('id', id);
  if (error) alert(error.message); else { alert('Permissão removida'); loadClients(); }
}

// =====================================================
// Orçamentos
// =====================================================
async function loadAdminBudgets() {
  const status = document.getElementById('filter-budget-status')?.value || '';
  let query = supabase
    .from('budget_requests')
    .select('*, profiles(full_name, email)')
    .order('created_at', { ascending: false });

  if (status) query = query.eq('status', status);

  const { data } = await query;
  const el = document.getElementById('budgets-table');

  if (!data?.length) {
    el.innerHTML = '<div class="empty-table">Nenhum orçamento</div>';
    return;
  }

  el.innerHTML = `<table class="admin-table"><thead><tr>
    <th>Cliente</th><th>Categoria</th><th>Descrição</th><th>Urgência</th><th>Status</th><th>Valor</th><th>Data</th><th>Ações</th>
  </tr></thead><tbody>
    ${data.map(b => `<tr>
      <td>${b.profiles?.full_name || '—'}</td>
      <td>${CATEGORY_LABELS[b.category] || b.category}</td>
      <td title="${b.description || ''}">${(b.description || '').slice(0, 40)}${(b.description||'').length > 40 ? '…' : ''}</td>
      <td>${b.urgency || 'normal'}</td>
      <td><span class="badge badge-${badgeClass(b.status)}">${STATUS_LABELS[b.status] || b.status}</span></td>
      <td>${b.quoted_value ? 'R$ ' + Number(b.quoted_value).toFixed(2) : '—'}</td>
      <td>${fmtDate(b.created_at)}</td>
      <td class="actions">
        <button onclick="editBudget('${b.id}')">Gerenciar</button>
      </td>
    </tr>`).join('')}
  </tbody></table>`;
}

async function editBudget(id) {
  const { data: b } = await supabase.from('budget_requests').select('*, profiles(full_name, email)').eq('id', id).single();
  if (!b) return;

  openAdminModal(`
    <div class="modal-header"><h2>Gerenciar Orçamento</h2>
    <button class="modal-close" onclick="closeAdminModal()">×</button></div>
    <p class="text-sm"><strong>${b.profiles?.full_name}</strong> (${b.profiles?.email})</p>
    <p class="text-sm text-muted">${CATEGORY_LABELS[b.category]} · ${fmtDate(b.created_at)}</p>
    <p class="mt-1">${b.description || ''}</p>
    <form onsubmit="saveBudget(event, '${b.id}')" class="mt-2">
      <div class="form-group">
        <label>Status</label>
        <select id="edit-status">
          ${['pending','analyzing','quoted','accepted','rejected','completed'].map(s =>
            `<option value="${s}" ${b.status === s ? 'selected' : ''}>${STATUS_LABELS[s]}</option>`
          ).join('')}
        </select>
      </div>
      <div class="form-group">
        <label>Valor orçado (R$)</label>
        <input type="number" id="edit-value" step="0.01" min="0" value="${b.quoted_value || ''}" placeholder="0.00">
      </div>
      <div class="form-group">
        <label>Notas internas</label>
        <textarea id="edit-notes">${b.admin_notes || ''}</textarea>
      </div>
      <button type="submit" class="btn btn-primary">Salvar</button>
    </form>
  `);
}

async function saveBudget(e, id) {
  e.preventDefault();
  const status = document.getElementById('edit-status').value;
  const quoted_value = document.getElementById('edit-value').value || null;
  const admin_notes = document.getElementById('edit-notes').value;

  const { error } = await supabase.from('budget_requests').update({
    status, quoted_value, admin_notes, updated_at: new Date().toISOString()
  }).eq('id', id);

  if (error) alert(error.message);
  else {
    closeAdminModal();
    loadAdminBudgets();
    alert('Orçamento atualizado!');
  }
}

// =====================================================
// Assinaturas
// =====================================================
async function loadSubscriptions() {
  const { data } = await supabase
    .from('subscriptions')
    .select('*, profiles(full_name, email), properties(name, property_type), subscription_plans(name)')
    .order('created_at', { ascending: false });

  const el = document.getElementById('subs-table');
  if (!data?.length) {
    el.innerHTML = '<div class="empty-table">Nenhuma assinatura</div>';
    return;
  }

  el.innerHTML = `<table class="admin-table"><thead><tr>
    <th>Cliente</th><th>Plano</th><th>Imóvel</th><th>Valor/mês</th><th>Status</th><th>Início</th><th>Ações</th>
  </tr></thead><tbody>
    ${data.map(s => `<tr>
      <td>${s.profiles?.full_name || '—'}</td>
      <td>${s.subscription_plans?.name || '—'}</td>
      <td>${s.properties?.name || s.properties?.property_type || '—'}</td>
      <td>R$ ${Number(s.monthly_value || 0).toFixed(2)}</td>
      <td><span class="badge badge-${badgeClass(s.status)}">${STATUS_LABELS[s.status] || s.status}</span></td>
      <td>${s.start_date ? fmtDate(s.start_date) : '—'}</td>
      <td class="actions">
        <button onclick="editSubscription('${s.id}', '${s.status}')">Status</button>
      </td>
    </tr>`).join('')}
  </tbody></table>`;
}

async function editSubscription(id, currentStatus) {
  const statuses = ['pending', 'active', 'paused', 'cancelled', 'expired'];
  openAdminModal(`
    <div class="modal-header"><h2>Alterar Status da Assinatura</h2>
    <button class="modal-close" onclick="closeAdminModal()">×</button></div>
    <form onsubmit="saveSubscription(event, '${id}')">
      <div class="form-group">
        <label>Status</label>
        <select id="sub-status">
          ${statuses.map(s => `<option value="${s}" ${s === currentStatus ? 'selected' : ''}>${STATUS_LABELS[s] || s}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label>Data de início (se ativar)</label>
        <input type="date" id="sub-start" value="${new Date().toISOString().slice(0,10)}">
      </div>
      <button type="submit" class="btn btn-primary">Salvar</button>
    </form>
  `);
}

async function saveSubscription(e, id) {
  e.preventDefault();
  const status = document.getElementById('sub-status').value;
  const start_date = document.getElementById('sub-start').value || null;
  const update = { status, updated_at: new Date().toISOString() };
  if (status === 'active' && start_date) update.start_date = start_date;

  const { error } = await supabase.from('subscriptions').update(update).eq('id', id);
  if (error) alert(error.message);
  else { closeAdminModal(); loadSubscriptions(); alert('Assinatura atualizada!'); }
}

// =====================================================
// Planos
// =====================================================
async function loadAdminPlans() {
  const { data } = await supabase.from('subscription_plans').select('*').order('base_price');
  const el = document.getElementById('plans-table');
  if (!data?.length) {
    el.innerHTML = '<div class="empty-table">Nenhum plano</div>';
    return;
  }
  el.innerHTML = `<table class="admin-table"><thead><tr>
    <th>Nome</th><th>Preço base</th><th>Por ambiente</th><th>Ativo</th><th>Ações</th>
  </tr></thead><tbody>
    ${data.map(p => `<tr>
      <td>${p.name}</td>
      <td>R$ ${Number(p.base_price).toFixed(2)}</td>
      <td>R$ ${Number(p.price_per_room || 0).toFixed(2)}</td>
      <td>${p.is_active ? '✅' : '❌'}</td>
      <td class="actions">
        <button onclick="editPlan('${p.id}')">Editar</button>
        <button class="danger" onclick="togglePlan('${p.id}', ${!p.is_active})">${p.is_active ? 'Desativar' : 'Ativar'}</button>
      </td>
    </tr>`).join('')}
  </tbody></table>`;
}

function openPlanModal(plan = null) {
  openAdminModal(`
    <div class="modal-header"><h2>${plan ? 'Editar' : 'Novo'} Plano</h2>
    <button class="modal-close" onclick="closeAdminModal()">×</button></div>
    <form onsubmit="savePlan(event, '${plan?.id || ''}')">
      <div class="form-group"><label>Nome</label>
        <input type="text" id="plan-name" required value="${plan?.name || ''}"></div>
      <div class="form-group"><label>Descrição</label>
        <textarea id="plan-desc">${plan?.description || ''}</textarea></div>
      <div class="form-group"><label>Preço base (R$)</label>
        <input type="number" id="plan-base" step="0.01" required value="${plan?.base_price || ''}"></div>
      <div class="form-group"><label>Preço por ambiente (R$)</label>
        <input type="number" id="plan-room" step="0.01" value="${plan?.price_per_room || 0}"></div>
      <div class="form-group"><label>Benefícios (um por linha)</label>
        <textarea id="plan-benefits">${(plan?.benefits || []).join('\n')}</textarea></div>
      <div class="form-group"><label>Serviços inclusos (um por linha)</label>
        <textarea id="plan-services">${(plan?.included_services || []).join('\n')}</textarea></div>
      <button type="submit" class="btn btn-primary">Salvar</button>
    </form>
  `);
}

async function editPlan(id) {
  const { data } = await supabase.from('subscription_plans').select('*').eq('id', id).single();
  if (data) openPlanModal(data);
}

async function savePlan(e, id) {
  e.preventDefault();
  const payload = {
    name: document.getElementById('plan-name').value.trim(),
    description: document.getElementById('plan-desc').value.trim(),
    base_price: parseFloat(document.getElementById('plan-base').value),
    price_per_room: parseFloat(document.getElementById('plan-room').value) || 0,
    benefits: document.getElementById('plan-benefits').value.split('\n').map(s => s.trim()).filter(Boolean),
    included_services: document.getElementById('plan-services').value.split('\n').map(s => s.trim()).filter(Boolean),
    is_active: true
  };

  let error;
  if (id) {
    ({ error } = await supabase.from('subscription_plans').update(payload).eq('id', id));
  } else {
    ({ error } = await supabase.from('subscription_plans').insert(payload));
  }
  if (error) alert(error.message);
  else { closeAdminModal(); loadAdminPlans(); }
}

async function togglePlan(id, active) {
  const { error } = await supabase.from('subscription_plans').update({ is_active: active }).eq('id', id);
  if (error) alert(error.message); else loadAdminPlans();
}

// =====================================================
// Histórico de Serviços
// =====================================================
async function loadAdminHistory() {
  const { data } = await supabase
    .from('service_history')
    .select('*, profiles(full_name), properties(name)')
    .order('service_date', { ascending: false });

  const el = document.getElementById('history-table');
  if (!data?.length) {
    el.innerHTML = '<div class="empty-table">Nenhum serviço registrado</div>';
    return;
  }
  el.innerHTML = `<table class="admin-table"><thead><tr>
    <th>Data</th><th>Cliente</th><th>Tipo</th><th>Imóvel</th><th>Profissional</th><th>Valor</th>
  </tr></thead><tbody>
    ${data.map(h => `<tr>
      <td>${fmtDate(h.service_date)}</td>
      <td>${h.profiles?.full_name || '—'}</td>
      <td>${h.service_type}</td>
      <td>${h.properties?.name || '—'}</td>
      <td>${h.professional_name || '—'}</td>
      <td>${h.value ? 'R$ ' + Number(h.value).toFixed(2) : '—'}</td>
    </tr>`).join('')}
  </tbody></table>`;
}

async function openHistoryModal() {
  const { data: clients } = await supabase.from('profiles').select('id, full_name, email').eq('role', 'client').order('full_name');
  openAdminModal(`
    <div class="modal-header"><h2>Registrar Serviço</h2>
    <button class="modal-close" onclick="closeAdminModal()">×</button></div>
    <form onsubmit="saveHistory(event)">
      <div class="form-group"><label>Cliente</label>
        <select id="hist-client" required>
          <option value="">Selecione...</option>
          ${(clients || []).map(c => `<option value="${c.id}">${c.full_name || c.email}</option>`).join('')}
        </select></div>
      <div class="form-group"><label>Data do serviço</label>
        <input type="date" id="hist-date" required value="${new Date().toISOString().slice(0,10)}"></div>
      <div class="form-group"><label>Tipo de serviço/reparo</label>
        <input type="text" id="hist-type" required placeholder="Ex: Troca de disjuntor"></div>
      <div class="form-group"><label>Descrição</label>
        <textarea id="hist-desc"></textarea></div>
      <div class="form-group"><label>Profissional / Equipe</label>
        <input type="text" id="hist-pro" placeholder="Nome do profissional"></div>
      <div class="form-group"><label>Valor (R$)</label>
        <input type="number" id="hist-value" step="0.01" min="0"></div>
      <div class="form-group"><label>Observações</label>
        <textarea id="hist-notes"></textarea></div>
      <button type="submit" class="btn btn-primary">Registrar</button>
    </form>
  `);
}

async function saveHistory(e) {
  e.preventDefault();
  const payload = {
    user_id: document.getElementById('hist-client').value,
    service_date: document.getElementById('hist-date').value,
    service_type: document.getElementById('hist-type').value.trim(),
    description: document.getElementById('hist-desc').value.trim(),
    professional_name: document.getElementById('hist-pro').value.trim() || null,
    value: document.getElementById('hist-value').value || null,
    observations: document.getElementById('hist-notes').value.trim() || null
  };
  const { error } = await supabase.from('service_history').insert(payload);
  if (error) alert(error.message);
  else { closeAdminModal(); loadAdminHistory(); alert('Serviço registrado!'); }
}

// =====================================================
// Parceiros
// =====================================================
async function loadAdminPartners() {
  const { data } = await supabase.from('partners').select('*').order('order_index');
  const el = document.getElementById('partners-table');
  if (!data?.length) {
    el.innerHTML = '<div class="empty-table">Nenhum parceiro</div>';
    return;
  }
  el.innerHTML = `<table class="admin-table"><thead><tr>
    <th>Nome</th><th>Descrição</th><th>Ativo</th><th>Ações</th>
  </tr></thead><tbody>
    ${data.map(p => `<tr>
      <td>${p.name}</td>
      <td>${(p.description || '').slice(0, 50)}</td>
      <td>${p.is_active ? '✅' : '❌'}</td>
      <td class="actions">
        <button class="danger" onclick="deletePartner('${p.id}')">Excluir</button>
      </td>
    </tr>`).join('')}
  </tbody></table>`;
}

function openPartnerModal() {
  openAdminModal(`
    <div class="modal-header"><h2>Novo Parceiro</h2>
    <button class="modal-close" onclick="closeAdminModal()">×</button></div>
    <form onsubmit="savePartner(event)">
      <div class="form-group"><label>Nome</label>
        <input type="text" id="partner-name" required></div>
      <div class="form-group"><label>Descrição</label>
        <textarea id="partner-desc"></textarea></div>
      <div class="form-group"><label>Website</label>
        <input type="url" id="partner-web" placeholder="https://"></div>
      <div class="form-group"><label>URL do logo</label>
        <input type="url" id="partner-logo" placeholder="https://"></div>
      <button type="submit" class="btn btn-primary">Salvar</button>
    </form>
  `);
}

async function savePartner(e) {
  e.preventDefault();
  const { error } = await supabase.from('partners').insert({
    name: document.getElementById('partner-name').value.trim(),
    description: document.getElementById('partner-desc').value.trim(),
    website: document.getElementById('partner-web').value.trim() || null,
    logo_url: document.getElementById('partner-logo').value.trim() || null,
    is_active: true
  });
  if (error) alert(error.message);
  else { closeAdminModal(); loadAdminPartners(); }
}

async function deletePartner(id) {
  if (!confirm('Excluir parceiro?')) return;
  await supabase.from('partners').delete().eq('id', id);
  loadAdminPartners();
}

// =====================================================
// Galeria
// =====================================================
async function loadAdminGallery() {
  const { data } = await supabase.from('service_gallery').select('*').order('created_at', { ascending: false });
  const el = document.getElementById('gallery-table');
  if (!data?.length) {
    el.innerHTML = '<div class="empty-table">Nenhuma imagem</div>';
    return;
  }
  el.innerHTML = `<table class="admin-table"><thead><tr>
    <th>Preview</th><th>Título</th><th>Categoria</th><th>Destaque</th><th>Ações</th>
  </tr></thead><tbody>
    ${data.map(g => `<tr>
      <td><img src="${g.image_url}" style="width:48px;height:48px;object-fit:cover;border-radius:6px" onerror="this.style.display='none'"></td>
      <td>${g.title || '—'}</td>
      <td>${g.category || '—'}</td>
      <td>${g.is_featured ? '⭐' : ''}</td>
      <td class="actions"><button class="danger" onclick="deleteGallery('${g.id}')">Excluir</button></td>
    </tr>`).join('')}
  </tbody></table>`;
}

function openGalleryModal() {
  openAdminModal(`
    <div class="modal-header"><h2>Adicionar à Galeria</h2>
    <button class="modal-close" onclick="closeAdminModal()">×</button></div>
    <form onsubmit="saveGallery(event)">
      <div class="form-group"><label>URL da imagem</label>
        <input type="url" id="gal-url" required placeholder="https://"></div>
      <div class="form-group"><label>Título</label>
        <input type="text" id="gal-title"></div>
      <div class="form-group"><label>Categoria</label>
        <input type="text" id="gal-cat" placeholder="Ex: pintura, elétrica"></div>
      <div class="form-group"><label>Descrição</label>
        <textarea id="gal-desc"></textarea></div>
      <label style="display:flex;align-items:center;gap:8px;margin-bottom:12px">
        <input type="checkbox" id="gal-feat"> Destacar
      </label>
      <button type="submit" class="btn btn-primary">Salvar</button>
    </form>
  `);
}

async function saveGallery(e) {
  e.preventDefault();
  const { error } = await supabase.from('service_gallery').insert({
    image_url: document.getElementById('gal-url').value.trim(),
    title: document.getElementById('gal-title').value.trim() || null,
    category: document.getElementById('gal-cat').value.trim() || null,
    description: document.getElementById('gal-desc').value.trim() || null,
    is_featured: document.getElementById('gal-feat').checked
  });
  if (error) alert(error.message);
  else { closeAdminModal(); loadAdminGallery(); }
}

async function deleteGallery(id) {
  if (!confirm('Excluir imagem?')) return;
  await supabase.from('service_gallery').delete().eq('id', id);
  loadAdminGallery();
}

// =====================================================
// Pagamentos
// =====================================================
async function loadAdminPayments() {
  const { data } = await supabase
    .from('payments')
    .select('*, profiles(full_name, email)')
    .order('created_at', { ascending: false });

  const el = document.getElementById('payments-table');
  if (!data?.length) {
    el.innerHTML = '<div class="empty-table">Nenhum pagamento registrado</div>';
    return;
  }
  el.innerHTML = `<table class="admin-table"><thead><tr>
    <th>Cliente</th><th>Valor</th><th>Método</th><th>Status</th><th>Vencimento</th><th>Pago em</th>
  </tr></thead><tbody>
    ${data.map(p => `<tr>
      <td>${p.profiles?.full_name || '—'}</td>
      <td>R$ ${Number(p.amount).toFixed(2)}</td>
      <td>${p.payment_method}</td>
      <td><span class="badge badge-${badgeClass(p.status)}">${p.status}</span></td>
      <td>${p.due_date ? fmtDate(p.due_date) : '—'}</td>
      <td>${p.paid_at ? fmtDate(p.paid_at) : '—'}</td>
    </tr>`).join('')}
  </tbody></table>`;
}

// =====================================================
// Helpers
// =====================================================
function openAdminModal(html) {
  document.getElementById('admin-modal-body').innerHTML = html;
  document.getElementById('admin-modal').classList.add('open');
}

function closeAdminModal() {
  document.getElementById('admin-modal').classList.remove('open');
}

document.addEventListener('click', (e) => {
  if (e.target.id === 'admin-modal') closeAdminModal();
});

function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('pt-BR');
}

function badgeClass(status) {
  if (['active', 'accepted', 'completed', 'paid', 'quoted'].includes(status)) return 'active';
  if (['rejected', 'cancelled', 'failed', 'expired'].includes(status)) return 'cancelled';
  return 'pending';
}