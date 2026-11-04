import express from 'express';
import { readFileSync } from 'node:fs';
import { spawn } from 'node:child_process';

const scores = JSON.parse(readFileSync(import.meta.dirname + "/../scores.json", "utf8"));

const app = express();
const PORT = process.env.PORT || 3000;

const referenceT1 = ['Type 1_Bug',
       'Type 1_Dark', 'Type 1_Dragon', 'Type 1_Electric', 'Type 1_Fairy',
       'Type 1_Fighting', 'Type 1_Fire', 'Type 1_Flying', 'Type 1_Ghost',
       'Type 1_Grass', 'Type 1_Ground', 'Type 1_Ice', 'Type 1_Normal',
       'Type 1_Poison', 'Type 1_Psychic', 'Type 1_Rock', 'Type 1_Steel',
       'Type 1_Water']

const referenceT2 = ['Type 2_Bug', 'Type 2_Dark', 'Type 2_Dragon',
       'Type 2_Electric', 'Type 2_Fairy', 'Type 2_Fighting', 'Type 2_Fire',
       'Type 2_Flying', 'Type 2_Ghost', 'Type 2_Grass', 'Type 2_Ground',
       'Type 2_Ice', 'Type 2_None', 'Type 2_Normal', 'Type 2_Poison',
       'Type 2_Psychic', 'Type 2_Rock', 'Type 2_Steel', 'Type 2_Water']

const referenceGen = ['Generation_1', 'Generation_2', 'Generation_3', 'Generation_4',
       'Generation_5', 'Generation_6']

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.set('view engine', 'ejs')
app.set('views', import.meta.dirname + "/views")

app.get("/", (req, res) => {
    res.render("index.ejs", { scores })
})

// form field -> the exact column name the models were trained with
const statColumns = {
    "hp": "HP",
    "attack": "Attack",
    "defense": "Defense",
    "spAtk": "Sp. Atk",
    "spDef": "Sp. Def",
    "speed": "Speed",
}

// send the encoded row to classify.py on stdin, get the prediction back on stdout
function classify(row) {
    return new Promise((resolve, reject) => {
        const py = spawn(import.meta.dirname + "/../venv/bin/python", [import.meta.dirname + "/classify.py"])
        let out = ""
        let err = ""

        py.stdout.on("data", (d) => out += d)
        py.stderr.on("data", (d) => err += d)
        py.on("error", reject)
        py.on("close", (code) => {
            if (code !== 0) return reject(new Error(err || "python exited with code " + code))
            try {
                resolve(JSON.parse(out))
            } catch (e) {
                reject(e)
            }
        })

        py.stdin.end(JSON.stringify(row))
    })
}

app.post("/predict", async (req, res) => {
    const stats = req.body
    const formattedStats = {}

    for (const [field, column] of Object.entries(statColumns)) {
        const value = Number(stats[field])
        if (!Number.isFinite(value) || value < 1 || value > 255) {
            return res.status(400).json({ error: column + " must be a number from 1 to 255" })
        }
        formattedStats[column] = value
    }

    if (!referenceT1.includes("Type 1_" + stats.type1)) {
        return res.status(400).json({ error: "Invalid primary type" })
    }
    if (!referenceT2.includes("Type 2_" + stats.type2)) {
        return res.status(400).json({ error: "Invalid secondary type" })
    }
    if (!referenceGen.includes("Generation_" + stats.generation)) {
        return res.status(400).json({ error: "Invalid generation" })
    }

    for (const stat of referenceT1) {
        formattedStats[stat] = Number(stat == "Type 1_" + stats.type1)
    }

    for (const stat of referenceT2) {
        formattedStats[stat] = Number(stat == "Type 2_" + stats.type2)
    }

    for (const stat of referenceGen) {
        formattedStats[stat] = Number(stat == "Generation_" + stats.generation)
    }

    try {
        const result = await classify(formattedStats)
        
        res.render("index.ejs", { scores, result, error: null })
    } catch (err) {
        console.error(err)
        res.status(500).json({ error: "Prediction failed" })
    }
})


app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));