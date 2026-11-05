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

const formatoEuro = (valor) =>
    `${valor.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;

const redondear = (valor) => Math.round(valor * 100) / 100;

export default function Diagnostico() {
    const [cliente, setCliente] = useState('');
    const [seleccionadas, setSeleccionadas] = useState([]);
    const [aplicarIrpf, setAplicarIrpf] = useState(true);
    const [incluirPrimerContacto, setIncluirPrimerContacto] = useState(true);
    const [extras, setExtras] = useState([]);
    const [servicioElegido, setServicioElegido] = useState('');

    const areasElegidas = AREAS_DIAGNOSTICO.filter((a) => seleccionadas.includes(a.id));
    const esPack = areasElegidas.length === AREAS_DIAGNOSTICO.length;

    const sumaAreas = areasElegidas.reduce((acc, a) => acc + a.precioBase, 0);
    const descuentoPack = esPack ? redondear(sumaAreas - PACK_PRECIO_BASE) : 0;

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
            ? [{ id: 'primer-contacto', nombre: 'Primer contacto / reunión inicial (cortesía)', importe: 0 }]
            : []),
        ...areasElegidas.map((a) => ({ id: a.id, nombre: a.nombre, importe: a.precioBase })),
        ...(esPack
            ? [{ id: 'pack', nombre: 'Descuento Pack Diagnóstico Empresarial completo', importe: -descuentoPack }]
            : []),
        ...extras.map((e) => ({
            id: e.uid,
            nombre: e.periodo === 'mes'
                ? `${e.nombre} (${e.cantidad} ${e.cantidad === 1 ? 'mes' : 'meses'} x ${formatoEuro(e.precio)})`
                : e.cantidad > 1 ? `${e.nombre} (x${e.cantidad})` : e.nombre,
            importe: redondear(e.precio * e.cantidad),
        })),
    ];

    const agregarServicio = () => {
        const servicio = SERVICIOS.find((s) => s.id === servicioElegido);
        if (!servicio) return;
        setExtras((prev) => [
            ...prev,
            {
                uid: `${servicio.id}-${Date.now()}`,
                nombre: servicio.nombre,
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

    const alternarArea = (id) => {
        setSeleccionadas((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
    };

    const alternarPack = () => {
        setSeleccionadas(esPack ? [] : AREAS_DIAGNOSTICO.map((a) => a.id));
    };

    const exportarPDF = () => {
        const doc = new jsPDF();
        const anchoPagina = doc.internal.pageSize.width;
        const colImporte = anchoPagina - 18;

        // Cabecera
        doc.setFillColor(30, 41, 59);
        doc.rect(0, 0, anchoPagina, 40, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(20);
        doc.text(datosAutonomo.nombre.toUpperCase(), 15, 18);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.text(`NIF: ${datosAutonomo.nif} | Tlf: ${datosAutonomo.telefono} | Email: ${datosAutonomo.email}`, 15, 28);

        // Título
        doc.setTextColor(30, 41, 59);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(16);
        doc.text(extras.length > 0 ? 'PRESUPUESTO DE SERVICIOS' : 'PRESUPUESTO DE DIAGNÓSTICO EMPRESARIAL', 15, 55);

        doc.setFontSize(10);
        doc.text('CLIENTE:', 15, 68);
        doc.setFont('helvetica', 'normal');
        doc.text(cliente || 'Cliente General', 50, 68);
        doc.setFont('helvetica', 'bold');
        doc.text('FECHA:', 15, 75);
        doc.setFont('helvetica', 'normal');
        doc.text(new Date().toLocaleDateString('es-ES'), 50, 75);

        // Tabla
        let y = 90;
        doc.setFillColor(241, 245, 249);
        doc.rect(15, y, anchoPagina - 30, 8, 'F');
        doc.setDrawColor(203, 213, 225);
        doc.line(15, y, anchoPagina - 15, y);
        doc.line(15, y + 8, anchoPagina - 15, y + 8);
        doc.setTextColor(51, 65, 85);
        doc.setFont('helvetica', 'bold');
        doc.text('CONCEPTO', 18, y + 5.5);
        doc.text('IMPORTE', colImporte, y + 5.5, { align: 'right' });

        y += 8;
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(15, 23, 42);
        lineas.forEach((linea) => {
            const texto = doc.splitTextToSize(linea.nombre, 130);
            const alto = Math.max(texto.length * 5 + 4, 10);
            if (y + alto > 270) {
                doc.addPage();
                y = 20;
                doc.setDrawColor(203, 213, 225);
                doc.line(15, y, anchoPagina - 15, y);
            }
            doc.text(texto, 18, y + 6);
            doc.text(linea.importe === 0 ? 'Gratuito' : formatoEuro(linea.importe), colImporte, y + 6, { align: 'right' });
            y += alto;
            doc.setDrawColor(226, 232, 240);
            doc.line(15, y, anchoPagina - 15, y);
        });

        // Totales
        y += 10;
        if (y > 230) { doc.addPage(); y = 20; }
        const filaTotal = (etiqueta, valor) => {
            doc.text(etiqueta, 112, y);
            doc.text(valor, colImporte, y, { align: 'right' });
            y += 6;
        };
        doc.setDrawColor(30, 41, 59);
        doc.line(110, y - 4, anchoPagina - 15, y - 4);
        y += 2;
        filaTotal('Base imponible:', formatoEuro(baseImponible));
        filaTotal(`I.V.A. (${IVA * 100}%):`, formatoEuro(cuotaIva));
        if (aplicarIrpf) {
            filaTotal(`Retención I.R.P.F. (${IRPF * 100}%):`, `- ${formatoEuro(retencionIrpf)}`);
        }

        doc.setFillColor(30, 41, 59);
        doc.rect(110, y - 2, anchoPagina - 125, 10, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.text('TOTAL:', 114, y + 4.5);
        doc.text(formatoEuro(totalAPagar), colImporte, y + 4.5, { align: 'right' });

        if (aplicarIrpf) {
            y += 18;
            doc.setTextColor(100, 116, 139);
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(8);
            doc.text(
                doc.splitTextToSize(
                    `La retención de I.R.P.F. (${formatoEuro(retencionIrpf)}) la ingresa el cliente en Hacienda en nombre del profesional.`,
                    anchoPagina - 30
                ),
                15,
                y
            );
        }

        doc.save(`Presupuesto_${cliente.trim().replace(/\s+/g, '_') || 'Empresarial'}.pdf`);
    };

    return (
        <div className="w-full bg-slate-950 text-white min-h-screen selection:bg-blue-600/30">
            {/* BARRA SUPERIOR */}
            <nav className="w-full sticky top-0 z-30 px-6 py-4 border-b bg-slate-900/80 border-slate-800 backdrop-blur-md">
                <div className="flex items-center gap-3">
                    <div className="bg-violet-600 text-white p-2 rounded-xl shadow-md shadow-violet-500/20">
                        <span className="text-xl font-black">D</span>
                    </div>
                    <div>
                        <h1 className="text-base font-black tracking-tight text-white">Diagnóstico Empresarial</h1>
                        <span className="text-xs font-semibold text-violet-400 uppercase tracking-wider block">Presupuesto por áreas</span>
                    </div>
                </div>
            </nav>

            <main className="w-full px-6 py-6 grid grid-cols-1 xl:grid-cols-12 gap-6">
                {/* IZQUIERDA: CONFIGURACIÓN */}
                <section className="xl:col-span-5 space-y-6">
                    <div className="border rounded-2xl p-6 shadow-xl bg-slate-900 border-slate-800 space-y-5">
                        <div>
                            <label className="block text-xs font-bold mb-1.5 text-slate-400">Cliente / Empresa</label>
                            <input
                                type="text"
                                placeholder="Ej. Panadería López S.L."
                                value={cliente}
                                onChange={(e) => setCliente(e.target.value)}
                                className="w-full border rounded-xl px-4 py-3 text-sm outline-none transition-all bg-slate-950 border-slate-800 text-white placeholder:text-slate-600 focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
                            />
                        </div>

                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-bold text-slate-400">Áreas a diagnosticar</span>
                                <button
                                    type="button"
                                    onClick={alternarPack}
                                    className={`text-[11px] font-bold px-3 py-1 rounded-xl border transition ${
                                        esPack
                                            ? 'bg-violet-600 border-violet-600 text-white'
                                            : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                                    }`}
                                >
                                    {esPack ? '✓ Pack completo' : '📦 Seleccionar pack'}
                                </button>
                            </div>

                            <div className="space-y-2">
                                {AREAS_DIAGNOSTICO.map((area) => {
                                    const activa = seleccionadas.includes(area.id);
                                    return (
                                        <button
                                            key={area.id}
                                            type="button"
                                            onClick={() => alternarArea(area.id)}
                                            className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border text-left transition ${
                                                activa
                                                    ? 'bg-violet-600/15 border-violet-500 text-white'
                                                    : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                                            }`}
                                        >
                                            <span className="flex items-center gap-3 text-sm font-bold">
                                                <span className={`w-5 h-5 rounded-md border flex items-center justify-center text-xs ${
                                                    activa ? 'bg-violet-600 border-violet-600' : 'border-slate-600'
                                                }`}>
                                                    {activa ? '✓' : ''}
                                                </span>
                                                {area.nombre.replace('Diagnóstico de ', '')}
                                            </span>
                                            <span className="text-xs text-slate-400 text-right">
                                                <span className="font-extrabold text-white">{formatoEuro(area.precioBase)}</span> + IVA
                                                <span className="block text-[10px]">{formatoEuro(area.precioBase * (1 + IVA))} con IVA</span>
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                            <p className="text-[11px] text-slate-500 mt-2">
                                Pack de las 4 áreas: {formatoEuro(PACK_PRECIO_BASE * (1 + IVA))} con IVA incluido.
                            </p>
                        </div>

                        <div className="border-t border-slate-800 pt-4">
                            <span className="block text-xs font-bold mb-2 text-slate-400">Otros servicios (IA, marketing, automatización)</span>
                            <div className="flex gap-2">
                                <select
                                    value={servicioElegido}
                                    onChange={(e) => setServicioElegido(e.target.value)}
                                    className="flex-1 min-w-0 border rounded-xl px-3 py-2.5 text-sm outline-none bg-slate-950 border-slate-800 text-white focus:border-violet-500"
                                >
                                    <option value="">Elige un servicio…</option>
                                    {CATEGORIAS_SERVICIOS.map((c) => (
                                        <optgroup key={c.categoria} label={c.categoria}>
                                            {c.servicios.map((s) => (
                                                <option key={s.id} value={s.id}>
                                                    {s.nombre} ({s.min === s.max ? formatoEuro(s.min) : `${formatoEuro(s.min)} - ${formatoEuro(s.max)}`}{s.periodo === 'mes' ? '/mes' : ''})
                                                </option>
                                            ))}
                                        </optgroup>
                                    ))}
                                </select>
                                <button
                                    type="button"
                                    onClick={agregarServicio}
                                    disabled={!servicioElegido}
                                    className="px-4 rounded-xl text-xs font-bold bg-violet-600 hover:bg-violet-700 disabled:bg-slate-800 disabled:text-slate-500 text-white transition"
                                >
                                    ➕ Añadir
                                </button>
                            </div>

                            {extras.length > 0 && (
                                <div className="space-y-2 mt-3">
                                    {extras.map((e) => {
                                        const fueraDeRango = e.precio < e.min || e.precio > e.max;
                                        return (
                                            <div key={e.uid} className="px-4 py-3 rounded-xl border bg-slate-950 border-slate-800">
                                                <div className="flex items-start justify-between gap-2">
                                                    <span className="text-sm font-bold text-white">{e.nombre}</span>
                                                    <button
                                                        type="button"
                                                        onClick={() => eliminarExtra(e.uid)}
                                                        className="text-xs font-black text-slate-600 hover:text-red-400"
                                                    >
                                                        ✕
                                                    </button>
                                                </div>
                                                <div className="flex flex-wrap items-center gap-3 mt-2 text-xs">
                                                    <label className="flex items-center gap-1.5 text-slate-400">
                                                        Precio
                                                        <input
                                                            type="number"
                                                            min="0"
                                                            value={e.precio}
                                                            onChange={(ev) => modificarExtra(e.uid, 'precio', ev.target.value)}
                                                            className="w-20 border rounded-lg px-2 py-1 text-right font-bold bg-slate-900 border-slate-700 text-white outline-none focus:border-violet-500"
                                                        />
                                                        € {e.periodo === 'mes' ? '/mes' : ''}
                                                    </label>
                                                    <label className="flex items-center gap-1.5 text-slate-400">
                                                        {e.periodo === 'mes' ? 'Meses' : 'Cant.'}
                                                        <input
                                                            type="number"
                                                            min="1"
                                                            value={e.cantidad}
                                                            onChange={(ev) => modificarExtra(e.uid, 'cantidad', ev.target.value)}
                                                            className="w-14 border rounded-lg px-2 py-1 text-center font-bold bg-slate-900 border-slate-700 text-white outline-none focus:border-violet-500"
                                                        />
                                                    </label>
                                                </div>
                                                <p className={`text-[10px] mt-1.5 ${fueraDeRango ? 'text-amber-400' : 'text-slate-500'}`}>
                                                    {fueraDeRango ? '⚠ Fuera de tarifa · ' : ''}
                                                    Tarifa: {e.min === e.max ? formatoEuro(e.min) : `${formatoEuro(e.min)} - ${formatoEuro(e.max)}`}
                                                    {e.periodo === 'mes' ? ' /mes' : ''} + IVA
                                                </p>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        <div className="space-y-2 border-t border-slate-800 pt-4">
                            <label className="flex items-center gap-3 text-sm text-slate-300 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={aplicarIrpf}
                                    onChange={(e) => setAplicarIrpf(e.target.checked)}
                                    className="w-4 h-4 accent-violet-600"
                                />
                                Aplicar retención IRPF {IRPF * 100}% (cliente empresa/autónomo)
                            </label>
                            <label className="flex items-center gap-3 text-sm text-slate-300 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={incluirPrimerContacto}
                                    onChange={(e) => setIncluirPrimerContacto(e.target.checked)}
                                    className="w-4 h-4 accent-violet-600"
                                />
                                Incluir primer contacto gratuito en el presupuesto
                            </label>
                        </div>
                    </div>
                </section>

                {/* DERECHA: RESUMEN */}
                <section className="xl:col-span-7 space-y-6">
                    {!hayConceptos ? (
                        <div className="border rounded-2xl p-16 text-center bg-slate-900/50 border-slate-800">
                            <span className="text-4xl block mb-3">🩺</span>
                            <p className="text-base font-bold text-white">Selecciona un área o un servicio</p>
                            <p className="text-sm text-slate-500 max-w-sm mx-auto mt-1">
                                Marca las áreas del negocio que quieres diagnosticar. Si eliges las cuatro se aplica el precio de pack.
                            </p>
                        </div>
                    ) : (
                        <>
                            <div className="border rounded-2xl shadow-xl overflow-hidden divide-y bg-slate-900 border-slate-800 divide-slate-800">
                                {lineas.map((linea) => (
                                    <div key={linea.id} className="px-5 py-4 flex items-center justify-between gap-4">
                                        <span className={`text-sm font-bold ${linea.importe < 0 ? 'text-emerald-400' : 'text-white'}`}>
                                            {linea.nombre}
                                        </span>
                                        <span className={`text-sm font-black ${linea.importe < 0 ? 'text-emerald-400' : 'text-white'}`}>
                                            {linea.importe === 0 ? 'Gratuito' : formatoEuro(linea.importe)}
                                        </span>
                                    </div>
                                ))}
                            </div>

                            <div className="border rounded-2xl p-5 bg-slate-900 border-slate-800 space-y-2 text-sm">
                                <div className="flex justify-between text-slate-300">
                                    <span>Base imponible</span>
                                    <span className="font-bold">{formatoEuro(baseImponible)}</span>
                                </div>
                                <div className="flex justify-between text-slate-300">
                                    <span>I.V.A. ({IVA * 100}%)</span>
                                    <span className="font-bold">{formatoEuro(cuotaIva)}</span>
                                </div>
                                <div className="flex justify-between text-slate-300">
                                    <span>Total con IVA</span>
                                    <span className="font-bold">{formatoEuro(totalConIva)}</span>
                                </div>
                                {aplicarIrpf && (
                                    <div className="flex justify-between text-amber-400">
                                        <span>Retención I.R.P.F. ({IRPF * 100}%)</span>
                                        <span className="font-bold">- {formatoEuro(retencionIrpf)}</span>
                                    </div>
                                )}
                                <div className="flex justify-between items-center mt-3 p-4 rounded-xl bg-violet-600 text-white">
                                    <span className="font-bold uppercase text-xs tracking-wider">Total a pagar</span>
                                    <span className="text-xl font-black">{formatoEuro(totalAPagar)}</span>
                                </div>
                                <p className="text-[11px] text-slate-500 pt-1">
                                    Reserva {formatoEuro(cuotaIva)} de IVA en otra cuenta para declararlo a Hacienda.
                                </p>
                            </div>

                            <button
                                onClick={exportarPDF}
                                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black px-8 py-3.5 rounded-xl shadow-lg shadow-emerald-600/20 text-xs uppercase tracking-widest transition transform active:scale-95"
                            >
                                📄 Guardar presupuesto PDF
                            </button>
                        </>
                    )}
                </section>
            </main>
        </div>
    );
}
