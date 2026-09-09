use petgraph::graph::{DiGraph, NodeIndex};
use petgraph::visit::EdgeRef;
use serde::Serialize;
use std::collections::HashMap;

use crate::domain::types::{RiskLevel, Surface, User};
use crate::graph::store::Store;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum NodeKind {
    User,
    Team,
    Ticket,
    Slot,
    Tournament,
    Table,
    Bonus,
    Surface,
    RgState,
    ConsentState,
}

#[derive(Debug, Clone, Serialize)]
pub struct GraphNode {
    pub id: String,
    pub kind: NodeKind,
    pub label: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct ExportNode {
    pub id: String,
    #[serde(rename = "type")]
    pub kind: NodeKind,
    pub label: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct ExportEdge {
    pub from: String,
    pub to: String,
    pub rel: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct GraphExport {
    pub nodes: Vec<ExportNode>,
    pub edges: Vec<ExportEdge>,
}

pub struct KnowledgeGraph {
    graph: DiGraph<GraphNode, String>,
    ids: HashMap<String, NodeIndex>,
}

fn surface_key(surface: Surface) -> &'static str {
    match surface {
        Surface::Watch => "surface:watch",
        Surface::Widget => "surface:widget",
        Surface::QuickAction => "surface:quick_action",
        Surface::LiveActivity => "surface:live_activity",
        Surface::DynamicIsland => "surface:dynamic_island",
        Surface::Push => "surface:push",
    }
}

fn surface_label(surface: Surface) -> &'static str {
    match surface {
        Surface::Watch => "Watch complication",
        Surface::Widget => "Widget",
        Surface::QuickAction => "Quick action",
        Surface::LiveActivity => "Live Activity",
        Surface::DynamicIsland => "Dynamic Island",
        Surface::Push => "Push",
    }
}

pub fn account_eligible(user: &User) -> bool {
    user.account.kyc_verified && user.account.age_verified && user.account.market_allowed
}

pub fn surface_consent_on(user: &User, surface: Surface) -> bool {
    let s = &user.consent.surfaces;
    match surface {
        Surface::LiveActivity | Surface::DynamicIsland => s.live_activity,
        Surface::Widget => s.widgets,
        Surface::Watch => s.watch,
        Surface::QuickAction => s.geolocation,
        Surface::Push => true,
    }
}

pub fn eligible_surfaces(user: &User) -> Vec<Surface> {
    if !account_eligible(user)
        || !user.consent.personalisation
        || !user.consent.tcf_purpose_consent
    {
        return Vec::new();
    }
    Surface::ladder()
        .into_iter()
        .filter(|s| !s.is_alerting())
        .filter(|s| surface_consent_on(user, *s))
        .collect()
}

pub fn inducements_blocked(user: &User) -> bool {
    !user.consent.marketing
        || user.rg.self_excluded
        || user.rg.deposit_limit_reached
        || user.rg.risk_level == RiskLevel::High
}

impl KnowledgeGraph {
    pub fn from_store(store: &Store) -> Self {
        let mut graph: DiGraph<GraphNode, String> = DiGraph::new();
        let mut ids: HashMap<String, NodeIndex> = HashMap::new();

        let mut ensure = |graph: &mut DiGraph<GraphNode, String>,
                          ids: &mut HashMap<String, NodeIndex>,
                          id: String,
                          kind: NodeKind,
                          label: String|
         -> NodeIndex {
            if let Some(ix) = ids.get(&id) {
                return *ix;
            }
            let ix = graph.add_node(GraphNode { id: id.clone(), kind, label });
            ids.insert(id, ix);
            ix
        };

        for surface in Surface::ladder() {
            if surface.is_alerting() {
                continue;
            }
            ensure(
                &mut graph,
                &mut ids,
                surface_key(surface).to_string(),
                NodeKind::Surface,
                surface_label(surface).to_string(),
            );
        }

        for user in store.users.values() {
            let user_key = format!("user:{}", user.id);
            let u = ensure(
                &mut graph,
                &mut ids,
                user_key.clone(),
                NodeKind::User,
                user.display_name.clone(),
            );

            let consent_label = if user.consent.personalisation {
                "Personalisation ON"
            } else {
                "Personalisation OFF"
            };
            let consent_key = format!("consent:{}", consent_label);
            let c = ensure(
                &mut graph,
                &mut ids,
                consent_key,
                NodeKind::ConsentState,
                consent_label.to_string(),
            );
            graph.add_edge(u, c, "has_consent_state".to_string());

            let rg_label = if user.rg.self_excluded {
                "Self-excluded"
            } else if user.rg.deposit_limit_reached {
                "Deposit limit reached"
            } else if user.rg.risk_level == RiskLevel::High {
                "High risk"
            } else {
                "Clear"
            };
            let rg_key = format!("rg:{}", rg_label);
            let r = ensure(
                &mut graph,
                &mut ids,
                rg_key,
                NodeKind::RgState,
                rg_label.to_string(),
            );
            graph.add_edge(u, r, "has_rg_state".to_string());

            for team_id in &user.follows {
                if let Some(team) = store.teams.get(team_id) {
                    let t = ensure(
                        &mut graph,
                        &mut ids,
                        format!("team:{}", team.id),
                        NodeKind::Team,
                        team.name.clone(),
                    );
                    graph.add_edge(u, t, "follows".to_string());
                }
            }

            for ticket in &user.tickets {
                let t = ensure(
                    &mut graph,
                    &mut ids,
                    format!("ticket:{}", ticket.id),
                    NodeKind::Ticket,
                    ticket.label.clone(),
                );
                graph.add_edge(u, t, "has_ticket".to_string());
            }

            for slot_id in &user.favorite_slots {
                if let Some(slot) = store.slots.get(slot_id) {
                    let s = ensure(
                        &mut graph,
                        &mut ids,
                        format!("slot:{}", slot.id),
                        NodeKind::Slot,
                        slot.name.clone(),
                    );
                    graph.add_edge(u, s, "favorite_slot".to_string());
                }
            }

            for tour_id in &user.followed_tournaments {
                if let Some(tour) = store.tournaments.get(tour_id) {
                    let t = ensure(
                        &mut graph,
                        &mut ids,
                        format!("tournament:{}", tour.id),
                        NodeKind::Tournament,
                        tour.name.clone(),
                    );
                    graph.add_edge(u, t, "followed_tournament".to_string());
                }
            }

            for table_id in &user.live_dealer_tables {
                if let Some(table) = store.tables.get(table_id) {
                    let t = ensure(
                        &mut graph,
                        &mut ids,
                        format!("table:{}", table.id),
                        NodeKind::Table,
                        table.name.clone(),
                    );
                    graph.add_edge(u, t, "plays_table".to_string());
                }
            }

            for surface in eligible_surfaces(user) {
                let s = ensure(
                    &mut graph,
                    &mut ids,
                    surface_key(surface).to_string(),
                    NodeKind::Surface,
                    surface_label(surface).to_string(),
                );
                graph.add_edge(u, s, "eligible_for_surface".to_string());
            }

            if inducements_blocked(user) {
                graph.add_edge(u, r, "inducements_blocked_by".to_string());
            }
        }

        KnowledgeGraph { graph, ids }
    }

