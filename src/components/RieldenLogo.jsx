// Marca de Rielden: la «R» dorada (#FAC51A) + blanca (#F8F8F8), mismos trazos que el CRM de Rielden.
export const RIELDEN = {
    oro: '#FAC51A',
    oroFuerte: '#FFD24A',
    blanco: '#F8F8F8',
    negro: '#000000',
    superficie: '#191919',
};

const BOWL = 'M22.5 23 L59 23 C71 23 80 32 80 43.5 C80 55 71.5 64.5 61 64.5 L61 49.5 C65.5 49 68.5 46.5 68.5 42.5 C68.5 38.2 65 35 60 35 L25 35 C24 35 23.4 34.4 23.3 33.5 Z';
const BODY = 'M21 53.5 L34.5 39.5 L57.5 39.5 C59.5 39.5 61 41 61 43 L61 66 L80 81 L59.5 81 L43 59.5 C41.8 57.6 42.6 54.5 44.5 53.5 L35.5 53.5 L35.5 81 L21 81 Z';
const VIEWBOX = '18 20 65 64';

export function LogoMark({ size = 32, className = '' }) {
    return (
        <svg viewBox={VIEWBOX} width={size} height={size} className={`flex-none ${className}`} aria-hidden="true">
            <path d={BOWL} fill={RIELDEN.oro} />
            <path d={BODY} fill={RIELDEN.blanco} />
        </svg>
    );
}

export function Wordmark({ height = 32, className = '' }) {
    return (
        <span className={`inline-flex items-center gap-2.5 ${className}`} role="img" aria-label="Rielden">
            <LogoMark size={height} />
            <span
                className="font-extrabold uppercase tracking-[0.18em] text-[#F8F8F8]"
                style={{ fontSize: Math.round(height * 0.6) }}
                aria-hidden="true"
            >
                Rielden
            </span>
        </span>
    );
}

// Rasteriza la «R» a PNG para incrustarla en el PDF (jsPDF no dibuja SVG).
export async function logoComoPng(tamano = 256) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${VIEWBOX}" width="${tamano}" height="${tamano}"><path fill="${RIELDEN.oro}" d="${BOWL}"/><path fill="${RIELDEN.blanco}" d="${BODY}"/></svg>`;
    const img = new Image();
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
    await img.decode();
    const canvas = document.createElement('canvas');
    canvas.width = tamano;
    canvas.height = tamano;
    canvas.getContext('2d').drawImage(img, 0, 0, tamano, tamano);
    return canvas.toDataURL('image/png');
}
