"""Summarize simulate.mjs CSV shards. Usage: python analyze.py <shard-directory>"""
import csv
import itertools
import sys
from collections import defaultdict
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parent
RAW = Path(sys.argv[1])
LABELS = [
    "기사·궁수·사제", "기사·마법사·사제", "전사·궁수·사제", "기사·궁수·궁수",
    "기사·마법사·마법사", "기사·전사·전사", "전사·마법사·궁수", "기사·사제·사제",
]
rows = defaultdict(list)
for file in sorted(RAW.glob("*.csv")):
    with file.open(encoding="utf-8") as src:
        for row in csv.DictReader(src):
            if "mode" in row:
                rows[row["mode"]].append(row)


def summary(values):
    """Percent mean and 95% paired bootstrap interval by independent roster seed."""
    values = np.asarray(values)
    rng = np.random.default_rng(1127)
    idx = rng.integers(len(values), size=(4000, len(values)))
    lo, hi = np.quantile(values[idx].mean(axis=1), [.025, .975])
    return tuple(round(100 * v, 2) for v in (values.mean(), lo, hi))


def tally(row):
    return np.array([int(row[k]) for k in ("win", "loss", "draw")])


def matrix(mode):
    groups = defaultdict(list)
    for r in rows[mode]:
        i, j = int(r["left"]), int(r["right"])
        w, l, d = tally(r)
        groups[i, j].append((w, l, d))
        if mode == "matrix":
            groups[j, i].append((l, w, d))
    mat = np.full((8, 8), .5)
    with (ROOT / (mode + ".csv")).open("w", newline="", encoding="utf-8-sig") as dest:
        writer = csv.writer(dest)
        writer.writerow(["도전 파티", "상대 파티", "승", "패", "무", "승률(%)", "95% 하한", "95% 상한"])
        for (i, j), values in sorted(groups.items()):
            counts = np.asarray(values)
            shares = counts[:, 0] / counts.sum(axis=1)
            mat[i, j] = shares.mean()
            writer.writerow([LABELS[i], LABELS[j], *counts.sum(axis=0), *summary(shares)])
    print(mode, "wins (%) by row", np.round(100 * mat, 1), sep="\n")
    return mat


def pairs(mode):
    per_seed = defaultdict(dict)
    for r in rows[mode]:
        c = tally(r)
        per_seed[int(r["seed"])][r["variant"], r["condition"]] = c
    keys = list(next(iter(per_seed.values())))
    variants = sorted({k[0] for k in keys})
    conditions = sorted({k[1] for k in keys})
    rates = {}
    lines = []
    for v in variants:
        for c in conditions:
            arr = np.array([sample[v, c] for sample in per_seed.values()])
            rates[v, c] = arr[:, 0] / arr.sum(axis=1)
            lines.append([mode, v, c, *arr.sum(axis=0), *summary(rates[v, c])])
    deltas = []
    for c in conditions:
        delta = rates[variants[1], c] - rates[variants[0], c]
        deltas.append(delta)
        lines.append([mode, " - ".join(reversed(variants)), c, "", "", "", *summary(delta)])
    lines.append([mode, "difference in differences", " - ".join(reversed(conditions)), "", "", "", *summary(deltas[1] - deltas[0])])
    print(mode, lines)
    return lines


def series(wins, order):
    # Probability of at least two wins in three independent fights. Timeouts
    # count as unwon rounds; the unplayed third fight after a 2-0 cannot affect it.
    a, b, c = (wins[order[j], j] for j in range(3))
    return a*b + a*c + b*c - 2*a*b*c


def best_orders(mat, orders):
    vals = [series(mat, order) for order in orders]
    return [order for order, v in zip(orders, vals) if np.isclose(v, max(vals), rtol=0, atol=1e-10)]


