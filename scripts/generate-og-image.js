const sharp = require('sharp');
const path = require('path');

async function generateOgImage() {
    const width = 1200;
    const height = 630;

    // Create a gradient background with text overlay
    const svg = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
        <defs>
            <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" style="stop-color:#020617"/>
                <stop offset="50%" style="stop-color:#0f172a"/>
                <stop offset="100%" style="stop-color:#064e3b"/>
            </linearGradient>
            <linearGradient id="textGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" style="stop-color:#ffffff"/>
                <stop offset="50%" style="stop-color:#e2e8f0"/>
                <stop offset="100%" style="stop-color:#94a3b8"/>
            </linearGradient>
        </defs>
        <rect width="100%" height="100%" fill="url(#bg)"/>

        <!-- Decorative orbs -->
        <circle cx="150" cy="150" r="200" fill="#10b981" opacity="0.15" filter="blur(60px)"/>
        <circle cx="1050" cy="200" r="250" fill="#06b6d4" opacity="0.1" filter="blur(80px)"/>
        <circle cx="600" cy="500" r="180" fill="#8b5cf6" opacity="0.08" filter="blur(50px)"/>

        <!-- Logo text -->
        <text x="600" y="280" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="96" font-weight="bold" fill="url(#textGradient)">
            digital<tspan fill="#34d399">4d</tspan>
        </text>

        <!-- Tagline -->
        <text x="600" y="380" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="36" fill="#94a3b8">
            3D Печат и Моделиране
        </text>

        <!-- Subtitle -->
        <text x="600" y="450" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="24" fill="#64748b">
            Професионални услуги за 3D принтиране
        </text>

        <!-- Bottom accent line -->
        <rect x="450" y="520" width="300" height="4" rx="2" fill="#10b981" opacity="0.8"/>
    </svg>`;

    await sharp(Buffer.from(svg))
        .png()
        .toFile(path.join(__dirname, '../public/og-image.png'));

    console.log('✅ OG image generated: public/og-image.png');
}

generateOgImage().catch(console.error);