"""Reads one encoded Pokemon row (JSON object) from stdin, prints a JSON prediction to stdout."""
import json
import sys
import warnings
from pathlib import Path

import joblib
import pandas as pd

warnings.filterwarnings("ignore")

MODELS_PATH = Path(__file__).resolve().parent.parent / "models.pkl"
PRIMARY = "brf"


def main():
    row = json.load(sys.stdin)
    models = joblib.load(MODELS_PATH)
    columns = list(models[PRIMARY].feature_names_in_)

    # KeyError here means Node sent a row that does not match the training columns
    X = pd.DataFrame([[row[column] for column in columns]], columns=columns)

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
