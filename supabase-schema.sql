-- =====================================================
-- SCHEMA COMPLETO PARA O APP DE SERVIÇOS / PLANOS
-- Execute este script no SQL Editor do Supabase
-- =====================================================

-- 1. Extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Tabela de perfis (estende auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  cpf TEXT UNIQUE,
  phone TEXT,
  avatar_url TEXT,
  facial_recognition_status TEXT DEFAULT 'pending', -- pending | verified | rejected
  documents_status TEXT DEFAULT 'pending',          -- pending | uploaded | verified
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Endereços do usuário
CREATE TABLE IF NOT EXISTS public.addresses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  label TEXT, -- Casa, Trabalho, etc.
  street TEXT NOT NULL,
  number TEXT,
  complement TEXT,
  neighborhood TEXT,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  zip_code TEXT NOT NULL,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Imóveis (permite múltiplos por usuário)
CREATE TABLE IF NOT EXISTS public.properties (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  property_type TEXT NOT NULL CHECK (property_type IN (
    'casa', 'apartamento', 'sala_comercial', 'industria', 'loteamento'
  )),
  name TEXT, -- Ex: "Minha Casa", "Sala Comercial Centro"
  address_id UUID REFERENCES public.addresses(id),
  rooms JSONB DEFAULT '{}', -- { quartos: 3, salas: 1, banheiros: 2, cozinha: 1, area_lazer: true, piscina: false, ar_condicionado: 2, outros: "..." }
  inspection_status TEXT DEFAULT 'pending', -- pending | scheduled | completed
  inspection_date TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Planos de mensalidade
CREATE TABLE IF NOT EXISTS public.subscription_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  benefits JSONB DEFAULT '[]',
  included_services JSONB DEFAULT '[]',
  base_price DECIMAL(10,2) NOT NULL,
  price_per_room DECIMAL(10,2) DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Assinaturas do usuário (um plano por imóvel)
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES public.subscription_plans(id),
  status TEXT DEFAULT 'pending' CHECK (status IN (
    'pending', 'active', 'paused', 'cancelled', 'expired'
  )),
  start_date DATE,
  end_date DATE,
  monthly_value DECIMAL(10,2),
  payment_method TEXT, -- credit_card | pix | boleto
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Solicitações de Orçamento
CREATE TABLE IF NOT EXISTS public.budget_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  property_id UUID REFERENCES public.properties(id),
  category TEXT NOT NULL CHECK (category IN (
    'reforma', 'pintura', 'manutencao_equipamentos', 'jardinagem',
    'construcao', 'ampliacao', 'limpeza', 'reparos_geral',
    'eletrica', 'telhado', 'drywall_gesso', 'locacao_mao_obra'
  )),
  title TEXT,
  description TEXT NOT NULL,
  urgency TEXT DEFAULT 'normal', -- low | normal | high | urgent
  preferred_date DATE,
  status TEXT DEFAULT 'pending' CHECK (status IN (
    'pending', 'analyzing', 'quoted', 'accepted', 'rejected', 'completed'
  )),
  quoted_value DECIMAL(10,2),
  admin_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Histórico de serviços / reparos
CREATE TABLE IF NOT EXISTS public.service_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  property_id UUID REFERENCES public.properties(id),
  subscription_id UUID REFERENCES public.subscriptions(id),
  budget_request_id UUID REFERENCES public.budget_requests(id),
  service_date DATE NOT NULL,
  service_type TEXT NOT NULL,
  description TEXT,
  before_photos TEXT[] DEFAULT '{}',
  after_photos TEXT[] DEFAULT '{}',
  professional_name TEXT,
  team TEXT,
  value DECIMAL(10,2),
  observations TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Cartões de pagamento (tokenizados - nunca guarde dados reais do cartão)
CREATE TABLE IF NOT EXISTS public.payment_methods (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('credit_card', 'pix', 'boleto')),
  last_four TEXT,           -- últimos 4 dígitos (se cartão)
  brand TEXT,               -- visa, mastercard, etc.
  holder_name TEXT,
  is_default BOOLEAN DEFAULT false,
  gateway_token TEXT,       -- token do gateway (Stripe/MercadoPago)
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. Pagamentos
CREATE TABLE IF NOT EXISTS public.payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES public.subscriptions(id),
  budget_request_id UUID REFERENCES public.budget_requests(id),
  amount DECIMAL(10,2) NOT NULL,
  payment_method TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN (
    'pending', 'paid', 'failed', 'refunded', 'cancelled'
  )),
  gateway_id TEXT,
  paid_at TIMESTAMPTZ,
  due_date DATE,
  boleto_url TEXT,
  pix_qr_code TEXT,
  pix_copy_paste TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. Parceiros da empresa
CREATE TABLE IF NOT EXISTS public.partners (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  logo_url TEXT,
  description TEXT,
  website TEXT,
  is_active BOOLEAN DEFAULT true,
  order_index INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 12. Galeria de serviços realizados (imagens)
CREATE TABLE IF NOT EXISTS public.service_gallery (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT,
  description TEXT,
  image_url TEXT NOT NULL,
  category TEXT,
  is_featured BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 13. Documentos do usuário
CREATE TABLE IF NOT EXISTS public.user_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL, -- cpf, rg, comprovante_residencia, etc.
  file_url TEXT NOT NULL,
  status TEXT DEFAULT 'pending', -- pending | verified | rejected
  admin_notes TEXT,
  uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- RLS (Row Level Security)
-- =====================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budget_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_documents ENABLE ROW LEVEL SECURITY;

-- Políticas: usuário só vê/edita seus próprios dados
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users manage own addresses" ON public.addresses
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users manage own properties" ON public.properties
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users manage own subscriptions" ON public.subscriptions
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users manage own budgets" ON public.budget_requests
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users view own history" ON public.service_history
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users manage own payment methods" ON public.payment_methods
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users view own payments" ON public.payments
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users manage own documents" ON public.user_documents
  FOR ALL USING (auth.uid() = user_id);

-- Tabelas públicas (leitura para autenticados)
CREATE POLICY "Authenticated can read plans" ON public.subscription_plans
  FOR SELECT TO authenticated USING (is_active = true);

CREATE POLICY "Authenticated can read partners" ON public.partners
  FOR SELECT TO authenticated USING (is_active = true);

CREATE POLICY "Authenticated can read gallery" ON public.service_gallery
  FOR SELECT TO authenticated USING (true);

-- =====================================================
-- Trigger: cria perfil automaticamente no signup
-- =====================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, cpf)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'cpf', NULL)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =====================================================
-- Dados iniciais de exemplo (planos)
-- =====================================================
INSERT INTO public.subscription_plans (name, description, benefits, included_services, base_price, price_per_room)
VALUES
(
  'Plano Básico',
  'Manutenção preventiva mensal para residências',
  '["Visita mensal de inspeção", "Prioridade no agendamento", "Desconto de 10% em serviços avulsos", "Histórico digital completo"]'::jsonb,
  '["Inspeção elétrica básica", "Verificação de vazamentos", "Limpeza de filtros de ar-condicionado"]'::jsonb,
  89.90,
  15.00
),
(
  'Plano Completo',
  'Cobertura ampla com reparos inclusos',
  '["Visita quinzenal", "Reparos de até R$ 300 inclusos", "Prioridade máxima", "Desconto de 20% em serviços", "Suporte 24h via app"]'::jsonb,
  '["Manutenção elétrica", "Hidráulica", "Pintura de retoques", "Jardinagem básica", "Limpeza de calhas"]'::jsonb,
  189.90,
  25.00
),
(
  'Plano Premium',
  'Solução completa para imóveis comerciais e industriais',
  '["Visitas semanais", "Reparos ilimitados até R$ 800", "Equipe dedicada", "Relatórios mensais", "Seguro complementar"]'::jsonb,
  '["Todas as categorias de serviço", "Locação de mão de obra", "Drywall e gesso", "Telhado", "Elétrica completa"]'::jsonb,
  349.90,
  40.00
);

-- Storage buckets (execute também no painel Storage do Supabase)
-- Crie os buckets: avatars, documents, service-photos, gallery
-- Com políticas de acesso autenticado.
-- =====================================================
-- ADMIN: role nos perfis + políticas de admin
-- =====================================================

-- Adiciona coluna role se não existir
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'client'
  CHECK (role IN ('client', 'admin', 'master'));

-- Atualiza o trigger de novo usuário para incluir role
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, cpf, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'cpf', NULL),
    COALESCE(NEW.raw_user_meta_data->>'role', 'client')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função helper: verifica se o usuário atual é admin/master
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('admin', 'master')
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Políticas para admin ver/editar tudo
CREATE POLICY "Admins can view all profiles" ON public.profiles
  FOR SELECT USING (public.is_admin() OR auth.uid() = id);

