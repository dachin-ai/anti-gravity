import io
import re
import base64
from datetime import datetime, timezone
from collections import Counter
from typing import Any, Dict, List, Optional

import pandas as pd
import requests
try:
    from apify_client import ApifyClient
except Exception:
    ApifyClient = None

# ── Actors ──────────────────────────────────────────────
ACTOR_IG_SCRAPER   = "apify/instagram-scraper"
ACTOR_IG_COMMENTS  = "apify/instagram-comment-scraper"
ACTOR_TT_VIDEO     = "clockworks/tiktok-video-scraper"
ACTOR_TT_COMMENTS  = "clockworks/tiktok-comments-scraper"

IG_URL_RE   = re.compile(r"^https://(www\.)?instagram\.com/.+", re.IGNORECASE)
TT_LONG_RE  = re.compile(r"^https://(www\.)?tiktok\.com/.+", re.IGNORECASE)
TT_SHORT_RE = re.compile(r"^https://(vt|vm)\.tiktok\.com/.+", re.IGNORECASE)
TT_VIDEO_ID_RE = re.compile(r"/video/(\d+)", re.IGNORECASE)

STOPWORDS = set("""
a an the and or but if then else for to of in on at by with from as is are was were be been being
i you he she it we they me him her us them my your his their our its this that these those
yang dan atau tapi jika maka untuk ke dari pada di sebagai adalah itu ini tersebut nya lah pun saja juga tidak bukan iya ya
""".split())


# ── Helpers ─────────────────────────────────────────────
def safe_get(d: Any, keys: List[str], default=None):
    if not isinstance(d, dict):
        return default
    for k in keys:
        if k in d and d[k] is not None:
            return d[k]
    return default


def safe_get_path(d: Any, paths: List[str], default=None):
    for p in paths:
        cur: Any = d
        ok = True
        for part in p.split("."):
            if isinstance(cur, dict) and part in cur:
                cur = cur[part]
            else:
                ok = False
                break
        if ok and cur is not None:
            return cur
    return default


def to_int(x) -> Optional[int]:
    try:
        if x is None or x == "":
            return None
        if isinstance(x, (int, float)):
            return int(x)
        s = re.sub(r"[^\d\-]", "", str(x))
        return int(s) if s else None
    except Exception:
        return None


def df_text(df: pd.DataFrame) -> pd.DataFrame:
    if df is None:
        return df
    if df.empty:
        return df.fillna("")
    return df.fillna("").astype(str)


def as_kv_rows_text(d: Dict[str, Any]) -> pd.DataFrame:
    return pd.DataFrame(
        [{"field": str(k), "value": "" if v is None else str(v)} for k, v in d.items()],
        columns=["field", "value"],
    )


def scraped_date_mmddyyyy() -> str:
    return datetime.now().strftime("%m/%d/%Y")


def export_time_hhmmss() -> str:
    return datetime.now().strftime("%H:%M:%S")


def format_post_date_mmddyyyy(raw_ts: Any) -> str:
    if raw_ts is None or raw_ts == "":
        return ""
    try:
        if isinstance(raw_ts, (int, float)):
            v = int(raw_ts)
            if v > 10_000_000_000:
                v //= 1000
            return datetime.fromtimestamp(v, tz=timezone.utc).astimezone().strftime("%m/%d/%Y")
        s = str(raw_ts).strip()
        if s.isdigit():
            v = int(s)
            if v > 10_000_000_000:
                v //= 1000
            return datetime.fromtimestamp(v, tz=timezone.utc).astimezone().strftime("%m/%d/%Y")
        s = s.replace("Z", "+00:00")
        dt = datetime.fromisoformat(s)
        return dt.astimezone().strftime("%m/%d/%Y")
    except Exception:
        return ""


def keyword_per_comment(text: str, top_k: int = 3) -> str:
    t = (text or "").lower()
    t = re.sub(r"http\S+|www\.\S+", " ", t)
    t = re.sub(r"[^a-z0-9_\s]", " ", t)
    toks = [p for p in t.split() if p and p not in STOPWORDS and len(p) >= 3]
    if not toks:
        return ""
    cnt = Counter(toks).most_common(top_k)
    return ", ".join([w for w, _ in cnt])


