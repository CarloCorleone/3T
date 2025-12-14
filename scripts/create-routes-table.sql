-- =====================================================
-- TABLA: 3t_saved_routes
-- Descripción: Guarda rutas optimizadas para persistencia
-- Estrategia: Solo 1 ruta activa a la vez (is_active = true)
-- =====================================================

-- Crear tabla
CREATE TABLE IF NOT EXISTS public.3t_saved_routes (
  route_id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  route_data JSONB NOT NULL,
  total_orders INTEGER NOT NULL,
  total_routes INTEGER NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Índice para búsqueda rápida de ruta activa
CREATE INDEX IF NOT EXISTS idx_saved_routes_active ON public.3t_saved_routes(is_active)
  WHERE is_active = true;

-- Trigger para updated_at automático
CREATE TRIGGER update_saved_routes_updated_at 
  BEFORE UPDATE ON public.3t_saved_routes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Comentarios para documentación
COMMENT ON TABLE public.3t_saved_routes IS 'Rutas optimizadas guardadas - solo 1 activa a la vez';
COMMENT ON COLUMN public.3t_saved_routes.route_data IS 'Array de RouteGroup serializado como JSONB {routeGroups: RouteGroup[]}';
COMMENT ON COLUMN public.3t_saved_routes.is_active IS 'Solo una ruta puede estar activa (true), las demás son históricas';
COMMENT ON COLUMN public.3t_saved_routes.total_orders IS 'Total de pedidos en todas las rutas';
COMMENT ON COLUMN public.3t_saved_routes.total_routes IS 'Número de rutas en el grupo';

