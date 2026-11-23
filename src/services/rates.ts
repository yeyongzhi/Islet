import { ref } from 'vue'

/** Frankfurter（欧洲央行）免费汇率接口，无需 key */
export interface RateData {
  __fetchedAt?: number
  __stale?: boolean

  base: string
  rates: Record<string, number>
  date: string
}

const cache = ref<Record<string, RateData>>({})

/** 拉取 base→targets 汇率；带进程内缓存（10 分钟） */
export async function fetchRates(base: string, targets: string[]): Promise<RateData | null> {
  const uniq = [...new Set(targets)].filter((t) => t !== base)
  if (!uniq.length) return { base, rates: { [base]: 1 }, date: new Date().toLocaleDateString('sv-SE'), __fetchedAt: Date.now() }
  const cacheKey = `${base}:${uniq.join(',')}`
  const cached = cache.value[cacheKey]
  if (cached && Date.now() - (cached.__fetchedAt ?? 0) < 10 * 60000) {
    return cached
  }
  try {
    const url = `https://api.frankfurter.app/latest?from=${base}${uniq.length ? `&to=${uniq.join(',')}` : ''}`
    const res = await fetch(url)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const json = (await res.json()) as { base: string; date: string; rates: Record<string, number> }
    const data: RateData & { __fetchedAt: number } = {
      base: json.base,
      rates: json.rates,
      date: json.date,
      __fetchedAt: Date.now(),
    }
    cache.value[cacheKey] = data
    return data
  } catch {
    return cached ? { ...cached, __stale: true } : null
  }
}
