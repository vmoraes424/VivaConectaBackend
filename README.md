# Viva Conecta Backend 🚀

Backend completo e robusto para o ecossistema **Viva Conecta**, desenvolvido com **Fastify**, **TypeScript**, **Drizzle ORM**, **PostgreSQL** e **Zod**, integrado com **Docker**, envio de e-mails via **Resend** e armazenamento de imagens no **Cloudflare R2**.

Todas as regras de negócio mockadas do frontend foram fielmente replicadas para a arquitetura de servidor com persistência relacional, autenticação segura (JWT + Cookies httpOnly) e validação estrita.

---

## 🛠️ Tecnologias Utilizadas

- **Node.js** (v22+) & **TypeScript** (Strict mode)
- **Fastify** (Framework HTTP de alta performance)
- **Drizzle ORM & Drizzle Kit** (Modelagem de dados e migrações tipadas)
- **PostgreSQL** (Driver nativo `postgres.js`)
- **Zod** (Validação de schemas e variáveis de ambiente)
- **Docker & Docker Compose** (Containerização completa de API e banco de dados)
- **Resend** (E-mails transacionais para recuperação de senha e convite de novos usuários)
- **Cloudflare R2 / AWS S3 SDK** (Armazenamento compatível com S3 para fotos de perfil e logotipos de parceiros)
- **@fastify/multipart** (Suporte a upload de arquivos em streaming até 5MB)
- **@fastify/jwt & @fastify/cookie** (Autenticação segura via cookie httpOnly e bearer token)
- **bcryptjs** (Hash e salting seguro de senhas)

---

## 📁 Estrutura de Diretórios

```
backend/
├── drizzle/                     # Migrações SQL geradas pelo Drizzle Kit
│   └── 0000_broad_gwen_stacy.sql
├── src/
│   ├── app.ts                  # Configuração do Fastify, multipart, middlewares e rotas
│   ├── server.ts               # Ponto de entrada do servidor HTTP
│   ├── config/
│   │   └── env.ts              # Validação de variáveis de ambiente com Zod
│   ├── db/
│   │   ├── index.ts            # Conexão Drizzle ORM + postgres.js
│   │   ├── seed.ts             # Script de seed (7 parceiros, 48 indicações, 132 acessos, usuários)
│   │   └── schema/             # Schemas das tabelas relacionais
│   │       ├── especialidades.ts
│   │       ├── parceiros.ts
│   │       ├── indicacoes.ts
│   │       ├── codigos-emitidos.ts
│   │       ├── acessos.ts
│   │       ├── usuarios.ts
│   │       ├── recuperacao-senha.ts
│   │       └── index.ts
│   ├── lib/
│   │   ├── conecta.ts          # Gerador de códigos VIVA, normalização de texto e links WhatsApp
│   │   ├── email.ts            # Serviço de e-mail com templates HTML via Resend
│   │   ├── r2.ts               # Cliente Cloudflare R2 / S3 para upload de imagens
│   │   └── password.ts         # Funções de hash e verificação de senha
│   ├── middlewares/
│   │   └── auth.ts             # Autenticação JWT, guards de papel (admin/parceiro) e áreas
│   └── modules/
│       ├── auth/               # Login, logout, me, recuperação de senha e convites
│       ├── usuarios/           # Gestão de usuários (administradores, editores, parceiros) e perfil
│       ├── especialidades/     # CRUD de especialidades com proteção de integridade
│       ├── parceiros/          # CRUD de parceiros, comissão fixa/percentual e exclusão em cascata
│       ├── indicacoes/         # Criação com código único VIVA, comissão congelada e métricas
│       ├── parceiro-dashboard/ # Visão restrita do parceiro autenticado
│       ├── resumo/             # Dashboard administrativo com filtros por período e atividades
│       ├── upload/             # Upload de avatares/imagens para o Cloudflare R2
│       └── publico/            # Validação pública do código e registro de acessos/cliques
├── .dockerignore
├── Dockerfile                  # Multi-stage build otimizado para Node 22
├── docker-compose.yml          # Orquestração da API e PostgreSQL com volumes persistentes
├── .env.example
├── drizzle.config.ts
├── package.json
└── tsconfig.json
```

