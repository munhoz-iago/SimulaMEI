# Rotação de secrets + mover `.env` fora do OneDrive — design

**Data:** 2026-05-25 · **Status:** pronto para execução manual (sem código) · **Tipo:** P0 segurança — ação imediata
**Origem:** Security Audit 2026-05-25, Critical #1

## 1. Objetivo

Eliminar o risco de vazamento do `SUPABASE_SERVICE_ROLE_KEY` (JWT com expiração ~67 anos) por sync acidental do OneDrive. Esse token é chave-mestra do banco de produção: bypassa RLS de TODAS as tabelas. Se vazar (upload em ferramenta de IA, screenshot, sync para outro device), entrega o tenant inteiro.

## 2. Estado atual (verificado)

- `.env` (raiz do repo) contém `SUPABASE_SERVICE_ROLE_KEY` real do projeto `fepnwaepjlostashckfj` com `exp: 2093...`
- `.env.local` contém `VERCEL_OIDC_TOKEN` real
- `.gitignore` ignora `.env*` ✅ (não commitará)
- Repo vive em `C:/Users/iagom/Downloads/📁 Organizado/Projetos e Código/SimulaMEI/simulamei` — pasta `Downloads/📁 Organizado/Projetos e Código/` está sob OneDrive sync (OneDrive folder de Iago).

**Implicação:** OneDrive copia `.env` e `.env.local` pra qualquer device adicional logado na mesma conta Microsoft, pro storage em nuvem (`onedrive.live.com`), e pode disparar upload em ferramentas integradas (Copilot do Windows, OneDrive AI, etc.).

## 3. Decisões (fechadas)

- **Rotacionar AGORA** o `SUPABASE_SERVICE_ROLE_KEY` no Supabase Dashboard e atualizar no Vercel (não esperar deploy ou janela).
- **Revogar `VERCEL_OIDC_TOKEN`** atual via Vercel Settings → Tokens.
- **Mover `.env` e `.env.local`** para `C:/Users/iagom/dev/envs/simulamei/` (fora do OneDrive sync). Apontar via symlink ou ajustar Next/Vercel CLI pra ler de path explícito.
- **Documentar policy** de "secrets nunca em pasta sincronizada".

## 4. Passos manuais (sem código)

### Passo 1 — Supabase Dashboard
1. Acessar https://supabase.com/dashboard/project/fepnwaepjlostashckfj/settings/api
2. Clicar **"Reset service_role secret"** (ou equivalent botão de rotação)
3. Copiar a nova chave (NÃO colar no `.env` ainda)

### Passo 2 — Vercel
1. Acessar https://vercel.com/munhoziago244s-projects/simula-mei/settings/environment-variables
2. Editar `SUPABASE_SERVICE_ROLE_KEY` → colar nova chave → Save
3. Confirmar applied a Production + Preview + Development
4. Em **Settings → Tokens**, revogar `VERCEL_OIDC_TOKEN` antigo (procurar token gerado pelo CLI local). Gerar novo se ainda precisar do CLI.

### Passo 3 — Mover env files
```powershell
# Powershell (Windows)
mkdir C:\Users\iagom\dev\envs\simulamei
move "C:\Users\iagom\Downloads\📁 Organizado\Projetos e Código\SimulaMEI\simulamei\.env" "C:\Users\iagom\dev\envs\simulamei\.env"
move "C:\Users\iagom\Downloads\📁 Organizado\Projetos e Código\SimulaMEI\simulamei\.env.local" "C:\Users\iagom\dev\envs\simulamei\.env.local"

# Editar .env e .env.local pra trocar o SUPABASE_SERVICE_ROLE_KEY pela nova
notepad C:\Users\iagom\dev\envs\simulamei\.env
notepad C:\Users\iagom\dev\envs\simulamei\.env.local
```

### Passo 4 — Symlink (Windows)
Em PowerShell **elevado** (admin):
```powershell
cd "C:\Users\iagom\Downloads\📁 Organizado\Projetos e Código\SimulaMEI\simulamei"
New-Item -ItemType SymbolicLink -Path .env -Target C:\Users\iagom\dev\envs\simulamei\.env
New-Item -ItemType SymbolicLink -Path .env.local -Target C:\Users\iagom\dev\envs\simulamei\.env.local
```

Next.js e Vercel CLI seguem o symlink normalmente.

### Passo 5 — Verificar OneDrive
1. Abrir OneDrive client local
2. Confirmar que `.env` e `.env.local` na pasta do projeto sumiram do sync (símbolo de nuvem deve sumir)
3. Limpar **histórico de versões** no OneDrive online — login em onedrive.live.com → navegar até pasta `simulamei` → se aparecer `.env` lá, **deletar permanentemente** (lixeira + esvaziar lixeira)

### Passo 6 — Auditar leaks anteriores
- Buscar `SUPABASE_SERVICE_ROLE_KEY` no histórico de chat do Copilot Windows / ChatGPT / outras IAs (se você integrou OneDrive)
- Buscar em pastas compartilhadas
- Se encontrar: nova rotação imediata

## 5. Validação

Após Passo 3+4:
- `npm run dev` continua funcionando (lê `.env` via symlink)
- `vercel pull --environment=production .env` continua funcionando
- `vercel deploy --prod` continua sem erro de env missing

Após Passo 1+2:
- Tentar autenticar como service role em algum tool (ex: `curl` ou Postman) usando a chave ANTIGA → deve retornar 401 (key revogada)

## 6. Sucesso

- [ ] Nova `SUPABASE_SERVICE_ROLE_KEY` gerada no Supabase Dashboard
- [ ] Vercel env var atualizada com nova chave (3 environments)
- [ ] Vercel `VERCEL_OIDC_TOKEN` antigo revogado
- [ ] `.env` e `.env.local` movidos para `C:/Users/iagom/dev/envs/simulamei/` com nova chave
- [ ] Symlinks criados na raiz do repo
- [ ] OneDrive parou de syncar `.env*` (verificar ícone)
- [ ] OneDrive online não tem `.env*` no histórico
- [ ] `npm run dev` + `vercel deploy` continuam funcionando

## 7. Não-objetivos

- ❌ Implementar gerenciador de secrets (Vault, Doppler, etc.) — escopo separado, esse spec é hotfix imediato
- ❌ Refactor de código que usa service role — admin-everywhere é problema arquitetural separado ([[2026-05-25-accountant-rls-enforced-design]])
- ❌ Audit completo de outros secrets — vai por demanda

## 8. Riscos

- **Symlink quebrar em Windows sem admin** — Passo 4 exige PowerShell elevado. Alternativa: usar `mklink /D` no cmd elevado, ou Windows Settings → Developer Mode on (permite symlink sem elevation).
- **CI/CD perder o env** — Vercel é OK porque env vars são gerenciadas no Dashboard, não vêm de `.env`. Mas se você usa `vercel pull` localmente pra refresh, esse fluxo continua funcionando (escreve no path do symlink).
- **OneDrive backup antigo recuperável** — se OneDrive teve versão antiga do `.env` com a chave velha, alguém com acesso ao OneDrive ainda pode pegar. Por isso o Passo 6.

## 9. Followups (próximas semanas)

- Avaliar Doppler / Vault / 1Password CLI pra todos os secrets do projeto (não só `.env`)
- Adicionar pre-commit hook que bloqueia `git add .env*` (já existe `.gitignore`, mas hook é segunda camada)
- Documentar em `README.md` a policy de "secrets fora de pastas sincronizadas"

---

*Arquivos tocados:* nenhum no repo. Mudanças todas em ambiente local + Supabase + Vercel.
