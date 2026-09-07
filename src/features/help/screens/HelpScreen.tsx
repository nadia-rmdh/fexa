import { type ReactNode, useState } from 'react'

/** Numbered hotspot pins over a recreated mockup, paired with a matching legend list —
 *  hovering/focusing either side highlights both. Pins use indigo specifically because
 *  nothing else in the app uses that hue: the mockups below reuse the app's own
 *  semantic colors (amber for low stock, emerald for savings, gray for "out"), so the
 *  annotation color has to be one that can never be mistaken for real UI state. */
function HotspotDiagram({
  mock,
  hotspots,
}: {
  mock: ReactNode
  hotspots: { id: string; top: string; left: string; title: string; body: string }[]
}) {
  const [active, setActive] = useState<string | null>(null)

  return (
    <div className="grid gap-5 md:grid-cols-[1.3fr_1fr]">
      <div className="relative rounded-2xl border border-zinc-200 bg-zinc-100 p-4 dark:border-zinc-700 dark:bg-zinc-800/60">
        {mock}
        {hotspots.map((h, i) => (
          <div
            key={h.id}
            className={`absolute flex h-7 w-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full text-xs font-extrabold text-white shadow transition-all ${
              active === h.id ? 'bg-indigo-500 ring-4 ring-indigo-300 dark:ring-indigo-900' : 'bg-indigo-600'
            }`}
            style={{ top: h.top, left: h.left }}
          >
            {i + 1}
          </div>
        ))}
      </div>
      <div className="flex flex-col gap-1">
        {hotspots.map((h, i) => (
          <button
            key={h.id}
            type="button"
            onMouseEnter={() => setActive(h.id)}
            onMouseLeave={() => setActive(null)}
            onFocus={() => setActive(h.id)}
            onBlur={() => setActive(null)}
            className={`flex gap-3 rounded-lg p-2 text-left transition-colors ${
              active === h.id ? 'bg-zinc-100 dark:bg-zinc-800' : ''
            }`}
          >
            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-[11px] font-extrabold text-white">
              {i + 1}
            </span>
            <span>
              <span className="block text-sm font-semibold">{h.title}</span>
              <span className="block text-sm text-zinc-500 dark:text-zinc-400">{h.body}</span>
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}

function Section({ id, eyebrow, title, intro, children }: { id: string; eyebrow: string; title: string; intro?: string; children: ReactNode }) {
  return (
    <section
      id={id}
      className="scroll-mt-4 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-700 dark:bg-zinc-800/40"
    >
      <div className="mb-1 text-xs font-bold tracking-wide text-amber-700 dark:text-amber-500">{eyebrow}</div>
      <h3 className="mb-2 text-lg font-bold">{title}</h3>
      {intro && <p className="mb-5 max-w-[60ch] text-sm text-zinc-500 dark:text-zinc-400">{intro}</p>}
      {children}
    </section>
  )
}

function Arrow() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0 text-zinc-400">
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  )
}

function FlowStep({ icon, title, sub }: { icon: ReactNode; title: string; sub: string }) {
  return (
    <div className="flex flex-1 flex-col items-center gap-2 px-2 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-zinc-200 bg-zinc-100 text-amber-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-amber-500">
        {icon}
      </div>
      <div className="text-sm font-semibold">{title}</div>
      <div className="text-xs text-zinc-500 dark:text-zinc-400">{sub}</div>
    </div>
  )
}

function Flow({ steps }: { steps: { icon: ReactNode; title: string; sub: string }[] }) {
  return (
    <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
      {steps.map((s, i) => (
        <div key={i} className="flex items-center gap-3 sm:contents">
          <FlowStep {...s} />
          {i < steps.length - 1 && (
            <div className="flex justify-center sm:pt-0">
              <div className="rotate-90 sm:rotate-0"><Arrow /></div>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

function ChainNode({ children, variant }: { children: ReactNode; variant?: 'shared' | 'price' | 'label' }) {
  const cls =
    variant === 'shared'
      ? 'border-sky-500 text-sky-600 ring-1 ring-inset ring-sky-500 dark:text-sky-400'
      : variant === 'price'
        ? 'border-transparent bg-emerald-50 tabular-nums text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
        : variant === 'label'
          ? 'border-rose-500 text-rose-600 ring-1 ring-inset ring-rose-500 dark:text-rose-400'
          : 'border-zinc-200 bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800'
  return <span className={`rounded-lg border px-3 py-1.5 text-sm font-medium ${cls}`}>{children}</span>
}

function Chain({ nodes }: { nodes: { label: string; variant?: 'shared' | 'price' | 'label' }[] }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {nodes.map((n, i) => (
        <span key={i} className="flex items-center gap-1.5">
          {i > 0 && <span className="text-zinc-400">→</span>}
          <ChainNode variant={n.variant}>{n.label}</ChainNode>
        </span>
      ))}
    </div>
  )
}

/** Deliberately outside AppLayout (see router.tsx) — no shared bottom tab bar, its own
 *  background/text colors, and its own small way back in, so this reads as a separate
 *  destination someone can be handed a link to, not another tab of the POS app. */
export function HelpScreen() {
  return (
    <div className="min-h-dvh bg-zinc-50 text-zinc-900 dark:bg-zinc-900 dark:text-zinc-50">
      <div className="mx-auto max-w-3xl p-4 pb-16">
        <a href="#/checkout" className="mb-6 inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M15 6l-6 6 6 6" /></svg>
          Back to FEXA
        </a>
        <div className="mb-6">
          <div className="mb-1 flex items-center gap-2">
            <span
              className="h-4 w-4 shrink-0 rounded-full"
              style={{ background: 'conic-gradient(from -90deg, #6DBFF3 0deg 180deg, #CD7D3C 180deg 360deg)' }}
              aria-hidden="true"
            />
            <span className="text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-500">Field Guide</span>
          </div>
          <h1 className="text-2xl font-bold">Running the booth on FEXA</h1>
          <p className="mt-1 max-w-[54ch] text-sm text-zinc-500 dark:text-zinc-400">
            Everything a helper needs to work a shift, plus the full reference for how the catalog, bundles, and events
            behind it fit together.
          </p>
        </div>

      <div className="sticky top-0 z-10 mb-6 flex gap-2 bg-zinc-50/95 py-2 backdrop-blur dark:bg-zinc-900/95">
        {/* Plain hash links (href="#shift") don't work here — this app runs on
            HashRouter, which treats anything after "#" as a route path, not an in-page
            anchor. "#shift" would get matched against the route table, miss, and fall
            through to the catch-all redirect to /checkout. Scrolling manually sidesteps
            the router entirely. */}
        <button
          type="button"
          onClick={() => document.getElementById('shift')?.scrollIntoView({ behavior: 'smooth' })}
          className="rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-sm font-medium dark:border-zinc-700 dark:bg-zinc-800"
        >
          Running a Shift
        </button>
        <button
          type="button"
          onClick={() => document.getElementById('reference')?.scrollIntoView({ behavior: 'smooth' })}
          className="rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-sm font-medium dark:border-zinc-700 dark:bg-zinc-800"
        >
          Full Reference
        </button>
      </div>

      {/* ============ PART 1 ============ */}
      <h2 id="shift" className="scroll-mt-16 mb-1 text-xl font-bold">
        Running a Shift
      </h2>
      <p className="mb-5 max-w-[62ch] text-sm text-zinc-500 dark:text-zinc-400">
        Read this before your first shift. It covers everything you'll actually touch at the booth — nothing about
        setting the catalog up.
      </p>

      <div className="mb-4 flex flex-col gap-4">
        <Section
          id="checkout-screen"
          eyebrow="Home base"
          title="The checkout screen"
          intro="Tap a numbered spot on the mockup, or a line on the right, to see them line up."
        >
          <HotspotDiagram
            hotspots={[
              { id: '1', top: '9%', left: '18%', title: 'Category pills', body: 'Jump to another category without going back — the current one stays highlighted.' },
              { id: '2', top: '42%', left: '58%', title: 'Stock count', body: 'The number is what’s left. Amber means it’s running low.' },
              { id: '3', top: '42%', left: '92%', title: '"Out" badge', body: 'Still shown so you know it exists — tapping it does nothing. See "Sold Out ≠ Gone."' },
              { id: '4', top: '66%', left: '15%', title: 'Bundle badge', body: 'Appears the moment a discount applies — you never have to spot it yourself.' },
              { id: '5', top: '96%', left: '50%', title: 'Checkout', body: 'Opens the payment step. The total already includes every bundle.' },
            ]}
            mock={
              <div>
                <div className="mb-2 flex gap-1.5 overflow-hidden">
                  <span className="shrink-0 rounded-full bg-zinc-800 px-3 py-1 text-xs font-medium text-white dark:bg-zinc-100 dark:text-zinc-900">Keychain</span>
                  <span className="shrink-0 rounded-full bg-zinc-200 px-3 py-1 text-xs font-medium text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300">Sticker</span>
                  <span className="shrink-0 rounded-full bg-zinc-200 px-3 py-1 text-xs font-medium text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300">Zine</span>
                </div>
                <div className="mb-3 text-xs text-zinc-400">
                  Categories / <span className="font-medium text-zinc-600 dark:text-zinc-300">Keychain</span> / Genshin
                </div>
                <div className="mb-3 grid grid-cols-3 gap-2">
                  <div className="relative flex aspect-square items-end overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
                    <span className="absolute right-1 top-1 rounded-full bg-zinc-900/80 px-1.5 py-0.5 text-[10px] font-semibold text-white">9</span>
                    <span className="w-full bg-black/60 px-1 py-1 text-[11px] font-medium text-white">Childe</span>
                  </div>
                  <div className="relative flex aspect-square items-end overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
                    <span className="absolute right-1 top-1 rounded-full bg-amber-500 px-1.5 py-0.5 text-[10px] font-semibold text-white">2</span>
                    <span className="w-full bg-black/60 px-1 py-1 text-[11px] font-medium text-white">Zhongli</span>
                  </div>
                  <div className="relative flex aspect-square items-end overflow-hidden rounded-xl border border-zinc-200 bg-white opacity-50 shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
                    <span className="absolute right-1 top-1 rounded-full bg-zinc-600 px-1.5 py-0.5 text-[10px] font-semibold text-white">Out</span>
                    <span className="w-full bg-black/60 px-1 py-1 text-[11px] font-medium text-white">Wrio</span>
                  </div>
                </div>
                <div className="rounded-xl border border-zinc-200 bg-white p-3 dark:border-zinc-700 dark:bg-zinc-900">
                  <div className="mb-2 flex items-center justify-between rounded-lg bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                    <span>Bundle: Zine Set</span><span>IDR 100,000</span>
                  </div>
                  <div className="flex justify-between border-b border-zinc-100 py-1 text-xs dark:border-zinc-800">
                    <span>Keychain · Genshin<span className="block text-zinc-400">Childe</span></span><span>IDR 55,000</span>
                  </div>
                  <div className="flex justify-between py-1 text-xs">
                    <span>Zine · Genshin<span className="block text-zinc-400">Childe</span></span><span>IDR 45,000</span>
                  </div>
                  <div className="mt-2 flex justify-between border-t border-zinc-100 pt-2 text-sm font-bold dark:border-zinc-800">
                    <span>Total</span><span>IDR 100,000</span>
                  </div>
                  <div className="mt-3 rounded-lg bg-zinc-900 py-2 text-center text-sm font-semibold text-white dark:bg-zinc-100 dark:text-zinc-900">Checkout</div>
                </div>
              </div>
            }
          />
        </Section>

        <Section id="adding-items" eyebrow="Three taps" title="Adding an item to the cart" intro="Always the same order. Tapping a design adds one unit — tap it again for a second.">
          <Flow
            steps={[
              {
                icon: (<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></svg>),
                title: 'Category', sub: 'Keychain, Sticker, Zine…',
              },
              {
                icon: (<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4v16M4 4h13l-2.5 4L17 12H4" /></svg>),
                title: 'Fandom', sub: 'Which series/show',
              },
              {
                icon: (<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="8" r="3.4" /><path d="M5 20c0-3.6 3.1-6 7-6s7 2.4 7 6" /></svg>),
                title: 'Design', sub: 'Tap to add — again for +1',
              },
            ]}
          />
        </Section>

        <Section id="bundles" eyebrow="No menu to open" title="Bundles happen automatically" intro="Add items normally — if a deal applies, the cart re-prices itself and shows what changed.">
          <div className="flex flex-wrap items-center gap-4">
            <div className="min-w-[180px] flex-1">
              <h4 className="mb-2 text-xs font-bold uppercase tracking-wide text-zinc-400">Added separately</h4>
              <div className="flex justify-between py-1 text-sm"><span>Keychain · Childe</span><span className="text-zinc-400 line-through">IDR 55,000</span></div>
              <div className="flex justify-between py-1 text-sm"><span>Zine · Childe</span><span className="text-zinc-400 line-through">IDR 45,000</span></div>
              <div className="flex justify-between py-1 text-sm font-bold"><span>À la carte total</span><span className="text-zinc-400 line-through">IDR 100,000</span></div>
            </div>
            <Arrow />
            <div className="min-w-[180px] flex-1">
              <h4 className="mb-2 text-xs font-bold uppercase tracking-wide text-zinc-400">What the cart shows</h4>
              <div className="flex justify-between py-1 text-sm font-bold"><span>Bundle: Zine Set</span><span>IDR 90,000</span></div>
              <span className="mt-2 inline-flex rounded-full bg-emerald-50 px-3 py-1 text-sm font-semibold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                Saved IDR 10,000
              </span>
            </div>
          </div>
        </Section>

        <Section id="payment" eyebrow="Two paths" title="Taking payment" intro="Cash and QR. Cash has one extra, optional field.">
          <HotspotDiagram
            hotspots={[
              { id: 'p1', top: '27%', left: '20%', title: 'Cash or QR', body: 'Pick one — the field below only shows up for Cash.' },
              { id: 'p2', top: '60%', left: '78%', title: 'Cash received', body: 'Type what the customer physically handed you. Leave it blank if they gave exact change.' },
              { id: 'p3', top: '92%', left: '45%', title: 'Change due', body: 'Updates as you type, and prints on the receipt — no mental math.' },
            ]}
            mock={
              <div className="rounded-xl border border-zinc-200 bg-white p-3 dark:border-zinc-700 dark:bg-zinc-900">
                <div className="mb-3 text-center text-xl font-bold">IDR 54,000</div>
                <div className="mb-3 grid grid-cols-2 gap-2">
                  <div className="rounded-lg border-2 border-zinc-900 bg-zinc-100 py-3 text-center text-sm font-medium dark:border-zinc-100 dark:bg-zinc-800">Cash</div>
                  <div className="rounded-lg border-2 border-zinc-200 py-3 text-center text-sm font-medium dark:border-zinc-700">QR</div>
                </div>
                <div className="mb-1 text-xs font-medium text-zinc-500">Cash received (leave blank for exact change)</div>
                <div className="mb-2 rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-400 dark:border-zinc-700">IDR 100,000</div>
                <div className="text-xs text-zinc-500">
                  Change due: <span className="font-bold text-emerald-600 dark:text-emerald-400">IDR 46,000</span>
                </div>
              </div>
            }
          />
        </Section>

        <Section id="sold-out" eyebrow="Not deleted, just empty" title="Sold out ≠ gone" intro="An item that started the event with stock but has since run out doesn't disappear — it just can't be added anymore, so you can still tell a customer 'yes, we carry that, but we're out.'">
          <div className="max-w-[110px]">
            <div className="relative flex aspect-square items-end overflow-hidden rounded-xl border border-zinc-200 bg-white opacity-50 shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
              <span className="absolute right-1 top-1 rounded-full bg-zinc-600 px-1.5 py-0.5 text-[10px] font-semibold text-white">Out</span>
              <span className="w-full bg-black/60 px-1 py-1 text-[11px] font-medium text-white">Wrio</span>
            </div>
          </div>
          <p className="mt-3 text-sm text-zinc-500 dark:text-zinc-400">
            Only an admin can bring more of it in mid-event, from <b>Admin → Events → Add Item to Stock</b>.
          </p>
        </Section>
      </div>

      {/* ============ PART 2 ============ */}
      <h2 id="reference" className="scroll-mt-16 mb-1 mt-10 text-xl font-bold">
        Full Reference
      </h2>
      <p className="mb-5 max-w-[62ch] text-sm text-zinc-500 dark:text-zinc-400">
        The part behind the part above — how the catalog, bundle deals, and events are actually built and maintained.
      </p>

      <div className="flex flex-col gap-4">
        <Section id="catalog" eyebrow="01 — Catalog" title="Building the catalog" intro="Four layers plus an optional label, always built in this order, since each one depends on the last:">
          <Chain
            nodes={[
              { label: 'Category' },
              { label: 'Fandom' },
              { label: 'Character' },
              { label: 'Label (optional)', variant: 'label' },
              { label: 'Item' },
            ]}
          />
          <p className="my-4 max-w-[60ch] text-sm text-zinc-500 dark:text-zinc-400">
            Fandoms and Characters are <b>shared across every Category</b> — enter "Genshin Impact → Zhongli" once,
            and the same node reappears wherever else it applies:
          </p>
          <div className="flex flex-col gap-2">
            <Chain nodes={[{ label: 'Keychain' }, { label: 'Genshin Impact', variant: 'shared' }, { label: 'Zhongli', variant: 'shared' }, { label: 'IDR 55,000', variant: 'price' }]} />
            <Chain nodes={[{ label: 'Sticker' }, { label: 'Genshin Impact', variant: 'shared' }, { label: 'Zhongli', variant: 'shared' }, { label: 'IDR 12,000', variant: 'price' }]} />
          </div>
          <p className="my-4 max-w-[60ch] text-sm text-zinc-500 dark:text-zinc-400">
            A <b>Label</b> works the other way: same Category, same Fandom, same Character — but a second physical
            design still counts as a completely separate Item, with its own price and its own stock count:
          </p>
          <div className="flex flex-col gap-2">
            <Chain nodes={[{ label: 'Keychain' }, { label: 'Genshin Impact', variant: 'shared' }, { label: 'Zhongli', variant: 'shared' }, { label: 'Design A', variant: 'label' }, { label: 'IDR 55,000', variant: 'price' }]} />
            <Chain nodes={[{ label: 'Keychain' }, { label: 'Genshin Impact', variant: 'shared' }, { label: 'Zhongli', variant: 'shared' }, { label: 'Design B', variant: 'label' }, { label: 'IDR 60,000', variant: 'price' }]} />
          </div>
          <p className="mt-4 max-w-[60ch] text-sm text-zinc-500 dark:text-zinc-400">
            Leave the label blank for the common case — just one design per character. Only add one when you actually
            have two (or more) physical products for the same Category+Fandom+Character combination; a bundle rule
            never looks at the label, only at Category and Character, so labeled variants still bundle exactly like
            any other item of that character.
          </p>
        </Section>

        <Section id="bundle-rules" eyebrow="02 — Deals" title="Bundle rules" intro="Four rule types — the engine always finds the cheapest legal combination for whatever's actually in the cart, so you don't have to design them to avoid overlapping.">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {[
              { name: 'Quantity in category', body: 'Buy N of one category, any characters, flat price.', ex: '2 Keychains → IDR 50,000' },
              { name: 'Cross-category, matched', body: 'One item per listed category, same character — or a generic category that takes any character at all.', ex: 'Keychain + Zine (any) → IDR 100,000' },
              { name: 'Character full-set', body: 'One of every listed category, all the same character.', ex: 'Keychain+Sticker+Pin, one char → IDR 50,000' },
              { name: 'Buy N, get 1 free', body: 'Stacks on top of every other bundle. The cheapest eligible unit is the free one.', ex: 'Every 6th Sticker free' },
            ].map((r) => (
              <div key={r.name} className="rounded-xl border border-zinc-200 bg-zinc-50 p-3.5 dark:border-zinc-700 dark:bg-zinc-800">
                <b className="mb-1 block text-sm">{r.name}</b>
                <span className="text-sm text-zinc-500 dark:text-zinc-400">{r.body}</span>
                <span className="mt-2 block tabular-nums text-xs text-zinc-400">{r.ex}</span>
              </div>
            ))}
          </div>
        </Section>

        <Section id="delisting" eyebrow="03 — Catalog upkeep" title="Active vs. delisted" intro="Turning a Category, Fandom, or Character's Active toggle off doesn't delete anything — it just keeps it out of the restock list for the next event, so you're never asked to stock something you meant to retire.">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-800">
              <span className="mb-3 inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-emerald-600 dark:text-emerald-400">
                <span className="h-1.5 w-1.5 rounded-full bg-current" /> Active
              </span>
              <div className="flex justify-between border-b border-dashed border-zinc-200 py-1.5 text-sm dark:border-zinc-700"><span>Items list</span><span className="text-zinc-500">plain</span></div>
              <div className="flex justify-between border-b border-dashed border-zinc-200 py-1.5 text-sm dark:border-zinc-700"><span>Start Event restock</span><span className="text-zinc-500">included</span></div>
              <div className="flex justify-between py-1.5 text-sm"><span>Checkout, once stocked</span><span className="text-zinc-500">sellable</span></div>
            </div>
            <div className="rounded-xl border border-zinc-200 bg-white p-4 opacity-90 dark:border-zinc-700 dark:bg-zinc-900">
              <span className="mb-3 inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-red-600 dark:text-red-400">
                <span className="h-1.5 w-1.5 rounded-full bg-current" /> Delisted
              </span>
              <div className="flex justify-between border-b border-dashed border-zinc-200 py-1.5 text-sm dark:border-zinc-700">
                <span>Items list</span>
                <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-semibold text-red-700 dark:bg-red-900/40 dark:text-red-400">⊘ Delisted category</span>
              </div>
              <div className="flex justify-between border-b border-dashed border-zinc-200 py-1.5 text-sm text-zinc-400 line-through dark:border-zinc-700"><span>Start Event restock</span><span>skipped</span></div>
              <div className="flex justify-between py-1.5 text-sm text-zinc-400 line-through"><span>Checkout</span><span>never stocked</span></div>
            </div>
          </div>
          <p className="mt-4 max-w-[60ch] text-sm text-zinc-500 dark:text-zinc-400">
            Its catalog data, price, and sales history are untouched either way — reactivate it later and it slots
            right back in. To stop something from selling <em>this instant</em>, mid-event, that's a different lever —
            see "What shows at checkout" below.
          </p>
        </Section>

        <Section id="events" eyebrow="04 — Per-event setup" title="Starting an event" intro="Starting a new event carries the catalog and bundle rules forward untouched — the only thing you re-enter is how much of each item you're bringing, grouped the same way the catalog is organized:">
          <div className="max-w-sm rounded-xl border border-zinc-200 bg-zinc-100 p-4 dark:border-zinc-700 dark:bg-zinc-800/60">
            <div className="mb-1 text-xs font-bold uppercase tracking-wide text-zinc-400">Keychain</div>
            <div className="mb-1.5 mt-2 text-sm font-bold">Genshin Impact</div>
            <div className="mb-1.5 flex items-center justify-between rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900">
              <span>Zhongli</span><span className="rounded bg-zinc-100 px-2 py-0.5 font-bold tabular-nums dark:bg-zinc-800">24</span>
            </div>
            <div className="mb-1.5 flex items-center justify-between rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900">
              <span>Childe</span><span className="rounded bg-zinc-100 px-2 py-0.5 font-bold tabular-nums dark:bg-zinc-800">18</span>
            </div>
            <div className="mb-1.5 mt-3 text-sm font-bold">Honkai: Star Rail</div>
            <div className="flex items-center justify-between rounded-lg border border-transparent bg-emerald-50 px-2.5 py-1.5 text-sm dark:bg-emerald-900/20">
              <span>Sunday</span><span className="rounded bg-emerald-600 px-2 py-0.5 font-bold tabular-nums text-white">12</span>
            </div>
            <div className="mt-2 inline-flex rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
              Sunday is new — added to this list automatically
            </div>
          </div>
          <p className="mt-4 max-w-[60ch] text-sm text-zinc-500 dark:text-zinc-400">
            Leave something at 0 (or skip it entirely) and it simply won't appear at checkout — see below for exactly
            why.
          </p>
          <p className="mt-2 max-w-[60ch] text-sm text-zinc-500 dark:text-zinc-400">
            Realized you need to add something <em>after</em> the event's already started — reactivated a category, or
            a brand-new item arrived? <b>Admin → Events → Add Item to Stock</b> lists only what isn't stocked yet and
            brings it in without waiting for the next event.
          </p>
        </Section>

        <Section id="visibility" eyebrow="05 — The one rule that matters" title="What shows at checkout" intro="Not 'is it active' — was a quantity actually entered for it at Start Event. That single question decides every tile a helper sees:">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-xl bg-emerald-50 p-3.5 dark:bg-emerald-900/20">
              <span className="mb-2 inline-block rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">Stocked, in stock</span>
              <b className="block text-sm">Shown, tappable</b>
              <span className="text-sm text-zinc-500 dark:text-zinc-400">The normal case — adds to the cart.</span>
            </div>
            <div className="rounded-xl bg-amber-50 p-3.5 dark:bg-amber-900/20">
              <span className="mb-2 inline-block rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">Stocked, sold out</span>
              <b className="block text-sm">Shown, disabled</b>
              <span className="text-sm text-zinc-500 dark:text-zinc-400">"Out" badge — still visible, can't be tapped.</span>
            </div>
            <div className="rounded-xl bg-zinc-100 p-3.5 dark:bg-zinc-800">
              <span className="mb-2 inline-block rounded-full bg-zinc-500 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">Never stocked</span>
              <b className="block text-sm">Not shown at all</b>
              <span className="text-sm text-zinc-500 dark:text-zinc-400">Delisted, or just left at 0 — same result.</span>
            </div>
          </div>
        </Section>

        <Section id="reports" eyebrow="06 — After the fact" title="Reports" intro="One page per event, exportable as a CSV for a spreadsheet.">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {[
              { name: 'Revenue by payment method', body: 'Cash vs. QR — this is the number that should match your cash drawer.' },
              { name: 'Best sellers', body: 'Units and revenue per item, ranked.' },
              { name: 'Bundle usage', body: 'How often each deal fired, and how much it discounted in total.' },
              { name: 'Leftover stock', body: 'What the system expects is left, to check against your physical count at pack-down.' },
            ].map((r) => (
              <div key={r.name} className="rounded-xl border border-zinc-200 p-3.5 dark:border-zinc-700">
                <b className="mb-1 block text-sm">{r.name}</b>
                <span className="text-sm text-zinc-500 dark:text-zinc-400">{r.body}</span>
              </div>
            ))}
          </div>
        </Section>

        <Section id="backup" eyebrow="07 — Safety net" title="Backup & restore" intro="Everything lives on the device, not a server — so Admin → Backup is the only copy that exists elsewhere.">
          <Flow
            steps={[
              { icon: (<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 3v12M7 10l5 5 5-5M5 21h14" /></svg>), title: 'Export', sub: 'Admin → Backup → download the JSON' },
              { icon: (<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="4" y="3" width="10" height="16" rx="2" /><rect x="15" y="7" width="6" height="12" rx="1.5" /></svg>), title: 'Keep it safe', sub: 'Cloud drive, email to yourself…' },
              { icon: (<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 21V9M7 14l5-5 5 5M5 3h14" /></svg>), title: 'Restore', sub: 'On a new or wiped device' },
            ]}
          />
          <p className="mt-4 max-w-[60ch] text-sm text-zinc-500 dark:text-zinc-400">
            Export before a big event and after building out a lot of catalog data — restoring is how you'd recover
            from a lost or broken tablet.
          </p>
        </Section>

        <Section id="offline" eyebrow="08 — Install" title="Install & go offline" intro="One moment online to install, then zero signal needed for the rest of the market.">
          <Flow
            steps={[
              { icon: (<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c2.5 2.7 3.8 6 3.8 9s-1.3 6.3-3.8 9c-2.5-2.7-3.8-6-3.8-9s1.3-6.3 3.8-9z" /></svg>), title: 'Open the link', sub: 'Once, while online' },
              { icon: (<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="5" y="3" width="14" height="18" rx="2.5" /><path d="M9 18h6" /></svg>), title: 'Add to Home Screen', sub: 'Share menu (iOS) or app menu (Android)' },
              { icon: (<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2 2 19h20L12 2z" /><path d="M12 9v5M12 17h.01" strokeLinecap="round" /></svg>), title: 'Zero signal, no problem', sub: 'Opens and sells like any app' },
            ]}
          />
        </Section>
      </div>

        <p className="mt-8 max-w-[62ch] border-t border-zinc-200 pt-5 text-xs text-zinc-400 dark:border-zinc-700">
          FEXA Field Guide — for the person running the booth, and the person who set it up.
        </p>
      </div>
    </div>
  )
}
