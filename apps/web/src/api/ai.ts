import type { AiConversation } from '@northline/schemas/ai'
import { balanceSheet, idr, profitAndLoss } from '@northline/schemas/fixtures'
import type { AiMessage } from '@northline/schemas/reports'
import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query'
import { mock } from './mock'

const conversations: AiConversation[] = [
  {
    id: 'c1', title: 'Kenapa laba bersih Oktober turun?', report: 'Laba Rugi · Okt 2026', reportId: 'laba-rugi', at: '2026-10-17T14:22',
    messages: [
      { bot: false, text: 'Kenapa laba bersih Oktober turun dibanding September?', time: '14:22' },
      { bot: true, text: 'Laba bersih turun 18% menjadi 142.300.000. Penyebab utamanya beban pengiriman naik 27.600.000 dan pendapatan jasa turun 9%.', time: '14:22', credits: 2 },
      { bot: false, text: 'Beban pengiriman naik dari vendor mana?', time: '14:24' },
      { bot: true, text: 'Sebagian besar dari Tidal Logistics (19.400.000), terkait pengiriman ekspres ke Surabaya.', time: '14:24', credits: 1 },
    ],
  },
  {
    id: 'c2', title: 'Ringkas posisi kas per akhir bulan', report: 'Neraca · 17/10/2026', reportId: 'neraca', at: '2026-10-17T09:05',
    messages: [
      { bot: false, text: 'Ringkas posisi kas dan bank saat ini.', time: '09:05' },
      { bot: true, text: 'Total kas & bank 1.284.500.000: BCA 912.000.000, Mandiri 341.500.000, kas kecil 31.000.000.', time: '09:05', credits: 1 },
    ],
  },
  {
    id: 'c3', title: 'Piutang yang lewat jatuh tempo', report: 'Umur Piutang · 16/10/2026', reportId: 'umur-piutang', at: '2026-10-16T16:40',
    messages: [
      { bot: false, text: 'Pelanggan mana yang piutangnya lewat 60 hari?', time: '16:40' },
      { bot: true, text: 'Tiga pelanggan: CV Lumen Abadi 48.750.000, PT Sinar Pesisir 22.100.000, Toko Maju 6.300.000.', time: '16:41', credits: 2 },
    ],
  },
  {
    id: 'c4', title: 'Perbandingan beban operasional Q3', report: 'Laba Rugi · Q3 2026', reportId: 'laba-rugi', at: '2026-10-12T10:15',
    messages: [
      { bot: false, text: 'Bandingkan beban operasional Q3 dengan Q2.', time: '10:15' },
      { bot: true, text: 'Beban operasional Q3 612.400.000, naik 6,4% dari Q2. Kenaikan terbesar di gaji (+21.000.000) dan sewa (+12.500.000).', time: '10:16', credits: 3 },
    ],
  },
]

export const aiConversationsQuery = queryOptions({ queryKey: ['ai', 'history'], queryFn: () => mock(conversations) })

export function useDeleteConversation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      conversations.splice(conversations.findIndex((c) => c.id === id), 1)
      return mock(null, 200)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ai', 'history'] }),
  })
}

// ---- report AI panel: canned replies quoting fixture figures (no AI backend yet) ----
const pl = profitAndLoss()
const bs = balanceSheet()
const answers = [
  `Laba bersih ${idr(pl.netIncome)} terutama karena rugi pelepasan aset tetap ${idr(pl.otherExpense)}. Tanpa pos itu, laba operasional ${idr(pl.grossProfit - pl.opex)}.`,
  `Pendapatan Operasional ${idr(pl.pendapatanOperasional)}, dikurangi Diskon Penjualan IDR menjadi ${idr(pl.revenue)}. Beban pokok penjualan ${idr(pl.cogs)}, laba kotor ${idr(pl.grossProfit)}.`,
  `Kas dan setara kas ${idr(bs.cash)} jauh di atas liabilitas ${idr(bs.liabilities)}, jadi likuiditas kuat.`,
  `Aset ${idr(bs.assets)} = Liabilitas ${idr(bs.liabilities)} + Ekuitas ${idr(bs.equity)}. Neraca seimbang.`,
]
let turn = 0
const now = () => new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
export const aiGreeting = (report: string): AiMessage => ({
  id: 'g',
  bot: true,
  t: `Saya sudah membaca ${report} PT Harbor Nusantara. Laba bersih periode ini ${idr(pl.netIncome)}, terbebani rugi pelepasan aset ${idr(pl.otherExpense)}. Tanyakan apa saja tentang angka di laporan ini.`,
  tm: '10:24',
  cr: '1 kredit',
})

export function useAskAi() {
  return useMutation({
    mutationFn: (_q: string): Promise<AiMessage> => mock({ id: `b${Date.now()}`, bot: true, t: answers[turn++ % answers.length], tm: now(), cr: '2 kredit' }, 1600),
  })
}
export const aiNow = now
