/* =====================================================
   Bella Casa Construtora - App Principal
   ===================================================== */

const SUPABASE_URL = 'https://jwlbwgzaukwjhuqhoewl.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp3bGJ3Z3phdWt3amh1cWhvZXdsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE0Mjk5MTQsImV4cCI6MjEwNzAwNTkxNH0.4_oeh6OMjUQKLMqKZ1iuxJG6bOEQukAnbKiCm7gH_gM';

const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Estado global
let currentUser = null;
let currentProfile = null;
let deferredPrompt = null;

const CATEGORIES = [
  { id: 'reforma', label: 'Reforma', icon: '🏠' },
  { id: 'pintura', label: 'Pintura', icon: '🎨' },
  { id: 'manutencao_equipamentos', label: 'Manutenção de Equipamentos', icon: '🔧' },
  { id: 'jardinagem', label: 'Jardinagem', icon: '🌳' },
  { id: 'construcao', label: 'Construção', icon: '🏗️' },
  { id: 'ampliacao', label: 'Ampliação', icon: '📐' },
  { id: 'limpeza', label: 'Limpeza', icon: '🧹' },
  { id: 'reparos_geral', label: 'Reparos em Geral', icon: '🛠️' },
  { id: 'eletrica', label: 'Elétrica', icon: '⚡' },
  { id: 'telhado', label: 'Telhado', icon: '🏚️' },
  { id: 'drywall_gesso', label: 'Drywall e Gesso', icon: '🧱' },
  { id: 'locacao_mao_obra', label: 'Locação de Mão de Obra', icon: '👷' }
];

const PROPERTY_TYPES = [
  { id: 'casa', label: 'Casa' },
  { id: 'apartamento', label: 'Apartamento' },
  { id: 'sala_comercial', label: 'Sala Comercial' },
  { id: 'industria', label: 'Indústria' },
  { id: 'loteamento', label: 'Loteamento' }
];

// =====================================================
// Inicialização
// =====================================================
document.addEventListener('DOMContentLoaded', async () => {
  // PWA install prompt (Chrome/Edge/Android)
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    if (!localStorage.getItem('pwa-dismissed')) {
      const banner = document.getElementById('install-banner');
      if (banner) banner.classList.add('show');
    }
  });

  // iOS: mostrar dica de instalação (Safari não dispara beforeinstallprompt)
  const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches
    || window.navigator.standalone === true;
  if (isIos && !isStandalone && !localStorage.getItem('ios-tip-dismissed')) {
    const tip = document.getElementById('ios-install-tip');
    if (tip) {
      tip.style.display = 'flex';
      tip.querySelector('button')?.addEventListener('click', () => {
        localStorage.setItem('ios-tip-dismissed', '1');
      });
    }
  }

  // Já instalado: esconder banners
  window.addEventListener('appinstalled', () => {
    document.getElementById('install-banner')?.classList.remove('show');
    deferredPrompt = null;
  });

  // Auth state
  const { data: { session } } = await sb.auth.getSession();
  if (session) {
    currentUser = session.user;
    await loadProfile();
    if (isAdminRole()) {
      window.location.href = 'admin.html';
      return;
    }
    showApp();
  } else {
    showWelcome();
  }

  sb.auth.onAuthStateChange(async (event, session) => {
    if (event === 'SIGNED_IN' && session) {
      currentUser = session.user;
      await loadProfile();
      if (isAdminRole()) {
        window.location.href = 'admin.html';
        return;
      }
      showApp();
    } else if (event === 'SIGNED_OUT') {
      currentUser = null;
      currentProfile = null;
      showWelcome();
    }
  });

  // Service Worker
  if ('serviceWorker' in navigator) {
    try {
      await navigator.serviceWorker.register('/sw.js');
      console.log('SW registered');
    } catch (e) {
      console.warn('SW registration failed', e);
    }
  }
});

async function loadProfile() {
  const { data, error } = await sb
    .from('profiles')
    .select('*')
    .eq('id', currentUser.id)
    .single();
  if (!error && data) {
    currentProfile = data;
    updateHeader();
  }
}

function isAdminRole() {
  return currentProfile && ['admin', 'master'].includes(currentProfile.role);
}

