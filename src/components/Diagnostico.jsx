import { useState } from 'react';
import { jsPDF } from 'jspdf';
import { datosAutonomo } from '../data/datosAutonomo';
import {
    AREAS_DIAGNOSTICO,
    IVA,
    IRPF,
    PACK_PRECIO_BASE,
    CATEGORIAS_SERVICIOS,
    SERVICIOS,
} from '../data/preciosDiagnostico';
import { LogoMark, Wordmark, logoComoPng } from './RieldenLogo';

const formatoEuro = (valor) =>
    `${valor.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;

const redondear = (valor) => Math.round(valor * 100) / 100;

const rangoTexto = (s) =>
    `${s.min === s.max ? formatoEuro(s.min) : `${formatoEuro(s.min)} – ${formatoEuro(s.max)}`}${s.periodo === 'mes' ? ' /mes' : ''}`;

// Iconos de línea para cada área del diagnóstico
const ICONOS_AREA = {
    administracion: (
        <>
            <rect x="2" y="7" width="20" height="14" rx="2" />
            <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
        </>
    ),
    delivery: (
        <>
            <path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2" />
            <path d="M15 18H9" />
            <path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.62l-3.48-4.35A1 1 0 0 0 17.52 8H14" />
            <circle cx="17" cy="18" r="2" />
            <circle cx="7" cy="18" r="2" />
        </>
    ),
    marketing: (
        <>
            <path d="m3 11 18-5v12L3 14v-3z" />
            <path d="M11.6 16.8a3 3 0 1 1-5.8-1.6" />
        </>
    ),
    ventas: (
        <>
            <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
            <polyline points="16 7 22 7 22 13" />
        </>
    ),
};

function Icono({ children, className = 'w-5 h-5' }) {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
            {children}
        </svg>
    );
}

function Interruptor({ activo, onChange, titulo, descripcion }) {
    return (
        <button
            type="button"
            role="switch"
            aria-checked={activo}
            onClick={() => onChange(!activo)}
            className="w-full flex items-center justify-between gap-4 text-left py-2 group"
        >
            <span>
                <span className="block text-sm font-semibold text-[#F8F8F8]">{titulo}</span>
                <span className="block text-xs text-[#A3A3A3]">{descripcion}</span>
            </span>
            <span className={`relative flex-none w-11 h-6 rounded-full transition-colors duration-300 ${activo ? 'bg-[#FAC51A]' : 'bg-[#333]'}`}>
                <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full shadow transition-transform duration-300 ${activo ? 'translate-x-5 bg-black' : 'bg-[#A3A3A3]'}`} />
            </span>
        </button>
    );
}

const tarjeta = 'rounded-3xl border border-[#2a2a2a] bg-[#111]/80 backdrop-blur-sm';
const etiqueta = 'text-[11px] font-bold uppercase tracking-[0.16em] text-[#8a8a8a]';

