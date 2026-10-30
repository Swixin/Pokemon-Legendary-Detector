from sklearn.dummy import DummyClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.svm import SVC
from sklearn.neighbors import KNeighborsClassifier
from sklearn.ensemble import RandomForestClassifier
from imblearn.ensemble import BalancedRandomForestClassifier
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import accuracy_score, f1_score, recall_score


import joblib

X_train, X_test, y_train, y_test = joblib.load("dataset/split.pkl")

dummy = DummyClassifier(strategy="most_frequent", random_state=42)
dummy.fit(X_train, y_train)
dummy_predictions = dummy.predict(X_test)

print(f"Accu: {accuracy_score(y_test, dummy_predictions)}\nF1: {f1_score(y_test, dummy_predictions, zero_division=0)}\nRecall: {recall_score(y_test, dummy_predictions)}")

baseline = accuracy_score(y_test, dummy_predictions)


models = {
    "logreg": make_pipeline(StandardScaler(), LogisticRegression(class_weight="balanced", max_iter=1000)),
    "svm": make_pipeline(StandardScaler(), SVC(class_weight="balanced", random_state=42)),
    "k-neighbors": make_pipeline(StandardScaler(), KNeighborsClassifier(n_neighbors=3, weights='distance')),
    "rfc": RandomForestClassifier(class_weight="balanced", random_state=42),
    "brf": BalancedRandomForestClassifier(n_estimators=500, random_state=42)
}

for name, model in models.items():
    model.fit(X_train, y_train)
    model_predictions = model.predict(X_test)

    print(name + ":")
    print(f"Accu: {accuracy_score(y_test, model_predictions)}")
    print(f"F1: {f1_score(y_test, model_predictions, zero_division=0)}")
    print(f"Recall: {recall_score(y_test, model_predictions)}")
    print("")

joblib.dump(models, "models.pkl")