function updateHeader() {
  const el = document.getElementById('user-avatar');
  const nameEl = document.getElementById('user-name');
  if (el && currentProfile) {
    const initials = (currentProfile.full_name || 'U')
      .split(' ')
      .map(n => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
    el.textContent = initials;
  }
  if (nameEl && currentProfile) {
    nameEl.textContent = currentProfile.full_name?.split(' ')[0] || 'Usuário';
  }
}

// =====================================================
// Navegação
// =====================================================
function showWelcome() {
  document.getElementById('welcome')?.classList.remove('hidden');
  document.getElementById('auth')?.classList.add('hidden');
  document.getElementById('app')?.classList.add('hidden');
}

function openAuth(mode) {
  document.getElementById('welcome')?.classList.add('hidden');
  showAuth(mode);
}

function showAuth(mode) {
  document.getElementById('welcome')?.classList.add('hidden');
  document.getElementById('app').classList.add('hidden');
  document.getElementById('auth').classList.remove('hidden');
  document.getElementById('login-form').classList.toggle('hidden', mode !== 'login');
  document.getElementById('register-form').classList.toggle('hidden', mode !== 'register');
  clearMessages();
}

function showApp() {
  document.getElementById('welcome')?.classList.add('hidden');
  document.getElementById('auth').classList.add('hidden');
  document.getElementById('app').classList.remove('hidden');
  navigate('inicio');
}

function navigate(page) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  const pageEl = document.getElementById(`page-${page}`);
  const navEl = document.querySelector(`[data-page="${page}"]`);
  if (pageEl) pageEl.classList.add('active');
  if (navEl) navEl.classList.add('active');

  // Carregar dados da página
  if (page === 'inicio') loadInicio();
  if (page === 'orcamentos') loadOrcamentos();
  if (page === 'planos') loadPlanos();
  if (page === 'config') loadConfig();
  if (page === 'historico') loadHistorico();
}

// =====================================================
// Auth
// =====================================================
async function handleLogin(e) {
  e.preventDefault();
  clearMessages();
  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;
  const btn = e.target.querySelector('button[type="submit"]');
  btn.disabled = true;
  btn.textContent = 'Entrando...';

  const { data, error } = await sb.auth.signInWithPassword({ email, password });
  btn.disabled = false;
  btn.textContent = 'Entrar';

  if (error) {
    showError(error.message === 'Invalid login credentials'
      ? 'E-mail ou senha incorretos'
      : error.message);
  }
}

async function handleRegister(e) {
  e.preventDefault();
  clearMessages();
  const fullName = document.getElementById('reg-name').value.trim();
  const email = document.getElementById('reg-email').value.trim();
  const cpf = document.getElementById('reg-cpf').value.replace(/\D/g, '');
  const password = document.getElementById('reg-password').value;

  if (cpf.length !== 11) {
    showError('CPF inválido. Informe 11 dígitos.');
    return;
  }
  if (password.length < 6) {
    showError('A senha deve ter no mínimo 6 caracteres.');
    return;
  }

  const btn = e.target.querySelector('button[type="submit"]');
  btn.disabled = true;
  btn.textContent = 'Cadastrando...';

  const { data, error } = await sb.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName, cpf }
    }
  });

  btn.disabled = false;
  btn.textContent = 'Cadastrar';

  if (error) {
    showError(error.message);
    return;
  }

  showSuccess('Cadastro realizado! Verifique seu e-mail para confirmar (se habilitado) ou faça login.');
  setTimeout(() => showAuth('login'), 2500);
}

async function handleLogout() {
  await sb.auth.signOut();
}

function showError(msg) {
  const el = document.querySelector('.error-msg:not(.hidden)');
  const els = document.querySelectorAll('.error-msg');
  els.forEach(e => {
    e.textContent = msg;
    e.style.display = 'block';
  });
}

function showSuccess(msg) {
  const els = document.querySelectorAll('.success-msg');
  els.forEach(e => {
    e.textContent = msg;
    e.style.display = 'block';
  });
}

function clearMessages() {
  document.querySelectorAll('.error-msg, .success-msg').forEach(e => {
    e.style.display = 'none';
    e.textContent = '';
  });
}

// Máscara CPF
function maskCPF(input) {
  let v = input.value.replace(/\D/g, '').slice(0, 11);
  if (v.length > 9) v = v.replace(/(\d{3})(\d{3})(\d{3})(\d{0,2})/, '$1.$2.$3-$4');
  else if (v.length > 6) v = v.replace(/(\d{3})(\d{3})(\d{0,3})/, '$1.$2.$3');
  else if (v.length > 3) v = v.replace(/(\d{3})(\d{0,3})/, '$1.$2');
  input.value = v;
}

