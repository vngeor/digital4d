"use client"

import dynamic from "next/dynamic"

const Dinosaur3D = dynamic(() => import("./Dinosaur3D"), {
    ssr: false,
    loading: () => (
        <div className="w-full h-[200px] sm:h-[260px] flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
        </div>
    ),
})

export function Dinosaur3DWrapper() {
    return <Dinosaur3D />
}
