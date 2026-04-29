from datetime import datetime
from sqlalchemy.orm import Session
from models import ActivityLog
from typing import Optional

def get_user_activity(db: Session, start_date: Optional[str] = None, end_date: Optional[str] = None):
    query = db.query(ActivityLog)
    if start_date:
        query = query.filter(ActivityLog.time >= datetime.strptime(start_date, "%Y-%m-%d"))
    if end_date:
        query = query.filter(ActivityLog.time <= datetime.strptime(end_date, "%Y-%m-%d"))
    logs = query.all()

    # Summary: count per tool per day
    summary = {}
    for log in logs:
        tool = log.tools
        date = log.time.date().isoformat() if log.time else None
        if tool and date:
            summary.setdefault(tool, {}).setdefault(date, 0)
            summary[tool][date] += 1

    # Detail: count per user per tool
    user_tool_count = {}
    for log in logs:
        user = log.username
        tool = log.tools
        if user and tool:
            user_tool_count.setdefault(user, {}).setdefault(tool, 0)
            user_tool_count[user][tool] += 1

    # Format for frontend
    summary_list = [
        {"tool": tool, "data": [{"date": date, "count": count} for date, count in sorted(date_map.items())]}
        for tool, date_map in summary.items()
    ]
    user_tool_table = [
        {"user": user, **tools} for user, tools in user_tool_count.items()
    ]

    return {"summary": summary_list, "user_table": user_tool_table}
