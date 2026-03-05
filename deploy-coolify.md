# Deploy no Coolify (Frontend + Backend)

Este guia foi montado com base no seu repositório atual (`npm workspaces`, `client` Vite, `server` Node + `ws`, pacote local `shared`).

## Resumo da arquitetura no Coolify

- **1 serviço Backend** (Node/WebSocket) para `packages/server`
- **1 serviço Frontend** (site estático Vite) para `packages/client`
- Ambos usando o **mesmo repositório**, mas com comandos diferentes

> Importante: como o `client` e o `server` dependem de `@pals-defence/shared` via workspace local, o build deve considerar o monorepo (não tratar cada pasta como projeto isolado sem workspaces).

---

## 1) Pré-requisitos

- Repositório no Git (GitHub/GitLab/etc.)
- Coolify conectado ao provedor Git
- (Opcional, recomendado) 2 domínios/subdomínios:
	- `api.seudominio.com` → backend
	- `game.seudominio.com` → frontend

---

## 2) Criar o serviço Backend (WebSocket)

No Coolify, crie um novo app a partir do repositório e configure:

- **Tipo**: Application (Nixpacks)
- **Branch**: sua branch de deploy
- **Base Directory**: raiz do repo (deixe `/`)

### Comandos

- **Install Command**:

```bash
npm ci --include=dev
```

- **Build Command**:

```bash
npm run typecheck --workspaces --if-present
```

- **Start Command**:

```bash
npm --workspace @pals-defence/server run start
```

### Porta

- **Port/Internal Port**: `3000`

O servidor já lê `PORT` automaticamente (`process.env.PORT ?? 3000`).

### Variáveis de ambiente (backend)

- `PORT=3000` (normalmente o Coolify já injeta/gerencia)
- `DIFFICULTY=normal` (ou `easy` / `hard`)
- `SEED=12345` (opcional)

### Persistência de dados (muito importante)

Seu backend grava progresso/telemetria em:

- `packages/server/data/progression.json`
- `packages/server/data/telemetry.json`

Sem volume persistente, esses dados podem resetar a cada redeploy/restart.

No Coolify, adicione **Persistent Storage** para a pasta de dados do backend no container.

- Em builds Nixpacks, o caminho costuma ser: `/app/packages/server/data`

Se seu runtime usar caminho diferente, ajuste para o path equivalente onde o repositório fica montado.

---

## 3) Criar o serviço Frontend (Vite estático)

Crie outro app no Coolify com o mesmo repositório.

- **Tipo**: Static Site (ou Application estático, dependendo da versão do Coolify)
- **Base Directory**: raiz do repo (`/`)

### Build

- **Install Command**:

```bash
npm ci
```

- **Build Command**:

```bash
npm --workspace @pals-defence/client run build
```

- **Publish Directory**:

```bash
packages/client/dist
```

### Variável de ambiente do frontend

No frontend, configure o WebSocket do backend:

- `VITE_WS_URL=wss://api.seudominio.com`

> Em produção com HTTPS, use `wss://`.

> Variáveis `VITE_*` são injetadas em build time. Se mudar `VITE_WS_URL`, faça novo deploy/build do frontend.

---

## 4) Domínios e roteamento

- Backend: associe domínio (ex.: `api.seudominio.com`) ao serviço backend
- Frontend: associe domínio (ex.: `game.seudominio.com`) ao serviço frontend
- Ative TLS/SSL automático no Coolify

Depois disso, o cliente deve conectar usando `VITE_WS_URL` apontando para o domínio do backend.

---

## 5) Checklist rápido de validação

1. Backend sobe sem erro e mostra log de listening em `:3000`
2. Frontend builda e publica `packages/client/dist`
3. Abrindo o jogo em produção, conexão WebSocket fica `OPEN`
4. Jogando uma run, arquivos em `packages/server/data/*.json` são atualizados

---

## 6) Troubleshooting

### Erro de pacote `@pals-defence/shared` não encontrado

Causa: build sem contexto de workspace.

Correção:

- mantenha **Base Directory** na raiz do monorepo
- rode `npm ci` na raiz
- use comandos com `npm --workspace ...`

### Backend sobe mas frontend não conecta

Verifique:

- `VITE_WS_URL` está com `wss://` e domínio correto
- domínio do backend está ativo com SSL
- porta interna do backend configurada como `3000`

### `tsx: command not found` no backend

`tsx` está em `devDependencies`, e o script `start` usa `tsx`.

Use instalação com dev deps no backend:

```bash
npm ci --include=dev
```

---

## 7) Comandos equivalentes locais (referência)

- Backend: `npm --workspace @pals-defence/server run start`
- Frontend build: `npm --workspace @pals-defence/client run build`

Esses são os mesmos comandos que o Coolify deve executar no deploy.