// =====================================================
// Página Início
// =====================================================
async function loadInicio() {
  // Parceiros
  const { data: partners } = await sb
    .from('partners')
    .select('*')
    .eq('is_active', true)
    .order('order_index');

  const partnersEl = document.getElementById('partners-list');
  if (partnersEl) {
    if (partners && partners.length) {
      partnersEl.innerHTML = partners.map(p => `
        <div class="card card-clickable" style="text-align:center;padding:16px">
          <div style="font-size:2rem;margin-bottom:8px">${p.logo_url ? `<img src="${p.logo_url}" style="width:48px;height:48px;object-fit:contain">` : '🤝'}</div>
          <div class="card-title">${p.name}</div>
          <div class="card-desc">${p.description || ''}</div>
        </div>
      `).join('');
    } else {
      partnersEl.innerHTML = '<p class="text-muted text-sm">Nenhum parceiro cadastrado ainda.</p>';
    }
  }

  // Galeria
  const { data: gallery } = await sb
    .from('service_gallery')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(6);

  const galleryEl = document.getElementById('gallery-list');
  if (galleryEl) {
    if (gallery && gallery.length) {
      galleryEl.innerHTML = `<div class="photo-grid">${gallery.map(g => `
        <img src="${g.image_url}" alt="${g.title || ''}" loading="lazy">
      `).join('')}</div>`;
    } else {
      galleryEl.innerHTML = '<p class="text-muted text-sm">Nenhuma imagem de serviços ainda.</p>';
    }
  }
}

// =====================================================
// Orçamentos
// =====================================================
let selectedCategory = null;

function openOrcamentoModal() {
  selectedCategory = null;
  document.getElementById('orc-category-chips').innerHTML = CATEGORIES.map(c => `
    <div class="chip" data-cat="${c.id}" onclick="selectCategory('${c.id}', this)">
      ${c.icon} ${c.label}
    </div>
  `).join('');
  document.getElementById('orc-form').reset();
  openModal('modal-orcamento');
}

function selectCategory(id, el) {
  selectedCategory = id;
  document.querySelectorAll('#orc-category-chips .chip').forEach(c => c.classList.remove('active'));
  el.classList.add('active');
}

async function submitOrcamento(e) {
  e.preventDefault();
  if (!selectedCategory) {
    alert('Selecione uma categoria de serviço');
    return;
  }
  const description = document.getElementById('orc-desc').value.trim();
  const urgency = document.getElementById('orc-urgency').value;
  const preferredDate = document.getElementById('orc-date').value || null;

  const btn = e.target.querySelector('button[type="submit"]');
  btn.disabled = true;

  const { error } = await sb.from('budget_requests').insert({
    user_id: currentUser.id,
    category: selectedCategory,
    description,
    urgency,
    preferred_date: preferredDate,
    title: CATEGORIES.find(c => c.id === selectedCategory)?.label
  });

  btn.disabled = false;
  if (error) {
    alert('Erro ao solicitar orçamento: ' + error.message);
    return;
  }
  closeModal('modal-orcamento');
  alert('Orçamento solicitado com sucesso! Nossa equipe entrará em contato.');
  loadOrcamentos();
}

async function loadOrcamentos() {
  const el = document.getElementById('orcamentos-list');
  if (!el) return;
  el.innerHTML = '<div class="loading"><div class="spinner"></div></div>';

  const { data, error } = await sb
    .from('budget_requests')
    .select('*')
    .eq('user_id', currentUser.id)
    .order('created_at', { ascending: false });

  if (error || !data?.length) {
    el.innerHTML = `
      <div class="empty-state">
        <div class="icon">📋</div>
        <p>Nenhum orçamento solicitado ainda.</p>
        <button class="btn btn-primary mt-2" style="width:auto" onclick="openOrcamentoModal()">Solicitar Orçamento</button>
      </div>`;
    return;
  }

  el.innerHTML = data.map(o => {
    const cat = CATEGORIES.find(c => c.id === o.category);
    const statusMap = {
      pending: 'badge-pending', analyzing: 'badge-pending',
      quoted: 'badge-active', accepted: 'badge-active',
      rejected: 'badge-cancelled', completed: 'badge-active'
    };
    const statusLabel = {
      pending: 'Pendente', analyzing: 'Em análise', quoted: 'Orçado',
      accepted: 'Aceito', rejected: 'Recusado', completed: 'Concluído'
    };
    return `
      <div class="card">
        <div style="display:flex;justify-content:space-between;align-items:flex-start">
          <div>
            <div class="card-title">${cat?.icon || ''} ${o.title || cat?.label}</div>
            <div class="card-desc">${o.description?.slice(0, 80)}${o.description?.length > 80 ? '...' : ''}</div>
            <div class="text-sm text-muted mt-1">${new Date(o.created_at).toLocaleDateString('pt-BR')}</div>
          </div>
          <span class="badge ${statusMap[o.status] || 'badge-pending'}">${statusLabel[o.status] || o.status}</span>
        </div>
        ${o.quoted_value ? `<div class="mt-1" style="font-weight:600;color:var(--primary)">R$ ${Number(o.quoted_value).toFixed(2)}</div>` : ''}
      </div>`;
  }).join('');
}

