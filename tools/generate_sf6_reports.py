# tools/generate_sf6_reports.py
import json
from pathlib import Path

import numpy as np
import pandas as pd
from sqlalchemy import create_engine, text

DATABASE_URL = "postgresql+psycopg2://postgres:postgres@localhost:5432/games"
OUTPUT_DIR = Path("docs/assets/data/sf6-reports")

# Canonical timezone for “what day did you play?”
REPORT_TZ = "America/New_York"

CFNS = [
    "braventooth",
    "legendaryjiggxv",
    "buttinjector",
    "smokingseabass",
    "karatesnacks",
    "fromundaman",
    "avaris",
    "jrome39",
    "kaylen",
    "mistah d. mojo",
    "xhaos",
    "shazoomba",
    "scrubzbane",
    "galaxybran",
]

MATCH_QUERY = """
SELECT
    match_hash,
    lower(player_cfn) AS player_cfn,
    player_character,
    player_lp      AS player_mr,      -- MR stored in LP field in this view
    opponent_character,
    opponent_lp    AS opponent_mr,    -- MR stored in LP field in this view
    match_timestamp,
    is_winner,
    lower(match_mode) AS match_mode
FROM sf.v_match_player_norm
WHERE lower(player_cfn) = lower(:player_cfn)
ORDER BY match_timestamp;
"""

BASELINE_N = 5              # baseline 5 games before first point
MIN_GAMES_FOR_STABLE = 10   # for best/worst matchup stats
SESSION_GAP_MINUTES = 30

MR_MAX = 2500
MAX_WEEKS = 12


# ----------------------------
# Time helpers
# ----------------------------
def _ensure_tz(series: pd.Series) -> pd.Series:
    """
    Ensure timestamps are tz-aware, then convert to REPORT_TZ.
    - If tz-aware: convert.
    - If tz-naive: assume UTC then convert.
    """
    s = pd.to_datetime(series, errors="coerce")

    # If tz-naive, localize to UTC
    if getattr(s.dt, "tz", None) is None:
        s = s.dt.tz_localize("UTC")

    return s.dt.tz_convert(REPORT_TZ)


def _local_date(series: pd.Series) -> pd.Series:
    """Return local date (REPORT_TZ) for a timestamp series."""
    return _ensure_tz(series).dt.date


def _week_start_sunday_local(ts_local_midnight: pd.Timestamp) -> pd.Timestamp:
    """
    Given a local-tz midnight timestamp, return the Sunday-start midnight (local tz).
    pandas weekday: Mon=0..Sun=6
    We want Sunday as start.
    """
    days_since_sun = (ts_local_midnight.weekday() + 1) % 7
    return (ts_local_midnight - pd.Timedelta(days=days_since_sun)).normalize()


# ----------------------------
# Activity: daily (for legacy / debug)
# ----------------------------
def compute_activity_by_day(df: pd.DataFrame) -> list[dict]:
    """
    Daily activity time series.
    Output:
      [{ "date": "YYYY-MM-DD", "matches": int, "wins": int, "winrate": float|null }]
    """
    if df.empty:
        return []

    d = df.copy()
    d["date"] = _local_date(d["match_timestamp"])

    g = (
        d.groupby("date")
        .agg(matches=("win_int", "size"), wins=("win_int", "sum"))
        .reset_index()
        .sort_values("date")
    )

    out = []
    for _, r in g.iterrows():
        matches = int(r["matches"])
        wins = int(r["wins"])
        wr = (wins / matches) if matches else None
        out.append(
            {
                "date": r["date"].isoformat(),
                "matches": matches,
                "wins": wins,
                "winrate": round(float(wr), 4) if wr is not None else None,
            }
        )
    return out


