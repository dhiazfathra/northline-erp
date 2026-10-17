import type { DrawerRecord } from '@northline/schemas/overview'
import { Dialog as P } from 'radix-ui'
import { DialogOverlay, DialogPortal } from '@/components/ui/dialog'
import { Sheet } from '@/components/ui/sheet'
import { useShell, useT } from '@/lib/shell'
import { cn } from '@/lib/utils'

/** Right-side glass record panel; bottom sheet on mobile. */
export function RecordDrawer({ record, onClose }: { record: DrawerRecord | null; onClose: () => void }) {
  const { L, isMobile, showToast } = useShell()
  const t = useT()
  return (
    <Sheet open={!!record} onOpenChange={(o) => !o && onClose()}>
      <DialogPortal>
        <DialogOverlay className="z-40 bg-black/35 supports-backdrop-filter:backdrop-blur-none animate-[fade_.2s]" />
        {record && (
          <P.Content
            aria-describedby={undefined}
            className={cn(
              'fixed z-41 flex flex-col overflow-y-auto rounded-[32px] text-(--ink) border border-white/35 outline-none',
              'bg-[linear-gradient(135deg,rgba(255,255,255,.3),rgba(255,255,255,.07)_40%,rgba(255,255,255,.04)_65%,rgba(255,255,255,.16)),radial-gradient(120%_60%_at_0%_0%,rgba(255,255,255,.22),transparent_60%),rgba(var(--fg),.05)]',
              'backdrop-blur-[36px] backdrop-saturate-[2.2] backdrop-brightness-[1.12]',
              'shadow-[inset_0_1.5px_0_rgba(255,255,255,.7),inset_0_-1.5px_0_rgba(255,255,255,.12),inset_1.5px_0_0_rgba(255,255,255,.3),inset_-1.5px_0_0_rgba(255,255,255,.15),inset_0_0_40px_rgba(255,255,255,.08),0_30px_70px_rgba(0,0,0,.4)]',
              isMobile
                ? 'inset-x-[8px] bottom-[8px] max-h-[88vh] p-[22px] animate-[up_.3s_ease-out]'
                : 'top-[16px] right-[16px] bottom-[16px] w-[420px] p-[30px] animate-[slide_.3s_ease-out]',
            )}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] uppercase tracking-[.5px] opacity-55">{t(record.kind)}</span>
              <P.Close className="flex size-[32px] cursor-pointer items-center justify-center rounded-full bg-[rgba(var(--fg),.1)]">×</P.Close>
            </div>
            <P.Title className={cn('mt-[18px] font-normal leading-[1.1]', isMobile ? 'text-[24px]' : 'text-[30px]')}>{record.title}</P.Title>
            <div className={cn('mt-[20px] font-extralight tracking-[-1px]', isMobile ? 'text-[34px]' : 'text-[44px]')}>{record.value}</div>
            <div className="mt-[4px] text-[12px] opacity-60">{t(record.note)}</div>
            <div className="mt-[28px] flex flex-col">
              {record.lines.map((d) => (
                <div key={d.a.en} className="flex justify-between border-b border-[rgba(var(--fg),.1)] py-[13px] text-[13px]">
                  <span className="opacity-80">{t(d.a)}</span>
                  <span>{d.b}</span>
                </div>
              ))}
            </div>
            <div className="mt-auto flex gap-[8px] pt-[24px]">
              <button
                type="button"
                className="flex-1 cursor-pointer rounded-[20px] bg-(--ink) p-[13px] text-center text-[13px] font-normal text-(--paper)"
                onClick={() => {
                  showToast(t(record.cta))
                  onClose()
                }}
              >
                {t(record.cta)}
              </button>
              <P.Close className="cursor-pointer rounded-[20px] bg-[rgba(var(--fg),.1)] px-[18px] py-[13px] text-[13px]">{L.close}</P.Close>
            </div>
          </P.Content>
        )}
      </DialogPortal>
    </Sheet>
  )
}