---

## ⚙️ Variáveis de Ambiente (`.env`)

Crie o arquivo `.env` na pasta `backend/`:

```env
PORT=3333
HOST=0.0.0.0
NODE_ENV=development
DATABASE_URL=postgres://postgres:postgres@localhost:5432/viva_conecta
JWT_SECRET=super-secret-jwt-key-viva-conecta-change-me-in-production
COOKIE_SECRET=super-secret-cookie-key-viva-conecta-change-me
FRONTEND_URL=http://localhost:3000

# Resend (E-mails transacionais)
RESEND_API_KEY=re_1234567890abcdef
EMAIL_FROM="Viva Conecta <nao-responda@vivasf.com.br>"

# Cloudflare R2 (Storage de Imagens)
R2_ACCOUNT_ID=seu_account_id_cloudflare
R2_ACCESS_KEY_ID=seu_access_key_id
R2_SECRET_ACCESS_KEY=sua_secret_access_key
R2_BUCKET_NAME=viva-conecta
R2_PUBLIC_URL=https://pub-seu-hash.r2.dev
```

> **Nota:** Caso `RESEND_API_KEY` ou as credenciais do `R2` não estejam preenchidas durante o desenvolvimento, o sistema opera automaticamente em modo **Mock Gracioso**: os links de e-mail e as imagens são logados no console com formatação clara, sem travar a execução local.

---

## 🐳 Executando com Docker

Você pode subir toda a infraestrutura (API Fastify + PostgreSQL) com um único comando:

```bash
# Subir contêineres em segundo plano
docker compose up --build -d

# Visualizar logs da API
docker compose logs -f backend

# Rodar migrations dentro do contêiner
docker compose exec backend npm run db:push

# Rodar seed dentro do contêiner
docker compose exec backend npm run db:seed

# Derrubar contêineres
docker compose down
```

---

## 🚀 Execução Local (Sem Docker)

```bash
# 1. Instalar dependências
npm install

# 2. Aplicar migrações no PostgreSQL local
npm run db:push

# 3. Popular banco com os dados seed idênticos ao mock
npm run db:seed

# 4. Iniciar em modo de desenvolvimento (hot-reload)
npm run dev

# 5. Compilar TypeScript
npm run build

# 6. Iniciar em produção
npm run start

# 7. Abrir Drizzle Studio (interface web do banco de dados)
npm run db:studio
```

---

## 📧 Integração com Resend

O serviço em `src/lib/email.ts` dispara e-mails transacionais com identidade visual alinhada à Viva Sem Fronteiras:

1. **Recuperação de Senha**:
   - Disparado automaticamente na rota `POST /api/auth/recuperar-senha`.
   - Gera um e-mail com botão de ação para `${FRONTEND_URL}/nova-senha?token=...`.
   - Válido por 1 hora, de uso único.
2. **Convite de Novos Usuários**:
   - Disparado na criação de usuário (`POST /api/usuarios`) e na renovação de convite (`POST /api/usuarios/:id/renovar-convite`).
   - Apresenta mensagem personalizada de acordo com o papel (Administrador, Editor ou Parceiro Oficial).
   - Botão para `${FRONTEND_URL}/convite/...` válido por 5 dias.

---

## ☁️ Integração com Cloudflare R2

O serviço em `src/lib/r2.ts` conecta-se à API S3 da Cloudflare (`endpoint: https://<ACCOUNT_ID>.r2.cloudflarestorage.com`):

- **Formatos aceitos**: PNG, JPEG, WebP.
- **Tamanho máximo**: 5 MB por imagem.
- **Nomeação segura**: Gera chaves UUID imutáveis dentro da pasta `avatars/` (ex: `avatars/a7f3b...webp`).
- **Upload Multipart**: `POST /api/upload/avatar` recebe o arquivo binário direto do form/input.
- **Upload Base64/DataURL**: `POST /api/upload/base64` recebe `{ dataUrl: string }`, facilitando a integração imediata com ferramentas de recorte de imagem do navegador.