// =====================================================
// Planos de Mensalidade
// =====================================================
let selectedPlan = null;
let roomCounts = { quartos: 0, salas: 1, banheiros: 1, cozinha: 1, area_lazer: 0, piscina: 0, ar_condicionado: 0 };

async function loadPlanos() {
  const el = document.getElementById('planos-list');
  if (!el) return;
  el.innerHTML = '<div class="loading"><div class="spinner"></div></div>';

  // Planos disponíveis
  const { data: plans } = await sb
    .from('subscription_plans')
    .select('*')
    .eq('is_active', true);

  // Assinaturas do usuário
  const { data: subs } = await sb
    .from('subscriptions')
    .select('*, properties(name, property_type), subscription_plans(name)')
    .eq('user_id', currentUser.id);

  let html = '';

  if (subs?.length) {
    html += '<div class="section-title">Meus Planos Ativos</div>';
    html += subs.map(s => `
      <div class="card">
        <div style="display:flex;justify-content:space-between">
          <div>
            <div class="card-title">${s.subscription_plans?.name || 'Plano'}</div>
            <div class="card-desc">${s.properties?.name || s.properties?.property_type || 'Imóvel'}</div>
            <div class="text-sm mt-1">R$ ${Number(s.monthly_value || 0).toFixed(2)}/mês</div>
          </div>
          <span class="badge badge-${s.status === 'active' ? 'active' : 'pending'}">${s.status}</span>
        </div>
      </div>
    `).join('');
  }

  html += '<div class="section-title">Planos Disponíveis</div>';
  if (plans?.length) {
    html += plans.map((p, i) => `
      <div class="card plan-card ${i === 1 ? 'featured' : ''}">
        <div class="card-title">${p.name}</div>
        <div class="card-desc">${p.description || ''}</div>
        <div class="plan-price">R$ ${Number(p.base_price).toFixed(2)} <span>/mês base</span></div>
        <ul class="plan-benefits">
          ${(p.benefits || []).map(b => `<li>${b}</li>`).join('')}
        </ul>
        <button class="btn btn-primary btn-sm mt-1" onclick="openContratarPlano('${p.id}', '${p.name}', ${p.base_price}, ${p.price_per_room})">
          Contratar
        </button>
      </div>
    `).join('');
  } else {
    html += '<p class="text-muted">Nenhum plano disponível no momento.</p>';
  }

  el.innerHTML = html;
}

function openContratarPlano(planId, planName, basePrice, pricePerRoom) {
  selectedPlan = { id: planId, name: planName, basePrice, pricePerRoom };
  roomCounts = { quartos: 0, salas: 1, banheiros: 1, cozinha: 1, area_lazer: 0, piscina: 0, ar_condicionado: 0 };
  document.getElementById('plan-name-modal').textContent = planName;
  renderRoomCounters();
  updatePlanEstimate();
  openModal('modal-contratar-plano');
}

function renderRoomCounters() {
  const rooms = [
    { key: 'quartos', label: 'Quartos' },
    { key: 'salas', label: 'Salas' },
    { key: 'banheiros', label: 'Banheiros' },
    { key: 'cozinha', label: 'Cozinha' },
    { key: 'area_lazer', label: 'Área de Lazer' },
    { key: 'piscina', label: 'Piscina' },
    { key: 'ar_condicionado', label: 'Ar-condicionado (qtd)' }
  ];
  document.getElementById('room-counters').innerHTML = rooms.map(r => `
    <div class="room-row">
      <span>${r.label}</span>
      <div class="counter">
        <button type="button" onclick="changeRoom('${r.key}', -1)">−</button>
        <span id="room-${r.key}">${roomCounts[r.key]}</span>
        <button type="button" onclick="changeRoom('${r.key}', 1)">+</button>
      </div>
    </div>
  `).join('');
}

