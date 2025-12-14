"""
Framework A/B Testing para Validar Precios Dinámicos y Alertas de Churn
Sistema de experimentos controlados para medir el impacto de las predicciones ML
"""

import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import json
import os
import logging
from typing import Dict, List, Optional
from enum import Enum

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

# --- Configuración ---
EXPERIMENTS_DIR = "/opt/cane/3t/ml/experiments"
RESULTS_DIR = "/opt/cane/3t/ml/reports/ab_tests"

os.makedirs(EXPERIMENTS_DIR, exist_ok=True)
os.makedirs(RESULTS_DIR, exist_ok=True)

class ExperimentType(Enum):
    DYNAMIC_PRICING = "dynamic_pricing"
    CHURN_ALERT = "churn_alert"
    DEMAND_FORECAST = "demand_forecast"

class ExperimentStatus(Enum):
    DRAFT = "draft"
    ACTIVE = "active"
    PAUSED = "paused"
    COMPLETED = "completed"

class ABTestExperiment:
    """
    Clase para manejar experimentos A/B Testing
    """
    
    def __init__(
        self,
        experiment_id: str,
        name: str,
        experiment_type: ExperimentType,
        description: str,
        start_date: datetime,
        end_date: datetime,
        control_group_size: float = 0.5,
        treatment_group_size: float = 0.5
    ):
        self.experiment_id = experiment_id
        self.name = name
        self.experiment_type = experiment_type
        self.description = description
        self.start_date = start_date
        self.end_date = end_date
        self.control_group_size = control_group_size
        self.treatment_group_size = treatment_group_size
        self.status = ExperimentStatus.DRAFT
        
        self.control_group = []
        self.treatment_group = []
        self.results = {
            "control": {},
            "treatment": {},
            "metrics": {}
        }
    
    def assign_groups(self, customer_ids: List[str], seed: int = 42):
        """
        Asignar clientes a grupo de control o tratamiento aleatoriamente
        """
        np.random.seed(seed)
        shuffled_ids = np.random.permutation(customer_ids)
        
        control_size = int(len(shuffled_ids) * self.control_group_size)
        
        self.control_group = shuffled_ids[:control_size].tolist()
        self.treatment_group = shuffled_ids[control_size:].tolist()
        
        logging.info(f"✓ Grupos asignados:")
        logging.info(f"  → Control: {len(self.control_group)} clientes")
        logging.info(f"  → Treatment: {len(self.treatment_group)} clientes")
        
        return self.control_group, self.treatment_group
    
    def is_customer_in_treatment(self, customer_id: str) -> bool:
        """Verificar si un cliente está en el grupo de tratamiento"""
        return customer_id in self.treatment_group
    
    def record_outcome(self, customer_id: str, outcome: Dict):
        """
        Registrar resultado de un cliente
        outcome = {
            "revenue": 45000,
            "orders_count": 3,
            "churned": False,
            "timestamp": datetime
        }
        """
        group = "treatment" if self.is_customer_in_treatment(customer_id) else "control"
        
        if customer_id not in self.results[group]:
            self.results[group][customer_id] = []
        
        self.results[group][customer_id].append(outcome)
    
    def calculate_metrics(self):
        """Calcular métricas de éxito del experimento"""
        logging.info(f"\n📊 Calculando métricas para: {self.name}")
        
        # Métricas del grupo de control
        control_revenue = sum(
            sum(outcome["revenue"] for outcome in outcomes)
            for outcomes in self.results["control"].values()
        )
        control_orders = sum(
            sum(outcome["orders_count"] for outcome in outcomes)
            for outcomes in self.results["control"].values()
        )
        control_churned = sum(
            1 for outcomes in self.results["control"].values()
            if any(outcome.get("churned", False) for outcome in outcomes)
        )
        
        # Métricas del grupo de tratamiento
        treatment_revenue = sum(
            sum(outcome["revenue"] for outcome in outcomes)
            for outcomes in self.results["treatment"].values()
        )
        treatment_orders = sum(
            sum(outcome["orders_count"] for outcome in outcomes)
            for outcomes in self.results["treatment"].values()
        )
        treatment_churned = sum(
            1 for outcomes in self.results["treatment"].values()
            if any(outcome.get("churned", False) for outcome in outcomes)
        )
        
        # Calcular uplift
        control_customers = len(self.results["control"])
        treatment_customers = len(self.results["treatment"])
        
        control_avg_revenue = control_revenue / control_customers if control_customers > 0 else 0
        treatment_avg_revenue = treatment_revenue / treatment_customers if treatment_customers > 0 else 0
        
        revenue_uplift = ((treatment_avg_revenue - control_avg_revenue) / control_avg_revenue * 100) if control_avg_revenue > 0 else 0
        
        control_churn_rate = (control_churned / control_customers * 100) if control_customers > 0 else 0
        treatment_churn_rate = (treatment_churned / treatment_customers * 100) if treatment_customers > 0 else 0
        churn_reduction = control_churn_rate - treatment_churn_rate
        
        self.results["metrics"] = {
            "control": {
                "customers": control_customers,
                "total_revenue": control_revenue,
                "avg_revenue_per_customer": control_avg_revenue,
                "total_orders": control_orders,
                "churned_customers": control_churned,
                "churn_rate": control_churn_rate
            },
            "treatment": {
                "customers": treatment_customers,
                "total_revenue": treatment_revenue,
                "avg_revenue_per_customer": treatment_avg_revenue,
                "total_orders": treatment_orders,
                "churned_customers": treatment_churned,
                "churn_rate": treatment_churn_rate
            },
            "uplift": {
                "revenue_uplift_pct": revenue_uplift,
                "churn_reduction_pct": churn_reduction,
                "absolute_revenue_diff": treatment_avg_revenue - control_avg_revenue,
                "orders_diff": treatment_orders - control_orders
            }
        }
        
        logging.info(f"\n🎯 RESULTADOS:")
        logging.info(f"  Control:")
        logging.info(f"    → Revenue promedio: ${control_avg_revenue:,.0f}")
        logging.info(f"    → Churn rate: {control_churn_rate:.1f}%")
        logging.info(f"  Treatment:")
        logging.info(f"    → Revenue promedio: ${treatment_avg_revenue:,.0f}")
        logging.info(f"    → Churn rate: {treatment_churn_rate:.1f}%")
        logging.info(f"  Uplift:")
        logging.info(f"    → Revenue: {revenue_uplift:+.1f}%")
        logging.info(f"    → Churn reduction: {churn_reduction:+.1f}%")
        
        return self.results["metrics"]
    
    def save_experiment(self):
        """Guardar experimento a disco"""
        filename = f"{self.experiment_id}.json"
        filepath = os.path.join(EXPERIMENTS_DIR, filename)
        
        data = {
            "experiment_id": self.experiment_id,
            "name": self.name,
            "type": self.experiment_type.value,
            "description": self.description,
            "start_date": self.start_date.isoformat(),
            "end_date": self.end_date.isoformat(),
            "status": self.status.value,
            "control_group_size": self.control_group_size,
            "treatment_group_size": self.treatment_group_size,
            "control_group": self.control_group,
            "treatment_group": self.treatment_group,
            "results": self.results
        }
        
        with open(filepath, 'w') as f:
            json.dump(data, f, indent=2, default=str)
        
        logging.info(f"💾 Experimento guardado: {filepath}")
        return filepath
    
    @staticmethod
    def load_experiment(experiment_id: str):
        """Cargar experimento desde disco"""
        filename = f"{experiment_id}.json"
        filepath = os.path.join(EXPERIMENTS_DIR, filename)
        
        if not os.path.exists(filepath):
            raise FileNotFoundError(f"Experimento {experiment_id} no encontrado")
        
        with open(filepath, 'r') as f:
            data = json.load(f)
        
        experiment = ABTestExperiment(
            experiment_id=data["experiment_id"],
            name=data["name"],
            experiment_type=ExperimentType(data["type"]),
            description=data["description"],
            start_date=datetime.fromisoformat(data["start_date"]),
            end_date=datetime.fromisoformat(data["end_date"]),
            control_group_size=data["control_group_size"],
            treatment_group_size=data["treatment_group_size"]
        )
        
        experiment.status = ExperimentStatus(data["status"])
        experiment.control_group = data["control_group"]
        experiment.treatment_group = data["treatment_group"]
        experiment.results = data["results"]
        
        logging.info(f"📂 Experimento cargado: {experiment_id}")
        return experiment
    
    def generate_report(self):
        """Generar reporte detallado del experimento"""
        report_path = os.path.join(RESULTS_DIR, f"{self.experiment_id}_report.md")
        
        with open(report_path, 'w') as f:
            f.write(f"# Reporte A/B Test: {self.name}\n\n")
            f.write(f"**ID:** `{self.experiment_id}`\n\n")
            f.write(f"**Tipo:** {self.experiment_type.value}\n\n")
            f.write(f"**Descripción:** {self.description}\n\n")
            f.write(f"**Periodo:** {self.start_date.strftime('%Y-%m-%d')} → {self.end_date.strftime('%Y-%m-%d')}\n\n")
            f.write(f"**Estado:** {self.status.value}\n\n")
            f.write("---\n\n")
            
            f.write("## Grupos de Experimento\n\n")
            f.write(f"- **Control:** {len(self.control_group)} clientes ({self.control_group_size*100:.0f}%)\n")
            f.write(f"- **Treatment:** {len(self.treatment_group)} clientes ({self.treatment_group_size*100:.0f}%)\n\n")
            
            if self.results["metrics"]:
                metrics = self.results["metrics"]
                
                f.write("## Resultados\n\n")
                f.write("### Grupo de Control\n\n")
                f.write(f"- **Clientes:** {metrics['control']['customers']}\n")
                f.write(f"- **Revenue Total:** ${metrics['control']['total_revenue']:,.0f}\n")
                f.write(f"- **Revenue Promedio/Cliente:** ${metrics['control']['avg_revenue_per_customer']:,.0f}\n")
                f.write(f"- **Pedidos Totales:** {metrics['control']['total_orders']}\n")
                f.write(f"- **Churn Rate:** {metrics['control']['churn_rate']:.1f}%\n\n")
                
                f.write("### Grupo de Tratamiento\n\n")
                f.write(f"- **Clientes:** {metrics['treatment']['customers']}\n")
                f.write(f"- **Revenue Total:** ${metrics['treatment']['total_revenue']:,.0f}\n")
                f.write(f"- **Revenue Promedio/Cliente:** ${metrics['treatment']['avg_revenue_per_customer']:,.0f}\n")
                f.write(f"- **Pedidos Totales:** {metrics['treatment']['total_orders']}\n")
                f.write(f"- **Churn Rate:** {metrics['treatment']['churn_rate']:.1f}%\n\n")
                
                f.write("### Uplift\n\n")
                f.write(f"- **Revenue Uplift:** {metrics['uplift']['revenue_uplift_pct']:+.1f}%\n")
                f.write(f"- **Churn Reduction:** {metrics['uplift']['churn_reduction_pct']:+.1f}%\n")
                f.write(f"- **Diferencia Revenue Absoluta:** ${metrics['uplift']['absolute_revenue_diff']:+,.0f}\n")
                f.write(f"- **Diferencia Pedidos:** {metrics['uplift']['orders_diff']:+}\n\n")
            
            f.write("---\n\n")
            f.write("## Conclusiones\n\n")
            
            if self.results["metrics"]:
                uplift = self.results["metrics"]["uplift"]["revenue_uplift_pct"]
                churn_reduction = self.results["metrics"]["uplift"]["churn_reduction_pct"]
                
                if uplift > 5:
                    f.write("✅ **POSITIVO:** El experimento muestra un uplift significativo de revenue.\n\n")
                elif uplift > 0:
                    f.write("⚠️ **MARGINAL:** El uplift de revenue es positivo pero modesto.\n\n")
                else:
                    f.write("❌ **NEGATIVO:** El experimento no muestra uplift de revenue.\n\n")
                
                if churn_reduction > 5:
                    f.write("✅ **POSITIVO:** Reducción significativa de churn.\n\n")
                elif churn_reduction > 0:
                    f.write("⚠️ **MARGINAL:** Reducción de churn positiva pero modesta.\n\n")
                else:
                    f.write("❌ **NEGATIVO:** No se observa reducción de churn.\n\n")
            
            f.write("## Recomendaciones\n\n")
            f.write("1. Analizar los resultados en contexto del negocio\n")
            f.write("2. Validar con stakeholders\n")
            f.write("3. Considerar extender el experimento si los resultados son marginales\n")
            f.write("4. Implementar en producción si el uplift es positivo y significativo\n\n")
        
        logging.info(f"📄 Reporte generado: {report_path}")
        return report_path