# ----------------------------
# Activity: weekly heatmap grid (Sun..Sat) in REPORT_TZ
# ----------------------------
def compute_activity_by_week(
    df: pd.DataFrame,
    tz_name: str = REPORT_TZ,
    max_weeks: int = MAX_WEEKS,
) -> list[dict]:
    """
    Weekly heatmap grid, Sunday..Saturday, bucketed in tz_name.

    Output:
    [
      {
        "week_start": "YYYY-MM-DD",   # Sunday
        "week_end": "YYYY-MM-DD",     # Saturday
        "matches": int,
        "wins": int,
        "winrate": float | None,
        "days": [
          {"date": "YYYY-MM-DD", "matches": int, "wins": int, "winrate": float | None},  # Sun
          ...
          {"date": "YYYY-MM-DD", "matches": int, "wins": int, "winrate": float | None},  # Sat
        ]
      },
      ...
    ]
    """
    if df.empty:
        return []

    d = df.copy()

    # Convert to tz_name and floor to local midnight
    ts_local = _ensure_tz(d["match_timestamp"]).dt.tz_convert(tz_name)
    d["local_day"] = ts_local.dt.floor("D")
    d["win_int"] = d["win_int"].astype(int)

    day = (
        d.groupby("local_day")
        .agg(matches=("win_int", "size"), wins=("win_int", "sum"))
        .reset_index()
        .sort_values("local_day")
    )

    if day.empty:
        return []

    # Map date -> counts
    day["date_iso"] = day["local_day"].dt.date.astype(str)
    by_date = {r["date_iso"]: (int(r["matches"]), int(r["wins"])) for _, r in day.iterrows()}

    def iso_of(dt: pd.Timestamp) -> str:
        return dt.date().isoformat()

    # Determine active weeks based on days with matches
    weeks: dict[str, pd.Timestamp] = {}
    for dt in day["local_day"]:
        ws = _week_start_sunday_local(dt)
        weeks[iso_of(ws)] = ws

    week_list = []
    for wk_iso, ws in sorted(weeks.items(), key=lambda kv: kv[0]):
        total_m = 0
        total_w = 0
        days_out = []

        for i in range(7):
            cur = (ws + pd.Timedelta(days=i)).normalize()
            iso = iso_of(cur)
            m, w = by_date.get(iso, (0, 0))
            total_m += m
            total_w += w
            wr = (w / m) if m else None
            days_out.append(
                {
                    "date": iso,
                    "matches": int(m),
                    "wins": int(w),
                    "winrate": round(float(wr), 4) if wr is not None else None,
                }
            )

        if total_m > 0:
            week_list.append(
                {
                    "week_start": wk_iso,
                    "week_end": iso_of(ws + pd.Timedelta(days=6)),
                    "matches": int(total_m),
                    "wins": int(total_w),
                    "winrate": round(float(total_w / total_m), 4) if total_m else None,
                    "days": days_out,
                }
            )

    return week_list[-max_weeks:]


def compute_activity_by_week_modes(df_all: pd.DataFrame) -> dict:
    """
    Weekly heatmap grids for:
      - all modes combined (for your “total games played” viz)
      - each mode separately (optional, for later UI toggles)

    Output:
      {
        "all": [... week objects ...],
        "modes": { "rank": [...], "battlehub": [...], ... }
      }
    """
    out = {"all": [], "modes": {}}
    if df_all.empty:
        return out

    out["all"] = compute_activity_by_week(df_all, tz_name=REPORT_TZ, max_weeks=MAX_WEEKS)

    if "match_mode" in df_all:
        for mode, sub in df_all.groupby("match_mode"):
            sub = sub.copy()
            grid = compute_activity_by_week(sub, tz_name=REPORT_TZ, max_weeks=MAX_WEEKS)
            # keep only if it has data
            if grid:
                out["modes"][str(mode)] = grid

    return out


# ----------------------------
# Sessions + ranked insights (MR-filtered df)
# ----------------------------
def compute_sessions(df: pd.DataFrame):
    """Return list of sessions, where each session is a DataFrame slice."""
    if df.empty:
        return []

    df = df.sort_values("match_timestamp")

    sessions = []
    current_rows = []
    prev_ts = None

    for _, row in df.iterrows():
        ts = row["match_timestamp"]
        if prev_ts is None:
            current_rows = [row]
        else:
            gap = (ts - prev_ts).total_seconds() / 60
            if gap >= SESSION_GAP_MINUTES:
                sessions.append(pd.DataFrame(current_rows))
                current_rows = [row]
            else:
                current_rows.append(row)
        prev_ts = ts

    if current_rows:
        sessions.append(pd.DataFrame(current_rows))

    return sessions