# ── URL Helpers ─────────────────────────────────────────
def parse_links_from_textarea(raw_text: str) -> List[str]:
    lines = [x.rstrip() for x in (raw_text or "").splitlines() if x.strip()]
    merged: List[str] = []
    for line in lines:
        s = line.strip()
        if s.lower().startswith("http"):
            merged.append(s)
        else:
            if merged:
                merged[-1] = merged[-1] + s
    return [x.strip() for x in merged if x.strip()]


def sanitize_ig_url(raw: str, kind: str) -> str:
    s = (raw or "").strip()
    if not s:
        raise ValueError("URL/username is empty.")
    s = "".join(ch for ch in s if ch.isprintable()).strip()
    s = s.replace("instagr.am", "instagram.com")
    s = s.replace("m.instagram.com", "instagram.com")
    s = s.replace("www.instagram.com", "instagram.com")
    if not s.startswith("http"):
        if kind == "profile":
            s = f"https://instagram.com/{s.strip('@')}/"
        else:
            s = "https://" + s
    if s.startswith("http://"):
        s = "https://" + s[len("http://"):]
    if s.startswith("https://instagram.com/"):
        s = "https://www.instagram.com/" + s[len("https://instagram.com/"):]
    else:
        s = re.sub(r"^https://[^/]*instagram\.com/", "https://www.instagram.com/", s)
    s = s.split("?")[0].split("#")[0]
    if kind == "profile" and not s.endswith("/"):
        s += "/"
    if not IG_URL_RE.match(s):
        raise ValueError(f"Invalid IG URL: {s}")
    return s


def sanitize_tt_url(raw: str) -> str:
    s = (raw or "").strip()
    if not s:
        raise ValueError("URL is empty.")
    s = "".join(ch for ch in s if ch.isprintable()).strip()
    if not s.startswith("http"):
        s = "https://" + s
    if s.startswith("http://"):
        s = "https://" + s[len("http://"):]
    s = s.replace("m.tiktok.com", "www.tiktok.com")
    if not (TT_LONG_RE.match(s) or TT_SHORT_RE.match(s)):
        if re.match(r"^https://tiktok\.com/", s, flags=re.IGNORECASE):
            s = re.sub(r"^https://tiktok\.com/", "https://www.tiktok.com/", s, flags=re.IGNORECASE)
        if not (TT_LONG_RE.match(s) or TT_SHORT_RE.match(s)):
            raise ValueError(f"Invalid TikTok URL: {s}")
    return s


