import { GoogleGenAI, Type } from '@google/genai';

export default async function handler(req, res) {
  // 1. Permitir únicamente peticiones POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido. Usa POST.' });
  }

  // 2. Extraer parámetros del body
  const { descripcion } = req.body || {};

  if (!descripcion) {
    return res.status(400).json({ error: 'La descripción es obligatoria' });
  }

  // 3. Obtener la API key dentro de la ejecución del handler
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return res.status(500).json({
      error: 'Error de configuración: No se encuentra GEMINI_API_KEY en las variables de entorno de Vercel.',
    });
  }

  try {
    // 4. Inicializar la instancia en tiempo de ejecución
    const ai = new GoogleGenAI({ apiKey });

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Desglosa el siguiente trabajo de construcción o reforma: "${descripcion}"`,
      config: {
        systemInstruction:
          'Eres un perito experto en presupuestos de construcción y reformas en España. Tu objetivo es desglosar la descripción del usuario en partidas de materiales y mano de obra verídicas, estimando cantidades lógicas y costes de mercado actuales del sector en euros. Devuelve estrictamente la estructura JSON solicitada.',
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

    // 5. Normalizar IDs únicos para el mapeo en React
    resultadoFinal.partidas = (resultadoFinal.partidas || []).map((partida, index) => ({
      ...partida,
      id: baseId + index,
    }));

    return res.status(200).json(resultadoFinal);
  } catch (error) {
    console.error('Error en Serverless Function Gemini:', error);
    return res.status(500).json({
      error: `Error en el motor de IA: ${error.message || error}`,
    });
  }
}