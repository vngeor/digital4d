export function BackgroundOrbs() {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10" aria-hidden="true">
      {/* Easter Egg 1 — Pink */}
      <div
        className="absolute top-20 left-10 w-[30rem] h-[40rem] opacity-[0.07]"
        style={{
          background: 'radial-gradient(ellipse, rgb(244 114 182) 0%, transparent 70%)',
          borderRadius: '50% 50% 50% 50% / 60% 60% 40% 40%',
          transform: 'rotate(15deg)',
        }}
      />
      {/* Easter Egg 2 — Yellow */}
      <div
        className="absolute top-40 right-20 w-[36rem] h-[48rem] opacity-[0.06]"
        style={{
          background: 'radial-gradient(ellipse, rgb(250 204 21) 0%, transparent 70%)',
          borderRadius: '50% 50% 50% 50% / 60% 60% 40% 40%',
          transform: 'rotate(-10deg)',
        }}
      />
      {/* Easter Egg 3 — Lavender */}
      <div
        className="absolute bottom-20 left-1/3 w-[32rem] h-[42rem] opacity-[0.05]"
        style={{
          background: 'radial-gradient(ellipse, rgb(192 132 252) 0%, transparent 70%)',
          borderRadius: '50% 50% 50% 50% / 60% 60% 40% 40%',
          transform: 'rotate(8deg)',
        }}
      />
    </div>
  )
}
