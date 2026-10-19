# ==========================================
# Estágio 1: Build
# ==========================================
FROM node:22-alpine AS builder

WORKDIR /app

# Copia manifestos de dependência
COPY package*.json ./

# Instala todas as dependências (inclusive devDependencies para build)
RUN npm ci

# Copia código fonte e arquivos de configuração
COPY tsconfig.json drizzle.config.ts ./
COPY src/ ./src/
COPY drizzle/ ./drizzle/

# Compila TypeScript para dist/
RUN npm run build

# ==========================================
# Estágio 2: Runner de Produção
# ==========================================
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3334
ENV HOST=0.0.0.0

# Copia manifestos e instala apenas dependências de produção
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Copia artefatos compilados do estágio de build
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/drizzle ./drizzle
COPY --from=builder /app/drizzle.config.ts ./drizzle.config.ts

# Usuário não-root para segurança
USER node

EXPOSE 3334

# Inicializa o servidor Fastify
CMD ["node", "dist/server.js"]
