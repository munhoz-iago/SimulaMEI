# Aba Conta — edição de perfil — design

**Data:** 2026-05-22 · **Status:** pronto para CLI · **Tipo:** P0 feature gap (campos do schema inertes após onboarding)

## 1. Objetivo

A aba `Conta` hoje só renderiza 2 painéis read-only (plano + excluir conta). O schema `user_profiles` tem 12 campos editáveis (nome, telefone, CNAE, tipo MEI, município, UF, faturamento estimado, folha, etc.) que ficam **inertes após o onboarding**. Usuário não tem como corrigir typo no nome, atualizar CNAE depois de migrar de atividade, mudar UF se mudou de cidade.

Adicionar 3 painéis editáveis com pattern "Editar → Form → Salvar" (sem auto-save — edição de perfil pede confirmação explícita).

## 2. Estado atual (verificado)

### `src/app/dashboard/page.tsx:860-901` (aba Conta)

```tsx
{activeTab === 'conta' && (
  <section style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
    <Panel>  {/* Plano + email — read-only */}
      <div>Plano: {PLAN_LABELS[currentPlan]}</div>
      <p>{PLAN_DESCRIPTIONS[currentPlan]}</p>
      <p>{user.email} · {CNAE_OFICIAL_TOTAL.toLocaleString('pt-BR')} CNAEs</p>
    </Panel>
    <Panel>  {/* Zona sensível — já tem modal próprio (PR #5) */}
      <DeleteAccountSection />
    </Panel>
  </section>
)}
```

2 painéis. Zero campos editáveis.

### Schema `user_profiles` (migrations 001 + 003)

Campos editáveis:
- `nome` (text)
- `nome_negocio` (text)
- `telefone` (text)
- `cnae_principal` (text — requer CnaeAutocomplete)
- `tipo_mei` ('geral' | 'caminhoneiro')
- `municipio` (text)
- `uf` (text 2 chars, regex `/^[A-Z]{2}$/`)
- `faturamento_mensal_estimado` (numeric ≥ 0)
- `faturamento_acumulado_atual` (numeric ≥ 0)
- `folha_mensal` (numeric ≥ 0)
- `mes_atual` (int 1-12)
- `objetivo_principal` (text)

Campos **não-editáveis** pela UI da Conta:
- `email` — gerenciado pelo Supabase Auth (alteração requer reverification — fora deste spec)
- `plano` — alterado via checkout (B2B em `/upgrade/contador`, B2C em `/relatorio`)
- `onboarding_completed_at`, `created_at`, `updated_at` — automáticos

### Endpoint atual `POST /api/onboarding`

Aceita TODOS os campos required (all-or-nothing). Não suporta atualização parcial. Validation usa `normalizeBoundedText` + `ONBOARDING_TEXT_LIMITS`. UF regex `/^[A-Z]{2}$/`. Reusar a infra de validação.

## 3. Decisões (fechadas)

- **Endpoint novo `PATCH /api/profile`** aceita campos parciais (qualquer subset dos 12 campos editáveis). Não tocar `/api/onboarding` — semântica distinta (criação vs edição).
- **Validação reusa `normalizeBoundedText` + `ONBOARDING_TEXT_LIMITS`** de `src/lib/validation.ts`. UF regex idem. Nada novo.
- **3 painéis novos** organizados por afinidade:
  1. **Identidade** — `nome`, `nome_negocio`, `telefone`, e-mail (read-only com tooltip "para alterar, contate suporte")
  2. **Atividade fiscal** — `cnae_principal` (CnaeAutocomplete), `tipo_mei` (radio), `municipio`, `uf`
  3. **Operação** — `faturamento_mensal_estimado`, `faturamento_acumulado_atual`, `folha_mensal`, `mes_atual` (select), `objetivo_principal`