# --- Funciones Helper para Experimentos Específicos ---

def create_dynamic_pricing_experiment(
    customer_ids: List[str],
    start_date: datetime = None,
    duration_days: int = 30
) -> ABTestExperiment:
    """
    Crear experimento A/B para precios dinámicos
    Control: Precios estáticos tradicionales
    Treatment: Precios sugeridos por modelo ML
    """
    if start_date is None:
        start_date = datetime.now()
    
    end_date = start_date + timedelta(days=duration_days)
    
    experiment = ABTestExperiment(
        experiment_id=f"dynamic_pricing_{start_date.strftime('%Y%m%d')}",
        name="Validación de Precios Dinámicos ML",
        experiment_type=ExperimentType.DYNAMIC_PRICING,
        description=(
            "Experimento para validar el impacto de precios sugeridos por el modelo Ridge Regression "
            "vs precios estáticos tradicionales en el revenue y satisfacción del cliente."
        ),
        start_date=start_date,
        end_date=end_date,
        control_group_size=0.5,
        treatment_group_size=0.5
    )
    
    experiment.assign_groups(customer_ids)
    experiment.status = ExperimentStatus.ACTIVE
    experiment.save_experiment()
    
    logging.info(f"🚀 Experimento de Precios Dinámicos creado: {experiment.experiment_id}")
    return experiment

