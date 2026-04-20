"""
model.py — GAT + DiffPool model definition and inference helpers.
Logic is kept identical to the original Colab notebook.
"""

import json
import networkx as nx
import torch
import torch.nn.functional as F
from torch.nn import Linear
from torch_geometric.data import Data
from torch_geometric.nn import GATConv, dense_diff_pool, BatchNorm
from torch_geometric.utils import to_dense_batch, to_dense_adj

# ── Device ────────────────────────────────────────────────────────────────────
DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")


def normalize_symptom_name(value):
    return " ".join(value.strip().lower().split())


def parse_user_symptoms(symptoms_text, symptom_lookup):
    raw_symptoms = [normalize_symptom_name(item) for item in symptoms_text.split(",")]
    return [symptom_lookup[item] for item in raw_symptoms if item in symptom_lookup]


def build_disease_symptom_index(knowledge):
    disease_symptom_map = {}
    symptom_lookup = {}

    for disease, details in knowledge["diseases"].items():
        for dtype, info in details["types"].items():
            unique_symptoms = []
            seen = set()
            for symptom in info["symptoms"]:
                normalized = normalize_symptom_name(symptom)
                symptom_lookup.setdefault(normalized, symptom)
                if normalized not in seen:
                    seen.add(normalized)
                    unique_symptoms.append(symptom)
            disease_symptom_map[dtype] = unique_symptoms

    return disease_symptom_map, symptom_lookup


def score_disease_matches(selected_symptoms, disease_symptom_map):
    selected_norm = {normalize_symptom_name(symptom) for symptom in selected_symptoms}
    rankings = []

    for disease, disease_symptoms in disease_symptom_map.items():
        disease_norm = {normalize_symptom_name(symptom) for symptom in disease_symptoms}
        matched = selected_norm & disease_norm
        if not matched:
            continue

        union_count = len(selected_norm | disease_norm)
        overlap_score = len(matched) / union_count if union_count else 0.0
        coverage_score = len(matched) / len(disease_norm) if disease_norm else 0.0
        precision_score = len(matched) / len(selected_norm) if selected_norm else 0.0
        score = (0.55 * overlap_score) + (0.25 * coverage_score) + (0.20 * precision_score)

        rankings.append(
            {
                "disease": disease,
                "score": score,
                "matched_count": len(matched),
                "matched_symptoms": sorted(matched),
            }
        )

    rankings.sort(
        key=lambda item: (item["score"], item["matched_count"], item["disease"]),
        reverse=True,
    )
    return rankings


def get_ranked_predictions(symptoms_text, disease_symptom_map, symptom_lookup):
    matched_symptoms = parse_user_symptoms(symptoms_text, symptom_lookup)
    if not matched_symptoms:
        return []

    rankings = score_disease_matches(matched_symptoms, disease_symptom_map)
    results = []
    for item in rankings:
        results.append(
            {
                "disease": item["disease"],
                "confidence_raw": round(item["score"] * 100, 2),
                "confidence": f"{item['score'] * 100:.2f}%",
                "matched_count": item["matched_count"],
                "matched_symptoms": item["matched_symptoms"],
            }
        )
    return results

# ── GATSimple (UNCHANGED from notebook) ──────────────────────────────────────
class GATSimple(torch.nn.Module):
    def __init__(self, num_classes):
        super().__init__()
        self.gat1  = GATConv(4, 128, heads=4)
        self.bn1   = BatchNorm(128 * 4)
        self.gat2  = GATConv(128 * 4, 256)
        self.bn2   = BatchNorm(256)
        self.gat3  = GATConv(256, 256)
        self.bn3   = BatchNorm(256)

        self.assign1 = Linear(256, 128)
        self.assign2 = Linear(128, 25)

        self.embed1  = Linear(256, 128)
        self.embed2  = Linear(128, 128)

        self.lin1    = Linear(128, 64)
        self.lin2    = Linear(64, num_classes)
        self.dropout = 0.35

    def forward(self, data):
        x, edge_index, batch = data.x, data.edge_index, data.batch
        edge_attr = data.edge_attr

        x = self.gat1(x, edge_index, edge_attr=edge_attr)
        x = self.bn1(x); x = F.relu(x)
        x = F.dropout(x, p=self.dropout, training=self.training)

        x = self.gat2(x, edge_index, edge_attr=edge_attr)
        x = self.bn2(x); x = F.relu(x)
        x = F.dropout(x, p=self.dropout, training=self.training)

        x = self.gat3(x, edge_index, edge_attr=edge_attr)
        x = self.bn3(x); x = F.relu(x)

        x_dense, mask = to_dense_batch(x, batch)
        adj           = to_dense_adj(edge_index, batch)

        s = F.relu(self.assign1(x_dense))
        s = self.assign2(s)
        z = F.relu(self.embed1(x_dense))
        z = self.embed2(z)

        x_pool, adj_pool, link_loss, ent_loss = dense_diff_pool(z, adj, s, mask)
        x = torch.sum(x_pool, dim=1)

        x   = F.relu(self.lin1(x))
        x   = F.dropout(x, p=self.dropout, training=self.training)
        out = self.lin2(x)
        return out, link_loss, ent_loss


