import { useState, useEffect, useRef } from 'react';
import { jsPDF } from 'jspdf';

export default function Presupuestos() {
  const [descripcion, setDescripcion] = useState('');
  const [cliente, setCliente] = useState('');
  const [conceptos, setConceptos] = useState([]);
  const [cargando, setCargando] = useState(false);
  
  // Estados para controlar el dictado por voz
  const [escuchando, setEscuchando] = useState(false);
  const reconocimientoRef = useRef(null);

  const datosAutonomo = {
    nombre: "Construcciones y Reformas Manuel",
    nif: "12345678-X",
    telefono: "600 000 000",
    email: "manuel.obras@email.com"
  };

  // Inicializar el motor de reconocimiento de voz nativo del móvil/navegador
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false; // Graba ráfagas cortas de dictado
      recognition.lang = 'es-ES';     // Idioma español
      recognition.interimResults = false;

      recognition.onstart = () => setEscuchando(true);
      recognition.onend = () => setEscuchando(false);
      
      recognition.onresult = (event) => {
        const textoDictado = event.results[0][0].transcript;
        // Unimos lo que ya estaba escrito con lo nuevo que ha dicho tu padre
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

  // Función para encender/apagar el micrófono
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

  const consultarIA = async () => {
    if (!descripcion.trim()) return;
    setCargando(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      const jsonDeLaIA = [
        { id: Date.now() + 1, nombre: 'Saco Cemento Cola Capa Fina', cantidad: 6, precioBase: 8.20, unidad: 'uds' },
        { id: Date.now() + 2, nombre: 'Azulejo Cerámico Blanco (m2)', cantidad: 15, precioBase: 14.50, unidad: 'm²' },
        { id: Date.now() + 3, nombre: 'Tubo PVC Fontanería 40mm (metros)', cantidad: 4, precioBase: 3.80, unidad: 'm' },
        { id: Date.now() + 4, nombre: 'Mano de obra Oficial 1ª', cantidad: 24, precioBase: 22.00, unidad: 'horas' },
      ];
      setConceptos(jsonDeLaIA);
    } catch (error) {
      console.error("Error con la IA", error);
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

  const calcularTotal = () => {
    return conceptos.reduce((acc, item) => acc + (item.precioBase * item.cantidad), 0).toFixed(2);
  };

  const exportarPDF = () => {
    const doc = new jsPDF();
    const anchoPagina = doc.internal.pageSize.width;
    
    doc.setFillColor(30, 41, 59);
    doc.rect(0, 0, anchoPagina, 40, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.text(datosAutonomo.nombre.toUpperCase(), 15, 18);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(`NIF: ${datosAutonomo.nif} | Tlf: ${datosAutonomo.telefono} | Email: ${datosAutonomo.email}`, 15, 28);

    doc.setTextColor(30, 41, 59);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text("PRESUPUESTO DE OBRA", 15, 55);

    doc.setFontSize(11);
    doc.text("CLIENTE / OBRA:", 15, 68);
    doc.setFont("helvetica", "normal");
    doc.text(cliente || 'Cliente General', 52, 68);

    doc.setFont("helvetica", "bold");
    doc.text("FECHA:", 15, 75);
    doc.setFont("helvetica", "normal");
    doc.text(new Date().toLocaleDateString('es-ES'), 52, 75);

    let y = 90;
    doc.setFillColor(241, 245, 249);
    doc.rect(15, y, anchoPagina - 30, 8, 'F');
    doc.setDrawColor(203, 213, 225);
    doc.line(15, y, anchoPagina - 15, y);
    doc.line(15, y + 8, anchoPagina - 15, y + 8);

    doc.setTextColor(51, 65, 85);
    doc.setFont("helvetica", "bold");
    doc.text("DESCRIPCIÓN", 18, y + 5.5);
    doc.text("CANT.", 115, y + 5.5);
    doc.text("PRECIO UNID.", 140, y + 5.5);
    doc.text("TOTAL", 175, y + 5.5);

    y += 8;
    doc.setFont("helvetica", "normal");
    doc.setTextColor(15, 23, 42);

    conceptos.forEach((item) => {
      if (y > 270) { doc.addPage(); y = 20; }
      doc.text(item.nombre, 18, y + 6);
      doc.text(`${item.cantidad} ${item.unidad}`, 115, y + 6);
      doc.text(`${item.precioBase.toFixed(2)} €`, 140, y + 6);
      doc.text(`${(item.cantidad * item.precioBase).toFixed(2)} €`, 175, y + 6);
      doc.line(15, y + 9, anchoPagina - 15, y + 9);
      y += 9;
    });

    y += 10;
    const subtotal = Number(calcularTotal());
    const iva = subtotal * 0.21;
    doc.setDrawColor(30, 41, 59);
    doc.line(110, y, anchoPagina - 15, y);
    doc.text("Subtotal:", 112, y + 6);
    doc.text(`${subtotal.toFixed(2)} €`, 175, y + 6);
    doc.text("I.V.A. (21%):", 112, y + 12);
    doc.text(`${iva.toFixed(2)} €`, 175, y + 12);

    doc.setFillColor(30, 41, 59);
    doc.rect(110, y + 16, anchoPagina - 125, 10, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.text("TOTAL:", 114, y + 22.5);
    doc.text(`${(subtotal + iva).toFixed(2)} €`, 173, y + 22.5);

    doc.save(`Presupuesto_${cliente.replace(/\s+/g, '_') || 'Reforma'}.pdf`);
  };

  return (
    <div className="max-w-xl mx-auto pb-36 pt-4 px-3 selection:bg-indigo-500 selection:text-white">
      
      {/* 1. HEADER ULTRA-MODERNO */}
      <header className="mb-8 flex items-center justify-between">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white text-base shadow-md shadow-indigo-500/20">
              ⚡
            </div>
            <h1 className="text-xl font-black bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 bg-clip-text text-transparent">
              Presupuestador Pro
            </h1>
          </div>
          <p className="text-[11px] font-medium text-slate-400">Inteligencia de voz artificial para reformas.</p>
        </div>
        <span className="bg-indigo-50 text-indigo-600 text-[10px] font-bold px-3 py-1 rounded-xl tracking-wider">
          AI ENGINE v3.0
        </span>
      </header>

      {/* 2. DISEÑO INTEGRADO: PANEL DE ENTRADA INTELIGENTE */}
      <div className="bg-slate-900/5 backdrop-blur-md rounded-3xl border border-slate-200/50 p-5 mb-6 space-y-4 shadow-sm">
        <div>
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Ubicación u Obra</label>
          <input 
            type="text" 
            placeholder="Ej. Salón de María - Calle Real 12" 
            value={cliente}
            onChange={(e) => setCliente(e.target.value)}
            className="w-full bg-white border border-slate-200 shadow-inner rounded-2xl px-4 py-3 text-slate-800 text-sm font-medium focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
          />
        </div>

        <div>
          <div className="flex justify-between items-center mb-1.5 ml-1">
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">¿Qué materiales o trabajos requiere?</label>
            
            {/* BOTÓN INNOVADOR DE VOZ */}
            <button
              type="button"
              onClick={alternarMicrofono}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition active:scale-95 ${
                escuchando 
                  ? 'bg-red-500 text-white animate-pulse shadow-md shadow-red-500/30' 
                  : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100'
              }`}
            >
              <span>{escuchando ? '🛑 Detener' : '🎙️ Dictar por voz'}</span>
            </button>
          </div>
          
          <div className="relative">
            <textarea 
              rows="3"
              placeholder="Escribe o pulsa 'Dictar por voz' para describir el proyecto..." 
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              className="w-full bg-white border border-slate-200 shadow-inner rounded-2xl px-4 py-3 text-slate-700 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none resize-none transition-all placeholder:text-slate-400"
            />
            {escuchando && (
              <div className="absolute bottom-3 right-3 flex items-center gap-1 text-[10px] text-red-500 font-bold bg-white px-2 py-0.5 rounded-md border border-red-100">
                <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-ping"></span> Escuchando...
              </div>
            )}
          </div>
        </div>

        <button
          onClick={consultarIA}
          disabled={cargando || !descripcion.trim()}
          className="w-full bg-gradient-to-r from-slate-900 to-indigo-950 hover:from-slate-800 hover:to-indigo-900 disabled:from-slate-100 disabled:to-slate-100 disabled:text-slate-400 text-white font-bold py-3.5 rounded-2xl transition active:scale-[0.99] flex items-center justify-center gap-2 shadow-md text-sm"
        >
          {cargando ? (
            <>
              <span className="animate-spin inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full"></span>
              <span>Calculando estructura óptima...</span>
            </>
          ) : (
            <span>⚡ Desglosar Presupuesto</span>
          )}
        </button>
      </div>

      {/* 3. PARTIDAS ESTILO LISTA DINÁMICA MODERNA */}
      {conceptos.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between px-2">
            <div>
              <h2 className="text-sm font-black text-slate-900">Conceptos Calculados</h2>
              <p className="text-[10px] font-medium text-slate-400">Edita cualquier celda si es preciso.</p>
            </div>
            <button
              onClick={agregarConceptoManual}
              className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-3 py-2 rounded-xl flex items-center gap-1 transition-all shadow-sm shadow-indigo-600/10"
            >
              ✨ Nueva Partida
            </button>
          </div>

          <div className="space-y-3">
            {conceptos.map((item) => (
              <div key={item.id} className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-4 hover:border-indigo-200 transition-colors group">
                <input 
                  type="text" 
                  value={item.nombre}
                  onChange={(e) => modificarCampo(item.id, 'nombre', e.target.value)}
                  className="w-full font-bold text-slate-800 text-sm bg-transparent border-b border-transparent focus:border-indigo-500 outline-none pb-1 transition-all"
                />
                
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100 text-xs">
                  <div className="flex items-center gap-3">
                    {/* Cantidad */}
                    <div className="flex items-center bg-slate-50 border border-slate-200/80 rounded-xl px-2 py-1">
                      <span className="text-slate-400 font-bold mr-1.5 text-[10px]">CANT:</span>
                      <input 
                        type="number" 
                        value={item.cantidad}
                        onChange={(e) => modificarCampo(item.id, 'cantidad', e.target.value)}
                        className="w-10 bg-transparent text-center font-bold text-slate-800 outline-none"
                      />
                      <input 
                        type="text" 
                        value={item.unidad}
                        onChange={(e) => modificarCampo(item.id, 'unidad', e.target.value)}
                        className="w-8 bg-transparent text-[10px] text-slate-400 text-left outline-none font-medium ml-1"
                      />
                    </div>

                    {/* Precio Ud */}
                    <div className="flex items-center bg-slate-50 border border-slate-200/80 rounded-xl px-2 py-1">
                      <span className="text-slate-400 font-bold mr-1.5 text-[10px]">PRECIO:</span>
                      <input 
                        type="number" 
                        step="0.01"
                        value={item.precioBase}
                        onChange={(e) => modificarCampo(item.id, 'precioBase', e.target.value)}
                        className="w-14 bg-transparent text-right font-bold text-slate-800 outline-none"
                      />
                      <span className="text-slate-400 font-bold ml-1">€</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <span className="font-extrabold text-indigo-950 text-sm">{(item.cantidad * item.precioBase).toFixed(2)}€</span>
                    </div>
                    <button 
                      onClick={() => eliminarConcepto(item.id)}
                      className="text-slate-300 hover:text-red-500 transition-colors p-1"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. CIERRE PERSISTENTE MINIMALISTA Y ELEGANTE */}
      {conceptos.length > 0 && (
        <div className="bg-slate-950/95 backdrop-blur-md text-white p-5 rounded-3xl shadow-xl fixed bottom-20 left-4 right-4 max-w-xl mx-auto flex items-center justify-between border border-white/10 z-40 animate-fade-in">
          <div>
            <div className="text-[9px] uppercase tracking-widest text-indigo-300 font-black flex gap-2 mb-0.5">
              <span>Base: {calcularTotal()}€</span>
              <span>• IVA (21%)</span>
            </div>
            <p className="text-2xl font-black text-white tracking-tight">
              {(Number(calcularTotal()) * 1.21).toFixed(2)}<span className="text-xs font-bold text-indigo-400 ml-1">€ Total</span>
            </p>
          </div>
          <button 
            onClick={exportarPDF}
            className="bg-gradient-to-r from-indigo-500 to-violet-500 hover:from-indigo-600 hover:to-violet-600 text-white font-bold px-5 py-3 rounded-2xl shadow-lg shadow-indigo-500/20 transition active:scale-[0.96] text-xs uppercase tracking-wider flex items-center gap-1.5"
          >
            🚀 Exportar PDF
          </button>
        </div>
      )}
    </div>
  );
}