- **Pattern UX por painel:**
  - Estado `view` (default) — campos como texto plano + botão "Editar"
  - Estado `editing` — campos viram `<input>`/`<select>`/`<textarea>` + botões "Salvar" / "Cancelar"
  - Estado `saving` — botões disabled + label "Salvando..."
  - Estado `error` — banner inline dentro do painel
  - "Cancelar" reverte sem salvar
- **Sem auto-save** — edição de perfil pede confirmação. Diferente do Fator R (slider/calc).
- **CnaeAutocomplete reusado** (componente existe em `src/components/simulador/`). Não há novo componente de busca CNAE.
- **Painel "Plano" atual mantido** intacto. Apenas adicionar link "Gerenciar assinatura" pra `/api/billing/portal` quando `plan !== 'free'`.
- **Painel "Zona sensível" mantido** (DeleteAccountSection já refatorado).
- **Grid muda:** de `1fr 1fr` (2 colunas) pra layout em 2 colunas com painéis variando em altura. Identidade + Plano à esquerda; Atividade + Operação + Zona sensível à direita. Em mobile (≤900px): 1 coluna empilhada.

## 4. Workstreams

**P0 — endpoint:**
- W1: `PATCH /api/profile/route.ts` aceitando partial payload. Validação por campo (cada um opcional, mas se presente passa pelo mesmo regex/range do onboarding).
- W2: Tests do endpoint (PATCH com 1 campo, com vários, sem auth → 401, com campo inválido → 400, com campo desconhecido → ignora silenciosamente).

**P0 — componentes editáveis:**
- W3: `<ProfileEditCard>` wrapper genérico (state `view | editing | saving | error`, props: `title`, `icon`, `fields`, `onSave`). Renderiza filhos com `mode`.
- W4: 3 painéis específicos consumindo `<ProfileEditCard>`:
  - `<IdentityCard>`
  - `<FiscalActivityCard>`
  - `<OperationsCard>`
- W5: Cada painel define lista de fields, validação local, payload de save.

**P0 — integração:**
- W6: `dashboard/page.tsx` aba Conta vira 5-painel grid:
  - `<IdentityCard profile={profile} />`
  - `<FiscalActivityCard profile={profile} />`
  - `<OperationsCard profile={profile} />`
  - Painel Plano existente (intacto)
  - `<DeleteAccountSection />` (intacto)
- W7: Após save bem-sucedido: `router.refresh()` pra puxar profile atualizado do server.

**P1 — polish:**
- W8: Telemetria — `profile_field_updated` evento aditivo (não renomear nada) com prop `{ section: 'identity' | 'fiscal' | 'operations', fieldsChanged: string[] }`.
- W9: Link "Gerenciar assinatura" no painel Plano quando `currentPlan !== 'free'`.

**Fora deste spec:**
- Mudança de e-mail (requer fluxo de reverification — escopo separado)
- Mudança de senha (Supabase Auth tem fluxo próprio em `/auth/recuperar`)
- Avatar/foto de perfil
- Histórico de mudanças

## 5. Detalhes por workstream

### W1 — `PATCH /api/profile/route.ts` (NEW)