def compute_session_insights(df: pd.DataFrame):
    """
    df should be ranked+MR-valid so mr_delta makes sense.
    """
    sessions = compute_sessions(df)

    def bucket_label(size: int) -> str:
        if 1 <= size <= 5:
            return "1-5"
        if 6 <= size <= 10:
            return "6-10"
        if 11 <= size <= 15:
            return "11-15"
        return "16+"

    def week_start_monday(ts: pd.Timestamp) -> str | None:
        if pd.isna(ts):
            return None
        ts = pd.to_datetime(ts)
        if ts.tzinfo is None:
            ts = ts.tz_localize("UTC")
        ts = ts.tz_convert(REPORT_TZ)
        monday = (ts - pd.Timedelta(days=int(ts.weekday()))).normalize()
        return monday.date().isoformat()

    # 1) Performance by session length (raw sessions)
    by_length = []
    for s in sessions:
        size = len(s)
        if size == 0:
            continue

        s = s.sort_values("match_timestamp")
        winrate = float(s["win_int"].mean())

        mr_delta = 0.0
        if "player_mr" in s and size > 1:
            mr_delta = float(pd.to_numeric(s["player_mr"], errors="coerce").iloc[-1] - pd.to_numeric(s["player_mr"], errors="coerce").iloc[0])

        start_ts = s["match_timestamp"].iloc[0]
        start_iso = start_ts.isoformat() if pd.notna(start_ts) else None

        by_length.append(
            {
                "size": int(size),
                "bucket": bucket_label(int(size)),
                "winrate": round(winrate, 4),
                "mr_delta": round(float(mr_delta), 1),
                "start_ts": start_iso,
            }
        )

    # aggregate by bucket
    bucket_map = {}
    for sess in by_length:
        b = sess["bucket"]
        bucket_map.setdefault(b, {"bucket": b, "winrates": [], "mr_deltas": [], "count": 0})
        bucket_map[b]["winrates"].append(sess["winrate"])
        bucket_map[b]["mr_deltas"].append(sess["mr_delta"])
        bucket_map[b]["count"] += 1

    bucket_order = ["1-5", "6-10", "11-15", "16+"]
    by_length_buckets = []
    for b in bucket_order:
        if b not in bucket_map:
            continue
        info = bucket_map[b]
        avg_wr = sum(info["winrates"]) / len(info["winrates"])
        avg_mr = sum(info["mr_deltas"]) / len(info["mr_deltas"])
        by_length_buckets.append(
            {
                "range": b,
                "avg_winrate": round(avg_wr, 4),
                "avg_mr_delta": round(avg_mr, 1),
                "count": info["count"],
            }
        )

    # weekly_by_length
    weekly_map = {}
    for sess in by_length:
        start_iso = sess.get("start_ts")
        bucket = (sess.get("bucket") or "").strip()
        size = float(sess.get("size") or 0)
        winrate = sess.get("winrate")
        mr_delta = sess.get("mr_delta")

        if not start_iso or not bucket or size <= 0:
            continue

        start_ts = pd.to_datetime(start_iso, errors="coerce")
        wk = week_start_monday(start_ts)
        if not wk:
            continue

        winrate = float(winrate) if winrate is not None else 0.0
        mr_delta = float(mr_delta) if mr_delta is not None else 0.0

        key = (wk, bucket)
        if key not in weekly_map:
            weekly_map[key] = {
                "week_start": wk,
                "bucket": bucket,
                "count": 0,
                "sum_games": 0.0,
                "sum_wins": 0.0,
                "sum_mr_delta": 0.0,
            }

        weekly_map[key]["count"] += 1
        weekly_map[key]["sum_games"] += size
        weekly_map[key]["sum_wins"] += winrate * size
        weekly_map[key]["sum_mr_delta"] += mr_delta

    weekly_by_length = []
    for (_, _), acc in weekly_map.items():
        sum_games = acc["sum_games"]
        avg_wr = (acc["sum_wins"] / sum_games) if sum_games > 0 else None
        avg_mr = (acc["sum_mr_delta"] / acc["count"]) if acc["count"] > 0 else None

        weekly_by_length.append(
            {
                "week_start": acc["week_start"],
                "bucket": acc["bucket"],
                "count": int(acc["count"]),
                "avg_winrate": round(float(avg_wr), 4) if avg_wr is not None else None,
                "avg_mr_delta": round(float(avg_mr), 2) if avg_mr is not None else None,
            }
        )
    weekly_by_length = sorted(weekly_by_length, key=lambda r: (r["week_start"], r["bucket"]))

    # 2) Warm-up / Cool-down
    warm_samples = {"1": [], "2": [], "3-5": []}
    last3_samples = []

    for s in sessions:
        s = s.sort_values("match_timestamp").copy()
        n = len(s)
        if n == 0:
            continue

        s["game_number"] = range(1, n + 1)

        if n >= 1:
            warm_samples["1"].append(int(s.loc[s["game_number"] == 1, "win_int"].iloc[0]))
        if n >= 2:
            warm_samples["2"].append(int(s.loc[s["game_number"] == 2, "win_int"].iloc[0]))
        if n >= 3:
            mask_35 = s["game_number"].between(3, 5)
            warm_samples["3-5"].extend([int(v) for v in s.loc[mask_35, "win_int"].tolist()])

        last_n = min(3, n)
        last3_samples.extend([int(v) for v in s["win_int"].tail(last_n).tolist()])

    warmup_stats = {k: round(sum(v) / len(v), 4) for k, v in warm_samples.items() if v}
    cooldown_stats = {"last3": round(sum(last3_samples) / len(last3_samples), 4)} if last3_samples else {}

    # 3) Time-of-day heatmap (local)
    df2 = df.copy()
    df2["local_ts"] = _ensure_tz(df2["match_timestamp"])
    df2["hour_bucket"] = (df2["local_ts"].dt.hour // 2) * 2
    df2["day_of_week"] = df2["local_ts"].dt.day_name()

    heatmap = (
        df2.groupby(["day_of_week", "hour_bucket"])
        .agg(winrate=("win_int", "mean"), games=("win_int", "size"))
        .reset_index()
    )

    time_of_day_rows = []
    for _, r in heatmap.iterrows():
        time_of_day_rows.append(
            {
                "day": r["day_of_week"],
                "hour_bucket": int(r["hour_bucket"]),
                "winrate": round(float(r["winrate"]), 4),
                "games": int(r["games"]),
            }
        )

    # 4) Momentum / streaks
    def longest_streak(arr, value):
        max_s = 0
        cur = 0
        for v in arr:
            if v == value:
                cur += 1
                max_s = max(max_s, cur)
            else:
                cur = 0
        return max_s

    momentum_sessions = []
    for s in sessions:
        if len(s) == 0:
            continue
        s = s.sort_values("match_timestamp")
        wins = [int(x) for x in s["win_int"].tolist()]
        max_win_streak = longest_streak(wins, 1)
        max_loss_streak = longest_streak(wins, 0)

        mr_delta = 0.0
        if "player_mr" in s and len(s) > 1:
            mr_delta = float(pd.to_numeric(s["player_mr"], errors="coerce").iloc[-1] - pd.to_numeric(s["player_mr"], errors="coerce").iloc[0])

        momentum_sessions.append(
            {
                "size": int(len(s)),
                "max_win_streak": int(max_win_streak),
                "max_loss_streak": int(max_loss_streak),
                "mr_delta": round(float(mr_delta), 1),
            }
        )

    return {
        "sessions_raw": by_length,
        "by_length": by_length_buckets,
        "weekly_by_length": weekly_by_length,
        "warmup": warmup_stats,
        "cooldown": cooldown_stats,
        "time_of_day": time_of_day_rows,
        "momentum": momentum_sessions,
    }


# ----------------------------
# Summaries
# ----------------------------
def build_overall_summary(df: pd.DataFrame) -> dict:
    """All modes, no MR assumptions."""
    total = int(len(df))
    start_ts = df["match_timestamp"].min()
    end_ts = df["match_timestamp"].max()

    mode_breakdown = []
    if "match_mode" in df and total:
        counts = df["match_mode"].value_counts()
        for mode, n in counts.items():
            mode_breakdown.append(
                {
                    "mode": str(mode),
                    "matches": int(n),
                    "share_pct": round(100 * int(n) / total, 1),
                }
            )

    char_breakdown = []
    if "player_character" in df and total:
        # Count games with valid character data
        df_chars = df[df["player_character"].notna() & (df["player_character"].astype(str).str.strip() != "")]
        if not df_chars.empty:
            counts = df_chars["player_character"].astype(str).str.strip().str.title().value_counts()
            for character, games in counts.items():
                char_breakdown.append(
                    {
                        "character": character,
                        "games": int(games),
                        "share_pct": round(100 * int(games) / total, 1),
                    }
                )
        
        # Add "Unknown" for games without character data
        unknown_count = total - len(df_chars)
        if unknown_count > 0:
            char_breakdown.append(
                {
                    "character": "Unknown",
                    "games": int(unknown_count),
                    "share_pct": round(100 * unknown_count / total, 1),
                }
            )

    return {
        "matches_analyzed": total,
        "dataset_start": start_ts.date().isoformat() if pd.notna(start_ts) else None,
        "dataset_end": end_ts.date().isoformat() if pd.notna(end_ts) else None,
        "mode_breakdown": mode_breakdown,
        "character_breakdown": char_breakdown,
    }


def build_ranked_summary(df_rank_mr: pd.DataFrame, df_all: pd.DataFrame = None) -> dict:
    """
    Ranked-only, MR-valid subset for stats.
    df_rank_mr: MR-valid ranked games (for MR trends, matchups, stats)
    df_all: All matches (for character breakdown, defaults to df_rank_mr if None)
    """
    df = df_rank_mr
    if df_all is None:
        df_all = df_rank_mr  # fallback for backward compatibility
    
    total_matches = int(len(df))
    overall_wr = float(df["win_int"].mean()) if total_matches else 0.0

    if "player_character" in df_all and not df_all["player_character"].isna().all():
        main_char = df_all["player_character"].astype(str).str.strip().mode().iloc[0] if not df_all.empty else None
    else:
        main_char = None

    char_breakdown: list[dict] = []
    if "player_character" in df_all:
        total_all = int(len(df_all))
        # Filter to non-null characters only, from ALL matches
        df_chars = df_all[df_all["player_character"].notna() & (df_all["player_character"].astype(str).str.strip() != "")]
        if not df_chars.empty:
            counts = df_chars["player_character"].astype(str).str.strip().str.title().value_counts()
            for character, games in counts.items():
                char_breakdown.append(
                    {
                        "character": character,
                        "games": int(games),
                        "share_pct": round(100.0 * games / total_all, 1) if total_all else None,
                    }
                )
        
        # Add "Unknown" for games without character data
        unknown_count = total_all - len(df_chars)
        if unknown_count > 0:
            char_breakdown.append(
                {
                    "character": "Unknown",
                    "games": int(unknown_count),
                    "share_pct": round(100 * unknown_count / total_all, 1),
                }
            )

    start_ts = df["match_timestamp"].min()
    end_ts = df["match_timestamp"].max()

    grp = (
        df.groupby("opp_char_norm")
        .agg(
            games=("win_int", "size"),
            wins=("win_int", "sum"),
            avg_opp_mr=("opponent_mr", "mean"),
        )
        .reset_index()
    )
    grp["winrate"] = grp["wins"] / grp["games"]

    matchup_table = []
    if not grp.empty:
        for _, row in grp.iterrows():
            matchup_table.append(
                {
                    "opponent": row["opp_char_norm"].title(),
                    "games": int(row["games"]),
                    "wins": int(row["wins"]),
                    "winrate_pct": round(float(row["winrate"]) * 100, 1),
                    "avg_opponent_mr": round(float(row["avg_opp_mr"]), 1) if pd.notna(row["avg_opp_mr"]) else None,
                }
            )

    most_played = None
    if not grp.empty:
        mp = grp.sort_values("games", ascending=False).iloc[0]
        most_played = {
            "opponent": mp["opp_char_norm"].title(),
            "games": int(mp["games"]),
            "winrate_pct": round(float(mp["winrate"]) * 100, 1),
        }

    best_matchup = None
    worst_matchup = None
    stable = grp[grp["games"] >= MIN_GAMES_FOR_STABLE]
    if not stable.empty:
        best_row = stable.sort_values("winrate", ascending=False).iloc[0]
        worst_row = stable.sort_values("winrate", ascending=True).iloc[0]
        best_matchup = {
            "opponent": best_row["opp_char_norm"].title(),
            "games": int(best_row["games"]),
            "winrate_pct": round(float(best_row["winrate"]) * 100, 1),
        }
        worst_matchup = {
            "opponent": worst_row["opp_char_norm"].title(),
            "games": int(worst_row["games"]),
            "winrate_pct": round(float(worst_row["winrate"]) * 100, 1),
        }

    fix_one_matchup = None
    if not grp.empty:
        total_games = int(grp["games"].sum())
        total_wins = float(grp["wins"].sum())
        base_wr = total_wins / total_games if total_games else 0.0

        best_gain = 0.0
        best_new_wr = None
        best_row = None

        for _, row in grp.iterrows():
            g = float(row["games"])
            w = float(row["wins"])
            new_total_wins = total_wins - w + 0.5 * g
            new_wr = new_total_wins / total_games if total_games else 0.0
            gain = new_wr - base_wr
            if gain > best_gain + 1e-9:
                best_gain = gain
                best_new_wr = new_wr
                best_row = row

        if best_row is not None and best_gain > 0:
            fix_one_matchup = {
                "opponent": best_row["opp_char_norm"].title(),
                "games": int(best_row["games"]),
                "current_winrate_pct": round(float(best_row["winrate"]) * 100, 1),
                "simulated_winrate_pct": 50.0,
                "overall_winrate_pct": round(base_wr * 100, 1),
                "new_overall_winrate_pct": round(best_new_wr * 100, 1),
                "lift_pct_points": round(best_gain * 100, 1),
            }

    session_stats = compute_session_insights(df)
    activity_by_day = compute_activity_by_day(df)   # ranked+MR only (fine)
    activity_by_week = compute_activity_by_week(df) # ranked+MR only (fine)

    mr_timeseries = []
    if not df.empty:
        df_mr = df.sort_values("match_timestamp").copy()
        df_mr["player_mr_num"] = pd.to_numeric(df_mr["player_mr"], errors="coerce")
        df_mr["opponent_mr_num"] = pd.to_numeric(df_mr["opponent_mr"], errors="coerce")

        for _, row in df_mr.iterrows():
            ts = row.get("match_timestamp")
            ts_iso = ts.isoformat() if pd.notna(ts) else None
            player_mr_val = row.get("player_mr_num")
            opp_mr_val = row.get("opponent_mr_num")
            mr_timeseries.append(
                {
                    "ts": ts_iso,
                    "mr": float(player_mr_val) if pd.notna(player_mr_val) else None,
                    "opp_mr": float(opp_mr_val) if pd.notna(opp_mr_val) else None,
                    "win": int(row.get("win_int", 0)),
                    "opponent": str(row.get("opp_char_norm") or "").title(),
                }
            )

        # Weekly MR deltas (Monday start in REPORT_TZ)
        df_mr["local_ts"] = _ensure_tz(df_mr["match_timestamp"])
        # Calculate Monday start while preserving timezone, then convert to date string
        df_mr["week_start"] = (df_mr["local_ts"] - pd.to_timedelta(df_mr["local_ts"].dt.weekday, unit="D")).dt.date.astype(str)
        weekly = (
            df_mr.groupby("week_start")["player_mr_num"]
            .agg(["first", "last"])
            .reset_index()
            .dropna()
        )
        weekly["delta"] = weekly["last"] - weekly["first"]

        mr_weekly_delta = []
        for _, r in weekly.sort_values("week_start").iterrows():
            wk_val = r["week_start"]
            wk = wk_val if pd.notna(wk_val) else None  # already a string
            delta = float(r["delta"]) if pd.notna(r["delta"]) else None
            start_val = float(r["first"]) if pd.notna(r["first"]) else None
            end_val = float(r["last"]) if pd.notna(r["last"]) else None
            mr_weekly_delta.append(
                {
                    "week_start": wk,
                    "mr_delta": round(delta, 1) if delta is not None else None,
                    "mr_start": round(start_val, 1) if start_val is not None else None,
                    "mr_end": round(end_val, 1) if end_val is not None else None,
                }
            )

    return {
        "main_character": main_char.title() if isinstance(main_char, str) else main_char,
        "matches_analyzed": total_matches,
        "dataset_start": start_ts.date().isoformat() if pd.notna(start_ts) else None,
        "dataset_end": end_ts.date().isoformat() if pd.notna(end_ts) else None,
        "overall_winrate": round(overall_wr, 4),
        "overall_winrate_pct": round(overall_wr * 100, 1),
        "avg_mr": float(pd.to_numeric(df["player_mr"], errors="coerce").mean()) if "player_mr" in df else None,
        "avg_opponent_mr": float(pd.to_numeric(df["opponent_mr"], errors="coerce").mean()) if "opponent_mr" in df else None,
        "most_played_matchup": most_played,
        "best_matchup": best_matchup,
        "worst_matchup": worst_matchup,
        "min_games_for_stable": MIN_GAMES_FOR_STABLE,
        "matchup_table": matchup_table,
        "fix_one_matchup": fix_one_matchup,
        "character_breakdown": char_breakdown,
        "session_stats": session_stats,
        "activity_by_day": activity_by_day,
        "activity_by_week": activity_by_week,
        "mr_timeseries": mr_timeseries,
        "mr_weekly_delta": mr_weekly_delta,
    }


# ----------------------------
# JSON build
# ----------------------------
def build_player_json(engine, player_cfn: str) -> dict:
    df = pd.read_sql(text(MATCH_QUERY), engine, params={"player_cfn": player_cfn})
    if df.empty:
        print(f"[WARN] No matches for {player_cfn}")
        return {}

    # Parse + normalize
    df["match_timestamp"] = pd.to_datetime(df["match_timestamp"], errors="coerce")
    df["opp_char_norm"] = df["opponent_character"].astype(str).str.strip().str.lower()
    df["win_int"] = df["is_winner"].astype(str).str.strip().str.lower().eq("true").astype(int)
    df["match_mode"] = df["match_mode"].astype(str).str.strip().str.lower()

    # MR-era validity flag (only meaningful for ranked visuals)
    df["mr_valid"] = (
        pd.to_numeric(df["player_mr"], errors="coerce").le(MR_MAX)
        & pd.to_numeric(df["opponent_mr"], errors="coerce").le(MR_MAX)
    )

    df_all = df.copy()
    df_rank_all = df_all[df_all["match_mode"].eq("rank")].copy()  # ALL ranked games (for character breakdown)
    df_rank_mr = df_all[df_all["match_mode"].eq("rank") & df_all["mr_valid"]].copy()  # MR-valid only (for MR chart/matchups)

    # Ranked matchup curves should use ranked+MR-valid only
    matchups_out = []
    if not df_rank_mr.empty:
        df_rank_mr = df_rank_mr.sort_values(["opp_char_norm", "match_timestamp"])
        df_rank_mr["games_so_far"] = df_rank_mr.groupby("opp_char_norm").cumcount() + 1
        df_rank_mr["wins_so_far"] = df_rank_mr.groupby("opp_char_norm")["win_int"].cumsum()
        df_rank_mr["cum_winrate"] = df_rank_mr["wins_so_far"] / df_rank_mr["games_so_far"]

        for opp in sorted(df_rank_mr["opp_char_norm"].unique()):
            sub = df_rank_mr[df_rank_mr["opp_char_norm"] == opp].copy()
            sub = sub[sub["games_so_far"] >= BASELINE_N]
            if sub.empty:
                continue
            matchups_out.append(
                {
                    "opponent": opp.title(),
                    "games": sub["games_so_far"].tolist(),
                    "cum_winrate": sub["cum_winrate"].round(4).tolist(),
                }
            )

    out = {
        "player_cfn": player_cfn,
        "generated_at": pd.Timestamp.utcnow().isoformat(),
        "baseline_n": BASELINE_N,
        "summary": {
            "overall": build_overall_summary(df_all),
            "ranked": build_ranked_summary(df_rank_mr, df_all) if not df_rank_mr.empty else {},
            "activity_by_week_modes": compute_activity_by_week_modes(df_all),  # ✅ all-modes heatmap input
        },
        "matchups": matchups_out,
    }

    return out


def main():
    engine = create_engine(DATABASE_URL)
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    with engine.begin() as conn:
        for cfn in CFNS:
            report = build_player_json(conn, cfn)
            if not report:
                continue
            out_path = OUTPUT_DIR / f"{cfn.lower()}.json"
            out_path.write_text(json.dumps(report, indent=2))
            print(f"Wrote {out_path}")


if __name__ == "__main__":
    main()