def tags(class_mat):
    # Fit general strengths without pair-specific bonuses, using only class trials.
    # The class model treats a draw as half a win on each side when fitting
    # paired strengths. The played evaluation always requires two actual wins.
    observations = (1 + class_mat - class_mat.T) / 2
    ratings = np.zeros(8)
    for _ in range(1000):
        strength_mat = 1 / (1 + np.exp(ratings[None, :] - ratings[:, None]))
        gradient = (observations - strength_mat).sum(axis=1)
        if np.max(np.abs(gradient)) < 1e-10:
            break
        ratings += .25 * gradient
    else:
        raise ArithmeticError("Class strength fit failed to converge")
    seeds = defaultdict(list)
    for r in rows["tag"]:
        seeds[int(r["seed"])].append(r)
    policies = ["blind", "class_strength", "class_matchup", "practice_strength", "practice_matchup"]
    results = []
    orders = list(itertools.permutations(range(3)))
    for seed, sample in seeds.items():
        blocks = {k: np.zeros((3, 3)) for k in ("practice", "evaluation", "strength", "class", "practice_score")}
        for r in sample:
            i, j = int(r["left"]), int(r["right"])
            a, b = map(int, r["variant"].split(":"))
            counts = tally(r)
            blocks[r["condition"]][i, j] = counts[0] / counts.sum()
            if r["condition"] == "practice":
                blocks["practice_score"][i, j] = (counts[0] + .5 * counts[2] + .5) / (counts.sum() + 1)
            blocks["strength"][i, j] = strength_mat[a, b]
            blocks["class"][i, j] = class_mat[a, b]
        # Use the same nine practice pairings. Fit six team strengths and
        # discard opponent-specific advantages. The half-win/loss pseudocount
        # above keeps ratings finite when a party wins all twelve practice bouts.
        a_rating, b_rating = np.zeros(3), np.zeros(3)
        for _ in range(1500):
            approx = 1 / (1 + np.exp(b_rating[None, :] - a_rating[:, None]))
            residual = blocks["practice_score"] - approx
            a_step, b_step = residual.sum(axis=1), -residual.sum(axis=0)
            if max(abs(a_step).max(), abs(b_step).max()) < 1e-9:
                break
            a_rating += .5 * a_step
            b_rating += .5 * b_step
        else:
            raise ArithmeticError("Practice strength fit failed to converge")
        blocks["practice_strength"] = approx
        candidates = [orders] + [best_orders(blocks[k], orders) for k in ("strength", "class", "practice_strength", "practice")]
        scores = [np.mean([series(blocks["evaluation"], order) for order in opts]) for opts in candidates]
        results.append([seed, *scores])
    with (ROOT / "tag.csv").open("w", newline="", encoding="utf-8-sig") as dest:
        writer = csv.writer(dest)
        writer.writerow(["seed", *policies])
        writer.writerows(results)
    scores = np.array(results)[:, 1:]
    for i, p in enumerate(policies):
        print(p, summary(scores[:, i]), "vs blind", summary(scores[:, i] - scores[:, 0]))
    print("class matchup minus strength", summary(scores[:, 2] - scores[:, 1]))
    print("practice matchup minus strength", summary(scores[:, 4] - scores[:, 3]))


if __name__ == "__main__":
    expected = {"matrix": (256, 28), "gap": (96, 64), "formation": (240, 4),
                "shield": (240, 4), "leader": (384, 4), "tag": (64, 18)}
    for mode, (n_seeds, per_seed) in expected.items():
        seen = defaultdict(set)
        for r in rows[mode]:
            key = tuple(r[k] for k in ("left", "right", "variant", "condition"))
            assert key not in seen[r["seed"]], (mode, r)
            seen[r["seed"]].add(key)
            assert tally(r).sum() == (12 if mode == "tag" else 2), (mode, r)
        assert len(seen) == n_seeds and all(len(v) == per_seed for v in seen.values()), mode
    common = matrix("matrix")
    matrix("gap")
    with (ROOT / "controls.csv").open("w", newline="", encoding="utf-8-sig") as dest:
        writer = csv.writer(dest)
        writer.writerow(["실험", "대안·비교", "상대 조건", "승", "패", "무", "승률·차이", "95% 하한", "95% 상한"])
        for mode in ("formation", "shield", "leader"):
            writer.writerows(pairs(mode))
    tags(common)
    print("duels", {k: sum(tally(r).sum() for r in v) for k, v in rows.items()})