```ts
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { normalizeCnaeCode, getCnae } from '@/lib/tributario'
import { normalizeBoundedText, ONBOARDING_TEXT_LIMITS } from '@/lib/validation'

const UF_RE = /^[A-Z]{2}$/

// Schema: TODOS os campos são opcionais. Se enviado, valida.
const PayloadSchema = z.object({
  nome: z.string().optional(),
  nomeNegocio: z.string().optional(),
  telefone: z.string().optional(),
  cnaePrincipal: z.string().optional(),
  tipoMei: z.enum(['geral', 'caminhoneiro']).optional(),
  municipio: z.string().optional(),
  uf: z.string().optional(),
  faturamentoMensalEstimado: z.number().nonnegative().optional(),
  faturamentoAcumuladoAtual: z.number().nonnegative().optional(),
  folhaMensal: z.number().nonnegative().optional(),
  mesAtual: z.number().int().min(1).max(12).optional(),
  objetivoPrincipal: z.string().optional(),
}).strict()  // rejeita campos desconhecidos com 400

export async function PATCH(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Autenticação obrigatória.' }, { status: 401 })
  }

  const body = await request.json().catch(() => null)
  const parsed = PayloadSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Payload inválido.', details: parsed.error.flatten() },
      { status: 400 },
    )
  }

  // Normaliza cada campo presente
  const updates: Record<string, unknown> = {}

  if (parsed.data.nome !== undefined) {
    const n = normalizeBoundedText(parsed.data.nome, ONBOARDING_TEXT_LIMITS.nome)
    if (!n) return NextResponse.json({ error: 'Nome inválido.' }, { status: 400 })
    updates.nome = n
  }
  if (parsed.data.nomeNegocio !== undefined) {
    const n = normalizeBoundedText(parsed.data.nomeNegocio, ONBOARDING_TEXT_LIMITS.nomeNegocio)
    if (!n) return NextResponse.json({ error: 'Nome do negócio inválido.' }, { status: 400 })
    updates.nome_negocio = n
  }
  if (parsed.data.telefone !== undefined) {
    const n = normalizeBoundedText(parsed.data.telefone, ONBOARDING_TEXT_LIMITS.telefone)
    if (!n) return NextResponse.json({ error: 'Telefone inválido.' }, { status: 400 })
    updates.telefone = n
  }
  if (parsed.data.cnaePrincipal !== undefined) {
    const cnae = normalizeCnaeCode(parsed.data.cnaePrincipal)
    if (!cnae || !getCnae(cnae)) return NextResponse.json({ error: 'CNAE inválido.' }, { status: 400 })
    updates.cnae_principal = cnae
  }
  if (parsed.data.tipoMei !== undefined) {
    updates.tipo_mei = parsed.data.tipoMei
  }
  if (parsed.data.municipio !== undefined) {
    const m = normalizeBoundedText(parsed.data.municipio, ONBOARDING_TEXT_LIMITS.municipio)
    if (!m) return NextResponse.json({ error: 'Município inválido.' }, { status: 400 })
    updates.municipio = m
  }
  if (parsed.data.uf !== undefined) {
    const uf = parsed.data.uf.toUpperCase()
    if (!UF_RE.test(uf)) return NextResponse.json({ error: 'UF deve ter 2 letras maiúsculas.' }, { status: 400 })
    updates.uf = uf
  }
  if (parsed.data.faturamentoMensalEstimado !== undefined) {
    updates.faturamento_mensal_estimado = parsed.data.faturamentoMensalEstimado
  }
  if (parsed.data.faturamentoAcumuladoAtual !== undefined) {
    updates.faturamento_acumulado_atual = parsed.data.faturamentoAcumuladoAtual
  }
  if (parsed.data.folhaMensal !== undefined) {
    updates.folha_mensal = parsed.data.folhaMensal
  }
  if (parsed.data.mesAtual !== undefined) {
    updates.mes_atual = parsed.data.mesAtual
  }
  if (parsed.data.objetivoPrincipal !== undefined) {
    const o = normalizeBoundedText(parsed.data.objetivoPrincipal, ONBOARDING_TEXT_LIMITS.objetivoPrincipal)
    if (!o) return NextResponse.json({ error: 'Objetivo inválido.' }, { status: 400 })
    updates.objetivo_principal = o
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'Nenhum campo válido para atualizar.' }, { status: 400 })
  }

  const { error } = await supabase
    .from('user_profiles')
    .update(updates)
    .eq('id', user.id)

  if (error) {
    console.error('[/api/profile PATCH] error:', error.message)
    return NextResponse.json({ error: 'Não foi possível salvar agora.' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
```

### W2 — Tests do endpoint

