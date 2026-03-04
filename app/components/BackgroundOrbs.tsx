export function BackgroundOrbs() {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10" aria-hidden="true">
      <div
        className="absolute top-20 left-10 w-[36rem] h-[36rem] rounded-full opacity-[0.07]"
        style={{ background: 'radial-gradient(circle, rgb(16 185 129) 0%, transparent 70%)' }}
      />
      <div
        className="absolute top-40 right-20 w-[48rem] h-[48rem] rounded-full opacity-[0.05]"
        style={{ background: 'radial-gradient(circle, rgb(6 182 212) 0%, transparent 70%)' }}
      />
      <div
        className="absolute bottom-20 left-1/3 w-[40rem] h-[40rem] rounded-full opacity-[0.04]"
        style={{ background: 'radial-gradient(circle, rgb(168 85 247) 0%, transparent 70%)' }}
      />
    </div>
  )
}
