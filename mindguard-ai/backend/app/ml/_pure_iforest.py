"""Dependency-free Isolation Forest (fallback only).

The production path uses scikit-learn's IsolationForest
(see anomaly_detector.py). This module is used only when scikit-learn
is not installed, so the training pipeline and its tests can still run.
It follows Liu, Ting & Zhou (2008) and mirrors scikit-learn's API:
`score_samples` (higher = more normal), `decision_function`
(< 0 = unusual) and `predict` (-1 unusual, 1 normal).
"""

from __future__ import annotations

import math
import random
from statistics import median


def _c(n: int) -> float:
    """Average path length of an unsuccessful BST search."""
    if n <= 1:
        return 0.0
    if n == 2:
        return 1.0
    return 2.0 * (math.log(n - 1) + 0.5772156649) - 2.0 * (n - 1) / n


class _Node:
    __slots__ = ("feature", "split", "left", "right", "size")

    def __init__(self, feature=None, split=None, left=None, right=None, size=0):
        self.feature, self.split, self.left, self.right, self.size = feature, split, left, right, size


def _build(rows, depth, max_depth, rng):
    if depth >= max_depth or len(rows) <= 1:
        return _Node(size=len(rows))
    n_features = len(rows[0])
    candidates = [f for f in range(n_features) if min(r[f] for r in rows) < max(r[f] for r in rows)]
    if not candidates:
        return _Node(size=len(rows))
    f = rng.choice(candidates)
    lo, hi = min(r[f] for r in rows), max(r[f] for r in rows)
    split = rng.uniform(lo, hi)
    left = [r for r in rows if r[f] < split]
    right = [r for r in rows if r[f] >= split]
    return _Node(f, split, _build(left, depth + 1, max_depth, rng), _build(right, depth + 1, max_depth, rng))


def _path(x, node, depth=0):
    while node.feature is not None:
        node = node.left if x[node.feature] < node.split else node.right
        depth += 1
    return depth + _c(node.size)


class PureIsolationForest:
    def __init__(self, n_estimators=100, max_samples="auto", contamination=0.05, random_state=None, **_):
        self.n_estimators = n_estimators
        self.max_samples = max_samples
        self.contamination = contamination
        self.random_state = random_state

    def fit(self, X):
        rng = random.Random(self.random_state)
        X = [list(map(float, r)) for r in X]
        psi = min(256, len(X)) if self.max_samples == "auto" else min(int(self.max_samples), len(X))
        self.psi_ = psi
        max_depth = math.ceil(math.log2(max(psi, 2)))
        self.trees_ = [_build(rng.sample(X, psi), 0, max_depth, rng) for _ in range(self.n_estimators)]
        scores = sorted(self.score_samples(X))
        k = max(0, min(len(scores) - 1, int(self.contamination * len(scores))))
        self.offset_ = scores[k]
        return self

    def score_samples(self, X):
        cn = _c(self.psi_)
        out = []
        for x in X:
            h = sum(_path(list(map(float, x)), t) for t in self.trees_) / len(self.trees_)
            out.append(-(2.0 ** (-h / cn)))
        return out

    def decision_function(self, X):
        return [s - self.offset_ for s in self.score_samples(X)]

    def predict(self, X):
        return [-1 if d < 0 else 1 for d in self.decision_function(X)]


class PurePipeline:
    """Median imputation + standard scaling + Isolation Forest."""

    def __init__(self, **iforest_params):
        self.model = PureIsolationForest(**iforest_params)

    def fit(self, X):
        cols = list(zip(*X))
        self.medians_ = [median([v for v in c if v is not None and not math.isnan(v)] or [0.0]) for c in cols]
        filled = self._impute(X)
        cols = list(zip(*filled))
        self.means_ = [sum(c) / len(c) for c in cols]
        self.scales_ = [math.sqrt(sum((v - m) ** 2 for v in c) / len(c)) or 1.0 for c, m in zip(cols, self.means_)]
        self.model.fit(self._transform(filled))
        return self

    def _impute(self, X):
        return [[self.medians_[j] if (v is None or (isinstance(v, float) and math.isnan(v))) else float(v) for j, v in enumerate(r)] for r in X]

    def _transform(self, X):
        return [[(v - self.means_[j]) / self.scales_[j] for j, v in enumerate(r)] for r in X]

    def _prep(self, X):
        return self._transform(self._impute(X))

    def score_samples(self, X):
        return self.model.score_samples(self._prep(X))

    def decision_function(self, X):
        return self.model.decision_function(self._prep(X))

    def predict(self, X):
        return self.model.predict(self._prep(X))
