from collections import defaultdict
from datetime import datetime, timedelta
import json
import re
from sqlalchemy.orm import Session
from models import ActivityLog, AccountUser
from typing import Optional

def _normalize_tool_name(tool_name: Optional[str]) -> str:
    if not tool_name:
        return ""
    normalized = re.sub(r"\s*\([^)]*\)\s*", " ", tool_name).strip()
    return re.sub(r"\s+", " ", normalized)


def get_user_activity(
    db: Session,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    tool_view: str = "specific",
    exclude_admin: bool = False,
):
    query = db.query(ActivityLog)
    if start_date:
        query = query.filter(ActivityLog.time >= datetime.strptime(start_date, "%Y-%m-%d"))
    if end_date:
        end_dt = datetime.strptime(end_date, "%Y-%m-%d") + timedelta(days=1)
        query = query.filter(ActivityLog.time < end_dt)
    logs = query.all()

    user_rows = db.query(AccountUser.username, AccountUser.name).all()
    username_to_display_name = {}
    for row in user_rows:
        if not row.username:
            continue
        key = str(row.username).strip().lower()
        display = str(row.name).strip() if row.name else str(row.username).strip()
        username_to_display_name[key] = display

    admin_users = set()
    if exclude_admin:
        admin_rows = db.query(AccountUser.username, AccountUser.permissions).all()

        def _is_admin_enabled(raw_value) -> bool:
            if raw_value in (1, True):
                return True
            if isinstance(raw_value, str):
                return raw_value.strip().lower() in {"1", "true", "yes", "y"}
            return False

        def _normalize_permissions(perms):
            if isinstance(perms, dict):
                return perms
            if isinstance(perms, str):
                text = perms.strip()
                if not text:
                    return {}
                try:
                    parsed = json.loads(text)
                    return parsed if isinstance(parsed, dict) else {}
                except Exception:
                    return {}
            return {}

        for row in admin_rows:
            perms = _normalize_permissions(row.permissions)
            if _is_admin_enabled(perms.get("admin")) and row.username:
                admin_users.add(str(row.username).strip().lower())

    # Summary: count per tool per day
    summary = defaultdict(lambda: defaultdict(int))
    tool_user_sets = defaultdict(set)
    user_tool_count = defaultdict(lambda: defaultdict(int))
    users_seen = set()
    total_events = 0

    for log in logs:
        if not (log.username and log.time):
            continue
        username = str(log.username).strip()
        username_key = username.lower()
        if exclude_admin and username_key in admin_users:
            continue

        if tool_view == "general":
            tool = log.tools_general or _normalize_tool_name(log.tools)
        else:
            tool = log.tools
        if not tool:
            continue

        date = log.time.date().isoformat()

        summary[tool][date] += 1
        tool_user_sets[tool].add(username)
        display_name = username_to_display_name.get(username_key, username)
        user_tool_count[display_name][tool] += 1
        users_seen.add(display_name)
        total_events += 1

    summary_list = []
    for tool, date_map in summary.items():
        daily_data = [{"date": date, "count": count} for date, count in sorted(date_map.items())]
        summary_list.append(
            {
                "tool": tool,
                "total_count": sum(date_map.values()),
                "unique_users": len(tool_user_sets[tool]),
                "data": daily_data,
            }
        )

    summary_list.sort(key=lambda row: row["tool"])

    user_tool_table = []
    for user, tools in sorted(user_tool_count.items()):
        user_tool_table.append(
            {
                "user": user,
                "total": sum(tools.values()),
                "tools": dict(sorted(tools.items())),
            }
        )

    return {
        "summary": summary_list,
        "user_table": user_tool_table,
        "totals": {
            "total_events": total_events,
            "total_users": len(users_seen),
            "total_tools": len(summary_list),
        },
    }