export default function Diagnostico() {
    const [cliente, setCliente] = useState('');
    const [seleccionadas, setSeleccionadas] = useState([]);
    const [aplicarIrpf, setAplicarIrpf] = useState(true);
    const [incluirPrimerContacto, setIncluirPrimerContacto] = useState(true);
    const [extras, setExtras] = useState([]);
    const [servicioElegido, setServicioElegido] = useState('');
    const [generando, setGenerando] = useState(false);

    const areasElegidas = AREAS_DIAGNOSTICO.filter((a) => seleccionadas.includes(a.id));
    const esPack = areasElegidas.length === AREAS_DIAGNOSTICO.length;

    const sumaTodasAreas = AREAS_DIAGNOSTICO.reduce((acc, a) => acc + a.precioBase, 0);
    const ahorroPack = redondear(sumaTodasAreas - PACK_PRECIO_BASE);

    const sumaAreas = areasElegidas.reduce((acc, a) => acc + a.precioBase, 0);
    const descuentoPack = esPack ? ahorroPack : 0;
    const sumaExtras = extras.reduce((acc, e) => acc + e.precio * e.cantidad, 0);

    const baseImponible = redondear(sumaAreas + sumaExtras - descuentoPack);
    const cuotaIva = redondear(baseImponible * IVA);
    const retencionIrpf = aplicarIrpf ? redondear(baseImponible * IRPF) : 0;
    const totalConIva = redondear(baseImponible + cuotaIva);
    const totalAPagar = redondear(totalConIva - retencionIrpf);

    // Líneas que se muestran en pantalla y en el PDF
    const hayConceptos = areasElegidas.length > 0 || extras.length > 0;
    const lineas = [
        ...(incluirPrimerContacto && hayConceptos
            ? [{ id: 'primer-contacto', nombre: 'Primer contacto / reunión inicial', detalle: 'Cortesía', importe: 0 }]
            : []),
        ...areasElegidas.map((a) => ({ id: a.id, nombre: a.nombre, detalle: 'Diagnóstico empresarial', importe: a.precioBase })),
        ...(esPack
            ? [{ id: 'pack', nombre: 'Descuento pack diagnóstico completo', detalle: 'Las 4 áreas', importe: -descuentoPack }]
            : []),
        ...extras.map((e) => ({
            id: e.uid,
            nombre: e.nombre,
            detalle: e.periodo === 'mes'
                ? `${e.cantidad} ${e.cantidad === 1 ? 'mes' : 'meses'} × ${formatoEuro(e.precio)}`
                : e.cantidad > 1 ? `${e.cantidad} × ${formatoEuro(e.precio)}` : e.categoria,
            importe: redondear(e.precio * e.cantidad),
        })),
    ];

    const alternarArea = (id) => {
        setSeleccionadas((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
    };

    const alternarPack = () => {
        setSeleccionadas(esPack ? [] : AREAS_DIAGNOSTICO.map((a) => a.id));
    };

    const agregarServicio = () => {
        const servicio = SERVICIOS.find((s) => s.id === servicioElegido);
        if (!servicio) return;
        setExtras((prev) => [
            ...prev,
            {
                uid: `${servicio.id}-${Date.now()}`,
                nombre: servicio.nombre,
                categoria: servicio.categoria,
                min: servicio.min,
                max: servicio.max,
                periodo: servicio.periodo,
                precio: servicio.min,
                cantidad: 1,
            },
        ]);
        setServicioElegido('');
    };

    const modificarExtra = (uid, campo, valor) => {
        setExtras((prev) => prev.map((e) => (e.uid === uid ? { ...e, [campo]: Math.max(0, Number(valor) || 0) } : e)));
    };

    const eliminarExtra = (uid) => setExtras((prev) => prev.filter((e) => e.uid !== uid));

    const exportarPDF = async () => {
        setGenerando(true);
        try {
            const doc = new jsPDF();
            const ancho = doc.internal.pageSize.width;
            const alto = doc.internal.pageSize.height;
            const margen = 16;
            const derecha = ancho - margen;
            const ahora = new Date();
            const numero = `RD-${ahora.getFullYear()}${String(ahora.getMonth() + 1).padStart(2, '0')}${String(ahora.getDate()).padStart(2, '0')}-${String(ahora.getHours()).padStart(2, '0')}${String(ahora.getMinutes()).padStart(2, '0')}`;
            const titulo = extras.length > 0 ? 'Presupuesto de servicios' : 'Presupuesto de diagnóstico empresarial';

            let logo = null;
            try {
                logo = await logoComoPng(256);
            } catch (err) {
                console.warn('No se pudo rasterizar el logo de Rielden:', err);
            }

            // ── Cabecera negra con la marca
            doc.setFillColor(0, 0, 0);
            doc.rect(0, 0, ancho, 46, 'F');
            if (logo) doc.addImage(logo, 'PNG', margen, 11, 22, 22);
            doc.setTextColor(248, 248, 248);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(22);
            doc.text('RIELDEN', margen + 27, 24, { charSpace: 1.6 });
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(8.5);
            doc.setTextColor(163, 163, 163);
            doc.text('Consultoría · Inteligencia artificial · Automatización', margen + 27.5, 30.5);

            doc.setTextColor(250, 197, 26);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(11);
            doc.text('PRESUPUESTO', derecha, 20, { align: 'right', charSpace: 0.8 });
            doc.setTextColor(248, 248, 248);
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(9);
            doc.text(`Nº ${numero}`, derecha, 26.5, { align: 'right' });
            doc.text(ahora.toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' }), derecha, 31.5, { align: 'right' });

            // Franja dorada
            doc.setFillColor(250, 197, 26);
            doc.rect(0, 46, ancho, 1.6, 'F');

            // ── Cliente y título
            let y = 62;
            doc.setTextColor(138, 138, 138);
            doc.setFontSize(8);
            doc.setFont('helvetica', 'bold');
            doc.text('PREPARADO PARA', margen, y, { charSpace: 0.6 });
            doc.setTextColor(0, 0, 0);
            doc.setFontSize(15);
            doc.text(cliente.trim() || 'Cliente', margen, y + 7.5);

            doc.setFontSize(8);
            doc.setTextColor(138, 138, 138);
            doc.text('CONCEPTO', derecha, y, { align: 'right', charSpace: 0.6 });
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(10);
            doc.setTextColor(25, 25, 25);
            doc.text(titulo, derecha, y + 7.5, { align: 'right' });

            // ── Tabla
            y += 20;
            const cabeceraTabla = () => {
                doc.setFillColor(0, 0, 0);
                doc.roundedRect(margen, y, ancho - margen * 2, 9, 1.5, 1.5, 'F');
                doc.setTextColor(250, 197, 26);
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(8);
                doc.text('DESCRIPCIÓN', margen + 5, y + 6, { charSpace: 0.5 });
                doc.text('IMPORTE', derecha - 5, y + 6, { align: 'right', charSpace: 0.5 });
                y += 9;
            };
            cabeceraTabla();

            lineas.forEach((linea, i) => {
                const texto = doc.splitTextToSize(linea.nombre, 120);
                const altoFila = texto.length * 5 + 9;
                if (y + altoFila > alto - 30) {
                    doc.addPage();
                    y = 20;
                    cabeceraTabla();
                }
                if (i % 2 === 1) {
                    doc.setFillColor(247, 247, 247);
                    doc.rect(margen, y, ancho - margen * 2, altoFila, 'F');
                }
                const esDescuento = linea.importe < 0;
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(10);
                doc.setTextColor(0, 0, 0);
                doc.text(texto, margen + 5, y + 6);
                doc.setFont('helvetica', 'normal');
                doc.setFontSize(8);
                doc.setTextColor(138, 138, 138);
                doc.text(linea.detalle || '', margen + 5, y + 6 + texto.length * 5 - 0.5);

                doc.setFont('helvetica', 'bold');
                doc.setFontSize(10);
                if (esDescuento) doc.setTextColor(22, 163, 74);
                else if (linea.importe === 0) doc.setTextColor(180, 140, 10);
                else doc.setTextColor(0, 0, 0);
                doc.text(linea.importe === 0 ? 'Incluido' : formatoEuro(linea.importe), derecha - 5, y + 6, { align: 'right' });
                y += altoFila;
            });
            doc.setDrawColor(230, 230, 230);
            doc.line(margen, y, derecha, y);

            // ── Totales
            y += 10;
            if (y > alto - 70) { doc.addPage(); y = 24; }
            const xEtiqueta = ancho - margen - 78;
            const filaTotal = (texto, valor, color = [70, 70, 70]) => {
                doc.setFont('helvetica', 'normal');
                doc.setFontSize(9.5);
                doc.setTextColor(...color);
                doc.text(texto, xEtiqueta, y);
                doc.text(valor, derecha - 5, y, { align: 'right' });
                y += 6.5;
            };
            filaTotal('Base imponible', formatoEuro(baseImponible));
            filaTotal(`IVA (${IVA * 100}%)`, formatoEuro(cuotaIva));
            if (aplicarIrpf) filaTotal(`Retención IRPF (${IRPF * 100}%)`, `- ${formatoEuro(retencionIrpf)}`, [190, 120, 0]);

            doc.setFillColor(250, 197, 26);
            doc.roundedRect(xEtiqueta - 5, y - 2, derecha - xEtiqueta + 5, 14, 2, 2, 'F');
            doc.setTextColor(0, 0, 0);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(9);
            doc.text('TOTAL', xEtiqueta, y + 6.8, { charSpace: 0.8 });
            doc.setFontSize(14);
            doc.text(formatoEuro(totalAPagar), derecha - 5, y + 7.2, { align: 'right' });
            y += 24;

            // ── Notas
            const notas = [
                'Presupuesto válido durante 30 días desde la fecha de emisión.',
                ...(aplicarIrpf ? [`La retención de IRPF (${formatoEuro(retencionIrpf)}) la ingresa el cliente en Hacienda en nombre del profesional.`] : []),
                ...(esPack ? [`Precio de pack aplicado: ahorro de ${formatoEuro(ahorroPack)} + IVA respecto a contratar las áreas por separado.`] : []),
            ];
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(8);
            doc.setTextColor(138, 138, 138);
            doc.text('CONDICIONES', margen, y, { charSpace: 0.6 });
            y += 5;
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(90, 90, 90);
            notas.forEach((nota) => {
                const t = doc.splitTextToSize(`•  ${nota}`, ancho - margen * 2);
                doc.text(t, margen, y);
                y += t.length * 4.2 + 1;
            });

            // ── Pie en todas las páginas
            const contacto = ['Rielden', datosAutonomo.nombre, datosAutonomo.nif && `NIF ${datosAutonomo.nif}`, datosAutonomo.telefono, datosAutonomo.email]
                .filter(Boolean)
                .join('   ·   ');
            const paginas = doc.getNumberOfPages();
            for (let p = 1; p <= paginas; p++) {
                doc.setPage(p);
                doc.setFillColor(250, 197, 26);
                doc.rect(margen, alto - 16, 12, 0.8, 'F');
                doc.setFont('helvetica', 'normal');
                doc.setFontSize(7.5);
                doc.setTextColor(138, 138, 138);
                doc.text(contacto, margen, alto - 10);
                doc.text(`${p} / ${paginas}`, derecha, alto - 10, { align: 'right' });
            }

            doc.save(`Rielden_Presupuesto_${cliente.trim().replace(/\s+/g, '_') || numero}.pdf`);
        } finally {
            setGenerando(false);
        }
    };

    return (
        <div className="relative w-full min-h-screen bg-black text-[#F8F8F8] selection:bg-[#FAC51A] selection:text-black overflow-hidden">
            {/* Resplandor dorado de fondo */}
            <div aria-hidden="true" className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 w-[900px] h-[500px] rounded-full bg-[#FAC51A]/10 blur-[120px]" />
            <div aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-[0.04] [background-image:linear-gradient(#fff_1px,transparent_1px),linear-gradient(90deg,#fff_1px,transparent_1px)] [background-size:48px_48px]" />

            {/* CABECERA */}
            <header className="sticky top-0 z-30 border-b border-[#1f1f1f] bg-black/70 backdrop-blur-xl">
                <div className="max-w-7xl mx-auto px-5 sm:px-8 py-4 flex items-center justify-between">
                    <Wordmark height={30} />
                    <span className="hidden sm:inline-flex items-center gap-2 rounded-full border border-[#333] px-3 py-1 text-[11px] font-semibold text-[#A3A3A3]">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#FAC51A] animate-pulse" />
                        IVA {IVA * 100}% · IRPF {IRPF * 100}%
                    </span>
                </div>
            </header>

            <main className="relative max-w-7xl mx-auto px-5 sm:px-8 py-8 sm:py-12">
                {/* TÍTULO */}
                <div className="mb-10">
                    <span className="inline-flex items-center gap-2 rounded-full bg-[#FAC51A]/10 border border-[#FAC51A]/30 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-[#FAC51A]">
                        Presupuestador
                    </span>
                    <h1 className="mt-4 text-3xl sm:text-5xl font-black tracking-tight leading-[1.05]">
                        Diagnóstico <span className="text-[#FAC51A]">empresarial</span>
                    </h1>
                    <p className="mt-3 max-w-xl text-sm sm:text-base text-[#A3A3A3]">
                        Elige las áreas a analizar, añade los servicios que necesite el cliente y descarga un presupuesto con la marca Rielden.
                    </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
                    {/* ─── IZQUIERDA ─── */}
                    <section className="lg:col-span-7 space-y-6">
                        {/* Cliente */}
                        <div className={`${tarjeta} p-6`}>
                            <label htmlFor="cliente-diagnostico" className={etiqueta}>Cliente / Empresa</label>
                            <input
                                id="cliente-diagnostico"
                                type="text"
                                placeholder="Ej. Panadería López S.L."
                                value={cliente}
                                onChange={(e) => setCliente(e.target.value)}
                                className="mt-3 w-full rounded-2xl border border-[#2a2a2a] bg-black px-4 py-3.5 text-base font-semibold text-[#F8F8F8] placeholder:text-[#555] outline-none transition focus:border-[#FAC51A] focus:ring-4 focus:ring-[#FAC51A]/15"
                            />
                        </div>

                        {/* Áreas */}
                        <div className={`${tarjeta} p-6`}>
                            <div className="flex items-center justify-between mb-4">
                                <span className={etiqueta}>Áreas a diagnosticar</span>
                                <span className="text-xs font-semibold text-[#A3A3A3]">{areasElegidas.length}/{AREAS_DIAGNOSTICO.length}</span>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {AREAS_DIAGNOSTICO.map((area) => {
                                    const activa = seleccionadas.includes(area.id);
                                    return (
                                        <button
                                            key={area.id}
                                            type="button"
                                            aria-pressed={activa}
                                            onClick={() => alternarArea(area.id)}
                                            className={`group relative text-left rounded-2xl border p-5 transition-all duration-300 hover:-translate-y-0.5 ${
                                                activa
                                                    ? 'border-[#FAC51A] bg-gradient-to-br from-[#FAC51A]/15 to-transparent shadow-[0_0_0_4px_rgba(250,197,26,0.08),0_20px_40px_-20px_rgba(250,197,26,0.45)]'
                                                    : 'border-[#2a2a2a] bg-black hover:border-[#444]'
                                            }`}
                                        >
                                            <span className={`absolute top-4 right-4 w-6 h-6 rounded-full grid place-items-center text-xs font-black transition-all duration-300 ${
                                                activa ? 'bg-[#FAC51A] text-black scale-100' : 'border border-[#444] text-transparent scale-90'
                                            }`}>
                                                ✓
                                            </span>
                                            <span className={`w-11 h-11 rounded-xl grid place-items-center transition-colors ${
                                                activa ? 'bg-[#FAC51A] text-black' : 'bg-[#1c1c1c] text-[#FAC51A]'
                                            }`}>
                                                <Icono>{ICONOS_AREA[area.id]}</Icono>
                                            </span>
                                            <span className="block mt-4 text-base font-bold">{area.nombre.replace('Diagnóstico de ', '')}</span>
                                            <span className="mt-1 flex items-baseline gap-1.5">
                                                <span className="text-2xl font-black tracking-tight">{formatoEuro(area.precioBase)}</span>
                                                <span className="text-xs text-[#8a8a8a]">+ IVA</span>
                                            </span>
                                            <span className="block text-[11px] text-[#8a8a8a]">{formatoEuro(area.precioBase * (1 + IVA))} con IVA</span>
                                        </button>
                                    );
                                })}
                            </div>

                            {/* Banner pack */}
                            <div className={`mt-4 relative overflow-hidden rounded-2xl border p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all duration-300 ${
                                esPack ? 'border-[#FAC51A] bg-[#FAC51A] text-black' : 'border-[#FAC51A]/30 bg-gradient-to-r from-[#FAC51A]/15 via-[#FAC51A]/5 to-transparent'
                            }`}>
                                <div>
                                    <span className={`text-[11px] font-black uppercase tracking-[0.16em] ${esPack ? 'text-black/70' : 'text-[#FAC51A]'}`}>
                                        Pack completo · 4 áreas
                                    </span>
                                    <p className="mt-1 text-xl font-black">
                                        {formatoEuro(PACK_PRECIO_BASE * (1 + IVA))} <span className={`text-xs font-semibold ${esPack ? 'text-black/70' : 'text-[#A3A3A3]'}`}>IVA incluido</span>
                                    </p>
                                    <p className={`text-xs font-semibold ${esPack ? 'text-black/80' : 'text-[#A3A3A3]'}`}>
                                        Ahorra {formatoEuro(ahorroPack * (1 + IVA))} frente a contratarlas por separado
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={alternarPack}
                                    className={`flex-none rounded-xl px-5 py-3 text-sm font-black transition active:scale-95 ${
                                        esPack ? 'bg-black text-[#FAC51A] hover:bg-[#191919]' : 'bg-[#FAC51A] text-black hover:bg-[#FFD24A]'
                                    }`}
                                >
                                    {esPack ? '✓ Pack activo' : 'Activar pack'}
                                </button>
                            </div>
                        </div>

                        {/* Otros servicios */}
                        <div className={`${tarjeta} p-6`}>
                            <span className={etiqueta}>Otros servicios</span>
                            <p className="mt-1 text-xs text-[#8a8a8a]">IA, marketing digital y automatización de procesos. El precio arranca en el mínimo de la tarifa.</p>
                            <div className="mt-4 flex gap-2">
                                <select
                                    value={servicioElegido}
                                    onChange={(e) => setServicioElegido(e.target.value)}
                                    className="flex-1 min-w-0 rounded-2xl border border-[#2a2a2a] bg-black px-4 py-3 text-sm text-[#F8F8F8] outline-none transition focus:border-[#FAC51A] focus:ring-4 focus:ring-[#FAC51A]/15"
                                >
                                    <option value="">Elige un servicio…</option>
                                    {CATEGORIAS_SERVICIOS.map((c) => (
                                        <optgroup key={c.categoria} label={c.categoria}>
                                            {c.servicios.map((s) => (
                                                <option key={s.id} value={s.id}>
                                                    {s.nombre} ({rangoTexto(s)})
                                                </option>
                                            ))}
                                        </optgroup>
                                    ))}
                                </select>
                                <button
                                    type="button"
                                    onClick={agregarServicio}
                                    disabled={!servicioElegido}
                                    className="flex-none rounded-2xl bg-[#FAC51A] px-5 text-sm font-black text-black transition hover:bg-[#FFD24A] active:scale-95 disabled:bg-[#1c1c1c] disabled:text-[#555]"
                                >
                                    Añadir
                                </button>
                            </div>

                            {extras.length > 0 && (
                                <div className="mt-4 space-y-2.5">
                                    {extras.map((e) => {
                                        const fueraDeRango = e.precio < e.min || e.precio > e.max;
                                        return (
                                            <div key={e.uid} className="rounded-2xl border border-[#2a2a2a] bg-black p-4">
                                                <div className="flex items-start justify-between gap-3">
                                                    <div>
                                                        <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#FAC51A]">{e.categoria}</span>
                                                        <p className="text-sm font-bold">{e.nombre}</p>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => eliminarExtra(e.uid)}
                                                        aria-label={`Quitar ${e.nombre}`}
                                                        className="w-7 h-7 grid place-items-center rounded-lg text-xs text-[#666] transition hover:bg-[#1c1c1c] hover:text-[#ff7b72]"
                                                    >
                                                        ✕
                                                    </button>
                                                </div>
                                                <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-[#A3A3A3]">
                                                    <label className="flex items-center gap-2">
                                                        Precio
                                                        <span className="flex items-center rounded-xl border border-[#2a2a2a] bg-[#111] pr-2.5 focus-within:border-[#FAC51A]">
                                                            <input
                                                                type="number"
                                                                min="0"
                                                                value={e.precio}
                                                                onChange={(ev) => modificarExtra(e.uid, 'precio', ev.target.value)}
                                                                className="w-20 bg-transparent px-2.5 py-1.5 text-right font-bold text-[#F8F8F8] outline-none"
                                                            />
                                                            €{e.periodo === 'mes' ? '/mes' : ''}
                                                        </span>
                                                    </label>
                                                    <label className="flex items-center gap-2">
                                                        {e.periodo === 'mes' ? 'Meses' : 'Cantidad'}
                                                        <input
                                                            type="number"
                                                            min="1"
                                                            value={e.cantidad}
                                                            onChange={(ev) => modificarExtra(e.uid, 'cantidad', ev.target.value)}
                                                            className="w-16 rounded-xl border border-[#2a2a2a] bg-[#111] px-2.5 py-1.5 text-center font-bold text-[#F8F8F8] outline-none focus:border-[#FAC51A]"
                                                        />
                                                    </label>
                                                    <span className="ml-auto text-sm font-black text-[#F8F8F8]">{formatoEuro(e.precio * e.cantidad)}</span>
                                                </div>
                                                <p className={`mt-2 text-[11px] ${fueraDeRango ? 'text-[#f59e0b]' : 'text-[#666]'}`}>
                                                    {fueraDeRango ? '⚠ Fuera de tarifa · ' : ''}Tarifa {rangoTexto(e)} + IVA
                                                </p>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {/* Opciones */}
                        <div className={`${tarjeta} px-6 py-4 divide-y divide-[#222]`}>
                            <Interruptor
                                activo={aplicarIrpf}
                                onChange={setAplicarIrpf}
                                titulo={`Retención IRPF ${IRPF * 100}%`}
                                descripcion="Joven autónomo C.V. · la ingresa el cliente en tu nombre"
                            />
                            <Interruptor
                                activo={incluirPrimerContacto}
                                onChange={setIncluirPrimerContacto}
                                titulo="Primer contacto gratuito"
                                descripcion="Añade la reunión inicial (rompehielos) como cortesía"
                            />
                        </div>
                    </section>

                    {/* ─── DERECHA: RESUMEN ─── */}
                    <aside className="lg:col-span-5">
                        <div className="lg:sticky lg:top-24 rounded-3xl border border-[#2a2a2a] bg-gradient-to-b from-[#161616] to-[#0b0b0b] shadow-[0_40px_80px_-30px_rgba(0,0,0,0.9)] overflow-hidden">
                            <div className="flex items-center justify-between px-6 pt-6 pb-5 border-b border-dashed border-[#2a2a2a]">
                                <div className="flex items-center gap-3">
                                    <LogoMark size={28} />
                                    <div>
                                        <p className="text-sm font-black">Resumen</p>
                                        <p className="text-[11px] text-[#8a8a8a] truncate max-w-[180px]">{cliente.trim() || 'Sin cliente'}</p>
                                    </div>
                                </div>
                                {esPack && (
                                    <span className="rounded-full bg-[#FAC51A] px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-black">Pack</span>
                                )}
                            </div>

                            {!hayConceptos ? (
                                <div className="px-6 py-16 text-center">
                                    <div className="mx-auto w-16 h-16 rounded-2xl bg-[#1c1c1c] grid place-items-center opacity-60">
                                        <LogoMark size={34} />
                                    </div>
                                    <p className="mt-4 font-bold">Aún no hay conceptos</p>
                                    <p className="mt-1 text-sm text-[#8a8a8a] max-w-[260px] mx-auto">
                                        Marca un área o añade un servicio para ver el presupuesto.
                                    </p>
                                </div>
                            ) : (
                                <>
                                    <ul className="px-6 py-3">
                                        {lineas.map((linea) => (
                                            <li key={linea.id} className="flex items-start justify-between gap-4 py-2.5">
                                                <div className="min-w-0">
                                                    <p className="text-sm font-semibold leading-snug">{linea.nombre}</p>
                                                    {linea.detalle && <p className="text-[11px] text-[#8a8a8a]">{linea.detalle}</p>}
                                                </div>
                                                <span className={`flex-none text-sm font-bold tabular-nums ${
                                                    linea.importe < 0 ? 'text-[#5fd38d]' : linea.importe === 0 ? 'text-[#FAC51A]' : ''
                                                }`}>
                                                    {linea.importe === 0 ? 'Gratis' : formatoEuro(linea.importe)}
                                                </span>
                                            </li>
                                        ))}
                                    </ul>

                                    <div className="mx-6 border-t border-dashed border-[#2a2a2a]" />

                                    <dl className="px-6 py-4 space-y-2 text-sm">
                                        <div className="flex justify-between text-[#A3A3A3]">
                                            <dt>Base imponible</dt>
                                            <dd className="font-semibold tabular-nums text-[#F8F8F8]">{formatoEuro(baseImponible)}</dd>
                                        </div>
                                        <div className="flex justify-between text-[#A3A3A3]">
                                            <dt>IVA ({IVA * 100}%)</dt>
                                            <dd className="font-semibold tabular-nums text-[#F8F8F8]">{formatoEuro(cuotaIva)}</dd>
                                        </div>
                                        <div className="flex justify-between text-[#A3A3A3]">
                                            <dt>Total con IVA</dt>
                                            <dd className="font-semibold tabular-nums text-[#F8F8F8]">{formatoEuro(totalConIva)}</dd>
                                        </div>
                                        {aplicarIrpf && (
                                            <div className="flex justify-between text-[#f59e0b]">
                                                <dt>Retención IRPF ({IRPF * 100}%)</dt>
                                                <dd className="font-semibold tabular-nums">− {formatoEuro(retencionIrpf)}</dd>
                                            </div>
                                        )}
                                    </dl>

                                    <div className="px-6 pb-6">
                                        <div className="rounded-2xl bg-[#FAC51A] px-5 py-4 text-black flex items-end justify-between shadow-[0_20px_40px_-20px_rgba(250,197,26,0.6)]">
                                            <span className="text-[11px] font-black uppercase tracking-[0.16em]">Total a pagar</span>
                                            <span className="text-3xl font-black tracking-tight tabular-nums">{formatoEuro(totalAPagar)}</span>
                                        </div>

                                        <p className="mt-3 flex items-center gap-2 rounded-xl bg-[#1a1a1a] px-3 py-2 text-[11px] text-[#A3A3A3]">
                                            <span className="text-[#FAC51A]">●</span>
                                            Aparta {formatoEuro(cuotaIva)} de IVA en otra cuenta para Hacienda.
                                        </p>

                                        <button
                                            type="button"
                                            onClick={exportarPDF}
                                            disabled={generando}
                                            className="mt-4 w-full flex items-center justify-center gap-2 rounded-2xl border border-[#FAC51A] bg-black px-6 py-4 text-sm font-black uppercase tracking-[0.14em] text-[#FAC51A] transition hover:bg-[#FAC51A] hover:text-black active:scale-[0.98] disabled:opacity-60"
                                        >
                                            {generando ? (
                                                <span className="w-4 h-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
                                            ) : (
                                                <Icono className="w-4 h-4">
                                                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                                    <polyline points="7 10 12 15 17 10" />
                                                    <line x1="12" y1="15" x2="12" y2="3" />
                                                </Icono>
                                            )}
                                            Descargar PDF
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    </aside>
                </div>
            </main>
        </div>
    );
}
