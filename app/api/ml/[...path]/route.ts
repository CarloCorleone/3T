/**
 * Proxy API para ML Insights
 * 
 * Redirige todas las peticiones de /api/ml/* hacia la API ML interna (localhost:8001)
 * Soluciona el problema de acceso desde navegadores móviles/incógnito
 * 
 * Flujo:
 * - Cliente: fetch('/api/ml/health') 
 * - Next.js Server: fetch('http://localhost:8001/health')
 * - API ML: responde
 * - Next.js devuelve al cliente
 */

import { NextRequest, NextResponse } from 'next/server';

// URL interna de la API ML (solo accesible desde el servidor)
// Desde el contenedor Docker, el host es accesible en la IP del gateway de la red
const ML_API_INTERNAL_URL = process.env.ML_API_INTERNAL_URL || 'http://172.20.0.1:8001';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  const params = await context.params;
  return proxyRequest(request, params.path, 'GET');
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  const params = await context.params;
  return proxyRequest(request, params.path, 'POST');
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  const params = await context.params;
  return proxyRequest(request, params.path, 'PUT');
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  const params = await context.params;
  return proxyRequest(request, params.path, 'DELETE');
}

async function proxyRequest(
  request: NextRequest,
  pathSegments: string[],
  method: string
) {
  try {
    // Construir la URL completa hacia la API ML interna
    const path = pathSegments.join('/');
    const url = `${ML_API_INTERNAL_URL}/${path}`;
    
    // Copiar el body si existe (POST/PUT)
    let body: string | undefined;
    if (method === 'POST' || method === 'PUT') {
      try {
        const jsonBody = await request.json();
        body = JSON.stringify(jsonBody);
      } catch {
        // Si no hay body o no es JSON, continuar sin body
        body = undefined;
      }
    }

    // Hacer la petición a la API ML interna
    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
      body,
    });

    // Obtener la respuesta
    const data = await response.json();

    // Devolver con el mismo status code
    return NextResponse.json(data, { status: response.status });
    
  } catch (error) {
    console.error(`[ML Proxy Error] ${method} /${pathSegments.join('/')}:`, error);
    
    return NextResponse.json(
      { 
        error: 'Error al conectar con API ML',
        detail: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 503 }
    );
  }
}

