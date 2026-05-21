export const PUBLIC_RATE_LIMITS = {
  leads: {
    limit: 8,
    windowSeconds: 60 * 60,
  },
  simulations: {
    limit: 60,
    windowSeconds: 60 * 60,
  },
  accountantLeads: {
    limit: 5,
    windowSeconds: 60 * 60,
  },
  diagnostico: {
    // Endpoint de IA: limitar para evitar abuso de custos
    limit: 10,
    windowSeconds: 60 * 60,
  },
} as const
