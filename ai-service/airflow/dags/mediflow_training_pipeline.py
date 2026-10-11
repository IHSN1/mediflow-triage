from datetime import datetime
from airflow import DAG
from airflow.operators.bash import BashOperator

PROJECT_SRC = "/opt/airflow/project/src"

default_args = {"owner": "wissal", "retries": 1}

with DAG(
    dag_id="mediflow_training_pipeline",
    description="Pipeline Big Data : nettoyage + entrainement XGBoost (parallele) pour MediFlow AI",
    schedule_interval="@daily",
    start_date=datetime(2026, 8, 1),
    catchup=False,
    default_args=default_args,
    tags=["mediflow", "ml"],
) as dag:

    clean_data = BashOperator(
        task_id="clean_data",
        bash_command=f"cd {PROJECT_SRC} && python prepare_data.py",
    )

    train_baseline = BashOperator(
        task_id="train_baseline",
        bash_command=f"cd {PROJECT_SRC} && python train_model.py --mode baseline",
    )

    train_tuned = BashOperator(
        task_id="train_tuned",
        bash_command=f"cd {PROJECT_SRC} && python train_model.py --mode tuned",
    )

    compare_and_save = BashOperator(
        task_id="compare_and_save",
        bash_command=f"cd {PROJECT_SRC} && python train_model.py --mode compare",
    )

    validate_model = BashOperator(
        task_id="validate_model",
        bash_command=(
            "test -f /opt/airflow/project/models/xgboost_triage_model.pkl "
            "&& echo 'Modele final sauvegarde' "
            "&& ls -la /opt/airflow/project/models/xgboost_triage_model.pkl"
        ),
    )

    clean_data >> [train_baseline, train_tuned] >> compare_and_save >> validate_model