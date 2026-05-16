import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { GoogleGenAI, Type } from '@google/genai';

function readRequestBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';

    req.on('data', (chunk) => {
      body += chunk;
    });

    req.on('end', () => {
      resolve(body);
    });

    req.on('error', reject);
  });
}

function createGenerarPresupuestoMiddleware() {
  return async (req, res, next) => {
    if (req.method !== 'POST' || req.url !== '/api/generar-presupuesto') {
      next();
      return;
    }

    try {
      const rawBody = await readRequestBody(req);
      const { descripcion } = rawBody ? JSON.parse(rawBody) : {};

      if (!descripcion) {
        res.statusCode = 400;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: 'La descripción es obligatoria' }));
        return;
      }

      const apiKey = globalThis.process?.env?.GEMINI_API_KEY || '';

      if (!apiKey) {
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: 'Falta la clave GEMINI_API_KEY en tu archivo .env' }));
        return;
      }

      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `Desglosa el siguiente trabajo de construcción o reforma: "${descripcion}"`,
        config: {
          systemInstruction: 'Eres un perito experto en presupuestos de construcción y reformas en España. Tu objetivo es desglosar la descripción del usuario en partidas de materiales y mano de obra verídicas, estimando cantidades lógicas y costes de mercado actuales del sector en euros. Devuelve estrictamente la estructura JSON solicitada.',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              partidas: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    id: { type: Type.INTEGER },
                    nombre: { type: Type.STRING },
                    cantidad: { type: Type.NUMBER },
                    precioBase: { type: Type.NUMBER },
                    unidad: { type: Type.STRING },
                  },
                  required: ['id', 'nombre', 'cantidad', 'precioBase', 'unidad'],
                },
              },
            },
            required: ['partidas'],
          },
        },
      });

      const resultadoFinal = JSON.parse(response.text);
      const baseId = Date.now();

      resultadoFinal.partidas = (resultadoFinal.partidas || []).map((partida, index) => ({
        ...partida,
        id: baseId + index,
      }));

      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify(resultadoFinal));
    } catch (error) {
      console.error('Error procesando /api/generar-presupuesto:', error);
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: 'Error al procesar el presupuesto con la IA' }));
    }
  };
}

const apiMiddleware = createGenerarPresupuestoMiddleware();

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'local-api-generar-presupuesto',
      configureServer(server) {
        server.middlewares.use(apiMiddleware);
      },
      configurePreviewServer(server) {
        server.middlewares.use(apiMiddleware);
      },
    },
  ],
});