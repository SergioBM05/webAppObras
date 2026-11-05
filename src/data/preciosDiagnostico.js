// Tarifas de DIAGNÓSTICO EMPRESARIAL (fuente: PRECIOS_RIELDEN.pdf)
// Todos los precios son BASE IMPONIBLE (sin IVA).

export const IVA = 0.21;
export const IRPF = 0.07; // Retención jóvenes autónomos C.V.

export const AREAS_DIAGNOSTICO = [
    { id: 'administracion', nombre: 'Diagnóstico de Administración', precioBase: 500 },
    { id: 'delivery', nombre: 'Diagnóstico de Delivery', precioBase: 375 },
    { id: 'marketing', nombre: 'Diagnóstico de Marketing', precioBase: 375 },
    { id: 'ventas', nombre: 'Diagnóstico de Ventas', precioBase: 375 },
];

// Pack completo (las 4 áreas): 1.512,50 € con IVA → 1.250 € de base
export const PACK_TOTAL_CON_IVA = 1512.5;
export const PACK_PRECIO_BASE = PACK_TOTAL_CON_IVA / (1 + IVA);

// Otros servicios con precio orientativo en rango (min - max), base sin IVA.
// periodo: 'mes' → se factura por mes; 'unico' → pago único / por proyecto.
export const CATEGORIAS_SERVICIOS = [
    {
        categoria: 'Servicios de IA',
        servicios: [
            { id: 'ia-consultoria', nombre: 'Consultoría IA', min: 300, max: 2300, periodo: 'unico' },
            { id: 'ia-chatbot', nombre: 'Chat bot IA', min: 600, max: 5200, periodo: 'unico' },
            { id: 'ia-whatsapp', nombre: 'Bot de WhatsApp IA', min: 300, max: 2000, periodo: 'unico' },
            { id: 'ia-voz', nombre: 'Agente de voz', min: 800, max: 3000, periodo: 'unico' },
            { id: 'ia-documentos', nombre: 'Procesamiento de documentos', min: 2500, max: 16000, periodo: 'unico' },
            { id: 'ia-datos', nombre: 'Análisis de datos con IA', min: 3000, max: 20000, periodo: 'unico' },
            { id: 'ia-agente', nombre: 'Agente autónomo empresarial', min: 3500, max: 20000, periodo: 'unico' },
            { id: 'ia-medida', nombre: 'Aplicación de IA a medida', min: 1500, max: 5000, periodo: 'unico' },
        ],
    },
    {
        categoria: 'Marketing digital',
        servicios: [
            { id: 'mk-redes', nombre: 'Gestión de redes sociales', min: 200, max: 1200, periodo: 'mes' },
            { id: 'mk-seo', nombre: 'SEO', min: 150, max: 450, periodo: 'mes' },
            { id: 'mk-aeo', nombre: 'Implementación de AEO', min: 150, max: 400, periodo: 'unico' },
            { id: 'mk-seo-pyme', nombre: 'SEO para pyme (AEO incluido)', min: 250, max: 1500, periodo: 'mes' },
            { id: 'mk-auditoria-seo', nombre: 'Auditoría de SEO', min: 150, max: 2500, periodo: 'unico' },
            { id: 'mk-publicidad', nombre: 'Gestión de publicidad online', min: 200, max: 1200, periodo: 'mes' },
            { id: 'mk-email-puntual', nombre: 'Campaña puntual de email', min: 75, max: 75, periodo: 'unico' },
            { id: 'mk-email-mensual', nombre: 'Email marketing mensual', min: 200, max: 500, periodo: 'mes' },
            { id: 'mk-integral', nombre: 'Marketing externalizado integral', min: 800, max: 3500, periodo: 'mes' },
            { id: 'mk-web', nombre: 'Web o landing de conversión', min: 800, max: 3500, periodo: 'mes' },
        ],
    },
    {
        categoria: 'Automatización de procesos',
        servicios: [
            { id: 'au-auditoria', nombre: 'Auditoría de automatización', min: 0, max: 300, periodo: 'unico' },
            { id: 'au-seguimiento', nombre: 'Seguimiento automático de contactos comerciales', min: 300, max: 700, periodo: 'unico' },
            { id: 'au-facturacion', nombre: 'Automatización de facturación', min: 700, max: 1600, periodo: 'unico' },
            { id: 'au-robusta', nombre: 'Automatización puntual robusta', min: 2000, max: 3500, periodo: 'unico' },
            { id: 'au-flujo-ia', nombre: 'Flujo crítico con IA', min: 1500, max: 6000, periodo: 'unico' },
            { id: 'au-varios', nombre: 'Varios flujos conectados', min: 3000, max: 15000, periodo: 'unico' },
            { id: 'au-conector', nombre: 'Conector a medida para un programa antiguo', min: 600, max: 2300, periodo: 'unico' },
            { id: 'au-marketplaces', nombre: 'Sincronización de marketplaces', min: 1500, max: 6500, periodo: 'unico' },
            { id: 'au-portal', nombre: 'Portal de clientes', min: 1250, max: 3500, periodo: 'unico' },
            { id: 'au-mantenimiento', nombre: 'Mantenimiento de automatizaciones', min: 150, max: 900, periodo: 'mes' },
        ],
    },
];

export const SERVICIOS = CATEGORIAS_SERVICIOS.flatMap((c) =>
    c.servicios.map((s) => ({ ...s, categoria: c.categoria }))
);
