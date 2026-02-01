import { getTranslations, getLocale } from "next-intl/server"
import { Header } from "./components/Header"
import { NewsSection } from "./components/NewsSection"
import prisma from "@/lib/prisma"

export default async function Home() {
    const t = await getTranslations("hero")
    const tNews = await getTranslations("news")
    const tContact = await getTranslations("contact")
    const tFooter = await getTranslations("footer")
    const locale = await getLocale()

    // Fetch published news from database
    const dbNews = await prisma.content.findMany({
        where: {
            type: "news",
            published: true,
        },
        orderBy: [{ order: "asc" }, { createdAt: "desc" }],
        take: 6,
    })

    // Map to locale-specific fields
    const newsItems = dbNews.map((item) => {
        const titleKey = `title${locale.charAt(0).toUpperCase() + locale.slice(1)}` as keyof typeof item
        const bodyKey = `body${locale.charAt(0).toUpperCase() + locale.slice(1)}` as keyof typeof item

        return {
            title: (item[titleKey] as string) || item.titleEn,
            description: (item[bodyKey] as string) || item.bodyEn || "",
            date: new Date(item.createdAt).toLocaleDateString(locale === "bg" ? "bg-BG" : locale === "es" ? "es-ES" : "en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
            }),
            category: item.type === "news" ? tNews("title") : item.type,
        }
    })

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950 text-white overflow-hidden">
            {/* Animated Background Orbs */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-20 left-10 w-72 h-72 bg-emerald-500/20 rounded-full blur-3xl animate-pulse-glow" />
                <div className="absolute top-40 right-20 w-96 h-96 bg-cyan-500/15 rounded-full blur-3xl animate-pulse-glow animation-delay-1000" />
                <div className="absolute bottom-20 left-1/3 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl animate-pulse-glow animation-delay-2000" />
            </div>

            {/* Floating 3D Shapes */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-32 right-[15%] w-16 h-16 animate-float">
                    <div className="w-full h-full bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-xl rotate-45 shadow-lg shadow-emerald-500/30" />
                </div>
                <div className="absolute top-[60%] left-[10%] w-12 h-12 animate-float-slow animation-delay-400">
                    <div className="w-full h-full bg-gradient-to-br from-cyan-400 to-cyan-600 rounded-full shadow-lg shadow-cyan-500/30" />
                </div>
                <div className="absolute top-[20%] left-[20%] w-8 h-8 animate-float-reverse animation-delay-600">
                    <div className="w-full h-full bg-gradient-to-br from-purple-400 to-purple-600 rounded-lg rotate-12 shadow-lg shadow-purple-500/30" />
                </div>
                <div className="absolute bottom-[30%] right-[10%] w-10 h-10 animate-float animation-delay-200">
                    <div className="w-full h-full bg-gradient-to-br from-pink-400 to-pink-600 rounded-xl rotate-[-20deg] shadow-lg shadow-pink-500/30" />
                </div>
                <div className="absolute top-[45%] right-[25%] w-6 h-6 animate-float-slow">
                    <div className="w-full h-full bg-gradient-to-br from-amber-400 to-amber-600 rounded-full shadow-lg shadow-amber-500/30" />
                </div>
            </div>

            {/* Navbar */}
            <Header />

            {/* Hero Section */}
            <section className="relative flex flex-col items-center justify-center text-center py-32 px-4">
                <div className="animate-fade-in-up">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass mb-8 text-sm text-emerald-300">
                        <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                        {t("badge")}
                    </div>
                </div>

                <h1 className="text-5xl md:text-7xl font-bold mb-6 animate-fade-in-up animation-delay-200">
                    <span className="bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
                        {t("title1")}
                    </span>
                    <br />
                    <span className="bg-gradient-to-r from-emerald-400 via-cyan-400 to-emerald-400 bg-clip-text text-transparent">
                        {t("title2")}
                    </span>
                </h1>

                <p className="max-w-2xl mb-10 text-lg text-slate-300 animate-fade-in-up animation-delay-400">
                    {t("description")}
                </p>

                <div className="flex flex-col sm:flex-row gap-4 animate-fade-in-up animation-delay-600">
                    <a href="#services" className="group relative px-8 py-4 bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-full font-semibold text-white shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 hover:scale-105 transition-all">
                        {t("cta1")}
                        <span className="absolute inset-0 rounded-full bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </a>
                    <a href="#contact" className="px-8 py-4 glass rounded-full font-semibold hover:bg-white/10 hover:scale-105 transition-all">
                        {t("cta2")}
                    </a>
                </div>

                {/* 3D Printer Illustration */}
                <div className="mt-20 relative animate-fade-in-up animation-delay-600">
                    <div className="w-64 h-64 md:w-80 md:h-80 relative">
                        {/* Base */}
                        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-48 h-4 bg-gradient-to-r from-slate-700 to-slate-600 rounded-lg shadow-xl" />
                        {/* Printer Body */}
                        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-40 h-32 glass-strong rounded-xl">
                            <div className="absolute top-2 left-2 right-2 h-2 bg-emerald-500/50 rounded-full" />
                            <div className="absolute top-6 left-4 w-3 h-3 bg-emerald-400 rounded-full animate-pulse" />
                        </div>
                        {/* Print Head */}
                        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 w-8 h-8 bg-gradient-to-b from-emerald-400 to-emerald-600 rounded-lg shadow-lg shadow-emerald-500/50 animate-float" />
                        {/* Frame */}
                        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-44 h-48 border-2 border-slate-600/50 rounded-t-xl" style={{ borderBottom: 'none' }} />
                        {/* Printing Object */}
                        <div className="absolute bottom-8 left-1/2 -translate-x-1/2">
                            <div className="w-12 h-12 bg-gradient-to-br from-cyan-400 to-emerald-400 rounded-lg rotate-45 shadow-lg shadow-cyan-500/30 animate-pulse" />
                        </div>
                    </div>
                </div>
            </section>

            {/* News Section */}
            <NewsSection newsItems={newsItems} />

            {/* Contact Section */}
            <section id="contact" className="relative py-24 px-4">
                <div className="mx-auto max-w-4xl text-center">
                    <h2 className="text-4xl font-bold mb-4 bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
                        {tContact("title")}
                    </h2>
                    <p className="text-slate-400 mb-16 text-lg">{tContact("subtitle")}</p>

                    <div className="grid gap-6 sm:grid-cols-3">
                        {/* WhatsApp */}
                        <a href="https://wa.me/359888123456" target="_blank" rel="noopener noreferrer"
                           className="group flex flex-col items-center p-8 rounded-2xl glass hover:bg-white/10 hover:scale-105 hover:shadow-xl hover:shadow-green-500/10 transition-all duration-300">
                            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center mb-5 shadow-lg shadow-green-500/30 group-hover:shadow-green-500/50 group-hover:scale-110 transition-all">
                                <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                                </svg>
                            </div>
                            <h3 className="text-xl font-semibold mb-2">{tContact("whatsapp")}</h3>
                            <p className="text-slate-400">+359 888 123 456</p>
                        </a>

                        {/* Viber */}
                        <a href="viber://chat?number=359888123456" target="_blank" rel="noopener noreferrer"
                           className="group flex flex-col items-center p-8 rounded-2xl glass hover:bg-white/10 hover:scale-105 hover:shadow-xl hover:shadow-purple-500/10 transition-all duration-300">
                            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center mb-5 shadow-lg shadow-purple-500/30 group-hover:shadow-purple-500/50 group-hover:scale-110 transition-all">
                                <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M11.398.002C9.473.028 5.331.344 3.014 2.467 1.294 4.182.518 6.77.382 9.978.246 13.186.106 19.108 5.73 20.762l.002.002.001.006s-.036 1.881-.037 1.917c-.004.087.022.206.089.284.067.078.17.122.277.122.073 0 .146-.023.233-.07.11-.06 4.415-3.735 4.415-3.735l.09-.076c1.116.117 2.214.147 3.2.147 1.926 0 6.068-.316 8.385-2.44 1.72-1.714 2.496-4.303 2.632-7.51.136-3.209.277-9.13-5.348-10.784-1.604-.439-3.91-.626-6.27-.602zm5.392 3.71c.224 0 .4.18.4.401 0 .165-.101.31-.262.38-.023.005-.04.027-.067.027-1.004.315-1.56.833-1.849 1.126a7.72 7.72 0 00-.485.555c.076.14.125.3.125.472 0 .556-.45 1.006-1.006 1.006a1.007 1.007 0 01-.867-.493c-.05.02-.09.052-.144.068-.368.115-.667.248-.897.397-.233.152-.382.305-.48.474-.098.17-.15.357-.15.566 0 .203.056.367.1.509.044.141.079.263.054.42a.4.4 0 01-.393.33h-.001a.4.4 0 01-.394-.333c-.086-.538-.004-.997.15-1.381.155-.384.384-.691.656-.947-.012-.05-.02-.102-.02-.155 0-.556.45-1.007 1.006-1.007.235 0 .45.083.621.219.088-.071.19-.135.297-.2.362-.218.838-.424 1.375-.583.01-.015.013-.034.025-.048.3-.36.685-.718 1.164-1.012.48-.293 1.06-.523 1.777-.634.065-.013.139-.027.195-.027.025 0 .05.002.075.007zm-4.778 9.18c-.032 0-.065.004-.098.012a2.256 2.256 0 00-1.59-.656c-1.248 0-2.26 1.012-2.26 2.26s1.012 2.26 2.26 2.26c1.247 0 2.259-1.012 2.259-2.26a2.26 2.26 0 00-.43-1.327.4.4 0 01.26-.687.4.4 0 01.316.154 3.053 3.053 0 01.654 1.86c0 1.693-1.377 3.06-3.06 3.06-1.682 0-3.059-1.377-3.059-3.06s1.377-3.06 3.06-3.06c.85 0 1.617.348 2.173.907a.4.4 0 01-.085.537.402.402 0 01-.4.0z"/>
                                </svg>
                            </div>
                            <h3 className="text-xl font-semibold mb-2">{tContact("viber")}</h3>
                            <p className="text-slate-400">+359 888 123 456</p>
                        </a>

                        {/* Email */}
                        <a href="mailto:contact@digital4d.bg"
                           className="group flex flex-col items-center p-8 rounded-2xl glass hover:bg-white/10 hover:scale-105 hover:shadow-xl hover:shadow-emerald-500/10 transition-all duration-300">
                            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-400 to-cyan-500 flex items-center justify-center mb-5 shadow-lg shadow-emerald-500/30 group-hover:shadow-emerald-500/50 group-hover:scale-110 transition-all">
                                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
                                </svg>
                            </div>
                            <h3 className="text-xl font-semibold mb-2">{tContact("email")}</h3>
                            <p className="text-slate-400">contact@digital4d.bg</p>
                        </a>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="glass border-t border-white/10 py-8 mt-12">
                <div className="mx-auto max-w-6xl px-4 text-center text-slate-400">
                    <p>&copy; 2024 digital4d. {tFooter("rights")}</p>
                </div>
            </footer>
        </div>
    );
}
