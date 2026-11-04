import pandas as pd
from sklearn.model_selection import train_test_split
import joblib


df = pd.read_csv("./dataset/Pokemon.csv")

df = df.drop_duplicates(subset="#", keep="first")

df.drop(columns=["#", "Total", "Name"], inplace=True)
df["Type 2"] = df["Type 2"].fillna("None")

df = pd.get_dummies(df, columns=["Type 1", "Type 2", "Generation"], dtype=int)

X = df.drop(columns=["Legendary"])
y = df["Legendary"]
y = y.astype(int)

print(X.head(5))
print(y.head(5))
print(X.columns)

X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, stratify=y, random_state=42)

joblib.dump((X_train, X_test, y_train, y_test), "dataset/split.pkl")