# ── nx_to_pyg (UNCHANGED from notebook) ──────────────────────────────────────
def nx_to_pyg(graph, label):
    nodes = list(graph.nodes())
    idx   = {node: i for i, node in enumerate(nodes)}

    edges, edge_weights = [], []
    for u, v in graph.edges():
        w = graph[u][v].get("weight", 1.0)
        edges.append([idx[u], idx[v]]); edge_weights.append(w)
        edges.append([idx[v], idx[u]]); edge_weights.append(w)

    edge_index = torch.tensor(edges, dtype=torch.long).t().contiguous()
    edge_attr  = torch.tensor(edge_weights, dtype=torch.float).unsqueeze(1)

    x = []
    for node in nodes:
        node_type = graph.nodes[node].get("node_type")
        if node_type == "disease":
            base = [1, 0, 0]
        elif node_type == "symptom":
            base = [0, 1, 0]
        else:
            base = [0, 0, 1]
        hash_val = (hash(node) % 1000) / 1000.0
        x.append(base + [hash_val])

    x = torch.tensor(x, dtype=torch.float)
    y = torch.tensor([label], dtype=torch.long)
    return Data(x=x, edge_index=edge_index, edge_attr=edge_attr, y=y)


# ── load_model ────────────────────────────────────────────────────────────────
def load_model(domain_path="domain.json", weights_path="best_diffpool.pt"):
    with open(domain_path, "r") as f:
        knowledge = json.load(f)

    # Build knowledge graph (same as notebook)
    G = nx.Graph()
    all_symptoms = set()
    all_types    = []

    for disease, details in knowledge["diseases"].items():
        for dtype, info in details["types"].items():
            symptoms = info["symptoms"]
            G.add_node(dtype, node_type="disease")
            all_types.append(dtype)
            for symptom in symptoms:
                G.add_node(symptom, node_type="symptom")
                freq = symptoms.count(symptom)
                G.add_edge(dtype, symptom, weight=1.0 / freq)
                all_symptoms.add(symptom)

    label_map     = {d: i for i, d in enumerate(sorted(all_types))}
    inv_label_map = {v: k for k, v in label_map.items()}
    num_classes   = len(label_map)
    disease_symptom_map, symptom_lookup = build_disease_symptom_index(knowledge)

    model = GATSimple(num_classes).to(DEVICE)
    model.load_state_dict(
        torch.load(weights_path, map_location=DEVICE, weights_only=True)
    )
    model.eval()

    return {
        "model":         model,
        "knowledge":     knowledge,
        "label_map":     label_map,
        "inv_label_map": inv_label_map,
        "all_symptoms":  all_symptoms,
        "disease_symptom_map": disease_symptom_map,
        "symptom_lookup": symptom_lookup,
        "G":             G,
    }


# ── predict_from_text ─────────────────────────────────────────────────────────
def predict_from_text(
    symptoms_text,
    model,
    all_symptoms,
    inv_label_map,
    disease_symptom_map=None,
    symptom_lookup=None,
):
    if disease_symptom_map and symptom_lookup:
        matched_symptoms = parse_user_symptoms(symptoms_text, symptom_lookup)
        if not matched_symptoms:
            return "No known symptoms detected"

        rankings = score_disease_matches(matched_symptoms, disease_symptom_map)
        if rankings:
            return rankings[0]["disease"]

    user_symptoms    = [s.strip().lower() for s in symptoms_text.split(",")]
    matched_symptoms = [s for s in all_symptoms if s.lower() in user_symptoms]

    if not matched_symptoms:
        return "No known symptoms detected"

    temp_graph = nx.Graph()
    temp_graph.add_node("patient_case", node_type="patient")
    for s in matched_symptoms:
        temp_graph.add_node(s, node_type="symptom")
        temp_graph.add_edge("patient_case", s)

    pyg_graph       = nx_to_pyg(temp_graph, 0).to(DEVICE)
    pyg_graph.batch = torch.zeros(pyg_graph.num_nodes, dtype=torch.long).to(DEVICE)

    model.eval()
    with torch.no_grad():
        output = model(pyg_graph)
        out    = output[0] if isinstance(output, tuple) else output
        pred   = out.argmax(dim=1).item()

    return inv_label_map[pred]


# ── get_confidence ────────────────────────────────────────────────────────────
def get_confidence(symptoms_text, model, all_symptoms, disease_symptom_map=None, symptom_lookup=None):
    if disease_symptom_map and symptom_lookup:
        matched_symptoms = parse_user_symptoms(symptoms_text, symptom_lookup)
        if not matched_symptoms:
            return 0.0

        rankings = score_disease_matches(matched_symptoms, disease_symptom_map)
        if not rankings:
            return 0.0

        return min(max(rankings[0]["score"], 0.0), 0.99)

    user_symptoms    = [s.strip().lower() for s in symptoms_text.split(",")]
    matched_symptoms = [s for s in all_symptoms if s.lower() in user_symptoms]

    if not matched_symptoms:
        return 0.0

    temp_graph = nx.Graph()
    temp_graph.add_node("patient_case", node_type="patient")
    for s in matched_symptoms:
        temp_graph.add_node(s, node_type="symptom")
        temp_graph.add_edge("patient_case", s)

    pyg_graph       = nx_to_pyg(temp_graph, 0).to(DEVICE)
    pyg_graph.batch = torch.zeros(pyg_graph.num_nodes, dtype=torch.long).to(DEVICE)

    model.eval()
    with torch.no_grad():
        output = model(pyg_graph)
        out    = output[0] if isinstance(output, tuple) else output
        probs  = torch.softmax(out, dim=1)
        conf   = probs.max(dim=1).values.item()

    return conf
