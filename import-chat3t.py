#!/usr/bin/env python3
"""
Importar workflows de Chat 3T uno por uno
"""
import json
import sys

workflows_to_import = [
    ('M2vrCNU9HR1Dvyle', 'Chat 3T'),
    ('RK8QUHf5UHMGLtAI', 'Chat 3T copy'),
    ('Zhh5cz6K9ud4WmcO', 'Chat 3T Pro - Con Gráficos'),
    ('qCISojqHcn9JCxKu', 'Chat 3T Pro - Con Redis Memory'),
]

base_dir = '/opt/cane/3t/workflows-recuperados'

for wf_id, wf_name in workflows_to_import:
    # Buscar archivo que empiece con el ID
    import glob
    files = glob.glob(f"{base_dir}/{wf_id}_*.json")
    
    if not files:
        print(f"❌ No encontrado: {wf_name}")
        continue
    
    filepath = files[0]
    
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        # Imprimir info básica del workflow
        print(f"\n{'='*60}")
        print(f"📦 {wf_name}")
        print(f"{'='*60}")
        print(f"ID Original: {wf_id}")
        print(f"Nodos: {len(data.get('nodes', []))}")
        print(f"Activo: {data.get('active', False)}")
        print(f"Creado: {data.get('meta', {}).get('createdAt', 'N/A')}")
        print(f"Actualizado: {data.get('meta', {}).get('updatedAt', 'N/A')}")
        
        # Guardar workflow limpio para importar
        clean_workflow = {
            'name': data['name'],
            'nodes': data['nodes'],
            'connections': data['connections'],
            'settings': data.get('settings', {}),
            'staticData': data.get('staticData')
        }
        
        output_file = f"/tmp/import_{wf_id}.json"
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(clean_workflow, f, indent=2)
        
        print(f"✅ Preparado para importar: {output_file}")
        
    except Exception as e:
        print(f"❌ Error: {e}")

print(f"\n{'='*60}")
print("✅ Workflows preparados. Importando a n8n...")
print(f"{'='*60}\n")