---

## 📡 Catálogo Completo de Rotas da API

### 🔐 Autenticação (`/api/auth`)
- `POST /api/auth/login` - Login (retorna JWT e seta cookie `httpOnly`, bloqueia após 5 tentativas)
- `POST /api/auth/logout` - Logout (limpa cookie de sessão)
- `GET  /api/auth/me` - Dados do usuário autenticado
- `POST /api/auth/recuperar-senha` - Solicitar redefinição de senha (envia e-mail Resend)
- `GET  /api/auth/reset/:token` - Verificar validade de token de reset
- `POST /api/auth/nova-senha` - Cadastrar nova senha via token
- `GET  /api/auth/convite/:token` - Consultar dados do convite
- `POST /api/auth/aceitar-convite` - Definir senha e ativar conta de convite

### 👥 Usuários (`/api/usuarios`)
- `GET    /api/usuarios` - Listar usuários e parceiros (somente administradores)
- `POST   /api/usuarios` - Cadastrar novo usuário (gera token e envia convite Resend)
- `PUT    /api/usuarios/:id` - Editar usuário existente
- `POST   /api/usuarios/:id/renovar-convite` - Renovar token de convite e reenviar e-mail
- `DELETE /api/usuarios/:id` - Excluir usuário (protegido contra autoexclusão)
- `PUT    /api/usuarios/meu-perfil` - Atualizar próprio perfil (nome, telefone, localidade, avatar)

### 🏷️ Especialidades (`/api/especialidades`)
- `GET    /api/especialidades` - Listar especialidades
- `POST   /api/especialidades` - Criar especialidade (nome normalizado único)
- `PUT    /api/especialidades/:id` - Renomear especialidade
- `DELETE /api/especialidades/:id` - Excluir especialidade (valida se não há vínculos)

### 🤝 Parceiros (`/api/parceiros`)
- `GET    /api/parceiros` - Listar parceiros com filtros (`q`, `especialidade`, `status`) e contadores
- `GET    /api/parceiros/:id` - Obter detalhes de um parceiro
- `POST   /api/parceiros` - Cadastrar ou atualizar parceiro (comissão fixa ou percentual)
- `PATCH  /api/parceiros/:id/desativar` - Desativar parceiro
- `DELETE /api/parceiros/bulk` - Exclusão em massa em cascata (parceiros, indicações, acessos e contas)

### 📋 Indicações (`/api/indicacoes`)
- `GET    /api/indicacoes` - Listar indicações com filtros (`q`, `parceiro`, `periodo`, `status`)
- `GET    /api/indicacoes/:codigo` - Detalhes da indicação e histórico de acessos
- `POST   /api/indicacoes` - Criar indicação (gera código VIVA único não-reciclável e congela comissão)
- `DELETE /api/indicacoes/bulk` - Exclusão em massa de indicações

### ☁️ Upload de Imagens (`/api/upload`)
- `POST /api/upload/avatar` - Upload de arquivo de imagem via `multipart/form-data` para o Cloudflare R2
- `POST /api/upload/base64` - Upload de imagem codificada em Base64 / Data URL para o Cloudflare R2

### 📊 Painel do Parceiro (`/api/parceiro`)
- `GET /api/parceiro/me` - Métricas e lista de indicações exclusivas do parceiro logado

### 📈 Resumo Administrativo (`/api/resumo`)
- `GET /api/resumo?periodo=30` - Métricas gerais, ranking de parceiros e feed de atividades (7, 30 ou 90 dias)

### 🌐 Link Público (`/i` ou `/api/publico`)
- `GET  /i/:codigo` - Validação do código público e link WhatsApp
- `POST /i/:codigo/acesso` - Registro de clique/acesso do cliente (aparelho, geolocalização e cookie de visitante)
