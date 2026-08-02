export type ReportsOverviewRes = {
  from: string
  to: string
  items: {
    period: string
    income: number
    expense: number
    net: number
  }[]
}

export type ReportsByCategoryRes = {
  period: string
  type: "income" | "expense"
  items: {
    categoryId: string | null
    categoryName: string
    categoryColor: string | null
    categoryIcon: string | null
    total: number
  }[]
  totalAbs: number
}

export type SettingsRes = {
  user: {
    id: string
    name: string | null
    email: string | null
    image: string | null
  }
  settings: {
    baseCurrency: string
    startDatePeriod: string
    themeMode: "light" | "dark"
    offlineMode: "minimal" | "full"
  }
}

export type AccountRes = {
  items: {
    id: string
    name: string
  }[]
}

export type ReportsBudgetRes = {
  categoryId: string
  categoryName: string
  categoryColor: string | null
  planned: number
  spent: number
  remain: number
  pct: number
}

export type SummariesPortofolioRes = {
  totalValue: number
  totalCost: number
  totalPL: number
  totalPLPct: number
  top: {
    assetId: string
    symbol: string
    name: string
    qty: number
    lastPrice: number
    avgPrice: number
    value: number
    cost: number
    pl: number
    plPct: number
  }[]
}
