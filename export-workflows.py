#!/usr/bin/env python3
"""
Script para exportar workflows de la DB corrupta de n8n
"""
import sqlite3
import json
import os

# Conexión a la base de datos corrupta
db_path = '/opt/cane/volumes/n8n-corrupted-20250813/database.sqlite'
output_dir = '/opt/cane/3t/workflows-recuperados'

conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# Obtener todos los workflows
cursor.execute("""
    SELECT id, name, nodes, connections, settings, staticData, 
           active, createdAt, updatedAt
    FROM workflow_entity
    ORDER BY updatedAt DESC
""")

workflows = cursor.fetchall()

print(f"📦 Exportando {len(workflows)} workflows...")

exported = 0
for workflow in workflows:
    try:
        wf_id, name, nodes, connections, settings, staticData, active, createdAt, updatedAt = workflow
        
        # Crear objeto workflow
        workflow_data = {
            "name": name,
            "nodes": json.loads(nodes) if nodes else [],
            "connections": json.loads(connections) if connections else {},
            "settings": json.loads(settings) if settings else {},
            "staticData": json.loads(staticData) if staticData else None,
            "active": bool(active),
            "meta": {
                "original_id": wf_id,
                "createdAt": createdAt,
                "updatedAt": updatedAt
            }
        }
        
        # Sanitizar nombre de archivo
        safe_name = "".join(c if c.isalnum() or c in (' ', '-', '_') else '_' for c in name)
        safe_name = safe_name[:100]  # Limitar longitud
        filename = f"{wf_id}_{safe_name}.json"
        filepath = os.path.join(output_dir, filename)
        
        # Guardar JSON
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(workflow_data, f, indent=2, ensure_ascii=False)
        
        exported += 1
        print(f"✅ {exported}/{len(workflows)}: {name}")
        
    except Exception as e:
        print(f"❌ Error exportando {name}: {e}")

conn.close()

print(f"\n🎉 Exportados {exported} workflows a {output_dir}")


