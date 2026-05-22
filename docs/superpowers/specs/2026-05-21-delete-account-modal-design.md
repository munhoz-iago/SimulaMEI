# Delete account modal próprio — design

**Data:** 2026-05-21 · **Status:** pronto para CLI · **Tipo:** P0 quick win (profissionalismo)

## 1. Objetivo

Substituir os popups nativos do navegador (`window.confirm` + `window.prompt`) em `DeleteAccountSection` por um modal próprio do design system. O popup roxo "simulamei.com.br diz" do Chrome quebra a confiança em produto fiscal — passa sensação de protótipo, não de produto cobrado em R$ 9,90 ou R$ 97-247/mês.

## 2. Estado atual (verificado)

`src/components/dashboard/DeleteAccountSection.tsx:11-47`:

```ts
async function handleDeleteAccount() {
  const confirmed = window.confirm(
    'Isso remove sua conta, chaves de API, simulações salvas e vínculos de leads. Esta ação não pode ser desfeita.',
  )
  if (!confirmed) return

  const typed = window.prompt(`Digite ${DELETE_CONFIRMATION} para confirmar a exclusão da conta.`)
  if (typed !== DELETE_CONFIRMATION) return

  // ... fetch /api/account/delete + signOut + redirect /
}
```

Dois popups nativos sequenciais. UX consequente:
- `window.confirm` mostra popup roxo do Chrome ("simulamei.com.br diz")
- `window.prompt` mostra outro popup com input genérico (estilo do screenshot enviado)
- Sem branding, sem hierarquia visual, sem mensagens de erro inline

## 3. Decisões (fechadas)

- **Modal próprio** renderizado dentro do `DeleteAccountSection` (não componente global compartilhado — overhead desnecessário pra 1 uso).
- **2 estados no fluxo:**
  1. `confirming` — mostra modal com descrição da consequência + input "Digite EXCLUIR" + botões Cancelar/Excluir (Excluir desabilitado até input == "EXCLUIR")
  2. `loading` — botão Excluir mostra "Excluindo..." + bloqueia o input
- **Sem dependência nova** — modal é `<dialog>` HTML5 native OU `position: fixed` overlay com `aria-modal="true"`. Projeto não tem lib de modal hoje; manter zero deps.
- **Acessibilidade:**
  - `role="dialog"` + `aria-modal="true"` + `aria-labelledby` apontando pro título
  - Foco vai pro input ao abrir
  - ESC fecha sem confirmar
  - Click no overlay (backdrop) fecha sem confirmar
  - Botão Cancelar focável via TAB
- **Validação imediata do input** — botão "Excluir conta" só ativa quando `input === 'EXCLUIR'` (case-sensitive, sem `.trim()` pra forçar atenção)
- **Erro de API segue inline** — `errorMessage` state existente continua sendo mostrado dentro do modal (não fora dele) quando a API falha.

## 4. Workstreams

**P0:**
- W1: Refactor `DeleteAccountSection` removendo `confirm`/`prompt`, introduzindo state `mode: 'idle' | 'confirming' | 'loading'`
- W2: Render modal `<div role="dialog" aria-modal="true">` com overlay, header, input EXCLUIR, botões, error inline
- W3: Handlers de fechar (ESC, click overlay, Cancelar) — todos sem confirmar
- W4: Foco automático no input ao abrir (`useEffect` + `inputRef.current?.focus()`)
- W5: Teste pure-function pra validar input ("EXCLUIR" exato; "excluir" não conta; "EXCLUIR " não conta; vazio não conta)

**Fora deste spec:**
- Modal compartilhado global pra reutilização — só se aparecer terceiro callsite
- Atalho de teclado Enter pra confirmar — pode ser P2 polish
- Animação de entrada do modal — pode ser P2

## 5. Detalhes de implementação

### Arquivo único: `DeleteAccountSection.tsx`

Estrutura:

```tsx
type Mode = 'idle' | 'confirming' | 'loading'

export function DeleteAccountSection() {
  const router = useRouter()
  const [mode, setMode] = useState<Mode>('idle')
  const [typed, setTyped] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const canConfirm = isDeleteInputValid(typed)

  function openConfirm() {
    setTyped('')
    setErrorMessage('')
    setMode('confirming')
  }

  function closeConfirm() {
    if (mode === 'loading') return  // não fecha durante request
    setMode('idle')
    setTyped('')
  }

  // Foco automático ao abrir
  useEffect(() => {
    if (mode === 'confirming') {
      inputRef.current?.focus()
    }
  }, [mode])

  // ESC fecha
  useEffect(() => {
    if (mode !== 'confirming') return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') closeConfirm()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [mode])

  async function handleDelete() {
    if (!canConfirm) return
    setMode('loading')
    setErrorMessage('')

    const response = await fetch('/api/account/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ confirmation: DELETE_CONFIRMATION }),
    })

    if (!response.ok) {
      const payload = await response.json().catch(() => null) as { error?: string } | null
      setErrorMessage(payload?.error ?? 'Não foi possível excluir a conta agora.')
      setMode('confirming')  // volta pro modal aberto, mostra erro inline
      return
    }

    await createClient().auth.signOut()
    router.replace('/')
    router.refresh()
  }

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <p>...descrição existente...</p>
      <button onClick={openConfirm}>Excluir conta</button>
      {mode !== 'idle' && (
        <DeleteAccountModal
          typed={typed}
          onTypedChange={setTyped}
          canConfirm={canConfirm}
          loading={mode === 'loading'}
          errorMessage={errorMessage}
          onConfirm={handleDelete}
          onCancel={closeConfirm}
          inputRef={inputRef}
        />
      )}
    </div>
  )
}
```

