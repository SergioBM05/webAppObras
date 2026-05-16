import { useState, useEffect, useRef } from 'react';
import { jsPDF } from 'jspdf';

export default function Presupuestos({
    conceptos = [],
    setConceptos,
    cliente,
    setCliente,
    subtotal,
    totalConIva
}) {
    const [descripcion, setDescripcion] = useState('');
    const [cargando, setCargando] = useState(false);
    const [escuchando, setEscuchando] = useState(false);

    const reconocimientoRef = useRef(null);

    const datosAutonomo = {
        nombre: "Construcciones y Reformas Manuel",
        nif: "12345678-X",
        telefono: "600 000 000",
        email: "manuel.obras@email.com"
    };

    // Inicialización del dictado por voz
    useEffect(() => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (SpeechRecognition) {
            const recognition = new SpeechRecognition();
            recognition.continuous = false;
            recognition.lang = 'es-ES';
            recognition.interimResults = false;

            recognition.onstart = () => setEscuchando(true);
            recognition.onend = () => setEscuchando(false);

            recognition.onresult = (event) => {
                const textoDictado = event.results[0][0].transcript;
                setDescripcion((prev) => prev ? `${prev} ${textoDictado}` : textoDictado);
            };

            reconocimientoRef.current = recognition;

            return () => {
                recognition.onstart = null;
                recognition.onend = null;
                recognition.onresult = null;
                recognition.abort();
                reconocimientoRef.current = null;
            };
        }
    }, []);

    const alternarMicrofono = () => {
        const reconocimiento = reconocimientoRef.current;
        if (!reconocimiento) {
            alert("El dictado por voz no es compatible con este navegador. ¡Prueba desde Chrome en el móvil!");
            return;
        }
        if (escuchando) {
            reconocimiento.stop();
        } else {
            reconocimiento.start();
        }
    };

    // Conexión con tu API de Backend
    const consultarIA = async () => {
        if (!descripcion.trim()) return;
        setCargando(true);

        try {
            const respuesta = await fetch('/api/openai', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ descripcion: descripcion })
            });

            if (!respuesta.ok) {
                const errorData = await respuesta.json().catch(() => ({}));
                throw new Error(errorData.error || 'Error en la respuesta del servidor de IA');
            }

            const datos = await respuesta.json();

            if (datos && datos.partidas) {
                setConceptos(datos.partidas);
            } else {
                alert("La IA no pudo estructurar los datos correctamente. Inténtalo de nuevo.");
            }

        } catch (error) {
            console.error("Error al procesar con IA real:", error);
            alert("Hubo un problema al conectar con el motor de IA.");
        } finally {
            setCargando(false);
        }
    };

    const modificarCampo = (id, campo, valor) => {
        setConceptos(conceptos.map(item =>
            item.id === id ? { ...item, [campo]: campo === 'nombre' || campo === 'unidad' ? valor : Number(valor) } : item
        ));
    };

    const agregarConceptoManual = () => {
        setConceptos([...conceptos, { id: Date.now(), nombre: 'Nuevo concepto / material', cantidad: 1, precioBase: 0, unidad: 'uds' }]);
    };

    const eliminarConcepto = (id) => {
        setConceptos(conceptos.filter(item => item.id !== id));
    };

    const obtenerTotalNeto = () => {
        return conceptos.reduce((acc, item) => acc + (item.precioBase * item.cantidad), 0);
    };

    // Arreglo del PDF Maquetado sin solapamientos
    const exportarPDF = () => {
        const doc = new jsPDF();
        const anchoPagina = doc.internal.pageSize.width;

        // Cabecera Comercial
        doc.setFillColor(30, 41, 59);
        doc.rect(0, 0, anchoPagina, 40, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(20);
        doc.text(datosAutonomo.nombre.toUpperCase(), 15, 18);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.text(`NIF: ${datosAutonomo.nif} | Tlf: ${datosAutonomo.telefono} | Email: ${datosAutonomo.email}`, 15, 28);

        // Título del documento
        doc.setTextColor(30, 41, 59);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(16);
        doc.text("PRESUPUESTO DE OBRA", 15, 55);

        // Bloque de Información
        doc.setFontSize(10);
        doc.text("CLIENTE / OBRA:", 15, 68);
        doc.setFont("helvetica", "normal");
        doc.text(cliente || 'Cliente General', 50, 68);

        doc.setFont("helvetica", "bold");
        doc.text("FECHA:", 15, 75);
        doc.setFont("helvetica", "normal");
        doc.text(new Date().toLocaleDateString('es-ES'), 50, 75);

        // Encabezados de la Tabla
        let y = 90;
        doc.setFillColor(241, 245, 249);
        doc.rect(15, y, anchoPagina - 30, 8, 'F');
        doc.setDrawColor(203, 213, 225);
        doc.line(15, y, anchoPagina - 15, y);
        doc.line(15, y + 8, anchoPagina - 15, y + 8);

        doc.setTextColor(51, 65, 85);
        doc.setFont("helvetica", "bold");
        doc.text("DESCRIPCIÓN", 18, y + 5.5);
        doc.text("CANT.", 120, y + 5.5);
        doc.text("PRECIO UNID.", 145, y + 5.5);
        doc.text("TOTAL", 178, y + 5.5);

        y += 8;
        doc.setFont("helvetica", "normal");
        doc.setTextColor(15, 23, 42);

        // Renderizado Dinámico de Conceptos con control de saltos de línea
        conceptos.forEach((item) => {
            // Ajustamos el texto largo a un ancho máximo de 95mm para que no pise los números
            const lineasTexto = doc.splitTextToSize(item.nombre, 95);
            const altoFila = Math.max(lineasTexto.length * 5 + 4, 10);

            // Control de salto de página inteligente
            if (y + altoFila > 270) { 
                doc.addPage(); 
                y = 20; 
                // Rehacer línea superior en nueva página
                doc.setDrawColor(203, 213, 225);
                doc.line(15, y, anchoPagina - 15, y);
            }

            // Dibujar textos multi-línea
            doc.text(lineasTexto, 18, y + 6);
            
            // Los números alineados se quedan fijos en su primera línea de fila
            doc.text(`${item.cantidad} ${item.unidad}`, 120, y + 6);
            doc.text(`${item.precioBase.toFixed(2)} €`, 145, y + 6);
            doc.text(`${(item.cantidad * item.precioBase).toFixed(2)} €`, 178, y + 6);
            
            y += altoFila;
            doc.setDrawColor(226, 232, 240);
            doc.line(15, y, anchoPagina - 15, y);
        });

        // Totales Finales
        y += 10;
        if (y > 240) { doc.addPage(); y = 20; }

        const baseCalculo = obtenerTotalNeto();
        const iva = baseCalculo * 0.21;
        
        doc.setDrawColor(30, 41, 59);
        doc.line(110, y, anchoPagina - 15, y);
        
        doc.setFont("helvetica", "normal");
        doc.text("Subtotal:", 112, y + 6);
        doc.text(`${baseCalculo.toFixed(2)} €`, 178, y + 6);
        doc.text("I.V.A. (21%):", 112, y + 12);
        doc.text(`${iva.toFixed(2)} €`, 178, y + 12);

        doc.setFillColor(30, 41, 59);
        doc.rect(110, y + 16, anchoPagina - 125, 10, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFont("helvetica", "bold");
        doc.text("TOTAL:", 114, y + 22.5);
        doc.text(`${(baseCalculo + iva).toFixed(2)} €`, 175, y + 22.5);

        doc.save(`Presupuesto_${cliente.replace(/\s+/g, '_') || 'Reforma'}.pdf`);
    };

    if (!conceptos) return null;

    // Retorno de Interfaz forzado al Modo Oscuro Perseguido (bg-slate-950, text-white, border-slate-800)
    return (
        <div className="w-full bg-slate-950 text-white min-h-screen selection:bg-blue-600/30">
            {/* BARRA DE NAVEGACIÓN */}
            <nav className="w-full sticky top-0 z-30 px-6 py-4 border-b bg-slate-900/80 border-slate-800 backdrop-blur-md">
                <div className="w-full flex items-center justify-between mx-auto">
                    <div className="flex items-center gap-3">
                        <div className="bg-blue-600 text-white p-2 rounded-xl shadow-md shadow-blue-500/20">
                            <span className="text-xl font-black">M</span>
                        </div>
                        <div>
                            <h1 className="text-base font-black tracking-tight text-white">Presupuestos Pro</h1>
                            <span className="text-xs font-semibold text-blue-500 uppercase tracking-wider block">Panel de Control</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-6">
                        <div className="text-right hidden md:block">
                            <span className="text-xs font-bold block text-slate-300">{datosAutonomo.nombre}</span>
                            <span className="text-[11px] text-slate-400 font-medium">{datosAutonomo.email}</span>
                        </div>
                        <span className="text-sm" title="Modo Oscuro Activo">🌙</span>
                    </div>
                </div>
            </nav>

            {/* CUERPO PRINCIPAL */}
            <main className="w-full px-6 py-6 grid grid-cols-1 xl:grid-cols-12 gap-6">
                {/* SECCIÓN IZQUIERDA */}
                <section className="xl:col-span-4 space-y-6">
                    <div className="border rounded-2xl p-6 shadow-xl bg-slate-900 border-slate-800 sticky top-24">
                        <div className="flex items-center justify-between border-b pb-4 mb-4 border-slate-800">
                            <h2 className="text-sm font-black uppercase tracking-wider text-slate-400">Datos y Descripción</h2>
                            <span className="bg-blue-500/10 text-blue-500 text-[10px] font-bold px-2 py-0.5 rounded-full">Paso 1</span>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold mb-1.5 text-slate-400">Cliente / Localización de la Obra</label>
                                <input
                                    type="text"
                                    placeholder="Ej. Juan Martínez - Calle Mayor 12"
                                    value={cliente}
                                    onChange={(e) => setCliente(e.target.value)}
                                    className="w-full border rounded-xl px-4 py-3 text-sm outline-none transition-all bg-slate-950 border-slate-800 text-white placeholder:text-slate-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                />
                            </div>

                            <div>
                                <div className="flex justify-between items-center mb-1.5">
                                    <label className="text-xs font-bold text-slate-400">Descripción detallada de Trabajos</label>
                                    <button
                                        type="button"
                                        onClick={alternarMicrofono}
                                        className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold border transition-all ${
                                            escuchando
                                                ? 'bg-red-500 text-white border-red-500 animate-pulse'
                                                : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                                        }`}
                                    >
                                        <span>{escuchando ? '🛑 Grabando' : '🎙️ Dictar por Voz'}</span>
                                    </button>
                                </div>

                                <textarea
                                    rows="6"
                                    placeholder="Ej: Levantar casa de 25m2, poner techos de pladur, hacer baño y cocina..."
                                    value={descripcion}
                                    onChange={(e) => setDescripcion(e.target.value)}
                                    className="w-full border rounded-xl px-4 py-3 text-sm outline-none resize-none transition-all bg-slate-950 border-slate-800 text-white placeholder:text-slate-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                />
                            </div>

                            <button
                                onClick={consultarIA}
                                disabled={cargando || !descripcion.trim()}
                                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-800 disabled:text-slate-500 text-white font-bold py-3.5 rounded-xl transition text-sm shadow-lg shadow-blue-600/10 flex items-center justify-center gap-2 transform active:scale-[0.99]"
                            >
                                {cargando ? (
                                    <>
                                        <span className="animate-spin inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full"></span>
                                        <span>Consultando Precios de Mercado...</span>
                                    </>
                                ) : (
                                    <span>✨ Desglosar con IA Real</span>
                                )}
                            </button>
                        </div>
                    </div>
                </section>

                {/* SECCIÓN DERECHA */}
                <section className="xl:col-span-8 space-y-6">
                    {conceptos.length > 0 && (
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div className="p-4 border rounded-2xl bg-slate-900 border-slate-800">
                                <span className="text-[11px] font-bold text-slate-400 uppercase">Subtotal</span>
                                <p className="text-xl font-extrabold mt-0.5">{Number(subtotal).toFixed(2)}€</p>
                            </div>
                            <div className="p-4 border rounded-2xl bg-slate-900 border-slate-800">
                                <span className="text-[11px] font-bold text-slate-400 uppercase">I.V.A (21%)</span>
                                <p className="text-xl font-extrabold mt-0.5">{(Number(subtotal) * 0.21).toFixed(2)}€</p>
                            </div>
                            <div className="p-4 border rounded-2xl bg-blue-600 text-white border-transparent shadow-lg shadow-blue-500/15">
                                <span className="text-[11px] font-bold text-blue-200 uppercase">Total Presupuesto</span>
                                <p className="text-xl font-black mt-0.5">{totalConIva}€</p>
                            </div>
                        </div>
                    )}

                    <div className="flex items-center justify-between px-1">
                        <div>
                            <h2 className="text-base font-black tracking-tight text-white">Líneas de Partidas Generadas</h2>
                            <p className="text-xs text-slate-400">Personaliza libremente cantidades, textos y costes de mano de obra o materiales.</p>
                        </div>
                        {conceptos.length > 0 && (
                            <button
                                onClick={agregarConceptoManual}
                                className="border font-bold text-xs px-4 py-2.5 rounded-xl transition shadow-sm transform active:scale-95 bg-slate-900 border-slate-800 text-slate-200 hover:bg-slate-800"
                            >
                                ➕ Añadir Partida Manual
                            </button>
                        )}
                    </div>

                    {conceptos.length === 0 ? (
                        <div className="border rounded-2xl p-16 text-center bg-slate-900/50 border-slate-800">
                            <span className="text-4xl block mb-3 animate-bounce">📋</span>
                            <p className="text-base font-bold text-white">Tu presupuesto está vacío</p>
                            <p className="text-sm text-slate-500 max-w-sm mx-auto mt-1">Inserta los trabajos en la sección izquierda para extraer las partidas de materiales automáticamente.</p>
                        </div>
                    ) : (
                        <div className="border rounded-2xl shadow-xl overflow-hidden divide-y bg-slate-900 border-slate-800 divide-slate-800">
                            {conceptos.map((item) => (
                                <div key={item.id} className="p-4 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-800/30">
                                    <div className="flex-1">
                                        <input
                                            type="text"
                                            value={item.nombre}
                                            onChange={(e) => modificarCampo(item.id, 'nombre', e.target.value)}
                                            className="w-full font-bold text-sm bg-transparent border-b border-transparent focus:border-blue-500 outline-none pb-1 transition-all text-white"
                                        />
                                    </div>

                                    <div className="flex flex-wrap items-center gap-4 text-xs">
                                        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border bg-slate-950 border-slate-800">
                                            <span className="text-slate-500 font-medium">Cant:</span>
                                            <input
                                                type="number"
                                                value={item.cantidad}
                                                onChange={(e) => modificarCampo(item.id, 'cantidad', e.target.value)}
                                                className="w-12 bg-transparent text-center font-extrabold outline-none text-white focus:text-blue-500"
                                            />
                                            <input
                                                type="text"
                                                value={item.unidad}
                                                onChange={(e) => modificarCampo(item.id, 'unidad', e.target.value)}
                                                className="w-8 bg-transparent text-slate-500 font-bold text-left outline-none"
                                            />
                                        </div>

                                        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border bg-slate-950 border-slate-800">
                                            <span className="text-slate-500 font-medium">Precio:</span>
                                            <input
                                                type="number"
                                                value={item.precioBase}
                                                onChange={(e) => modificarCampo(item.id, 'precioBase', e.target.value)}
                                                className="w-16 bg-transparent text-right font-extrabold outline-none text-white focus:text-blue-500"
                                            />
                                            <span className="text-slate-500 font-bold">€</span>
                                        </div>

                                        <div className="min-w-[80px] text-right">
                                            <span className="font-black text-sm text-white">
                                                {(item.cantidad * item.precioBase).toFixed(2)}€
                                            </span>
                                        </div>

                                        <button
                                            onClick={() => eliminarConcepto(item.id)}
                                            className="transition-colors p-2 text-xs font-black rounded-lg text-slate-600 hover:text-red-400 hover:bg-slate-800"
                                        >
                                            ✕
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </section>
            </main>

            {/* BOTÓN INFERIOR PDF */}
            {conceptos.length > 0 && (
                <div className="w-full mt-12 border-t p-6 bg-slate-900 border-slate-800 rounded-2xl">
                    <div className="w-full flex flex-col sm:flex-row items-center justify-between gap-4">
                        <div>
                            <span className="text-xs uppercase font-extrabold text-slate-400 tracking-wider">Acción Directa</span>
                            <p className="text-sm text-slate-500 mt-0.5">Genera el comprobante formal en PDF de los materiales listados.</p>
                        </div>
                        <button
                            onClick={exportarPDF}
                            className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white font-black px-8 py-3.5 rounded-xl shadow-lg shadow-emerald-600/20 text-xs uppercase tracking-widest transition transform active:scale-95"
                        >
                            📄 Guardar Copia PDF
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}