function changeRoom(key, delta) {
  roomCounts[key] = Math.max(0, (roomCounts[key] || 0) + delta);
  document.getElementById(`room-${key}`).textContent = roomCounts[key];
  updatePlanEstimate();
}

function updatePlanEstimate() {
  if (!selectedPlan) return;
  const totalRooms = Object.values(roomCounts).reduce((a, b) => a + b, 0);
  const estimate = selectedPlan.basePrice + (totalRooms * selectedPlan.pricePerRoom);
  document.getElementById('plan-estimate').textContent = `R$ ${estimate.toFixed(2)}/mês (estimativa)`;
}

async function submitContratarPlano(e) {
  e.preventDefault();
  const propertyType = document.getElementById('prop-type').value;
  const propertyName = document.getElementById('prop-name').value.trim() || propertyType;
  const street = document.getElementById('prop-street').value.trim();
  const number = document.getElementById('prop-number').value.trim();
  const city = document.getElementById('prop-city').value.trim();
  const state = document.getElementById('prop-state').value.trim();
  const zip = document.getElementById('prop-zip').value.replace(/\D/g, '');

  if (!street || !city || !state || !zip) {
    alert('Preencha o endereço completo para a visita de inspeção.');
    return;
  }

  const btn = e.target.querySelector('button[type="submit"]');
  btn.disabled = true;
  btn.textContent = 'Processando...';

  try {
    // 1. Criar endereço
    const { data: addr, error: addrErr } = await sb.from('addresses').insert({
      user_id: currentUser.id,
      street, number, city, state, zip_code: zip,
      label: propertyName
    }).select().single();
    if (addrErr) throw addrErr;

    // 2. Criar imóvel
    const { data: prop, error: propErr } = await sb.from('properties').insert({
      user_id: currentUser.id,
      property_type: propertyType,
      name: propertyName,
      address_id: addr.id,
      rooms: roomCounts,
      inspection_status: 'pending'
    }).select().single();
    if (propErr) throw propErr;

    // 3. Criar assinatura
    const totalRooms = Object.values(roomCounts).reduce((a, b) => a + b, 0);
    const monthlyValue = selectedPlan.basePrice + (totalRooms * selectedPlan.pricePerRoom);

    const { error: subErr } = await sb.from('subscriptions').insert({
      user_id: currentUser.id,
      property_id: prop.id,
      plan_id: selectedPlan.id,
      status: 'pending',
      monthly_value: monthlyValue
    });
    if (subErr) throw subErr;

    closeModal('modal-contratar-plano');
    alert('Solicitação de plano enviada! Agendaremos a visita de inspeção em breve. Você pode contratar planos para outros imóveis também.');
    loadPlanos();
  } catch (err) {
    alert('Erro: ' + err.message);
  } finally {
    btn.disabled = false;
    btn.textContent = 'Solicitar Plano + Inspeção';
  }
}

// =====================================================
// Histórico de Serviços
// =====================================================
async function loadHistorico() {
  const el = document.getElementById('historico-list');
  if (!el) return;
  el.innerHTML = '<div class="loading"><div class="spinner"></div></div>';

  const { data, error } = await sb
    .from('service_history')
    .select('*, properties(name, property_type)')
    .eq('user_id', currentUser.id)
    .order('service_date', { ascending: false });

  if (error || !data?.length) {
    el.innerHTML = `
      <div class="empty-state">
        <div class="icon">📜</div>
        <p>Nenhum serviço realizado ainda.</p>
        <p class="text-sm">O histórico aparecerá aqui após a realização de reparos e manutenções.</p>
      </div>`;
    return;
  }

  el.innerHTML = data.map(h => `
    <div class="card">
      <div class="card-title">${h.service_type}</div>
      <div class="card-desc">${h.description || ''}</div>
      <div class="text-sm text-muted mt-1">
        📅 ${new Date(h.service_date).toLocaleDateString('pt-BR')}
        ${h.properties?.name ? ` · 🏠 ${h.properties.name}` : ''}
        ${h.professional_name ? ` · 👷 ${h.professional_name}` : ''}
        ${h.value ? ` · R$ ${Number(h.value).toFixed(2)}` : ''}
      </div>
      ${h.observations ? `<div class="text-sm mt-1">${h.observations}</div>` : ''}
      ${(h.before_photos?.length || h.after_photos?.length) ? `
        <div class="photo-grid mt-2">
          ${(h.before_photos || []).map(p => `<img src="${p}" alt="Antes" loading="lazy">`).join('')}
          ${(h.after_photos || []).map(p => `<img src="${p}" alt="Depois" loading="lazy">`).join('')}
        </div>
      ` : ''}
    </div>
  `).join('');
}