def create_churn_alert_experiment(
    customer_ids: List[str],
    start_date: datetime = None,
    duration_days: int = 60
) -> ABTestExperiment:
    """
    Crear experimento A/B para alertas de churn
    Control: Sin alertas proactivas
    Treatment: Alertas proactivas con acciones de retención
    """
    if start_date is None:
        start_date = datetime.now()
    
    end_date = start_date + timedelta(days=duration_days)
    
    experiment = ABTestExperiment(
        experiment_id=f"churn_alert_{start_date.strftime('%Y%m%d')}",
        name="Validación de Alertas de Churn",
        experiment_type=ExperimentType.CHURN_ALERT,
        description=(
            "Experimento para medir el impacto de alertas proactivas de churn (predichas por XGBoost) "
            "y acciones de retención en la tasa de churn real."
        ),
        start_date=start_date,
        end_date=end_date,
        control_group_size=0.5,
        treatment_group_size=0.5
    )
    
    experiment.assign_groups(customer_ids)
    experiment.status = ExperimentStatus.ACTIVE
    experiment.save_experiment()
    
    logging.info(f"🚀 Experimento de Alertas de Churn creado: {experiment.experiment_id}")
    return experiment


# --- CLI para Gestión de Experimentos ---

def main():
    """CLI de ejemplo para gestionar experimentos A/B"""
    logging.info("🧪 Framework A/B Testing - Agua Tres Torres")
    logging.info("=" * 60)
    
    # Ejemplo: Crear experimento de precios dinámicos
    customer_ids_example = [f"customer_{i}" for i in range(1, 101)]  # 100 clientes de ejemplo
    
    # Crear experimento
    experiment = create_dynamic_pricing_experiment(
        customer_ids=customer_ids_example,
        start_date=datetime.now(),
        duration_days=30
    )
    
    # Simular algunos resultados (en producción, esto vendría de Supabase)
    logging.info("\n📊 Simulando resultados...")
    for customer_id in experiment.control_group[:10]:
        experiment.record_outcome(customer_id, {
            "revenue": np.random.randint(10000, 50000),
            "orders_count": np.random.randint(1, 5),
            "churned": np.random.choice([True, False], p=[0.2, 0.8]),
            "timestamp": datetime.now()
        })
    
    for customer_id in experiment.treatment_group[:10]:
        experiment.record_outcome(customer_id, {
            "revenue": np.random.randint(12000, 60000),  # Mayor revenue en treatment
            "orders_count": np.random.randint(1, 6),
            "churned": np.random.choice([True, False], p=[0.15, 0.85]),  # Menor churn
            "timestamp": datetime.now()
        })
    
    # Calcular métricas
    experiment.calculate_metrics()
    
    # Generar reporte
    report_path = experiment.generate_report()
    
    # Guardar experimento actualizado
    experiment.save_experiment()
    
    logging.info("\n✅ Experimento configurado exitosamente")
    logging.info(f"📄 Reporte: {report_path}")
    logging.info("\n💡 Para usar en producción:")
    logging.info("   1. Integrar con Supabase para obtener customer_ids reales")
    logging.info("   2. Registrar outcomes desde la app 3T cuando se crean pedidos")
    logging.info("   3. Configurar cron job para calcular métricas diariamente")
    logging.info("   4. Notificar al equipo cuando un experimento termina")

if __name__ == "__main__":
    main()