CREATE POLICY "Admins can update all profiles" ON public.profiles
  FOR UPDATE USING (public.is_admin() OR auth.uid() = id);

CREATE POLICY "Admins manage all addresses" ON public.addresses
  FOR ALL USING (public.is_admin() OR auth.uid() = user_id);

CREATE POLICY "Admins manage all properties" ON public.properties
  FOR ALL USING (public.is_admin() OR auth.uid() = user_id);

CREATE POLICY "Admins manage all subscriptions" ON public.subscriptions
  FOR ALL USING (public.is_admin() OR auth.uid() = user_id);

CREATE POLICY "Admins manage all budgets" ON public.budget_requests
  FOR ALL USING (public.is_admin() OR auth.uid() = user_id);

CREATE POLICY "Admins manage all history" ON public.service_history
  FOR ALL USING (public.is_admin() OR auth.uid() = user_id);

CREATE POLICY "Admins manage all payment methods" ON public.payment_methods
  FOR ALL USING (public.is_admin() OR auth.uid() = user_id);

CREATE POLICY "Admins manage all payments" ON public.payments
  FOR ALL USING (public.is_admin() OR auth.uid() = user_id);

CREATE POLICY "Admins manage all documents" ON public.user_documents
  FOR ALL USING (public.is_admin() OR auth.uid() = user_id);

-- Admin pode gerenciar planos, parceiros e galeria
CREATE POLICY "Admins manage plans" ON public.subscription_plans
  FOR ALL USING (public.is_admin());

CREATE POLICY "Admins manage partners" ON public.partners
  FOR ALL USING (public.is_admin());

CREATE POLICY "Admins manage gallery" ON public.service_gallery
  FOR ALL USING (public.is_admin());

-- =====================================================
-- COMO CRIAR O USUÁRIO MASTER
-- =====================================================
-- 1. Cadastre-se normalmente no app com o e-mail do master
-- 2. No SQL Editor do Supabase, execute:
--
-- UPDATE public.profiles
-- SET role = 'master'
-- WHERE email = 'SEU_EMAIL_MASTER@exemplo.com';
--
-- Ou, ao criar o usuário via Dashboard > Authentication > Users,
-- adicione no raw_user_meta_data: {"role": "master", "full_name": "Admin Master"}