`src/app/api/profile/route.test.ts` (novo):
- PATCH sem auth → 401
- PATCH com 1 campo válido (nome) → 200 + apenas nome no update
- PATCH com vários campos → 200 + todos no update
- PATCH com payload vazio `{}` → 400 "Nenhum campo válido"
- PATCH com campo desconhecido `{foo: 'bar'}` → 400 (strict schema)
- PATCH com `uf: 'sp'` → 200 + uppercase no update (auto-normaliza)
- PATCH com `uf: 'SAP'` → 400
- PATCH com `cnae: 'inexistente'` → 400
- PATCH com `mes_atual: 13` → 400 (Zod range)
- PATCH com `faturamentoMensalEstimado: -100` → 400 (Zod nonnegative)

### W3 — `<ProfileEditCard>` (NEW)

`src/components/dashboard/ProfileEditCard.tsx`:

```tsx
'use client'

import { useState, ReactNode, FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { Panel } from './Panel'

type Mode = 'view' | 'editing' | 'saving' | 'error'

interface ProfileEditCardProps {
  title: string
  icon: ReactNode  // SVG icon
  accentColor: string  // CSS variable like 'var(--lime)'
  /** Conteúdo do modo view — texto plano dos campos. */
  viewContent: ReactNode
  /** Conteúdo do modo editing — form com inputs. Recebe ref aos campos via context interno. */
  editContent: ReactNode
  /** Função que coleta valores dos inputs (via FormData ou state externo) e retorna payload. */
  onCollectPayload: () => Record<string, unknown>
  /** Validation local antes de enviar (return string com erro ou null). */
  onValidate?: (payload: Record<string, unknown>) => string | null
}

export function ProfileEditCard({ title, icon, accentColor, viewContent, editContent, onCollectPayload, onValidate }: ProfileEditCardProps) {
  const router = useRouter()
  const [mode, setMode] = useState<Mode>('view')
  const [errorMessage, setErrorMessage] = useState('')

  async function handleSave(e: FormEvent) {
    e.preventDefault()
    const payload = onCollectPayload()
    const localError = onValidate?.(payload)
    if (localError) {
      setErrorMessage(localError)
      setMode('error')
      return
    }

    setMode('saving')
    setErrorMessage('')

    const response = await fetch('/api/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      const data = await response.json().catch(() => null) as { error?: string } | null
      setErrorMessage(data?.error ?? 'Não foi possível salvar agora.')
      setMode('error')
      return
    }

    setMode('view')
    router.refresh()
  }

  return (
    <Panel style={{ padding: '24px 28px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <div style={{ width: 36, height: 36, borderRadius: 8, background: `${accentColor}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {icon}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text3)' }}>
            {title}
          </div>
        </div>
        {mode === 'view' && (
          <button
            type="button"
            onClick={() => setMode('editing')}
            style={{ padding: '6px 12px', borderRadius: 'var(--radius)', border: '1px solid var(--border2)', background: 'var(--bg2)', color: 'var(--text1)', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
          >
            Editar
          </button>
        )}
      </div>

      {mode === 'view' && viewContent}

      {(mode === 'editing' || mode === 'saving' || mode === 'error') && (
        <form onSubmit={handleSave}>
          {editContent}
          {mode === 'error' && errorMessage && (
            <div style={{ padding: '10px 12px', background: 'rgba(255,74,74,0.08)', border: '1px solid rgba(255,74,74,0.2)', borderRadius: 'var(--radius)', color: 'var(--red)', fontSize: 13, marginTop: 12 }}>
              {errorMessage}
            </div>
          )}
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 16 }}>
            <button
              type="button"
              onClick={() => { setMode('view'); setErrorMessage('') }}
              disabled={mode === 'saving'}
              style={{ padding: '8px 14px', borderRadius: 'var(--radius)', border: '1px solid var(--border2)', background: 'transparent', color: 'var(--text1)', fontSize: 13, fontWeight: 700 }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={mode === 'saving'}
              style={{ padding: '8px 14px', borderRadius: 'var(--radius)', background: accentColor, color: 'var(--ink-on-accent)', fontSize: 13, fontWeight: 800, cursor: mode === 'saving' ? 'wait' : 'pointer' }}
            >
              {mode === 'saving' ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      )}
    </Panel>
  )
}
```

### W4 — 3 painéis específicos

`src/components/dashboard/IdentityCard.tsx`:

```tsx
'use client'
import { useRef } from 'react'
import { ProfileEditCard } from './ProfileEditCard'