    pub fn node_count(&self) -> usize {
        self.graph.node_count()
    }

    pub fn edge_count(&self) -> usize {
        self.graph.edge_count()
    }

    pub fn export(&self) -> GraphExport {
        let nodes = self
            .graph
            .node_weights()
            .map(|n| ExportNode { id: n.id.clone(), kind: n.kind, label: n.label.clone() })
            .collect();
        let edges = self
            .graph
            .edge_references()
            .map(|e| {
                let from = self.graph[e.source()].id.clone();
                let to = self.graph[e.target()].id.clone();
                ExportEdge { from, to, rel: e.weight().clone() }
            })
            .collect();
        GraphExport { nodes, edges }
    }

    pub fn to_mermaid(&self) -> String {
        let mut out = String::from("graph LR\n");
        for n in self.graph.node_weights() {
            let safe = sanitize(&n.id);
            let shape = match n.kind {
                NodeKind::User => format!("{}([\"{}\"])", safe, n.label),
                NodeKind::Surface => format!("{}[\"{}\"]", safe, n.label),
                NodeKind::RgState | NodeKind::ConsentState => {
                    format!("{}{{\"{}\"}}", safe, n.label)
                }
                _ => format!("{}(\"{}\")", safe, n.label),
            };
            out.push_str(&format!("  {}\n", shape));
        }
        for e in self.graph.edge_references() {
            let from = sanitize(&self.graph[e.source()].id);
            let to = sanitize(&self.graph[e.target()].id);
            out.push_str(&format!("  {} -->|{}| {}\n", from, e.weight(), to));
        }
        out
    }

    pub fn ids(&self) -> &HashMap<String, NodeIndex> {
        &self.ids
    }
}

fn sanitize(id: &str) -> String {
    id.chars()
        .map(|c| if c.is_alphanumeric() { c } else { '_' })
        .collect()
}