def resolve_tiktok_shortlink(url: str, timeout: int = 20) -> str:
    u = sanitize_tt_url(url)
    if not TT_SHORT_RE.match(u):
        u = re.sub(r"^https://[^/]*tiktok\.com/", "https://www.tiktok.com/", u, flags=re.IGNORECASE)
        return u
    try:
        r = requests.get(u, allow_redirects=True, timeout=timeout,
                         headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0"})
        final_url = (r.url or "").strip()
        if not final_url:
            return u
        final_url = final_url.replace("m.tiktok.com", "www.tiktok.com")
        final_url = re.sub(r"^https://[^/]*tiktok\.com/", "https://www.tiktok.com/", final_url, flags=re.IGNORECASE)
        return final_url
    except Exception:
        return u


# ── Apify runner ────────────────────────────────────────
def apify_run(client: ApifyClient, actor_id: str, run_input: Dict[str, Any]) -> List[Dict[str, Any]]:
    run = client.actor(actor_id).call(run_input=run_input)
    ds = run.get("defaultDatasetId")
    if not ds:
        return []
    return client.dataset(ds).list_items(clean=True).items or []


# ── IG fetch/parse ───────────────────────────────────────
def ig_fetch_post(client, post_url):
    items = apify_run(client, ACTOR_IG_SCRAPER, {"directUrls": [post_url], "resultsType": "posts", "resultsLimit": 1})
    return items[0] if items else {}


def ig_fetch_profile_by_username(client, username):
    prof_url = sanitize_ig_url(username, "profile")
    items = apify_run(client, ACTOR_IG_SCRAPER, {"directUrls": [prof_url], "resultsType": "details", "resultsLimit": 1})
    return items[0] if items else {}


def ig_fetch_comments(client, post_url, limit):
    if limit <= 0:
        return []
    return apify_run(client, ACTOR_IG_COMMENTS, {"directUrls": [post_url], "resultsLimit": int(limit)})


def ig_extract_owner_username(post_raw):
    return safe_get(post_raw, ["ownerUsername", "username"], "") or safe_get((post_raw.get("owner") or {}), ["username"], "") or ""


def ig_parse_profile(profile):
    username = safe_get(profile, ["username", "userName"], "") or ""
    url_raw = safe_get(profile, ["url"], "") or (username if username else "")
    prof_url = sanitize_ig_url(url_raw, "profile") if url_raw else ""
    return {
        "ig_username": username, "ig_full_name": safe_get(profile, ["fullName", "full_name", "name"], ""),
        "ig_profile_link": prof_url, "followers": to_int(safe_get(profile, ["followersCount", "followers"], None)),
        "following": to_int(safe_get(profile, ["followsCount", "following"], None)),
        "posts_count": to_int(safe_get(profile, ["postsCount", "posts"], None)),
        "is_verified": safe_get(profile, ["verified", "isVerified"], None),
        "is_business": safe_get(profile, ["isBusinessAccount"], None),
        "category": safe_get(profile, ["categoryName", "category"], ""),
        "external_url": safe_get(profile, ["externalUrl", "external_url", "website"], ""),
        "biography": safe_get(profile, ["biography", "bio", "description"], ""),
        "profile_pic_url": safe_get(profile, ["profilePicUrl", "profile_pic_url"], ""),
    }


def ig_parse_post(post):
    caption = safe_get(post, ["caption", "text", "title"], "") or ""
    hashtags = safe_get(post, ["hashtags"], None)
    if not isinstance(hashtags, list) or not hashtags:
        hashtags = list(dict.fromkeys(re.findall(r"#([A-Za-z0-9_\.]+)", caption)))
    mentions = safe_get(post, ["mentions"], None)
    if not isinstance(mentions, list) or not mentions:
        mentions = list(dict.fromkeys(re.findall(r"@([A-Za-z0-9_\.]+)", caption)))
    raw_ts = safe_get(post, ["timestamp", "takenAtTimestamp", "takenAt"], "")
    return {
        "post_link": safe_get(post, ["url", "postUrl", "link"], ""),
        "type": safe_get(post, ["type", "mediaType", "productType"], ""),
        "timestamp": raw_ts, "post_date": format_post_date_mmddyyyy(raw_ts),
        "caption": caption, "likes": to_int(safe_get(post, ["likesCount", "likes"], None)),
        "comment_count": to_int(safe_get(post, ["commentsCount", "comments"], None)),
        "hashtags_all": ", ".join(hashtags), "mentions_all": ", ".join(mentions),
        "video_duration_sec": to_int(safe_get(post, ["videoDuration", "duration", "video_duration"], None)),
        "Video Play Count": to_int(safe_get(post, ["videoPlayCount", "playCount", "plays"], None)),
        "Video View Count": to_int(safe_get(post, ["videoViewCount", "viewCount", "views"], None)),
        "display_url": safe_get(post, ["displayUrl", "display_url"], ""),
    }


def ig_parse_comment(item):
    text = safe_get(item, ["text", "comment", "body"], "") or ""
    username = safe_get(item, ["ownerUsername", "username"], "") or ""
    profile_url = safe_get(item, ["ownerProfileUrl", "profileUrl", "profile_url"], "") or (sanitize_ig_url(username, "profile") if username else "")
    return {
        "username": username, "profile_url": profile_url, "text": text,
        "likes": to_int(safe_get(item, ["likesCount", "likes"], None)),
        "keyword": keyword_per_comment(text, top_k=3),
        "timestamp": safe_get(item, ["timestamp", "createdAt", "created_at"], ""),
    }


# ── TikTok fetch/parse ───────────────────────────────────
def tt_fetch_video(client, post_url):
    items = apify_run(client, ACTOR_TT_VIDEO, {
        "postURLs": [post_url], "shouldDownloadVideos": False,
        "shouldDownloadCovers": False, "shouldDownloadSubtitles": False, "shouldDownloadSlideshowImages": False,
    })
    return items[0] if items else {}


def tt_fetch_comments(client, post_url, limit):
    if limit <= 0:
        return []
    return apify_run(client, ACTOR_TT_COMMENTS, {"postURLs": [post_url], "commentsPerPost": int(limit), "maxRepliesPerComment": 0})


def tt_parse_profile_from_video(video):
    username = safe_get_path(video, ["authorMeta.name", "authorMeta.username"], "") or ""
    profile_url = safe_get_path(video, ["authorMeta.profileUrl", "authorMeta.url"], "") or (f"https://www.tiktok.com/@{username}" if username else "")
    return {
        "tt_username": username, "tt_full_name": safe_get_path(video, ["authorMeta.nickName", "authorMeta.nickname"], "") or "",
        "tt_profile_link": profile_url, "followers": to_int(safe_get_path(video, ["authorMeta.fans", "authorMeta.followers"], None)),
        "following": to_int(safe_get_path(video, ["authorMeta.following"], None)),
        "posts_count": to_int(safe_get_path(video, ["authorMeta.video"], None)),
        "is_verified": safe_get_path(video, ["authorMeta.verified"], None),
        "external_url": safe_get_path(video, ["authorMeta.signatureLink"], ""),
        "biography": safe_get_path(video, ["authorMeta.signature"], ""),
        "profile_pic_url": safe_get_path(video, ["authorMeta.avatar", "authorMeta.avatarThumb"], ""),
    }


def tt_parse_video(video):
    caption = safe_get(video, ["text", "title", "caption"], "") or ""
    hashtags = list(dict.fromkeys(re.findall(r"#([A-Za-z0-9_\.]+)", caption)))
    raw_ts = safe_get(video, ["createTimeISO", "createTime"], "")
    return {
        "post_link": safe_get(video, ["webVideoUrl", "webVideoURL", "url"], "") or "",
        "type": "tiktok_video", "timestamp": raw_ts, "post_date": format_post_date_mmddyyyy(raw_ts),
        "caption": caption, "likes": to_int(safe_get(video, ["diggCount", "likes"], None)),
        "comment_count": to_int(safe_get(video, ["commentCount", "comments"], None)),
        "shares": to_int(safe_get(video, ["shareCount", "shares"], None)),
        "hashtags_all": ", ".join(hashtags),
        "video_duration_sec": to_int(safe_get_path(video, ["videoMeta.duration"], None)),
        "Video Play Count": to_int(safe_get(video, ["playCount", "views"], None)),
        "display_url": safe_get_path(video, ["videoMeta.coverUrl", "videoMeta.cover"], ""),
    }


def tt_parse_comment(item):
    text = safe_get(item, ["text"], "") or ""
    username = safe_get_path(item, ["author.uniqueId", "authorMeta.name", "userId"], "") or ""
    profile_url = safe_get_path(item, ["author.profileUrl"], "") or (f"https://www.tiktok.com/@{username}" if username else "")
    return {
        "username": username, "profile_url": profile_url, "text": text,
        "likes": to_int(safe_get(item, ["diggCount", "likeCount"], None)),
        "keyword": keyword_per_comment(text, top_k=3),
        "timestamp": safe_get(item, ["createTimeISO", "createdAt"], ""),
    }


# ── Excel builders ───────────────────────────────────────
def _b64(data: bytes) -> str:
    return base64.b64encode(data).decode("utf-8")


def build_excel_specific(kv1, kv2, comments_df) -> bytes:
    out = io.BytesIO()
    with pd.ExcelWriter(out, engine="xlsxwriter") as writer:
        wb = writer.book
        fmt_text = wb.add_format({"num_format": "@"})
        df_text(as_kv_rows_text(kv1)).to_excel(writer, index=False, sheet_name="01_general")
        df_text(as_kv_rows_text(kv2)).to_excel(writer, index=False, sheet_name="02_post")
        df_text(comments_df).to_excel(writer, index=False, sheet_name="03_comments")
        for sn, widths in [("01_general", [26, 90]), ("02_post", [26, 90]), ("03_comments", [22, 55, 70, 10, 28, 22])]:
            ws = writer.sheets[sn]
            ws.freeze_panes(1, 0)
            for i, w in enumerate(widths):
                ws.set_column(i, i, w, fmt_text)
    return out.getvalue()


def build_excel_general(rows: List[Dict]) -> bytes:
    out = io.BytesIO()
    with pd.ExcelWriter(out, engine="xlsxwriter") as writer:
        wb = writer.book
        fmt_text = wb.add_format({"num_format": "@"})
        df = df_text(pd.DataFrame(rows))
        df.to_excel(writer, index=False, sheet_name="general")
        ws = writer.sheets["general"]
        ws.freeze_panes(1, 0)
        for i in range(len(df.columns)):
            ws.set_column(i, i, 34, fmt_text)
    return out.getvalue()


# ── Main process functions ────────────────────────────────
def run_specific(token: str, platform: str, url: str, comments_limit: int) -> Dict:
    client = ApifyClient(token)
    scraped_at = scraped_date_mmddyyyy()
    export_time = export_time_hhmmss()
    empty_comments = pd.DataFrame(columns=["username", "profile_url", "text", "likes", "keyword", "timestamp"])

    if platform == "instagram":
        post_url = sanitize_ig_url(url, "post")
        post_raw = ig_fetch_post(client, post_url)
        if not post_raw:
            raise RuntimeError("Failed to fetch post (private/restricted/rate-limited).")
        post_parsed = ig_parse_post(post_raw)
        owner_username = ig_extract_owner_username(post_raw)
        profile_info = {}
        if owner_username:
            prof_raw = ig_fetch_profile_by_username(client, owner_username)
            if prof_raw:
                profile_info = ig_parse_profile(prof_raw)
        comment_items = ig_fetch_comments(client, post_url, comments_limit) if comments_limit > 0 else []
        comments_df = pd.DataFrame([ig_parse_comment(x) for x in comment_items]) if comment_items else empty_comments
        kv1 = {"platform": "instagram", "post_link": post_url,
                "ig_username": profile_info.get("ig_username") or owner_username,
                "ig_full_name": profile_info.get("ig_full_name", ""),
                "ig_profile_link": profile_info.get("ig_profile_link") or (sanitize_ig_url(owner_username, "profile") if owner_username else ""),
                "followers": profile_info.get("followers"), "following": profile_info.get("following"),
                "posts_count": profile_info.get("posts_count"), "is_verified": profile_info.get("is_verified"),
                "is_business": profile_info.get("is_business"), "category": profile_info.get("category"),
                "external_url": profile_info.get("external_url"), "scraped_at": scraped_at, "export_time": export_time}
        kv2 = {**{k: post_parsed.get(k) for k in ["post_date","caption","type","timestamp","likes","comment_count","hashtags_all","mentions_all","video_duration_sec","Video Play Count","Video View Count","display_url"]}, "export_time": export_time}

    else:
        tt_in = sanitize_tt_url(url)
        post_url = resolve_tiktok_shortlink(tt_in)
        video_raw = tt_fetch_video(client, post_url)
        if not video_raw:
            raise RuntimeError("Failed to fetch TikTok video (private/restricted/rate-limited).")
        post_parsed = tt_parse_video(video_raw)
        profile_info = tt_parse_profile_from_video(video_raw)
        comment_items = tt_fetch_comments(client, post_url, comments_limit) if comments_limit > 0 else []
        comments_df = pd.DataFrame([tt_parse_comment(x) for x in comment_items]) if comment_items else empty_comments
        kv1 = {"post_link": post_url, **{k: profile_info.get(k) for k in ["tt_username","tt_full_name","tt_profile_link","followers","following","posts_count","is_verified","external_url","biography","profile_pic_url"]}, "scraped_at": scraped_at, "export_time": export_time}
        kv2 = {**{k: post_parsed.get(k) for k in ["post_date","caption","type","timestamp","likes","comment_count","shares","hashtags_all","video_duration_sec","Video Play Count","display_url"]}, "export_time": export_time}

    xlsx = build_excel_specific(kv1, kv2, comments_df)
    return {
        "mode": "specific",
        "kv1": {k: ("" if v is None else str(v)) for k, v in kv1.items()},
        "kv2": {k: ("" if v is None else str(v)) for k, v in kv2.items()},
        "comments": df_text(comments_df).to_dict(orient="records"),
        "comments_columns": list(comments_df.columns),
        "file_base64": _b64(xlsx),
    }


def run_general(token: str, platform: str, raw_links: str, dedupe: bool, boost_type: Optional[str] = None) -> Dict:
    client = ApifyClient(token)
    scraped_at = scraped_date_mmddyyyy()
    export_time = export_time_hhmmss()
    lines = parse_links_from_textarea(raw_links)
    if dedupe:
        lines = list(dict.fromkeys(lines))
    rows = []
    errors = []

    for raw in lines:
        try:
            if platform == "instagram":
                post_url = sanitize_ig_url(raw, "post")
                post_raw = ig_fetch_post(client, post_url)
                if not post_raw:
                    errors.append(f"Failed: {raw}")
                    continue
                owner_username = ig_extract_owner_username(post_raw)
                owner_full = safe_get_path(post_raw, ["owner.fullName", "ownerFullName", "fullName"], "") or ""
                raw_ts = safe_get(post_raw, ["timestamp", "takenAtTimestamp", "takenAt"], "")
                post_date = format_post_date_mmddyyyy(raw_ts)
                play_count = to_int(safe_get(post_raw, ["videoPlayCount", "playCount", "plays"], None))
                likes = to_int(safe_get(post_raw, ["likesCount", "likes"], None))
                comment_count = to_int(safe_get(post_raw, ["commentsCount", "comments"], None))
                caption = safe_get(post_raw, ["caption", "text", "title"], "") or ""
                hashtags = safe_get(post_raw, ["hashtags"], None)
                if not isinstance(hashtags, list):
                    hashtags = list(dict.fromkeys(re.findall(r"#([A-Za-z0-9_\.]+)", caption)))
                video_duration_sec = to_int(safe_get(post_raw, ["videoDuration", "duration", "video_duration"], None))
                rows.append({"platform": "instagram", "boost_type": boost_type or "",
                              "account_name": str(owner_full or ""), "username": str(owner_username or ""),
                              "post_date": str(post_date or ""), "post_link": str(post_url),
                              "Video Play Count": str(play_count or ""), "likes": str(likes or ""),
                              "comment_count": str(comment_count or ""), "hashtags_all": ", ".join(hashtags) if isinstance(hashtags, list) else str(hashtags or ""),
                              "video_duration_sec": str(video_duration_sec or ""), "scraped_at": scraped_at, "export_time": export_time})
            else:
                tt_in = sanitize_tt_url(raw)
                post_url = resolve_tiktok_shortlink(tt_in)
                video_raw = tt_fetch_video(client, post_url)
                if not video_raw:
                    errors.append(f"Failed: {raw}")
                    continue
                owner_username = safe_get_path(video_raw, ["authorMeta.name", "authorMeta.username"], "") or ""
                owner_full = safe_get_path(video_raw, ["authorMeta.nickName", "authorMeta.nickname"], "") or ""
                raw_ts = safe_get(video_raw, ["createTimeISO", "createTime"], "")
                post_date = format_post_date_mmddyyyy(raw_ts)
                play_count = to_int(safe_get(video_raw, ["playCount", "views"], None))
                likes = to_int(safe_get(video_raw, ["diggCount", "likes"], None))
                comment_count = to_int(safe_get(video_raw, ["commentCount", "comments"], None))
                caption = safe_get(video_raw, ["text", "title", "caption"], "") or ""
                hashtags = list(dict.fromkeys(re.findall(r"#([A-Za-z0-9_\.]+)", caption)))
                video_duration_sec = to_int(safe_get_path(video_raw, ["videoMeta.duration"], None))
                post_link = safe_get(video_raw, ["webVideoUrl", "webVideoURL", "url"], "") or post_url
                rows.append({"account_name": str(owner_full or ""), "username": str(owner_username or ""),
                              "post_date": str(post_date or ""), "post_link": str(post_link), "input_link": str(raw),
                              "resolved_link": str(post_url), "desc": str(caption or ""),
                              "Video Play Count": str(play_count or ""), "likes": str(likes or ""),
                              "comment_count": str(comment_count or ""), "hashtags_all": ", ".join(hashtags),
                              "video_duration_sec": str(video_duration_sec or ""), "scraped_at": scraped_at, "export_time": export_time})
        except Exception as e:
            errors.append(f"Error on {raw}: {str(e)}")
            continue

    if not rows:
        raise RuntimeError("No data scraped — check links, privacy, or rate limits.")

    xlsx = build_excel_general(rows)
    return {
        "mode": "general",
        "rows": rows,
        "columns": list(rows[0].keys()) if rows else [],
        "errors": errors,
        "count": len(rows),
        "file_base64": _b64(xlsx),
    }