// =====================================================
// Configurações
// =====================================================
async function loadConfig() {
  if (!currentProfile) await loadProfile();
  const nameEl = document.getElementById('cfg-name');
  const emailEl = document.getElementById('cfg-email');
  const cpfEl = document.getElementById('cfg-cpf');
  if (nameEl) nameEl.value = currentProfile?.full_name || '';
  if (emailEl) emailEl.value = currentProfile?.email || currentUser?.email || '';
  if (cpfEl) cpfEl.value = currentProfile?.cpf || '';
}

async function savePersonalData(e) {
  e.preventDefault();
  const full_name = document.getElementById('cfg-name').value.trim();
  const cpf = document.getElementById('cfg-cpf').value.replace(/\D/g, '');
  const phone = document.getElementById('cfg-phone')?.value || null;

  const { error } = await sb.from('profiles').update({
    full_name, cpf, phone, updated_at: new Date().toISOString()
  }).eq('id', currentUser.id);

  if (error) alert('Erro ao salvar: ' + error.message);
  else {
    alert('Dados salvos com sucesso!');
    await loadProfile();
  }
}

// Placeholder para upload de documentos / reconhecimento facial
function openDocumentUpload() {
  alert('Em breve: upload de documentos (RG, CPF, comprovante) para o Storage do Supabase.\nStatus atual: ' + (currentProfile?.documents_status || 'pending'));
}

function openFacialRecognition() {
  alert('Em breve: reconhecimento facial para validação de identidade.\nStatus atual: ' + (currentProfile?.facial_recognition_status || 'pending'));
}

function openPaymentMethods() {
  openModal('modal-pagamento');
}

async function addPaymentMethod(e) {
  e.preventDefault();
  const type = document.getElementById('pay-type').value;
  const lastFour = document.getElementById('pay-lastfour')?.value || null;
  const brand = document.getElementById('pay-brand')?.value || null;
  const holder = document.getElementById('pay-holder')?.value || null;

  // Em produção, integre com Stripe/MercadoPago para tokenização real
  const { error } = await sb.from('payment_methods').insert({
    user_id: currentUser.id,
    type,
    last_four: lastFour,
    brand,
    holder_name: holder,
    is_default: true
  });

  if (error) alert('Erro: ' + error.message);
  else {
    alert('Método de pagamento cadastrado! (Integração real com gateway a ser configurada)');
    closeModal('modal-pagamento');
  }
}

// =====================================================
// Modais
// =====================================================
function openModal(id) {
  document.getElementById(id)?.classList.add('open');
}

function closeModal(id) {
  document.getElementById(id)?.classList.remove('open');
}

// Fechar modal ao clicar no overlay
document.addEventListener('click', (e) => {
  if (e.target.classList.contains('modal-overlay')) {
    e.target.classList.remove('open');
  }
});

// =====================================================
// PWA Install
// =====================================================
async function installPWA() {
  if (!deferredPrompt) {
    alert('Para instalar: use o menu do navegador → "Adicionar à tela inicial" / "Instalar app"');
    return;
  }
  deferredPrompt.prompt();
  const { outcome } = await deferredPrompt.userChoice;
  if (outcome === 'accepted') {
    document.getElementById('install-banner')?.classList.remove('show');
  }
  deferredPrompt = null;
}

function dismissInstall() {
  document.getElementById('install-banner')?.classList.remove('show');
  localStorage.setItem('pwa-dismissed', '1');
}

// Expor funções usadas em onclick do HTML
window.showAuth = showAuth;
window.showWelcome = showWelcome;
window.openAuth = openAuth;
window.handleLogin = handleLogin;
window.handleRegister = handleRegister;
window.handleLogout = handleLogout;
window.navigate = navigate;
window.maskCPF = maskCPF;
window.openOrcamentoModal = openOrcamentoModal;
window.selectCategory = selectCategory;
window.submitOrcamento = submitOrcamento;
window.openContratarPlano = openContratarPlano;
window.changeRoom = changeRoom;
window.submitContratarPlano = submitContratarPlano;
window.savePersonalData = savePersonalData;
window.openDocumentUpload = openDocumentUpload;
window.openFacialRecognition = openFacialRecognition;
window.openPaymentMethods = openPaymentMethods;
window.addPaymentMethod = addPaymentMethod;
window.openModal = openModal;
window.closeModal = closeModal;
window.installPWA = installPWA;
window.dismissInstall = dismissInstall;