interface IdentityCardProps {
  profile: { nome?: string | null; nome_negocio?: string | null; telefone?: string | null } | null
  email: string  // do user, read-only
}

export function IdentityCard({ profile, email }: IdentityCardProps) {
  const nomeRef = useRef<HTMLInputElement>(null)
  const negocioRef = useRef<HTMLInputElement>(null)
  const telefoneRef = useRef<HTMLInputElement>(null)

  const view = (
    <div style={{ display: 'grid', gap: 8, fontSize: 13, color: 'var(--text2)' }}>
      <Row label="Nome" value={profile?.nome ?? '—'} />
      <Row label="Negócio" value={profile?.nome_negocio ?? '—'} />
      <Row label="Telefone" value={profile?.telefone ?? '—'} />
      <Row label="E-mail" value={email} aside="—" />
    </div>
  )

  const edit = (
    <div style={{ display: 'grid', gap: 12 }}>
      <LabeledInput ref={nomeRef} label="Nome" defaultValue={profile?.nome ?? ''} />
      <LabeledInput ref={negocioRef} label="Nome do negócio" defaultValue={profile?.nome_negocio ?? ''} />
      <LabeledInput ref={telefoneRef} label="Telefone" defaultValue={profile?.telefone ?? ''} />
      <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4 }}>
        E-mail ({email}) só pode ser alterado pelo suporte — escreva pra contato@simulamei.com.br.
      </div>
    </div>
  )

  function collectPayload() {
    return {
      nome: nomeRef.current?.value,
      nomeNegocio: negocioRef.current?.value,
      telefone: telefoneRef.current?.value,
    }
  }

  return (
    <ProfileEditCard
      title="Identidade"
      icon={<UserIcon />}
      accentColor="var(--blue)"
      viewContent={view}
      editContent={edit}
      onCollectPayload={collectPayload}
    />
  )
}
```

(análogo pra `FiscalActivityCard` e `OperationsCard` — segue o padrão; use `<select>` para `tipo_mei` e `mes_atual`, `<CnaeAutocomplete>` para `cnae_principal`)

### W5 — Validação local nos painéis

Antes de enviar PATCH, cada card pode validar localmente pra dar feedback rápido:
- `Identity`: nome não vazio, telefone min 8 chars
- `Fiscal`: CNAE selecionado, UF 2 chars uppercase
- `Operations`: valores numéricos ≥ 0

### W6 — `dashboard/page.tsx` aba Conta

Substituir o bloco atual (linhas 861-901) por:

```tsx
{activeTab === 'conta' && (
  <section className="conta-grid" style={{
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 16,
    alignItems: 'start',
  }}>
    <IdentityCard profile={profile} email={user.email} />
    <FiscalActivityCard profile={profile} />
    <OperationsCard profile={profile} />
    <Panel>...painel plano existente intacto + link gerenciar assinatura...</Panel>
    <Panel>...zona sensível existente...</Panel>
  </section>
)}
```

Adicionar em `src/app/styles/responsive.css`:
```css
@media (max-width: 900px) {
  .conta-grid { grid-template-columns: 1fr !important; }
}
```

### W7 — `router.refresh()` após save

Já incluído no `<ProfileEditCard>`. Server Component re-roda, busca profile atualizado, painéis voltam pro modo view com valores novos.

### W8 — Telemetria

Em `ProfileEditCard.handleSave`, após sucesso, antes do `router.refresh()`:

```ts
captureProductEvent('profile_field_updated', {
  section: title.toLowerCase(),  // 'identidade', 'atividade fiscal', 'operação'
  fields_changed: Object.keys(payload).filter(k => payload[k] !== undefined),
})
```

Adicionar `'profile_field_updated'` ao `ProductEventName` union (aditivo).

### W9 — Link "Gerenciar assinatura"

No painel Plano existente, quando `currentPlan !== 'free'`:
```tsx
<a href="/api/billing/portal" style={{ ...}}>Gerenciar assinatura no Stripe →</a>
```

Endpoint `/api/billing/portal` deve existir (B2B já usa). Verificar em `src/app/api/billing/portal/route.ts` antes de adicionar o link.

## 6. Sucesso

- [ ] Aba Conta renderiza 5 painéis: Identidade, Atividade fiscal, Operação, Plano, Zona sensível
- [ ] Clicar "Editar" em qualquer painel mostra form com campos pré-preenchidos
- [ ] "Cancelar" reverte sem PATCH
- [ ] "Salvar" envia PATCH com APENAS os campos do painel; após 200, dispara `router.refresh()` e volta pro modo view com valores atualizados
- [ ] Erro de API renderiza inline DENTRO do painel
- [ ] PATCH com payload parcial funciona (1 campo, vários campos, todos os campos)
- [ ] PATCH sem auth → 401; com payload inválido → 400 mensagem útil; com campo desconhecido → 400 (strict)
- [ ] UF auto-uppercase, CNAE validado contra catálogo, ranges respeitados
- [ ] E-mail aparece read-only com nota sobre contato pro suporte
- [ ] Mobile (≤900px): grid colapsa pra 1 coluna
- [ ] `npm test -- --run` verde (current + ~10 novos)
- [ ] `npx tsc --noEmit` limpo
- [ ] `npx eslint <changed files>` limpo

## 7. Não-objetivos

- ❌ Mudança de e-mail (Supabase Auth flow separado, requer reverification)
- ❌ Mudança de senha (já existe em `/auth/recuperar` + `/auth/atualizar-senha`)
- ❌ Avatar/foto
- ❌ Histórico/audit log de mudanças
- ❌ Auto-save (decisão explícita: edição de perfil pede confirmação)
- ❌ Mudança no endpoint `/api/onboarding` (semântica distinta)
- ❌ Migration nova (schema já tem todos os campos)
- ❌ Mudança no CnaeAutocomplete (reusa como está)

## 8. Riscos

- **Concurrent edits**: 2 abas abertas editando o mesmo painel → último PATCH vence (sem optimistic locking via `updated_at`). Mitigação: aceitar como trade-off (raro pro perfil). Documentar.
- **CnaeAutocomplete em form não-modal**: componente foi feito pra simulador. Verificar se renderiza bem dentro do `<ProfileEditCard>` (dropdown z-index, etc).
- **Validação dupla**: client + server. Servidor é a fonte da verdade; client é só UX (feedback rápido). Aceitar duplicação.
- **`router.refresh()` em Server Component pesado**: a rota dashboard faz muitas queries (KPIs, monitor, oportunidades). Refresh completo pode ser perceptível. Aceitar — alternativa (mutate cache local) é mais complexa.

## 9. Estimativa

- Endpoint W1-W2: ~1h
- Componente W3 + 3 painéis W4: ~2h
- Integração W5-W7: ~1h
- Telemetria + link assinatura W8-W9: ~30min
- Tests + verificação: ~1h

**Total: ~5h** (escopo de meio dia de subagent + reviews).

---

*Arquivos tocados:*
- `src/app/api/profile/route.ts` (novo)
- `src/app/api/profile/route.test.ts` (novo)
- `src/components/dashboard/ProfileEditCard.tsx` (novo, wrapper)
- `src/components/dashboard/IdentityCard.tsx` (novo)
- `src/components/dashboard/FiscalActivityCard.tsx` (novo)
- `src/components/dashboard/OperationsCard.tsx` (novo)
- `src/app/dashboard/page.tsx` (substitui bloco aba Conta + adiciona link assinatura)
- `src/app/styles/responsive.css` (`.conta-grid` mobile collapse)
- `src/lib/analytics/events.ts` (adiciona `'profile_field_updated'` ao union)
