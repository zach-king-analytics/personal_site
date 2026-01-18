import json
from pathlib import Path

import pandas as pd
import plotly.graph_objects as go
import plotly.express as px

# ------------------------
# Paths
# ------------------------
REPORT_DIR = Path("docs/assets/data/sf6-reports")
IMG_DIR    = Path("docs/assets/img/sf6")

IMG_DIR.mkdir(parents=True, exist_ok=True)


def load_report(json_path: Path) -> dict:
    return json.loads(json_path.read_text(encoding="utf-8"))


def build_dataframe(report: dict) -> pd.DataFrame:
    """Flatten matchups into a DataFrame for plotting."""
    rows = []
    for m in report.get("matchups", []):
        opp = m["opponent"]
        for g, wr in zip(m["games"], m["cum_winrate"]):
            rows.append({
                "opponent": opp,
                "games": g,
                "cum_winrate": wr,  # 0–1
            })
    return pd.DataFrame(rows)


# ------------------------
# Figure 1: Overview lines
# ------------------------
def fig_overview(df: pd.DataFrame, player_cfn: str, baseline_n: int) -> go.Figure:
    fig = go.Figure()

    for opp, sub in df.groupby("opponent"):
        sub = sub.sort_values("games")
        fig.add_trace(
            go.Scatter(
                x=sub["games"],
                y=sub["cum_winrate"] * 100,
                mode="lines+markers",
                name=opp,
                line=dict(shape="spline", width=2),
                marker=dict(size=4),
                hovertemplate=(
                    f"{opp}<br>"
                    "Game %{x}<br>"
                    "Winrate %{y:.1f}%<extra></extra>"
                ),
            )
        )

    fig.update_layout(
        template="plotly_dark",
        paper_bgcolor="#050816",
        plot_bgcolor="#050816",
        font=dict(color="#E5E7EB"),
        title=dict(
            text=(
                f"Matchup performance for {player_cfn}<br>"
                f"<span style='font-size:0.8em;'>"
                f"Baseline {baseline_n} games · cumulative winrate"
                f"</span>"
            ),
            x=0,
            xanchor="left",
        ),
        xaxis=dict(
            title="Games played vs character",
            gridcolor="#1F2933",
            zeroline=False,
            dtick=5,
        ),
        yaxis=dict(
            title="Cumulative win rate (%)",
            range=[0, 100],
            gridcolor="#1F2933",
            ticksuffix="%",
        ),
        legend=dict(
            x=1.02,
            xanchor="left",
            y=0.5,
            bgcolor="#111827",
            bordercolor="#4B5563",
            borderwidth=1,
            font=dict(size=10),
        ),
        margin=dict(t=70, r=180, b=60, l=60),
        shapes=[
            dict(
                type="line",
                xref="paper",
                x0=0,
                x1=1,
                y0=50,
                y1=50,
                line=dict(color="#6B7280", width=1, dash="dash"),
            )
        ],
    )

    return fig


# ------------------------
# Figure 2: Worst→best bar chart
# ------------------------
def fig_worst(df: pd.DataFrame, player_cfn: str) -> go.Figure:
    # compute final winrate per opponent
    final = (
        df.sort_values("games")
          .groupby("opponent")
          .agg(
              total_games=("games", "max"),
              final_wr=("cum_winrate", "last"),
          )
          .reset_index()
    )

    final["final_wr_pct"] = final["final_wr"] * 100
    final = final.sort_values("final_wr_pct")  # worst first

    fig = go.Figure(
        go.Bar(
            x=final["final_wr_pct"],
            y=final["opponent"],
            orientation="h",
            text=[f"{v:.1f}%" for v in final["final_wr_pct"]],
            textposition="auto",
            marker=dict(
                color=[
                    "#F87171" if v < 50 else "#22C55E"
                    for v in final["final_wr_pct"]
                ]
            ),
            hovertemplate="%{y}: %{x:.1f}% winrate (%{customdata} games)<extra></extra>",
            customdata=final["total_games"],
        )
    )

    fig.update_layout(
        template="plotly_dark",
        paper_bgcolor="#050816",
        plot_bgcolor="#050816",
        font=dict(color="#E5E7EB"),
        title=dict(
            text=f"Current winrate by matchup for {player_cfn}<br>"
                 "<span style='font-size:0.8em;'>Worst → best</span>",
            x=0,
            xanchor="left",
        ),
        xaxis=dict(
            title="Win rate (%)",
            range=[0, 100],
            gridcolor="#1F2933",
            ticksuffix="%",
        ),
        yaxis=dict(
            automargin=True,
            gridcolor="#1F2933",
        ),
        margin=dict(t=60, r=40, b=60, l=120),
    )

    return fig


def main():
    for json_path in REPORT_DIR.glob("*.json"):
        report = load_report(json_path)
        player_cfn = report["player_cfn"]
        baseline_n = report.get("baseline_n", 5)

        df = build_dataframe(report)
        if df.empty:
            continue

        print(f"Building figures for {player_cfn}…")

        fig1 = fig_overview(df, player_cfn, baseline_n)
        fig2 = fig_worst(df, player_cfn)

        # require `pip install -U kaleido` once
        out1 = IMG_DIR / f"{player_cfn.lower()}_overview.png"
        out2 = IMG_DIR / f"{player_cfn.lower()}_worst.png"

        fig1.write_image(str(out1), format="png", scale=2)
        fig2.write_image(str(out2), format="png", scale=2)

        print(f"  wrote {out1}")
        print(f"  wrote {out2}")


if __name__ == "__main__":
    main()
