-- Migration 012: Portfolio indexes, notification preferences e simulation history
-- Criado: 2026-05-08

-- ─────────────────────────────────────────────────────────────────────────────
-- Parte 1: Índices para performance do dashboard de portfolio
-- ─────────────────────────────────────────────────────────────────────────────

-- Índice composto para busca rápida de clientes ativos por escritório
CREATE INDEX IF NOT EXISTS idx_office_clients_office_ativo 
  ON office_clients(office_id, ativo) 
  WHERE ativo = true;

-- Índice para busca de simulações mais recentes por cliente
CREATE INDEX IF NOT EXISTS idx_office_simulations_client_created 
  ON office_simulations(client_id, created_at DESC);

-- Índice para alertas ativos do escritório
CREATE INDEX IF NOT EXISTS idx_office_alerts_office_resolved 
  ON office_alerts(office_id, resolved_at) 
  WHERE resolved_at IS NULL;

-- ─────────────────────────────────────────────────────────────────────────────
-- Parte 2: Preferências de notificação no perfil
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE profiles 
  ADD COLUMN IF NOT EXISTS notification_prefs JSONB DEFAULT '{
    "email_enabled": true,
    "teto_70": false,
    "teto_80": true,
    "teto_95": true,
    "teto_100": true,
    "anexo_transicao": true,
    "fator_r_risco": true,
    "digest_frequency": "daily"
  }'::jsonb;

-- Validação de schema JSON para notification_prefs
CREATE OR REPLACE FUNCTION validate_notification_prefs()
RETURNS TRIGGER AS $$
BEGIN
  -- Verificar se é um objeto JSON válido
  IF jsonb_typeof(NEW.notification_prefs) != 'object' THEN
    NEW.notification_prefs := '{}'::jsonb;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_validate_notification_prefs ON profiles;
CREATE TRIGGER trg_validate_notification_prefs
  BEFORE INSERT OR UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION validate_notification_prefs();

-- ─────────────────────────────────────────────────────────────────────────────
-- Parte 3: Tabela de histórico de simulações para usuários
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS simulation_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  
  -- Inputs da simulação (para recalcular se necessário)
  entrada JSONB NOT NULL,
  
  -- Resultado completo (snapshot com TAX_RULE_VERSION)
  resultado JSONB NOT NULL,
  
  -- Metadados para organização
  title TEXT,
  tags TEXT[] DEFAULT '{}',
  notes TEXT,
  
  -- Controle de compartilhamento
  share_token TEXT UNIQUE, -- token para link público (opcional)
  share_expires_at TIMESTAMPTZ,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  -- Constraints
  CONSTRAINT valid_entrada CHECK (jsonb_typeof(entrada) = 'object'),
  CONSTRAINT valid_resultado CHECK (jsonb_typeof(resultado) = 'object'),
  CONSTRAINT valid_tags CHECK (array_length(tags, 1) <= 10) -- max 10 tags
);

-- Índices para simulation_history
CREATE INDEX IF NOT EXISTS idx_sim_history_user_created 
  ON simulation_history(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_sim_history_tags 
  ON simulation_history USING GIN(tags);

CREATE INDEX IF NOT EXISTS idx_sim_history_share_token 
  ON simulation_history(share_token) 
  WHERE share_token IS NOT NULL;

-- RLS para simulation_history
ALTER TABLE simulation_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own simulation history" 
  ON simulation_history FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own simulation history" 
  ON simulation_history FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own simulation history" 
  ON simulation_history FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own simulation history" 
  ON simulation_history FOR DELETE 
  USING (auth.uid() = user_id);

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sim_history_updated_at ON simulation_history;
CREATE TRIGGER trg_sim_history_updated_at
  BEFORE UPDATE ON simulation_history
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ─────────────────────────────────────────────────────────────────────────────
-- Parte 4: View para resumo de portfolio (materializada opcional)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE VIEW vw_portfolio_summary AS
SELECT 
  oc.office_id,
  COUNT(*) FILTER (WHERE oc.ativo = true) as total_clientes_ativos,
  COUNT(*) FILTER (WHERE oc.ativo = false) as total_clientes_inativos,
  
  -- Contagem por nível de risco (baseado na simulação mais recente)
  COUNT(*) FILTER (WHERE os.resultado->'alertaTeto'->>'cenario' = 'excesso_grave') as risco_critico,
  COUNT(*) FILTER (WHERE (os.resultado->'alertaTeto'->>'percentualUtilizado')::numeric >= 0.90) as risco_alto,
  COUNT(*) FILTER (WHERE (os.resultado->'alertaTeto'->>'percentualUtilizado')::numeric >= 0.80) as risco_medio,
  COUNT(*) FILTER (WHERE os.id IS NULL) as sem_simulacao,
  
  -- Oportunidades comuns
  COUNT(*) FILTER (WHERE os.resultado->'fatorR'->>'atingeMinimo' = 'false' AND os.resultado->'fatorR' IS NOT NULL) as fator_r_nao_otimizado,
  
  -- Última simulação do escritório
  MAX(os.created_at) as ultima_simulacao
  
FROM office_clients oc
LEFT JOIN LATERAL (
  SELECT id, resultado, created_at 
  FROM office_simulations 
  WHERE client_id = oc.id 
  ORDER BY created_at DESC 
  LIMIT 1
) os ON true
GROUP BY oc.office_id;

-- Comentários para documentação
COMMENT ON TABLE simulation_history IS 'Histórico de simulações salvas pelos usuários autenticados';
COMMENT ON COLUMN simulation_history.resultado IS 'Snapshot completo do resultado com TAX_RULE_VERSION para auditoria';
COMMENT ON COLUMN simulation_history.share_token IS 'Token opcional para compartilhamento público via link';
COMMENT ON VIEW vw_portfolio_summary IS 'Visão agregada de risco e oportunidades por escritório';
