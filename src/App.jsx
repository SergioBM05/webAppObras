import { useState } from 'react';
import Presupuestos from './components/Presupuestos';
import Tickets from './components/Tickets';

function App() {
  const [pestanaActiva, setPestanaActiva] = useState('presupuestos');
  // Pasamos el control del modo oscuro al padre para que afecte a TODA la pantalla
  const [darkMode, setDarkMode] = useState(false);

  // 🛠️ ESTADOS COMPARTIDOS IMPLEMENTADOS AQUÍ:
  const [conceptos, setConceptos] = useState([]);
  const [cliente, setCliente] = useState('');

  // 🛠️ CÁLCULOS EN TIEMPO REAL:
  const subtotal = conceptos.reduce(
    (acc, item) => acc + item.precioBase * item.cantidad, 
    0
  );
  const totalConIva = (subtotal * 1.21).toFixed(2);

  return (
    <div className={`w-full min-h-screen flex flex-col font-sans selection:bg-blue-500 selection:text-white transition-colors duration-300 ${
      darkMode ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-800'
    }`}>

      {/* ZONA DE CONTENIDO: Eliminados los paddings fijos laterales para destruir las bandas */}
      <main className="w-full flex-1 overflow-y-auto pb-24">
        {pestanaActiva === 'presupuestos' ? (
          <Presupuestos
            darkMode={darkMode}
            setDarkMode={setDarkMode}
            conceptos={conceptos}         
            setConceptos={setConceptos}   
            cliente={cliente}             
            setCliente={setCliente}       
            subtotal={subtotal}
            totalConIva={totalConIva}
          />
        ) : (
          <Tickets darkMode={darkMode} />
        )}
      </main>

      {/* NAVBAR INFERIOR ADAPTATIVO (Se vuelve oscuro o claro automáticamente) */}
      <nav className={`fixed bottom-0 left-0 right-0 border-t h-16 flex items-center justify-around px-6 shadow-xl z-50 transition-colors backdrop-blur-md ${
        darkMode
          ? 'bg-slate-900/90 border-slate-800/80 shadow-[0_-10px_20px_rgba(0,0,0,0.3)]'
          : 'bg-white/90 border-slate-200/80 shadow-[0_-8px_30px_rgba(0,0,0,0.05)]'
      }`}>

        {/* Botón de Presupuestos (Calculadora) */}
        <button
          onClick={() => setPestanaActiva('presupuestos')}
          className={`flex flex-col items-center justify-center w-24 h-full transition-all duration-200 ${
            pestanaActiva === 'presupuestos'
              ? 'text-blue-500 font-black scale-105'
              : darkMode ? 'text-slate-500 hover:text-slate-400' : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          <span className="text-xl mb-0.5">🧮</span>
          <span className="text-[10px] font-bold tracking-wider uppercase">Calculadora</span>
        </button>

        {/* Botón de Tickets */}
        <button
          onClick={() => setPestanaActiva('tickets')}
          className={`flex flex-col items-center justify-center w-24 h-full transition-all duration-200 ${
            pestanaActiva === 'tickets'
              ? 'text-blue-500 font-black scale-105'
              : darkMode ? 'text-slate-500 hover:text-slate-400' : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          <span className="text-xl mb-0.5">📸</span>
          <span className="text-[10px] font-bold tracking-wider uppercase">Tickets</span>
        </button>

      </nav>
    </div>
  );
}

export default App;