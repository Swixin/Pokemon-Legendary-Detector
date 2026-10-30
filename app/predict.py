"""ML bridge: reads one JSON Pokemon from stdin, prints a JSON prediction to stdout."""
import json
import sys
import warnings
from pathlib import Path

import joblib
import pandas as pd

warnings.filterwarnings("ignore")

MODELS_PATH = Path(__file__).resolve().parent.parent / "models.pkl"
PRIMARY = "brf"
STATS = {
    "hp": "HP",
    "attack": "Attack",
    "defense": "Defense",
    "spAtk": "Sp. Atk",
    "spDef": "Sp. Def",
    "speed": "Speed",
}


def build_row(data, columns):
    row = dict.fromkeys(columns, 0)
    for key, column in STATS.items():
        row[column] = data[key]
    row[f"Type 1_{data['type1']}"] = 1
    row[f"Type 2_{data['type2']}"] = 1
    row[f"Generation_{data['generation']}"] = 1
    return pd.DataFrame([row], columns=columns)


def main():
    data = json.load(sys.stdin)
    models = joblib.load(MODELS_PATH)
    columns = list(models[PRIMARY].feature_names_in_)
    X = build_row(data, columns)

    votes = {name: bool(model.predict(X)[0]) for name, model in models.items()}
    probability = float(models[PRIMARY].predict_proba(X)[0][1])

    json.dump(
        {
            "legendary": votes[PRIMARY],
            "probability": probability,
            "votes": votes,
            "primary": PRIMARY,
        },
        sys.stdout,
    )


if __name__ == "__main__":
    main()
