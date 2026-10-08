# Bella Casa Construtora — PWA Completo + Painel Admin

Aplicativo web progressivo (PWA) instalável em **Android, iOS e Desktop**, integrado ao **Supabase**, com **painel administrativo** completo.

## O que foi implementado

### App do Cliente
1. **Login e Cadastro** — nome, e-mail, CPF, senha (Supabase Auth)
2. **Tela inicial** — Orçamentos, Planos, Histórico, Configurações, Galeria, Parceiros
3. **Orçamentos** — 12 categorias, descrição, urgência, status
4. **Planos de Mensalidade** — tipo de imóvel, ambientes, endereço, múltiplos imóveis
5. **Histórico de Serviços** — data, tipo, fotos, profissional, valor
6. **Configurações** — dados pessoais, documentos, facial, pagamentos
7. **PWA** — instalável, offline, banner de instalação

### Painel Administrativo (`admin.html`)
- Acesso apenas com usuário **master** ou **admin**
- Login pelo formulário do app → redireciona automaticamente para o painel
- **Dashboard** — clientes, orçamentos pendentes, assinaturas ativas, receita estimada
- **Clientes** — listar, buscar, ver detalhes, promover/remover admin (só master)
- **Orçamentos** — filtrar, alterar status, definir valor orçado, notas internas
- **Assinaturas** — ativar / pausar / cancelar planos dos clientes
- **Planos** — criar, editar, ativar/desativar planos de mensalidade
- **Histórico** — registrar serviços realizados para clientes
- **Parceiros** e **Galeria** — CRUD completo
- **Pagamentos** — visualização de todos os pagamentos

---

## Como configurar

### 1. Banco de dados (obrigatório)

1. Acesse o painel do Supabase: https://supabase.com/dashboard
2. Abra o projeto `jwlbwgzaukwjhuqhoewl`
3. Vá em **SQL Editor** → New query
4. Cole e execute o conteúdo do arquivo `supabase-schema.sql`

Isso cria todas as tabelas, RLS, trigger de perfil, planos de exemplo e **sistema de roles (client / admin / master)**.

### 1.1 Criar o usuário Master

1. Cadastre-se no app com o e-mail que será o master
2. No SQL Editor do Supabase, execute:

```sql
UPDATE public.profiles
SET role = 'master'
WHERE email = 'SEU_EMAIL_MASTER@exemplo.com';
```

3. Faça logout e login de novo — você será redirecionado para o painel admin.

### 2. Storage (recomendado)

No painel → **Storage** → Create bucket:
- `avatars` (público)
- `documents` (privado)
- `service-photos` (privado)
- `gallery` (público)

### 3. Auth

Em **Authentication → Providers**, confirme que **Email** está habilitado.

Opcional: desative “Confirm email” em Settings se quiser login imediato após cadastro (útil em testes).

### 4. Hospedar o app

Você pode hospedar em:
- **Vercel / Netlify / Cloudflare Pages** (arraste a pasta `pwa-servicos`)
- Ou qualquer servidor estático (Nginx, Apache, etc.)

**Importante:** o app precisa ser servido via **HTTPS** para o PWA e a instalação funcionarem.

### 5. Testar localmente

```bash
cd pwa-servicos
npx serve .
# ou
python3 -m http.server 8080
```

Abra `http://localhost:8080` no celular ou desktop.

---

## Estrutura de arquivos

```
pwa-servicos/
├── index.html          # App principal
├── css/styles.css      # Estilos
├── js/app.js           # Lógica + Supabase
├── sw.js               # Service Worker
├── manifest.json       # PWA Manifest
├── icons/              # Ícones 192 e 512
├── supabase-schema.sql # Schema completo do banco
└── README.md
```

---

## Próximos passos sugeridos (melhorias futuras)

1. **Gateway de pagamento real** — integrar Mercado Pago ou Stripe (Pix + cartão + boleto)
2. **Upload de fotos** nos orçamentos e histórico (Supabase Storage)
3. **Notificações push** (quando orçamento for respondido ou inspeção agendada)
4. **Reconhecimento facial** com API (ex.: AWS Rekognition ou similar)
5. **Painel admin** separado para a empresa gerenciar orçamentos, planos e histórico
6. **Assinatura digital** de contratos de plano

---

## Credenciais usadas no código

- URL: `https://jwlbwgzaukwjhuqhoewl.supabase.co`
- Anon Key: já inserida no `js/app.js`

**Nunca** use a `service_role` key no frontend. Apenas a anon key.