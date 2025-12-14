-- Verificar columnas de la vista 3t_dashboard_ventas
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = '3t_dashboard_ventas'
ORDER BY ordinal_position;