### Helper puro testável

Em `DeleteAccountSection.tsx` ou novo `src/components/dashboard/delete-account-validation.ts`:

```ts
export const DELETE_CONFIRMATION = 'EXCLUIR'

export function isDeleteInputValid(input: string): boolean {
  return input === DELETE_CONFIRMATION
}
```

### Modal — componente interno (não exportado)

```tsx
function DeleteAccountModal({
  typed, onTypedChange, canConfirm, loading, errorMessage, onConfirm, onCancel, inputRef,
}: {
  typed: string
  onTypedChange: (v: string) => void
  canConfirm: boolean
  loading: boolean
  errorMessage: string
  onConfirm: () => void
  onCancel: () => void
  inputRef: React.RefObject<HTMLInputElement>
}) {
  return (
    <>
      {/* Overlay backdrop */}
      <div
        onClick={onCancel}
        style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,0.6)',
          backdropFilter: 'blur(2px)',
          zIndex: 100,
        }}
      />
      {/* Dialog */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-account-title"
        style={{
          position: 'fixed',
          top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          maxWidth: 460, width: '90vw',
          background: 'var(--bg1)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)',
          padding: 24,
          zIndex: 101,
          boxShadow: '0 24px 48px rgba(0,0,0,0.4)',
        }}
        onClick={e => e.stopPropagation()}
      >
        <h3 id="delete-account-title" style={{ color: 'var(--red)', fontSize: 18, margin: '0 0 8px' }}>
          Excluir conta
        </h3>
        <p style={{ color: 'var(--text2)', fontSize: 13, lineHeight: 1.6, margin: '0 0 16px' }}>
          Isso remove sua conta, chaves de API, simulações salvas e vínculos de leads. <strong>Esta ação não pode ser desfeita.</strong>
        </p>
        <label htmlFor="delete-confirm-input" style={{ display: 'block', fontSize: 12, color: 'var(--text2)', marginBottom: 6 }}>
          Digite <code style={{ background: 'var(--bg2)', padding: '1px 6px', borderRadius: 3 }}>EXCLUIR</code> para confirmar:
        </label>
        <input
          ref={inputRef}
          id="delete-confirm-input"
          type="text"
          value={typed}
          onChange={e => onTypedChange(e.target.value)}
          disabled={loading}
          style={{
            width: '100%', padding: '10px 12px',
            borderRadius: 'var(--radius)',
            border: '1px solid var(--border2)',
            background: 'var(--bg2)',
            color: 'var(--text1)',
            fontSize: 14,
            marginBottom: 16,
          }}
        />
        {errorMessage && (
          <div style={{
            padding: '10px 12px',
            background: 'rgba(255,74,74,0.08)',
            border: '1px solid rgba(255,74,74,0.2)',
            borderRadius: 'var(--radius)',
            color: 'var(--red)',
            fontSize: 13,
            marginBottom: 12,
          }}>
            {errorMessage}
          </div>
        )}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            style={{
              padding: '10px 14px',
              borderRadius: 'var(--radius)',
              border: '1px solid var(--border2)',
              background: 'transparent',
              color: 'var(--text1)',
              fontSize: 13, fontWeight: 700,
            }}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={!canConfirm || loading}
            style={{
              padding: '10px 14px',
              borderRadius: 'var(--radius)',
              border: '1px solid var(--red)',
              background: canConfirm ? 'var(--red)' : 'rgba(255,74,74,0.2)',
              color: canConfirm ? 'white' : 'var(--text3)',
              fontSize: 13, fontWeight: 800,
              cursor: canConfirm && !loading ? 'pointer' : 'not-allowed',
            }}
          >
            {loading ? 'Excluindo...' : 'Excluir conta'}
          </button>
        </div>
      </div>
    </>
  )
}
```

### Testes

`src/components/dashboard/delete-account-validation.test.ts`:
```ts
describe('isDeleteInputValid', () => {
  it('returns true for exact "EXCLUIR"', () => { ... })
  it('returns false for lowercase "excluir"', () => { ... })
  it('returns false for "EXCLUIR " with trailing space', () => { ... })
  it('returns false for empty string', () => { ... })
  it('returns false for partial "EXCL"', () => { ... })
})
```

## 6. Sucesso

- [ ] Clicar "Excluir conta" abre modal próprio (não popup do browser)
- [ ] Input "EXCLUIR" exato habilita botão; outros valores deixam desabilitado
- [ ] ESC fecha o modal sem confirmar
- [ ] Click no overlay (fora do dialog) fecha sem confirmar
- [ ] Erro de API aparece inline DENTRO do modal (não fora)
- [ ] Durante `loading`, ESC e overlay não fecham
- [ ] Modal acessível: `role="dialog"`, `aria-modal="true"`, `aria-labelledby`, foco automático
- [ ] Zero uso de `window.confirm` ou `window.prompt` no arquivo
- [ ] `npm test -- --run` verde
- [ ] `npx tsc --noEmit` limpo

## 7. Não-objetivos

- ❌ Lib de modal externa (Headless UI, Radix, etc) — overhead desnecessário pra 1 callsite
- ❌ Componente Modal global reutilizável — só extrai se aparecer 3º callsite
- ❌ Animação de entrada/saída — P2 polish
- ❌ Confirmar com Enter pressionado no input — UX dupla pode confundir; só botão por agora

---

*Arquivos tocados:*
- `src/components/dashboard/DeleteAccountSection.tsx` (refactor completo)
- `src/components/dashboard/delete-account-validation.test.ts` (novo)
