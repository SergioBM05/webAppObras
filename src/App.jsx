import { useState } from 'react';
import Presupuestos from './components/Presupuestos';
import Tickets from './components/Tickets'; // El que haremos después

function App() {
  // Estado para controlar qué pestaña está activa
  const [pestanaActiva, setPestanaActiva] = useState('presupuestos');

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans selection:bg-amber-500 selection:text-slate-900">
      
      {/* Zona de contenido que cambia según la pestaña */}
      <main className="flex-1 overflow-y-auto px-4 pt-6 pb-24">
        {pestanaActiva === 'presupuestos' ? (
          <Presupuestos />
        ) : (
          <Tickets />
        )}
      </main>

      {/* NAVBAR INFERIOR MODERNO (Estilo App Nativa) */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-md border-t border-slate-200/80 h-16 flex items-center justify-around px-6 shadow-lg z-50">
        
        {/* Botón de Presupuestos */}
        <button 
          onClick={() => setPestanaActiva('presupuestos')}
          className={`flex flex-col items-center justify-center w-20 h-full transition-colors ${
            pestanaActiva === 'presupuestos' 
              ? 'text-amber-500 font-bold' 
              : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          <span className="text-xl mb-0.5">🧮</span>
          <span className="text-[11px] tracking-wide uppercase">Calculadora</span>
        </button>

        {/* Botón de Tickets */}
        <button 
          onClick={() => setPestanaActiva('tickets')}
          className={`flex flex-col items-center justify-center w-20 h-full transition-colors ${
            pestanaActiva === 'tickets' 
              ? 'text-amber-500 font-bold' 
              : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          <span className="text-xl mb-0.5">📸</span>
          <span className="text-[11px] tracking-wide uppercase">Tickets</span>
        </button>

      </nav>
    </div>
  );
}

export default App;