#!/usr/bin/env python3
"""
Script para importar workflows a n8n usando la API
"""
import json
import os
import glob
import time

# Usar las herramientas MCP de n8n
workflows_dir = '/opt/cane/3t/workflows-recuperados'
workflow_files = sorted(glob.glob(os.path.join(workflows_dir, '*.json')))

print(f"📥 Importando {len(workflow_files)} workflows...")
print(f"⏳ Esto puede tomar varios minutos...\n")

imported = 0
failed = []

for i, filepath in enumerate(workflow_files, 1):
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            workflow_data = json.load(f)
        
        name = workflow_data.get('name', 'Sin nombre')
        original_id = workflow_data.get('meta', {}).get('original_id', 'unknown')
        
        # Preparar datos para importación (sin el meta que agregamos)
        workflow_to_import = {
            "name": workflow_data['name'],
            "nodes": workflow_data['nodes'],
            "connections": workflow_data['connections'],
            "settings": workflow_data.get('settings', {}),
            "staticData": workflow_data.get('staticData'),
            "active": False  # Importar como inactivo por seguridad
        }
        
        # Guardar para importación manual vía MCP
        import_file = f"/tmp/workflow_import_{original_id}.json"
        with open(import_file, 'w', encoding='utf-8') as f:
            json.dump(workflow_to_import, f, indent=2)
        
        print(f"✅ {i}/{len(workflow_files)}: {name}")
        print(f"   → Preparado: {import_file}")
        imported += 1
        
    except Exception as e:
        print(f"❌ {i}/{len(workflow_files)}: Error en {os.path.basename(filepath)}")
        print(f"   Error: {e}")
        failed.append(filepath)

print(f"\n📊 Resumen:")
print(f"✅ Preparados: {imported}")
print(f"❌ Fallidos: {len(failed)}")

if failed:
    print(f"\n❌ Workflows con errores:")
    for f in failed:
        print(f"   - {os.path.basename(f)}")

print(f"\n💡 Los workflows están listos en /opt/cane/3t/workflows-recuperados/")
print(f"💡 Ahora usaré la herramienta MCP de n8n para importarlos...")


