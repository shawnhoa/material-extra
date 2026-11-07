#!/usr/bin/env python3
import base64
import binascii
import hashlib
import hmac
import html
import http.cookies
import io
from email import policy
from email.parser import BytesParser
import json
import math
import mimetypes
import os
import re
import secrets
import smtplib
import ssl
import threading
import time
import unicodedata
from datetime import datetime, timedelta, timezone
from html.parser import HTMLParser
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from PIL import Image, ImageOps, UnidentifiedImageError
from urllib import request as urllib_request
from urllib.parse import parse_qs, unquote, urlencode, urlparse
from content_catalog import CatalogError, minecraft_catalog, minecraft_version, mirror_catalog, mirror_probe
from solar_themes import get_theme, theme_catalog, THEME_BY_KEY

DATA_DIR = Path(os.getenv("DATA_DIR", "/data"))
DATA_FILE = DATA_DIR / "blog.json"
LOCK = threading.RLock()
UPLOAD_DIR = DATA_DIR / "uploads"
STATIC_DIR = Path(__file__).parent
FRIEND_CATALOG_FILE = STATIC_DIR / "friends.json"
LEGAL_DOCUMENTS_FILE = STATIC_DIR / "legal_documents.json"
PORT = int(os.getenv("PORT", "8080"))
ADMIN_PORT = int(os.getenv("ADMIN_PORT", "8081"))
TURNSTILE_SITEKEY = os.getenv("TURNSTILE_SITEKEY", "")
TURNSTILE_SECRET = os.getenv("TURNSTILE_SECRET", "")
SMTP_HOST = os.getenv("SMTP_HOST", "")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USERNAME = os.getenv("SMTP_USERNAME", "")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")
SMTP_FROM = os.getenv("SMTP_FROM", "")
PUBLIC_BASE_URL = os.getenv("PUBLIC_BASE_URL", "http://localhost:8080").rstrip("/")
ADMIN_BASE_URL = os.getenv("ADMIN_BASE_URL", "http://localhost:8081").rstrip("/")
COMMENT_REVIEW_NOTIFY_EMAIL = os.getenv("COMMENT_REVIEW_NOTIFY_EMAIL", SMTP_FROM).strip()
GITHUB_CLIENT_ID = os.getenv("GITHUB_CLIENT_ID", "")
GITHUB_CLIENT_SECRET = os.getenv("GITHUB_CLIENT_SECRET", "")
QQ_APP_ID = os.getenv("QQ_APP_ID", "")
QQ_APP_KEY = os.getenv("QQ_APP_KEY", "")
EMAIL_CODE_PEPPER = secrets.token_bytes(32)
EMAIL_CODE_TTL_SECONDS = 600
EMAIL_CODE_COOLDOWN_SECONDS = 60
EMAIL_CODE_MAX_ATTEMPTS = 5
OAUTH_TEMP_TTL_SECONDS = 900
AVATAR_MAX_BYTES = 4 * 1024 * 1024
AVATAR_THUMBNAIL_SIZES = (32, 48, 64, 96, 128, 192, 256)
MAX_GALLERY_IMAGES = 9
Image.MAX_IMAGE_PIXELS = 40_000_000
REPORT_REASONS = {"spam", "harassment", "hate", "privacy", "impersonation", "other"}
PAYPAL_DONATION_URL = ""
SESSIONS = {}
EMAIL_CODES = {}
EMAIL_SEND_HISTORY = {}
OAUTH_STATES = {}
OAUTH_PENDING = {}
FRIEND_APPLICATION_SUBMISSIONS = {}
REPORT_SUBMISSIONS = {}
APP_STARTED_AT = time.time()


def now_iso():
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def clean(value, fallback=""):
    return str(value if value is not None else fallback).strip()


COMMENT_FILTER_FILES = {
    "advertising": "advertising.txt",
    "political": "political.txt",
    "weapons-explosives": "weapons-explosives.txt",
    "sexual": "sexual.txt",
}


def normalize_comment_filter_with_map(value):
    original = str(value if value is not None else "")
    characters = []
    source_indexes = []
    for source_index, source_character in enumerate(original):
        normalized = unicodedata.normalize("NFKC", source_character).casefold()
        for character in normalized:
            if unicodedata.category(character)[0] not in "CZPS":
                characters.append(character)
                source_indexes.append(source_index)
    return "".join(characters), source_indexes


def normalize_comment_filter_text(value):
    return normalize_comment_filter_with_map(value)[0]


def mask_comment_filter_words(value, flags=None):
    original = str(value if value is not None else "")
    normalized, source_indexes = normalize_comment_filter_with_map(original)
    if not normalized:
        return original
    masked_indexes = set()
    active_flags = set(flags) if flags is not None else None
    for category, words in COMMENT_FILTER_RULES:
        if active_flags is not None and category not in active_flags:
            continue
        for word in words:
            start = normalized.find(word)
            while start >= 0:
                end = start + len(word) - 1
                masked_indexes.update(range(source_indexes[start], source_indexes[end] + 1))
                start = normalized.find(word, start + len(word))
    return "".join("*" if index in masked_indexes else character for index, character in enumerate(original))


def load_comment_filter_rules():
    rules = []
    for category, filename in COMMENT_FILTER_FILES.items():
        path = STATIC_DIR / "moderation" / filename
        try:
            words = {
                normalized
                for line in path.read_text(encoding="utf-8").splitlines()
                if (normalized := normalize_comment_filter_text(line))
                and len(normalized) >= 2
            }
        except OSError:
            words = set()
        rules.append((category, tuple(sorted(words, key=len, reverse=True))))
    return tuple(rules)


def comment_moderation_flags(value):
    normalized = normalize_comment_filter_text(value)
    if not normalized:
        return []
    return [category for category, words in COMMENT_FILTER_RULES if any(word in normalized for word in words)]


COMMENT_FILTER_RULES = load_comment_filter_rules()


def load_friend_catalog():
    try:
        payload = json.loads(FRIEND_CATALOG_FILE.read_text(encoding="utf-8"))
        friends = payload.get("friends", []) if isinstance(payload, dict) else payload
        if not isinstance(friends, list):
            return []
        return [
            item for item in friends
            if isinstance(item, dict)
            and clean(item.get("name"))
            and valid_external_url(item.get("url"))
        ]
    except (OSError, ValueError, json.JSONDecodeError):
        return []


def valid_external_url(value):
    url = clean(value)
    parsed = urlparse(url)
    return parsed.scheme in {"http", "https"} and bool(parsed.netloc) and len(url) <= 500


def normalize_friend_url(value):
    parsed = urlparse(clean(value))
    if parsed.scheme not in {"http", "https"} or not parsed.netloc:
        return ""
    path = parsed.path.rstrip("/") or "/"
    return f"{parsed.scheme.lower()}://{parsed.netloc.lower()}{path}"


def parse_time(value):
    try:
        return datetime.fromisoformat(clean(value).replace("Z", "+00:00"))
    except ValueError:
        return None


def is_visible(post):
    scheduled = parse_time(post.get("scheduled_at")) if post.get("scheduled_at") else None
    return bool(post.get("published")) and (scheduled is None or scheduled <= datetime.now(timezone.utc))


def seed_posts():
    stamp = now_iso()
    return [
        {"id": "welcome", "slug": "welcome", "title": "欢迎来到星屿", "excerpt": "这里收录一些灵感、阅读札记和正在尝试的小项目。", "content": "<p>欢迎来到星屿笔记。</p><p>这是一篇演示文章。你可以在管理台中替换标题、封面、分类和正文，再发布自己的内容。</p>", "format": "html", "tags": ["随笔", "入门"], "category": "随笔", "author": "星屿作者", "published": True, "created_at": stamp, "updated_at": stamp, "published_at": stamp, "scheduled_at": "", "views": 0, "likes": 0, "liked_by": []},
        {"id": "field-notes", "slug": "field-notes", "title": "把灵感整理成可执行的计划", "excerpt": "一个简短的示例，展示文章列表、标签和归档的呈现方式。", "content": "<p>先记录问题，再把它拆成几个可以验证的小步骤。</p><p>这篇虚构内容只用于演示模板。实际部署时，请在管理台编辑并替换全部示例文字。</p>", "format": "html", "tags": ["计划", "记录"], "category": "创作", "author": "星屿作者", "published": True, "created_at": stamp, "updated_at": stamp, "published_at": stamp, "scheduled_at": "", "views": 0, "likes": 0, "liked_by": []},
    ]


FRIEND_CATALOG = load_friend_catalog()


def default_state():
    return {"posts": seed_posts(), "profile": {
        "name": "星屿笔记", "name_en": "Star Isle Notes",
        "eyebrow": "PERSONAL NOTES · 2026", "eyebrow_en": "PERSONAL NOTES · 2026",
        "subtitle": "收集灵感，记录正在发生的事", "subtitle_en": "A place to collect ideas and moments",
        "bio": "欢迎浏览星屿笔记的演示内容。", "bio_en": "Explore this fictional demo journal and its content tools.",
        "hero_cta": "浏览文章", "hero_cta_en": "Browse stories", "posts_eyebrow": "LATEST STORIES", "posts_heading": "最近写了什么", "posts_heading_en": "Latest stories", "home_theme": "auto",
        "about_eyebrow": "关于星屿", "about_eyebrow_en": "ABOUT THIS JOURNAL", "about_heading": "你好，欢迎来访。", "about_heading_en": "Hello, and welcome.",
        "about_name": "星屿作者", "about_name_en": "Star Isle editor",
        "about_dialog_kicker": "灵感便签", "about_dialog_kicker_en": "IDEA NOTES",
        "about_dialog_status": "刚刚", "about_dialog_status_en": "now",
        "about_dialog_idle": "很高兴认识你", "about_dialog_idle_en": "Nice to meet you",
        "about_dialog_hint": "点击继续聊天", "about_dialog_hint_en": "Tap to keep chatting",
        "about_dialogues_zh": "今天也去试试看！\n这机器……要不先拆开看看？\n新模型排队中，我先替你测。\n翻车不可怕，记得先备份。\n问题解决时，会有一声“原来如此”。\n屏幕之外，也要认真吃饭。\n你好呀，今天过得怎么样？\n世界很大，我们慢慢逛。",
        "about_dialogues_en": "Let’s try something new today!\nShould we see what’s inside this machine?\nThe new model is queued. I’ll test it first.\nThings break. Backups save the day.\nThat little “now I get it” moment is worth it.\nGood food matters outside the screen too.\nHi! How’s your day going?\nThe world is big. Let’s take it one step at a time.",
        "about_body": "星屿笔记是一个虚构的个人内容站点演示。你可以在管理台中编辑站点介绍、文章与主题。\n模板展示了访客阅读和内容管理两类界面。\n请用自己的资料替换这些示例文字。",
        "about_body_en": "Star Isle Notes is a fictional personal publishing demo. Use the admin workspace to edit the profile, stories, and theme.\nThe template includes both a reader site and a content workspace.\nReplace this sample copy before publishing your own instance.",
        "location": "演示站点", "copyright": "© 2026 Star Isle Notes", "footer_note": "独立内容站点模板 · Material 3", "footer_note_en": "Independent publishing template · Material 3",
        "support_eyebrow": "BUY ME A COFFEE", "support_eyebrow_en": "BUY ME A COFFEE",
        "support_title": "如果这些内容帮到了你", "support_title_en": "If these notes helped you",
        "support_body": "你的支持会用于服务器维护、域名续费和持续创作。感谢每一次阅读、分享与留言。",
        "support_body_en": "Your support helps cover hosting, domain renewal, and continued writing. Thank you for reading, sharing, and leaving a comment.",
        "support_note": "打赏完全自愿。感谢你的支持。",
        "support_note_en": "Support is entirely optional. Thank you for your support.",
        "alipay_qr_url": "", "wechat_qr_url": "", "paypal_url": PAYPAL_DONATION_URL,
        "donation_asset_version": "no-recipient-2026-11-04",
        "logo_url": "/brand.svg", "avatar_url": "", "social_links": []},
        "users": [], "comments": [], "reports": [], "moderation_log": [],
        "friend_links": [dict(item) for item in FRIEND_CATALOG],
        "friend_applications": [], "thoughts": [], "announcements": [], "legal_versions": {}}


class RichTextSanitizer(HTMLParser):
    allowed = {"p", "br", "strong", "b", "em", "i", "u", "s", "strike", "ul", "ol", "li", "blockquote", "h2", "h3", "h4", "span", "div", "a", "img", "video", "audio", "source", "figure", "figcaption", "pre", "code", "table", "thead", "tbody", "tr", "th", "td", "caption", "hr"}
    attrs = {"a": {"href", "title", "target", "rel"}, "img": {"src", "alt", "title", "loading", "decoding"}, "video": {"src", "poster", "controls"}, "audio": {"src", "controls"}, "source": {"src", "type"}, "pre": {"class"}, "th": {"colspan", "rowspan"}, "td": {"colspan", "rowspan"}}
    classes = {"macos-code", "article-lead", "article-callout", "article-callout-warning", "article-step-list", "article-step", "article-step-number", "article-step-body", "article-figure-pair", "article-figure-stack"}
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.parts = []
    def safe_url(self, value):
        value = clean(value)
        return value if value.startswith(("https://", "http://", "/")) else ""
    def handle_starttag(self, tag, attrs):
        if tag not in self.allowed:
            return
        out = []
        for key, value in attrs:
            if key == "style" and value:
                rules = []
                for rule in value.split(";"):
                    name, sep, raw = rule.partition(":")
                    name, raw = name.strip().lower(), raw.strip()
                    if sep and name in {"color", "background-color", "font-size", "text-align"} and len(raw) <= 32 and not any(x in raw.lower() for x in ("url", "expression", "javascript", "!")):
                        rules.append(name + ":" + raw)
                if rules:
                    out.append('style="' + html.escape(";".join(rules), quote=True) + '"')
            elif key == "class" and value:
                safe_classes = [name for name in clean(value).split() if name in self.classes]
                if safe_classes:
                    out.append('class="' + html.escape(" ".join(safe_classes), quote=True) + '"')
            elif key in self.attrs.get(tag, set()):
                safe = self.safe_url(value) if key in {"src", "href", "poster"} else clean(value)
                if safe or key in {"alt", "title", "type", "controls"}:
                    out.append(key + ('="' + html.escape(safe, quote=True) + '"' if safe else '=""'))
        self.parts.append("<" + tag + (" " + " ".join(out) if out else "") + ">")
    def handle_endtag(self, tag):
        if tag in self.allowed and tag not in {"br", "img", "source"}:
            self.parts.append("</" + tag + ">")
    def handle_data(self, data):
        self.parts.append(html.escape(data))


def sanitize_rich_text(value):
    parser = RichTextSanitizer(); parser.feed(clean(value)); parser.close(); return "".join(parser.parts)


def render_markdown(value):
    text = html.escape(clean(value))
    text = re.sub(r"^### (.+)$", r"<h3>\1</h3>", text, flags=re.M)
    text = re.sub(r"^## (.+)$", r"<h2>\1</h2>", text, flags=re.M)
    text = re.sub(r"^# (.+)$", r"<h2>\1</h2>", text, flags=re.M)
    text = re.sub(r"\*\*(.+?)\*\*", r"<strong>\1</strong>", text)
    text = re.sub(r"`([^`]+)`", r"<code>\1</code>", text)
    return "".join("<p>" + line + "</p>" for line in text.split("\n") if line.strip())


def hash_password(password, salt=None):
    salt = salt or secrets.token_hex(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode(), bytes.fromhex(salt), 250000).hex()
    return "pbkdf2_sha256$250000$" + salt + "$" + digest


def load_admin_config():
    target = DATA_DIR / "admin-access.json"
    try:
        return json.loads(target.read_text(encoding="utf-8"))
    except (OSError, ValueError, json.JSONDecodeError):
        username = os.getenv("ADMIN_USERNAME", "")
        password = os.getenv("ADMIN_PASSWORD", "")
        if not valid_admin_username(username) or not valid_admin_password(password) or len(password) < 16:
            raise FileNotFoundError("Set ADMIN_USERNAME and a 16+ character ADMIN_PASSWORD before opening the admin port")
        config = {"username": username, "password_hash": hash_password(password)}
        save_admin_config(config)
        return config


def save_admin_config(config):
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    target = DATA_DIR / "admin-access.json"
    temporary = target.with_suffix(".tmp")
    temporary.write_text(json.dumps(config, ensure_ascii=False, indent=2), encoding="utf-8")
    os.chmod(temporary, 0o600)
    temporary.replace(target)


def valid_admin_username(value):
    return isinstance(value, str) and bool(re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9._-]{2,31}", value))


def valid_admin_password(value):
    return isinstance(value, str) and 8 <= len(value) <= 128 and not any(ord(char) < 32 or ord(char) == 127 for char in value)


def verify_password(password, encoded):
    try:
        scheme, rounds, salt, expected = encoded.split("$", 3)
        actual = hashlib.pbkdf2_hmac("sha256", password.encode(), bytes.fromhex(salt), int(rounds)).hex()
        return scheme == "pbkdf2_sha256" and hmac.compare_digest(actual, expected)
    except (TypeError, ValueError):
        return False


def verify_turnstile(response_token, expected_action="register"):
    if not TURNSTILE_SECRET or not clean(response_token):
        return False
    body = json.dumps({"secret": TURNSTILE_SECRET, "response": clean(response_token)}).encode()
    req = urllib_request.Request("https://challenges.cloudflare.com/turnstile/v0/siteverify", data=body, headers={"Content-Type": "application/json"}, method="POST")
    try:
        with urllib_request.urlopen(req, timeout=8) as response:
            result = json.loads(response.read().decode())
        return result.get("success") is True and result.get("action") == expected_action
    except (OSError, ValueError, json.JSONDecodeError):
        return False


def email_code_digest(email, code):
    message = (email + ":" + code).encode()
    return hmac.new(EMAIL_CODE_PEPPER, message, hashlib.sha256).hexdigest()


def valid_email(email):
    return len(email) <= 254 and re.fullmatch(r"[^\s@]+@[^\s@]+\.[^\s@]+", email) is not None


class OAuthFlowError(Exception):
    pass


def oauth_provider_configured(provider):
    return provider == "github" and bool(GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET) or provider == "qq" and bool(QQ_APP_ID and QQ_APP_KEY)


def oauth_provider_settings():
    return {"github": bool(GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET), "qq": bool(QQ_APP_ID and QQ_APP_KEY)}


def oauth_callback_url(provider):
    return f"{PUBLIC_BASE_URL}/auth/{provider}/callback"


def safe_local_path(value, fallback="/"):
    value = clean(value)
    return value if value.startswith("/") and not value.startswith("//") and len(value) <= 500 else fallback


def prune_oauth_temp_records():
    now = time.time()
    with LOCK:
        for store in (OAUTH_STATES, OAUTH_PENDING):
            for key, record in list(store.items()):
                if record.get("expires_at", 0) <= now:
                    store.pop(key, None)


def create_oauth_state(provider, intent, user_id="", next_path="/"):
    prune_oauth_temp_records()
    state = secrets.token_urlsafe(32)
    with LOCK:
        OAUTH_STATES[state] = {
            "provider": provider,
            "intent": intent,
            "user_id": user_id,
            "next": safe_local_path(next_path),
            "expires_at": time.time() + OAUTH_TEMP_TTL_SECONDS,
        }
    return state


def consume_oauth_state(provider, state):
    prune_oauth_temp_records()
    with LOCK:
        record = OAUTH_STATES.pop(state, None)
    if not record or record.get("provider") != provider or record.get("expires_at", 0) <= time.time():
        raise OAuthFlowError("state_expired")
    return record


def create_oauth_pending(provider, identity):
    token = secrets.token_urlsafe(32)
    with LOCK:
        OAUTH_PENDING[token] = {
            "provider": provider,
            "identity": identity,
            "expires_at": time.time() + OAUTH_TEMP_TTL_SECONDS,
        }
    return token


def get_oauth_pending(token):
    prune_oauth_temp_records()
    with LOCK:
        record = OAUTH_PENDING.get(clean(token))
        if not record or record.get("expires_at", 0) <= time.time():
            return None
        return dict(record)


def find_user_by_oauth(state, provider, external_id):
    external_id = clean(external_id)
    if not external_id:
        return None
    for user in state.get("users", []):
        connection = (user.get("oauth_connections") or {}).get(provider)
        if isinstance(connection, dict) and clean(connection.get("id")) == external_id:
            return user
    return None


def oauth_connection_summary(user):
    result = {}
    connections = user.get("oauth_connections") if isinstance(user, dict) else {}
    for provider in ("github", "qq"):
        connection = connections.get(provider) if isinstance(connections, dict) else None
        result[provider] = {
            "connected": bool(isinstance(connection, dict) and clean(connection.get("id"))),
            "name": clean(connection.get("name"))[:80] if isinstance(connection, dict) else "",
            "bound_at": clean(connection.get("bound_at")) if isinstance(connection, dict) else "",
        }
    return result


def attach_oauth_connection(state, user, provider, identity):
    external_id = clean(identity.get("id"))
    if not external_id:
        raise OAuthFlowError("provider_error")
    conflict = find_user_by_oauth(state, provider, external_id)
    if conflict and conflict.get("id") != user.get("id"):
        raise OAuthFlowError("oauth_conflict")
    connections = user.setdefault("oauth_connections", {})
    if not isinstance(connections, dict):
        connections = user["oauth_connections"] = {}
    existing = connections.get(provider)
    if isinstance(existing, dict) and clean(existing.get("id")) not in {"", external_id}:
        raise OAuthFlowError("provider_already_bound")
    connections[provider] = {
        "id": external_id,
        "name": clean(identity.get("name"))[:80],
        "avatar_url": clean(identity.get("avatar_url"))[:1000],
        "bound_at": clean((existing or {}).get("bound_at")) or now_iso(),
    }
    if not user.get("avatar_url") and clean(identity.get("avatar_url")):
        user["avatar_url"] = clean(identity.get("avatar_url"))[:1000]
    return user


def unique_oauth_username(state, identity, provider):
    raw = clean(identity.get("name"))[:40]
    base = re.sub(r"[\x00-\x1f<>]", "", raw).strip() or f"{provider}_{clean(identity.get('id'))[:8]}"
    if len(base) < 2:
        base = f"{provider}_user"
    existing = {clean(user.get("username")).lower() for user in state.get("users", [])}
    candidate = base
    suffix = 2
    while candidate.lower() in existing:
        candidate = f"{base[:34]}_{suffix}"
        suffix += 1
    return candidate


def oauth_json_request(url, data=None, headers=None):
    request_headers = {"User-Agent": "StarIsleBlog/3.3", "Accept": "application/json"}
    request_headers.update(headers or {})
    request = urllib_request.Request(url, data=data, headers=request_headers, method="POST" if data is not None else "GET")
    try:
        with urllib_request.urlopen(request, timeout=15) as response:
            raw = response.read(1024 * 1024).decode("utf-8", errors="replace")
    except (OSError, ValueError) as error:
        raise OAuthFlowError("provider_error") from error
    text = raw.strip()
    if text.startswith("callback(") and text.endswith(");"):
        text = text[9:-2]
    elif text.startswith("callback(") and text.endswith(")"):
        text = text[9:-1]
    try:
        result = json.loads(text)
    except json.JSONDecodeError as error:
        raise OAuthFlowError("provider_error") from error
    if not isinstance(result, dict):
        raise OAuthFlowError("provider_error")
    return result


def exchange_github_identity(code):
    token_payload = oauth_json_request(
        "https://github.com/login/oauth/access_token",
        urlencode({
            "client_id": GITHUB_CLIENT_ID,
            "client_secret": GITHUB_CLIENT_SECRET,
            "code": code,
            "redirect_uri": oauth_callback_url("github"),
        }).encode(),
        {"Accept": "application/json", "Content-Type": "application/x-www-form-urlencoded"},
    )
    access_token = clean(token_payload.get("access_token"))
    if not access_token:
        raise OAuthFlowError("provider_denied")
    headers = {"Authorization": "Bearer " + access_token, "Accept": "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28"}
    profile = oauth_json_request("https://api.github.com/user", headers=headers)
    external_id = clean(profile.get("id"))
    name = clean(profile.get("login")) or clean(profile.get("name"))
    if not external_id or not name:
        raise OAuthFlowError("provider_error")
    return {
        "id": external_id,
        "name": name[:80],
        "avatar_url": clean(profile.get("avatar_url"))[:1000],
    }


def exchange_qq_identity(code):
    token_request = urllib_request.Request(
        "https://graph.qq.com/oauth2.0/token?" + urlencode({
            "grant_type": "authorization_code",
            "client_id": QQ_APP_ID,
            "client_secret": QQ_APP_KEY,
            "code": code,
            "redirect_uri": oauth_callback_url("qq"),
            "fmt": "json",
        }),
        headers={"User-Agent": "StarIsleBlog/3.3"},
    )
    try:
        with urllib_request.urlopen(token_request, timeout=15) as response:
            token_raw = response.read(1024 * 1024).decode("utf-8", errors="replace").strip()
    except OSError as error:
        raise OAuthFlowError("provider_error") from error
    try:
        token_payload = json.loads(token_raw)
    except json.JSONDecodeError:
        token_payload = {key: values[0] for key, values in parse_qs(token_raw).items() if values}
    access_token = clean(token_payload.get("access_token"))
    if not access_token:
        raise OAuthFlowError("provider_denied")
    openid_payload = oauth_json_request(
        "https://graph.qq.com/oauth2.0/me?" + urlencode({"access_token": access_token, "fmt": "json"})
    )
    openid = clean(openid_payload.get("openid"))
    if not openid:
        raise OAuthFlowError("provider_error")
    profile = oauth_json_request(
        "https://graph.qq.com/user/get_user_info?" + urlencode({
            "access_token": access_token,
            "oauth_consumer_key": QQ_APP_ID,
            "openid": openid,
        })
    )
    if int(profile.get("ret", 0) or 0) != 0:
        raise OAuthFlowError("provider_error")
    name = clean(profile.get("nickname")) or "QQ用户"
    return {
        "id": openid,
        "name": name[:80],
        "avatar_url": clean(profile.get("figureurl_qq_2") or profile.get("figureurl_qq_1"))[:1000],
    }


def send_email(recipient, subject, html_body):
    if not all((SMTP_HOST, SMTP_USERNAME, SMTP_PASSWORD, SMTP_FROM, valid_email(recipient))):
        return False
    from email.message import EmailMessage
    message = EmailMessage()
    message["From"] = SMTP_FROM
    message["To"] = recipient
    message["Subject"] = subject
    message.set_content("This message contains an HTML view.")
    message.add_alternative(html_body, subtype="html")
    try:
        if SMTP_PORT == 465:
            with smtplib.SMTP_SSL(SMTP_HOST, SMTP_PORT, timeout=12, context=ssl.create_default_context()) as client:
                client.login(SMTP_USERNAME, SMTP_PASSWORD)
                client.send_message(message)
        else:
            with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=12) as client:
                client.starttls(context=ssl.create_default_context())
                client.login(SMTP_USERNAME, SMTP_PASSWORD)
                client.send_message(message)
        return True
    except (OSError, smtplib.SMTPException):
        return False


def send_registration_email(email, code):
    safe_code = html.escape(code)
    body = f"<h2>Verify your email</h2><p>Your demo site verification code is <strong>{safe_code}</strong>.</p><p>It expires in 10 minutes.</p>"
    return send_email(email, "Email verification code", body)


def send_password_reset_email(email, code):
    safe_code = html.escape(code)
    body = f"<h2>Reset your password</h2><p>Your demo site reset code is <strong>{safe_code}</strong>.</p><p>It expires in 10 minutes.</p>"
    return send_email(email, "Password reset code", body)


def send_oauth_bind_email(email, code):
    safe_code = html.escape(code)
    body = f"<h2>Confirm account linking</h2><p>Your demo site code is <strong>{safe_code}</strong>.</p><p>It expires in 10 minutes.</p>"
    return send_email(email, "Account linking code", body)


def send_friend_application_approved_email(email, application):
    site_name = html.escape(clean(application.get("name"))[:80])
    site_url = html.escape(clean(application.get("url"))[:500])
    body = f"<h2>Link application approved</h2><p>{site_name} is now listed in the demo directory.</p><p><a href=\"{site_url}\">{site_url}</a></p>"
    return send_email(email, "Link application update", body)


def send_comment_review_request_email(comment, requester):
    if not valid_email(COMMENT_REVIEW_NOTIFY_EMAIL):
        return False
    reviewer = html.escape(clean(requester.get("username"))[:80])
    post_title = html.escape(clean(comment.get("post_title"))[:120] or "Post")
    content = html.escape(clean(comment.get("content"))[:500])
    body = f"<h2>Comment review requested</h2><p>{reviewer} requested a review for {post_title}.</p><blockquote>{content}</blockquote><p><a href=\"{html.escape(ADMIN_BASE_URL)}/\">Open admin</a></p>"
    return send_email(COMMENT_REVIEW_NOTIFY_EMAIL, "Comment review requested", body)

def reserve_email_send(email, client_ip):
    now = time.time()
    window = 60 * 60
    keys = ("email:" + email, "ip:" + client_ip)
    with LOCK:
        for address, record in list(EMAIL_CODES.items()):
            if record.get("expires_at", 0) <= now:
                EMAIL_CODES.pop(address, None)
        histories = {}
        for key in keys:
            history = [stamp for stamp in EMAIL_SEND_HISTORY.get(key, []) if now - stamp < window]
            histories[key] = history
            if history and key.startswith("email:") and now - history[-1] < EMAIL_CODE_COOLDOWN_SECONDS:
                return False, max(1, math.ceil(EMAIL_CODE_COOLDOWN_SECONDS - (now - history[-1])))
            limit = 5 if key.startswith("email:") else 20
            if len(history) >= limit:
                return False, max(1, math.ceil(window - (now - history[0])))
        if len(EMAIL_SEND_HISTORY) > 5000:
            for key in list(EMAIL_SEND_HISTORY):
                if not any(now - stamp < window for stamp in EMAIL_SEND_HISTORY[key]):
                    EMAIL_SEND_HISTORY.pop(key, None)
        if any(key not in EMAIL_SEND_HISTORY and len(EMAIL_SEND_HISTORY) >= 5000 for key in keys):
            return False, 60
        for key in keys:
            EMAIL_SEND_HISTORY[key] = histories[key]
            EMAIL_SEND_HISTORY[key].append(now)
    return True, 0


def verify_email_code(email, code, consume=False, purpose="register"):
    record = EMAIL_CODES.get(email)
    if not record or record.get("purpose", "register") != purpose:
        return False
    now = time.time()
    if record["expires_at"] <= now:
        EMAIL_CODES.pop(email, None)
        return False
    if not hmac.compare_digest(record["digest"], email_code_digest(email, code)):
        record["attempts"] += 1
        if record["attempts"] >= EMAIL_CODE_MAX_ATTEMPTS:
            EMAIL_CODES.pop(email, None)
        return False
    if consume:
        EMAIL_CODES.pop(email, None)
    return True


def seasonal_theme(profile=None):
    return get_theme(profile)


def normalize_post(post):
    post.setdefault("slug", post.get("id", "")); post.setdefault("format", "html"); post.setdefault("tags", []); post.setdefault("category", "未分类"); post.setdefault("author", "StarIsle"); post.setdefault("published_at", post.get("updated_at", "")); post.setdefault("scheduled_at", ""); post.setdefault("views", 0); post.setdefault("likes", 0); post.setdefault("liked_by", []); post.setdefault("pinned", False); post.setdefault("carousel", bool(post.get("pinned"))); post.setdefault("cover_url", "")
    if post.get("author") in {"栖迟", "Xander", ""}:
        post["author"] = "StarIsle"
    if not isinstance(post.get("liked_by"), list):
        post["liked_by"] = []
    return post


def load_legal_documents():
    try:
        payload = json.loads(LEGAL_DOCUMENTS_FILE.read_text(encoding="utf-8"))
        documents = payload.get("documents", {}) if isinstance(payload, dict) else {}
        return documents if isinstance(documents, dict) else {}
    except (OSError, json.JSONDecodeError):
        return {}


LEGAL_DOCUMENTS = load_legal_documents()


def legal_document_signature(document):
    signed = {
        "titleZh": clean(document.get("titleZh")),
        "titleEn": clean(document.get("titleEn")),
        "effective_at": clean(document.get("effective_at")),
        "updated_at": clean(document.get("updated_at")),
        "version": clean(document.get("version")),
        "sections": document.get("sections", []),
    }
    return hashlib.sha256(json.dumps(signed, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode()).hexdigest()


def format_legal_datetime(value):
    parsed = parse_time(value)
    return parsed.strftime("%Y-%m-%d %H:%M") if parsed else clean(value)


def sync_legal_announcements(state):
    if not LEGAL_DOCUMENTS:
        return False
    versions = state.setdefault("legal_versions", {})
    if not isinstance(versions, dict):
        versions = {}
        state["legal_versions"] = versions
    changed = []
    for key, document in LEGAL_DOCUMENTS.items():
        if not isinstance(document, dict):
            continue
        signature = legal_document_signature(document)
        if (versions.get(key) or {}).get("signature") != signature:
            changed.append((key, document, signature))
    if not changed:
        return False
    combined = hashlib.sha256("|".join(
        f"{key}:{(versions.get(key) or {}).get('signature', 'initial')}->{signature}"
        for key, _, signature in changed
    ).encode()).hexdigest()[:16]
    announcement_id = "legal-" + combined
    announcements = state.setdefault("announcements", [])
    if not any(item.get("id") == announcement_id for item in announcements if isinstance(item, dict)):
        titles_zh = "、".join(f"《{clean(document.get('titleZh'))}》" for _, document, _ in changed)
        titles_en = ", ".join(clean(document.get("titleEn")) for _, document, _ in changed)
        updated_at = format_legal_datetime(max(clean(document.get("updated_at")) for _, document, _ in changed))
        effective_at = format_legal_datetime(max(clean(document.get("effective_at")) for _, document, _ in changed))
        announcements.insert(0, {
            "id": announcement_id,
            "title_zh": "条款与政策已更新",
            "title_en": "Terms and policies updated",
            "body_zh": f"{titles_zh}已更新。生效时间：{effective_at}；更新时间：{updated_at}。请在继续使用本站前阅读最新版本。",
            "body_en": f"{titles_en} have been updated. Effective: {effective_at}; updated: {updated_at}. Please review the latest versions before continuing to use the site.",
            "published": True,
            "source": "legal",
            "source_ids": [key for key, _, _ in changed],
            "created_at": now_iso(),
            "updated_at": now_iso(),
            "published_at": now_iso(),
        })
    for key, document, signature in changed:
        versions[key] = {
            "signature": signature,
            "version": clean(document.get("version")),
            "effective_at": clean(document.get("effective_at")),
            "updated_at": clean(document.get("updated_at")),
        }
    return True


def _load_state_unlocked():
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    if not DATA_FILE.exists():
        state = default_state(); sync_legal_announcements(state); save_state(state); return state
    try:
        raw = json.loads(DATA_FILE.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        raw = default_state()
    defaults = default_state(); state = defaults.copy(); changed = False
    stored_profile = raw.get("profile", {}) if isinstance(raw, dict) else {}
    if isinstance(raw, list):
        state["posts"] = raw; changed = True
    elif isinstance(raw, dict):
        for key in ("posts", "users", "comments", "reports", "moderation_log", "friend_links", "friend_applications", "thoughts", "announcements"):
            if isinstance(raw.get(key), list): state[key] = raw[key]
        if isinstance(raw.get("legal_versions"), dict):
            state["legal_versions"] = raw["legal_versions"]
        if isinstance(raw.get("profile"), dict): state["profile"] = {**defaults["profile"], **raw["profile"]}
    profile = state["profile"]
    if profile.get("name") in {"栖迟", "Xander", "", None} or "栖迟" in clean(profile.get("name")):
        profile["name"] = "StarIsle的小屋"; changed = True
    if profile.get("copyright") == "© 2026 StarIsle":
        profile["copyright"] = "© 2026 StarIsle"; changed = True
    if profile.get("support_note") == "打赏完全自愿。请确认收款账户名称后再付款。":
        profile["support_note"] = "打赏完全自愿。感谢你的支持。"
        changed = True
    if profile.get("support_note_en") == "Support is entirely optional. Please confirm the recipient name before sending.":
        profile["support_note_en"] = "Support is entirely optional. Thank you for your support."
        changed = True
    for key, value in defaults["profile"].items():
        if key not in profile: profile[key] = value; changed = True
    if stored_profile.get("donation_asset_version") != defaults["profile"]["donation_asset_version"]:
        profile["alipay_qr_url"] = defaults["profile"]["alipay_qr_url"]
        profile["wechat_qr_url"] = defaults["profile"]["wechat_qr_url"]
        profile["donation_asset_version"] = defaults["profile"]["donation_asset_version"]
        changed = True
    if not profile.get("paypal_url"):
        profile["paypal_url"] = PAYPAL_DONATION_URL
        changed = True
    state["posts"] = [normalize_post(p) for p in state.get("posts", []) if isinstance(p, dict)]
    for comment in state.get("comments", []):
        for key, value in (("approved", True), ("parent_id", ""), ("reply_to_id", ""), ("reply_to_username", ""), ("reply_to_content", ""), ("image_url", ""), ("image_urls", []), ("likes", 0), ("liked_by", []), ("pinned", False), ("review_requested", False), ("review_requested_at", ""), ("reviewed_at", "")):
            if key not in comment:
                comment[key] = value; changed = True
        raw_urls = comment.get("image_urls") if isinstance(comment.get("image_urls"), list) else []
        urls = []
        for value in [*raw_urls, comment.get("image_url", "")]:
            url = valid_comment_image_url(value)
            if url and url not in urls:
                urls.append(url)
        urls = urls[:MAX_GALLERY_IMAGES]
        primary_url = urls[0] if urls else ""
        if comment.get("image_urls") != urls:
            comment["image_urls"] = urls; changed = True
        if comment.get("image_url") != primary_url:
            comment["image_url"] = primary_url; changed = True
        if not isinstance(comment.get("liked_by"), list):
            comment["liked_by"] = []; changed = True
        if "moderation_flags" not in comment:
            flags = comment_moderation_flags(comment.get("content", ""))
            comment["moderation_flags"] = flags
            changed = True
        flags = comment.get("moderation_flags") if isinstance(comment.get("moderation_flags"), list) else []
        if "review_status" not in comment:
            if flags and not comment.get("approved", True):
                comment.setdefault("moderation_original", clean(comment.get("content")))
                comment["content"] = mask_comment_filter_words(comment.get("content", ""), flags)
                comment["approved"] = True
                comment["review_status"] = "pending"
            else:
                comment["review_status"] = "approved"
            changed = True
        if flags and not comment.get("moderation_original"):
            comment["moderation_original"] = ""
    comments_by_id = {comment.get("id"): comment for comment in state.get("comments", [])}
    for comment in state.get("comments", []):
        target = comments_by_id.get(comment.get("reply_to_id") or comment.get("parent_id"))
        if comment.get("parent_id"):
            if target and target.get("parent_id"):
                if not comment.get("reply_to_content"):
                    comment["reply_to_id"] = target.get("id", "")
                    comment["reply_to_username"] = target.get("username", "")
                    comment["reply_to_content"] = clean(target.get("content"))[:180]
                    changed = True
            elif comment.get("reply_to_id") or comment.get("reply_to_username") or comment.get("reply_to_content"):
                comment["reply_to_id"] = ""
                comment["reply_to_username"] = ""
                comment["reply_to_content"] = ""
                changed = True
    for user in state.get("users", []):
        for key, value in (("avatar_url", ""), ("avatar_variants", {}), ("signature", ""), ("gender", "保密"), ("birthday", ""), ("muted_until", ""), ("moderation_reason", ""), ("banned", False), ("oauth_connections", {}), ("favorites", [])):
            if key not in user:
                user[key] = value; changed = True
        if not isinstance(user.get("oauth_connections"), dict):
            user["oauth_connections"] = {}; changed = True
        if not isinstance(user.get("favorites"), list):
            user["favorites"] = []; changed = True
        else:
            favorites = [clean(post_id) for post_id in user["favorites"] if clean(post_id)]
            if user["favorites"] != favorites:
                user["favorites"] = favorites; changed = True
    for thought in state.get("thoughts", []):
        for key, value in (("likes", 0), ("liked_by", []), ("image_url", ""), ("image_urls", [])):
            if key not in thought:
                thought[key] = value; changed = True
        raw_urls = thought.get("image_urls") if isinstance(thought.get("image_urls"), list) else []
        urls = []
        for value in [*raw_urls, thought.get("image_url", "")]:
            url = valid_image_reference(value)
            if url and url not in urls:
                urls.append(url)
        urls = urls[:MAX_GALLERY_IMAGES]
        primary_url = urls[0] if urls else ""
        if thought.get("image_urls") != urls:
            thought["image_urls"] = urls; changed = True
        if thought.get("image_url") != primary_url:
            thought["image_url"] = primary_url; changed = True
        if not isinstance(thought.get("liked_by"), list):
            thought["liked_by"] = []; changed = True
    for announcement in state.get("announcements", []):
        for key, value in (("title_en", ""), ("body_en", ""), ("source", "manual"), ("published_at", ""), ("updated_at", "")):
            if key not in announcement:
                announcement[key] = value; changed = True
    if sync_legal_announcements(state):
        changed = True
    if changed: save_state(state)
    return state


def _save_state_unlocked(state):
    DATA_DIR.mkdir(parents=True, exist_ok=True); temp = DATA_FILE.with_suffix(".tmp")
    temp.write_text(json.dumps(state, ensure_ascii=False, indent=2), encoding="utf-8"); temp.replace(DATA_FILE)


def load_state():
    with LOCK:
        return _load_state_unlocked()


def save_state(state):
    with LOCK:
        _save_state_unlocked(state)


def user_is_muted(user):
    until = parse_time(user.get("muted_until"))
    if until and until.tzinfo is None:
        until = until.replace(tzinfo=timezone.utc)
    return bool(until and until > datetime.now(timezone.utc))


def public_user(user):
    if not user: return None
    return {
        "id": user.get("id", ""),
        "username": user.get("username", ""),
        "signature": user.get("signature", ""),
        "avatar_url": user.get("avatar_url", ""),
        "avatar_variants": sanitized_avatar_variants(user),
        "created_at": user.get("created_at", ""),
        "muted": user_is_muted(user),
        "banned": bool(user.get("banned")),
    }


def account_user(user):
    if not user: return None
    return {
        **public_user(user),
        "email": user.get("email", ""),
        "gender": user.get("gender", "保密"),
        "birthday": user.get("birthday", ""),
        "muted_until": user.get("muted_until", "") if user_is_muted(user) else "",
        "moderation_reason": user.get("moderation_reason", ""),
        "oauth_connections": oauth_connection_summary(user),
        "has_password": bool(user.get("password_hash")),
        "favorites": list(user.get("favorites") or []),
    }


def report_view(report, state):
    users_by_id = {user.get("id"): user for user in state.get("users", [])}
    comments_by_id = {comment.get("id"): comment for comment in state.get("comments", [])}
    result = dict(report)
    result["reporter"] = public_user(users_by_id.get(report.get("reporter_id")))
    if report.get("target_type") == "comment":
        comment = comments_by_id.get(report.get("target_id"))
        result["target_comment"] = comment
        result["target_user"] = public_user(users_by_id.get(comment.get("user_id"))) if comment else None
    else:
        result["target_user"] = public_user(users_by_id.get(report.get("target_id")))
    return result


def public_friend_link(item):
    return {
        "id": clean(item.get("id")),
        "name": clean(item.get("name"))[:80],
        "url": clean(item.get("url"))[:500],
        "description": clean(item.get("description"))[:240],
        "avatar": clean(item.get("avatar"))[:1000],
        "address": clean(item.get("address"))[:120],
        "created_at": clean(item.get("created_at")),
    }


def image_suffix(body):
    if body.startswith(b"\xff\xd8\xff"):
        return ".jpg"
    if body.startswith(b"\x89PNG\r\n\x1a\n"):
        return ".png"
    if body.startswith((b"GIF87a", b"GIF89a")):
        return ".gif"
    if len(body) >= 12 and body[:4] == b"RIFF" and body[8:12] == b"WEBP":
        return ".webp"
    return ""


def sanitized_avatar_variants(user):
    raw = user.get("avatar_variants") if isinstance(user, dict) else None
    if not isinstance(raw, dict):
        return {}
    result = {}
    for size in AVATAR_THUMBNAIL_SIZES:
        value = clean(raw.get(str(size)))
        if re.fullmatch(rf"/uploads/[a-f0-9]{{32}}_{size}\.webp", value):
            result[str(size)] = value
    return result


def remove_avatar_variants(variants):
    for value in (variants or {}).values():
        name = clean(value).rsplit("/", 1)[-1]
        if re.fullmatch(r"[a-f0-9]{32}_\d+\.webp", name):
            try:
                (UPLOAD_DIR / name).unlink()
            except OSError:
                pass


def create_avatar_thumbnails(body, token):
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    variants = {}
    try:
        with Image.open(io.BytesIO(body)) as source:
            source.seek(0)
            if source.width * source.height > Image.MAX_IMAGE_PIXELS:
                raise ValueError("avatar dimensions too large")
            image = ImageOps.exif_transpose(source)
            image.load()
            if image.mode not in {"RGB", "RGBA"}:
                image = image.convert("RGBA")
            for size in AVATAR_THUMBNAIL_SIZES:
                thumbnail = ImageOps.fit(
                    image,
                    (size, size),
                    method=Image.Resampling.LANCZOS,
                    centering=(0.5, 0.5),
                )
                filename = f"{token}_{size}.webp"
                target = UPLOAD_DIR / filename
                temporary = target.with_suffix(".webp.tmp")
                thumbnail.save(temporary, format="WEBP", quality=82, method=6)
                temporary.replace(target)
                variants[str(size)] = "/uploads/" + filename
        return variants
    except (OSError, ValueError, UnidentifiedImageError, Image.DecompressionBombError):
        remove_avatar_variants(variants)
        raise ValueError("avatar image decode failed")


def valid_comment_image_url(value):
    value = clean(value)
    if not value:
        return ""
    match = re.fullmatch(r"/uploads/([a-f0-9]{32}\.(?:jpg|jpeg|png|gif|webp))", value)
    if not match:
        return ""
    return value if (UPLOAD_DIR / match.group(1)).is_file() else ""


def valid_image_reference(value):
    value = clean(value)
    if not value:
        return ""
    local = valid_comment_image_url(value)
    if local:
        return local
    return value if valid_external_url(value) else ""


def gallery_urls_from_payload(payload, validator=valid_comment_image_url):
    if "image_urls" in payload:
        raw_values = payload.get("image_urls")
        if not isinstance(raw_values, list):
            return [], True
        values = raw_values
    else:
        values = [payload.get("image_url", "")]
    if len(values) > MAX_GALLERY_IMAGES:
        return [], True
    urls = []
    invalid = False
    for value in values:
        cleaned = clean(value)
        if not cleaned:
            continue
        validated = validator(cleaned)
        if not validated:
            invalid = True
            continue
        if validated not in urls:
            urls.append(validated)
    return urls, invalid


def moderate_user(state, user, action, reason, duration_hours=0):
    action = clean(action).lower()
    reason = clean(reason)[:300]
    if action not in {"mute", "unmute", "ban", "unban"}:
        raise ValueError("无效的处置操作")
    if action in {"mute", "ban"} and len(reason) < 2:
        raise ValueError("请填写至少 2 个字符的处置原因")
    if action == "mute":
        try:
            duration_hours = int(duration_hours)
        except (TypeError, ValueError):
            raise ValueError("禁言时长无效")
        if duration_hours < 1 or duration_hours > 8760:
            raise ValueError("禁言时长需在 1 到 8760 小时之间")
        until = datetime.now(timezone.utc) + timedelta(hours=duration_hours)
        user["muted_until"] = until.isoformat(timespec="seconds")
    elif action == "unmute":
        user["muted_until"] = ""
    elif action == "ban":
        user["banned"] = True
        user["muted_until"] = ""
    elif action == "unban":
        user["banned"] = False
    user["moderation_reason"] = reason if action in {"mute", "ban"} else ""
    entry = {
        "id": secrets.token_hex(8),
        "user_id": user.get("id", ""),
        "action": action,
        "reason": reason,
        "duration_hours": duration_hours if action == "mute" else 0,
        "created_at": now_iso(),
    }
    state.setdefault("moderation_log", []).append(entry)
    return entry


def public_post(post): return {key: value for key, value in post.items() if key != "liked_by"}
def public_post_for_viewer(post, viewer=None):
    result = public_post(post)
    actor = "user:" + viewer["id"] if viewer else ""
    result["liked"] = bool(actor and actor in post.get("liked_by", []))
    result["favorited"] = bool(viewer and post.get("id") in (viewer.get("favorites") or []))
    return result
def text_word_count(value):
    plain = html.unescape(re.sub(r"<[^>]+>", " ", clean(value)))
    cjk_count = len(re.findall(r"[\u3400-\u9fff\uf900-\ufaff]", plain))
    latin_count = len(re.findall(r"[a-z0-9]+", re.sub(r"[\u3400-\u9fff\uf900-\ufaff]", " ", plain), flags=re.I))
    return cjk_count + latin_count
def public_thought(thought, viewer=None):
    result = {key: value for key, value in thought.items() if key != "liked_by"}
    result["image_urls"] = list(thought.get("image_urls") or ([thought.get("image_url")] if thought.get("image_url") else []))
    actor = "user:" + viewer["id"] if viewer else ""
    result["liked"] = bool(actor and actor in thought.get("liked_by", []))
    return result
def public_comment(comment, viewer=None, author=None):
    result = {key: value for key, value in comment.items() if key != "liked_by"}
    result["image_urls"] = list(comment.get("image_urls") or ([comment.get("image_url")] if comment.get("image_url") else []))
    result.pop("moderation_flags", None)
    result.pop("moderation_original", None)
    actor = "user:" + viewer["id"] if viewer else ""
    result["liked"] = bool(actor and actor in comment.get("liked_by", []))
    result["can_delete"] = bool(viewer and comment.get("user_id") == viewer.get("id"))
    result["pending_review"] = comment.get("review_status") == "pending"
    result["can_request_review"] = bool(result["can_delete"] and result["pending_review"] and not comment.get("review_requested"))
    result["user"] = public_user(author)
    return result
def make_id(title): return hashlib.sha1((title + secrets.token_hex(4)).encode()).hexdigest()[:12]


def server_runtime_status():
    now = time.time()
    try:
        uptime_seconds = max(0, float(Path("/proc/uptime").read_text().split()[0]))
    except (OSError, ValueError, IndexError):
        uptime_seconds = 0
    try:
        load_1m, load_5m, load_15m = os.getloadavg()
    except (OSError, AttributeError):
        load_1m = load_5m = load_15m = 0
    return {
        "status": "online",
        "uptime_seconds": int(uptime_seconds),
        "boot_time": datetime.fromtimestamp(now - uptime_seconds, timezone.utc).isoformat(timespec="seconds") if uptime_seconds else "",
        "service_uptime_seconds": int(max(0, now - APP_STARTED_AT)),
        "load": [round(value, 2) for value in (load_1m, load_5m, load_15m)],
        "checked_at": datetime.fromtimestamp(now, timezone.utc).isoformat(timespec="seconds"),
    }


class BlogHandler(BaseHTTPRequestHandler):
    server_version = "MeterialExtra/0.1.2"
    def log_message(self, fmt, *args): print("[%s] %s" % (self.log_date_time_string(), fmt % args))
    @property
    def admin_port(self): return self.server.server_port == ADMIN_PORT
    def parse_request(self):
        if not super().parse_request():
            return False
        if not self.admin_port:
            return True
        try:
            config = load_admin_config()
            scheme, _, encoded = self.headers.get("Authorization", "").partition(" ")
            if scheme.lower() != "basic" or len(encoded) > 4096:
                raise ValueError("credentials required")
            credentials = base64.b64decode(encoded, validate=True).decode("utf-8")
            username, separator, password = credentials.partition(":")
            authenticated = separator and hmac.compare_digest(username, config["username"]) and verify_password(password, config["password_hash"])
        except (OSError, ValueError, KeyError, TypeError, binascii.Error):
            authenticated = False
        if not authenticated:
            self.close_connection = True
            self.send_json({"error": "Administrator authentication required"}, HTTPStatus.UNAUTHORIZED, {"WWW-Authenticate": 'Basic realm="Blog administration", charset="UTF-8"'})
            return False
        if self.command not in ("GET", "HEAD", "OPTIONS"):
            origin = self.headers.get("Origin")
            if origin and urlparse(origin).netloc.lower() != self.headers.get("Host", "").lower():
                self.close_connection = True
                self.send_json({"error": "Cross-origin management request rejected"}, HTTPStatus.FORBIDDEN)
                return False
        return True
    def send_json(self, payload, status=HTTPStatus.OK, headers=None):
        raw = json.dumps(payload, ensure_ascii=False).encode(); self.send_response(status); self.send_header("Content-Type", "application/json; charset=utf-8"); self.send_header("Cache-Control", "no-store"); self.send_header("Content-Length", str(len(raw)))
        for key, value in (headers or {}).items(): self.send_header(key, value)
        self.end_headers(); self.wfile.write(raw)
    def send_file(self, filename):
        path = STATIC_DIR / filename
        if not path.is_file(): return self.send_error(HTTPStatus.NOT_FOUND)
        content_type = {".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "application/javascript; charset=utf-8", ".xml": "application/xml", ".json": "application/json; charset=utf-8", ".svg": "image/svg+xml", ".png": "image/png", ".webp": "image/webp", ".woff2": "font/woff2"}.get(path.suffix, "application/octet-stream")
        raw = path.read_bytes(); self.send_response(200); self.send_header("Content-Type", content_type); self.send_header("Content-Length", str(len(raw))); self.end_headers(); self.wfile.write(raw)
    def send_index(self, page="home"):
        path = STATIC_DIR / "index.html"
        if not path.is_file():
            return self.send_error(HTTPStatus.NOT_FOUND)
        state = load_state()
        theme = seasonal_theme(state.get("profile"))
        theme_key = clean(theme.get("key"))
        season = clean(theme.get("season"), "everyday")
        category = clean(theme.get("category"), "solar")
        palette = theme.get("palette") or {}
        accent = clean(palette.get("accent"), "#686b85")
        if not re.fullmatch(r"[a-z0-9-]+", theme_key):
            theme_key = "lichun"
        if not re.fullmatch(r"[a-z0-9-]+", season):
            season = "spring"
        if not re.fullmatch(r"#[0-9a-f]{6}", accent, re.I):
            accent = "#686b85"
        palette_vars = {"accent": accent}
        for key in ("sky1", "sky2", "back", "front", "sun"):
            value = clean(palette.get(key))
            palette_vars[key] = value if re.fullmatch(r"#[0-9a-f]{6}", value, re.I) else accent
        bootstrap_style = ";".join(f"--term-{key}:{value}" for key, value in palette_vars.items())
        bootstrap_rules = (
            f":root{{{bootstrap_style}}}"
            ':root:not([data-theme="dark"]){--boot-surface:color-mix(in srgb,var(--term-accent) 2%,#fbfcfa);--boot-primary:var(--term-accent)}'
            ':root[data-theme="dark"]{--boot-surface:color-mix(in srgb,var(--term-accent) 8%,#151a18);--boot-primary:color-mix(in srgb,var(--term-accent) 36%,#e4ece6)}'
            ':root[data-app-loading="true"],:root[data-app-loading="true"] body,#app-loading{background:var(--boot-surface,#fbfcfa)!important;color:var(--boot-primary,var(--term-accent))}'
        )
        source = path.read_text(encoding="utf-8")
        source = source.replace(
            '<meta name="theme-color" content="#6750a4">',
            f'<meta name="theme-color" content="{accent}">'
            f'<style id="theme-bootstrap">{bootstrap_rules}</style>',
            1,
        )
        source = source.replace(
            '<body class="sidebar-collapsed" data-ui="material3">',
            '<body class="sidebar-collapsed" data-ui="material3" '
            f'data-page="{html.escape(page, quote=True)}" '
            f'data-term="{html.escape(theme_key, quote=True)}" '
            f'data-season="{html.escape(season, quote=True)}" '
            f'data-theme-category="{html.escape(category, quote=True)}">',
            1,
        )
        page_titles = {"home": "首页", "articles": "全部文章", "archive": "文章归档", "minecraft": "Minecraft 版本库", "mirrors": "镜像库", "support": "投喂与支持", "friends": "友情链接", "thoughts": "日常", "about": "关于本站", "announcements": "网站公告", "search": "搜索文章"}
        if page in page_titles:
            site_name = clean((state.get("profile") or {}).get("name"), "StarIsle的小屋")
            title = site_name if page == "home" else f"{page_titles[page]} · {site_name}"
            source = re.sub(r"<title>.*?</title>", f"<title>{html.escape(title)}</title>", source, count=1)
        raw = source.encode("utf-8")
        self.send_response(HTTPStatus.OK)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Length", str(len(raw)))
        self.send_header("X-Content-Type-Options", "nosniff")
        self.end_headers()
        self.wfile.write(raw)
    def send_upload(self, filename):
        if not re.fullmatch(r"[a-f0-9]{32}(?:_(?:32|48|64|96|128|192|256))?\.(?:jpg|jpeg|png|gif|webp|mp4|webm|ogv|mp3|wav|ogg|pdf)", filename):
            return self.send_error(HTTPStatus.NOT_FOUND)
        path = UPLOAD_DIR / filename
        if not path.is_file(): return self.send_error(HTTPStatus.NOT_FOUND)
        content_type = {".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".gif": "image/gif", ".webp": "image/webp", ".mp4": "video/mp4", ".webm": "video/webm", ".ogv": "video/ogg", ".mp3": "audio/mpeg", ".wav": "audio/wav", ".ogg": "audio/ogg", ".pdf": "application/pdf"}.get(path.suffix, "application/octet-stream")
        raw = path.read_bytes(); self.send_response(200); self.send_header("Content-Type", content_type); self.send_header("X-Content-Type-Options", "nosniff"); self.send_header("Cache-Control", "public, max-age=31536000, immutable"); self.send_header("Content-Length", str(len(raw))); self.end_headers(); self.wfile.write(raw)
    def handle_upload(self):
        if not self.admin_port: return self.send_json({"error": "上传接口仅在管理端口提供"}, HTTPStatus.UNAUTHORIZED)
        content_type = self.headers.get("Content-Type", "")
        if not content_type.lower().startswith("multipart/form-data;"):
            return self.send_json({"error": "上传格式无效"}, HTTPStatus.BAD_REQUEST)
        try: length = int(self.headers.get("Content-Length", "0"))
        except ValueError: return self.send_json({"error": "上传大小无效"}, HTTPStatus.BAD_REQUEST)
        if length <= 0 or length > 12 * 1024 * 1024 + 65536:
            return self.send_json({"error": "单个文件最大为 12 MB"}, HTTPStatus.REQUEST_ENTITY_TOO_LARGE)
        raw = self.rfile.read(length)
        try:
            message = BytesParser(policy=policy.default).parsebytes((f"Content-Type: {content_type}\r\nMIME-Version: 1.0\r\n\r\n".encode() + raw))
            part = next((item for item in message.iter_parts() if item.get_param("name", header="content-disposition") == "file"), None)
            body = part.get_payload(decode=True) if part else None
            original = Path(part.get_filename() or "").name if part else ""
            suffix = Path(original).suffix.lower()
        except (ValueError, TypeError, AttributeError):
            return self.send_json({"error": "上传内容无法解析"}, HTTPStatus.BAD_REQUEST)
        allowed_types = {".jpg", ".jpeg", ".png", ".gif", ".webp", ".mp4", ".webm", ".ogv", ".mp3", ".wav", ".ogg", ".pdf"}
        if not body or len(body) > 12 * 1024 * 1024 or suffix not in allowed_types:
            return self.send_json({"error": "仅支持常见图片、音视频和 PDF，且单个文件最大为 12 MB"}, HTTPStatus.BAD_REQUEST)
        filename = secrets.token_hex(16) + suffix
        try:
            UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
            target = UPLOAD_DIR / filename
            temporary = target.with_suffix(target.suffix + ".tmp")
            temporary.write_bytes(body); temporary.replace(target)
        except OSError:
            return self.send_json({"error": "文件保存失败"}, HTTPStatus.INTERNAL_SERVER_ERROR)
        return self.send_json({"url": "/uploads/" + filename, "name": original, "type": mimetypes.guess_type(original)[0] or "application/octet-stream", "size": len(body)}, HTTPStatus.CREATED)
    def handle_avatar_upload(self):
        user = self.current_user()
        if not user:
            return self.send_json({"error": "请先登录"}, HTTPStatus.UNAUTHORIZED)
        if user.get("banned"):
            return self.send_json({"error": "账号已被封禁"}, HTTPStatus.FORBIDDEN)
        content_type = self.headers.get("Content-Type", "")
        if not content_type.lower().startswith("multipart/form-data;"):
            return self.send_json({"error": "头像上传格式无效"}, HTTPStatus.BAD_REQUEST)
        try:
            length = int(self.headers.get("Content-Length", "0"))
        except ValueError:
            return self.send_json({"error": "头像上传大小无效"}, HTTPStatus.BAD_REQUEST)
        if length <= 0 or length > AVATAR_MAX_BYTES + 65536:
            return self.send_json({"error": "头像文件最大为 4 MB"}, HTTPStatus.REQUEST_ENTITY_TOO_LARGE)
        raw = self.rfile.read(length)
        try:
            message = BytesParser(policy=policy.default).parsebytes(
                (f"Content-Type: {content_type}\r\nMIME-Version: 1.0\r\n\r\n").encode() + raw
            )
            part = next((item for item in message.iter_parts() if item.get_param("name", header="content-disposition") == "file"), None)
            body = part.get_payload(decode=True) if part else None
            declared_type = clean(part.get_content_type()).lower() if part else ""
        except (ValueError, TypeError, AttributeError):
            return self.send_json({"error": "头像内容无法解析"}, HTTPStatus.BAD_REQUEST)
        allowed_types = {"image/jpeg", "image/png", "image/gif", "image/webp"}
        suffix = image_suffix(body or b"")
        if not body or len(body) > AVATAR_MAX_BYTES or declared_type not in allowed_types or not suffix:
            return self.send_json({"error": "仅支持 JPG、PNG、GIF 或 WebP 图片，且最大为 4 MB"}, HTTPStatus.BAD_REQUEST)
        token = secrets.token_hex(16)
        filename = token + suffix
        try:
            avatar_variants = create_avatar_thumbnails(body, token)
        except ValueError:
            return self.send_json({"error": "头像图片无法解析或尺寸过大"}, HTTPStatus.BAD_REQUEST)
        try:
            UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
            target_file = UPLOAD_DIR / filename
            temporary = target_file.with_suffix(target_file.suffix + ".tmp")
            temporary.write_bytes(body)
            temporary.replace(target_file)
        except OSError:
            remove_avatar_variants(avatar_variants)
            return self.send_json({"error": "头像保存失败"}, HTTPStatus.INTERNAL_SERVER_ERROR)
        avatar_url = "/uploads/" + filename
        with LOCK:
            state = load_state()
            target = next((item for item in state["users"] if item.get("id") == user.get("id")), None)
            if not target:
                return self.send_json({"error": "账号不存在"}, HTTPStatus.UNAUTHORIZED)
            target["avatar_url"] = avatar_url
            target["avatar_variants"] = avatar_variants
            save_state(state)
        return self.send_json({"ok": True, "user": account_user(target), "avatar_url": avatar_url, "avatar_variants": avatar_variants}, HTTPStatus.CREATED)
    def handle_comment_image_upload(self):
        user = self.current_user()
        if not user:
            return self.send_json({"error": "请先登录"}, HTTPStatus.UNAUTHORIZED)
        if user.get("banned"):
            return self.send_json({"error": "账号已被封禁"}, HTTPStatus.FORBIDDEN)
        if user_is_muted(user):
            return self.send_json({"error": "账号当前处于禁言状态，暂时无法上传评论图片"}, HTTPStatus.FORBIDDEN)
        content_type = self.headers.get("Content-Type", "")
        if not content_type.lower().startswith("multipart/form-data;"):
            return self.send_json({"error": "图片上传格式无效"}, HTTPStatus.BAD_REQUEST)
        try:
            length = int(self.headers.get("Content-Length", "0"))
        except ValueError:
            return self.send_json({"error": "图片上传大小无效"}, HTTPStatus.BAD_REQUEST)
        if length <= 0 or length > AVATAR_MAX_BYTES + 65536:
            return self.send_json({"error": "评论图片最大为 4 MB"}, HTTPStatus.REQUEST_ENTITY_TOO_LARGE)
        raw = self.rfile.read(length)
        try:
            message = BytesParser(policy=policy.default).parsebytes(
                (f"Content-Type: {content_type}\r\nMIME-Version: 1.0\r\n\r\n").encode() + raw
            )
            part = next((item for item in message.iter_parts() if item.get_param("name", header="content-disposition") == "file"), None)
            body = part.get_payload(decode=True) if part else None
            declared_type = clean(part.get_content_type()).lower() if part else ""
        except (ValueError, TypeError, AttributeError):
            return self.send_json({"error": "图片内容无法解析"}, HTTPStatus.BAD_REQUEST)
        allowed_types = {"image/jpeg", "image/png", "image/gif", "image/webp"}
        suffix = image_suffix(body or b"")
        if not body or len(body) > AVATAR_MAX_BYTES or declared_type not in allowed_types or not suffix:
            return self.send_json({"error": "仅支持 JPG、PNG、GIF 或 WebP 图片，且最大为 4 MB"}, HTTPStatus.BAD_REQUEST)
        filename = secrets.token_hex(16) + suffix
        try:
            UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
            target_file = UPLOAD_DIR / filename
            temporary = target_file.with_suffix(target_file.suffix + ".tmp")
            temporary.write_bytes(body)
            temporary.replace(target_file)
        except OSError:
            return self.send_json({"error": "评论图片保存失败"}, HTTPStatus.INTERNAL_SERVER_ERROR)
        return self.send_json({"ok": True, "url": "/uploads/" + filename}, HTTPStatus.CREATED)
    def read_json(self):
        length = int(self.headers.get("Content-Length", "0"))
        if length > 4 * 1024 * 1024: raise ValueError("payload too large")
        return json.loads(self.rfile.read(length).decode() or "{}")
    def cookie_token(self):
        cookies = http.cookies.SimpleCookie(self.headers.get("Cookie", "")); return cookies.get("blog_session").value if cookies.get("blog_session") else ""
    def current_user(self):
        user_id = SESSIONS.get(self.cookie_token()); return next((u for u in load_state()["users"] if u.get("id") == user_id), None) if user_id else None
    def require_admin(self):
        if not self.admin_port: self.send_json({"error": "管理接口仅在管理端口提供"}, HTTPStatus.UNAUTHORIZED); return False
        return True
    def send_redirect(self, location):
        self.send_response(HTTPStatus.FOUND)
        self.send_header("Location", location)
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Length", "0")
        self.end_headers()
    def oauth_error_redirect(self, code):
        safe_code = re.sub(r"[^a-z_]", "", clean(code, "provider_error").lower()) or "provider_error"
        self.send_redirect("/?oauth_error=" + safe_code)
    def issue_user_session(self, user):
        token = secrets.token_urlsafe(32)
        SESSIONS[token] = user["id"]
        return f"blog_session={token}; Max-Age=2592000; HttpOnly; SameSite=Lax; Path=/"
    def handle_oauth_start(self, provider, query):
        intent = clean(query.get("intent", ["login"])[0], "login").lower()
        if intent not in {"login", "bind"}:
            intent = "login"
        if intent == "login" and query.get("policies_accepted", [""])[0] != "1":
            return self.send_redirect("/?oauth_error=agreement_required")
        if not oauth_provider_configured(provider):
            return self.send_redirect("/?oauth_error=not_configured")
        user = self.current_user()
        if intent == "bind" and not user:
            return self.send_redirect("/?oauth_error=session_required")
        next_path = safe_local_path(query.get("next", ["/"])[0])
        state = create_oauth_state(provider, intent, user.get("id", "") if user else "", next_path)
        callback = oauth_callback_url(provider)
        if provider == "github":
            authorize_url = "https://github.com/login/oauth/authorize?" + urlencode({
                "client_id": GITHUB_CLIENT_ID,
                "redirect_uri": callback,
                "scope": "read:user user:email",
                "state": state,
            })
        else:
            authorize_url = "https://graph.qq.com/oauth2.0/authorize?" + urlencode({
                "response_type": "code",
                "client_id": QQ_APP_ID,
                "redirect_uri": callback,
                "state": state,
                "scope": "get_user_info",
            })
        return self.send_redirect(authorize_url)
    def handle_oauth_callback(self, provider, query):
        if not oauth_provider_configured(provider):
            return self.oauth_error_redirect("not_configured")
        if query.get("error"):
            return self.oauth_error_redirect("provider_denied")
        try:
            flow = consume_oauth_state(provider, clean(query.get("state", [""])[0]))
            code = clean(query.get("code", [""])[0])
            if not code:
                raise OAuthFlowError("provider_denied")
            identity = exchange_github_identity(code) if provider == "github" else exchange_qq_identity(code)
        except OAuthFlowError as error:
            return self.oauth_error_redirect(str(error))
        with LOCK:
            state = load_state()
            existing = find_user_by_oauth(state, provider, identity.get("id"))
            if existing and existing.get("banned"):
                return self.oauth_error_redirect("account_banned")
            if existing:
                if flow.get("intent") == "bind" and flow.get("user_id") != existing.get("id"):
                    return self.oauth_error_redirect("oauth_conflict")
                try:
                    attach_oauth_connection(state, existing, provider, identity)
                except OAuthFlowError as error:
                    return self.oauth_error_redirect(str(error))
                save_state(state)
                cookie = self.issue_user_session(existing)
                self.send_response(HTTPStatus.FOUND)
                self.send_header("Location", f"/?oauth={provider}_{'bound' if flow.get('intent') == 'bind' else 'login'}")
                self.send_header("Set-Cookie", cookie)
                self.send_header("Cache-Control", "no-store")
                self.send_header("Content-Length", "0")
                self.end_headers()
                return
            if flow.get("intent") == "bind":
                target = next((user for user in state.get("users", []) if user.get("id") == flow.get("user_id")), None)
                if not target:
                    return self.oauth_error_redirect("session_required")
                try:
                    attach_oauth_connection(state, target, provider, identity)
                except OAuthFlowError as error:
                    return self.oauth_error_redirect(str(error))
                save_state(state)
                self.send_redirect(f"/?oauth={provider}_bound")
                return
        token = create_oauth_pending(provider, identity)
        self.send_redirect(f"/auth/bind?token={token}&provider={provider}")
    def visible_posts(self, state): return [p for p in state["posts"] if is_visible(p)]
    def post_page(self, posts, query):
        q = clean(query.get("q", [""])[0]).lower(); category = clean(query.get("category", [""])[0])
        tags = []
        for raw in query.get("tags", []) + query.get("tag", []):
            tags.extend(clean(item) for item in clean(raw).split(",") if clean(item))
        tags = list(dict.fromkeys(tags))
        if q: posts = [p for p in posts if q in (p.get("title", "") + " " + p.get("excerpt", "") + " " + p.get("content", "") + " " + " ".join(p.get("tags", []))).lower()]
        if category: posts = [p for p in posts if p.get("category") == category]
        if tags: posts = [p for p in posts if any(tag in p.get("tags", []) for tag in tags)]
        posts.sort(key=lambda p: (not bool(p.get("pinned")), -(datetime.fromisoformat(clean(p.get("published_at") or p.get("updated_at", "") or "1970-01-01T00:00:00+00:00")).timestamp()) if parse_time(p.get("published_at") or p.get("updated_at")) else 0))
        try: page = max(1, int(query.get("page", ["1"])[0] or 1)); size = min(100, max(1, int(query.get("page_size", ["6"])[0] or 6)))
        except ValueError: page, size = 1, 6
        total = len(posts); return posts[(page - 1) * size:page * size], {"page": page, "page_size": size, "total": total, "pages": (total + size - 1) // size}

    def do_GET(self):
        parsed = urlparse(self.path); query = parse_qs(parsed.query); state = load_state()
        oauth_route = re.fullmatch(r"/auth/(github|qq)/(start|callback)", parsed.path)
        if oauth_route:
            provider, action = oauth_route.groups()
            return self.handle_oauth_start(provider, query) if action == "start" else self.handle_oauth_callback(provider, query)
        if parsed.path == "/auth/bind":
            pending = get_oauth_pending(query.get("token", [""])[0])
            if not pending or pending.get("provider") != clean(query.get("provider", [""])[0]):
                return self.oauth_error_redirect("binding_expired")
            return self.send_index("oauth-bind") if not self.admin_port else self.send_error(404)
        if parsed.path == "/api/server/status":
            return self.send_json(server_runtime_status())
        if self.admin_port and parsed.path in ("/", "/index.html"): return self.send_file("admin.html")
        if self.admin_port and parsed.path in ("/admin-content", "/admin-content.html"): return self.send_file("admin-content.html")
        if parsed.path in ("/", "/index.html", "/post", "/articles", "/archive", "/minecraft", "/mirrors", "/support", "/announcements", "/search", "/about", "/friends", "/thoughts", "/profile", "/privacy", "/cookies", "/terms", "/copyright", "/disclaimer") or parsed.path.startswith(("/post/", "/category/", "/tag/")):
            page = "article" if parsed.path.startswith("/post/") else clean(parsed.path.strip("/"), "home") or "home"
            return self.send_index(page) if not self.admin_port else self.send_error(404)
        if parsed.path == "/admin": return self.send_file("admin.html") if self.admin_port else self.send_error(404)
        if parsed.path in ("/style.css", "/friends.css", "/friends.json", "/theme-complete.css", "/solar.css", "/libraries.css", "/article-material.css", "/about-material.css", "/solar.js", "/icons.js", "/mdui-icon-train.js", "/material-symbols-rounded-outlined.woff2", "/material-symbols-rounded-filled.woff2", "/material-select.js", "/app.js", "/admin.js", "/admin-material.css", "/brand.svg", "/brand-github.svg", "/brand-email.svg", "/brand-bilibili.svg", "/brand-douyin.svg", "/brand-x.svg", "/brand-weibo.svg", "/brand-qq.svg"): return self.send_file(parsed.path[1:]) if (parsed.path not in ("/admin.js",) or self.admin_port) else self.send_error(404)
        if parsed.path.startswith("/uploads/"): return self.send_upload(parsed.path.rsplit("/", 1)[-1])
        if parsed.path == "/health": return self.send_json({"status": "ok", "port": self.server.server_port})
        if parsed.path == "/api/minecraft/catalog":
            try:
                page = max(1, int(query.get("page", ["1"])[0]))
                page_size = min(50, max(1, int(query.get("page_size", ["20"])[0])))
            except ValueError:
                return self.send_json({"error": "分页参数无效"}, HTTPStatus.BAD_REQUEST)
            try:
                return self.send_json(minecraft_catalog(
                    edition=clean(query.get("edition", ["java"])[0]),
                    platform=clean(query.get("platform", ["windows"])[0]),
                    channel=clean(query.get("channel", ["all"])[0]),
                    query=clean(query.get("q", [""])[0])[:80],
                    build=clean(query.get("build", [""])[0])[:16],
                    page=page,
                    page_size=page_size,
                ))
            except CatalogError as error:
                return self.send_json({"error": str(error)}, HTTPStatus.BAD_GATEWAY)
        if parsed.path == "/api/minecraft/version":
            try:
                return self.send_json({"version": minecraft_version(
                    clean(query.get("edition", ["java"])[0]),
                    clean(query.get("id", [""])[0]),
                    clean(query.get("platform", ["windows"])[0]),
                )})
            except CatalogError as error:
                return self.send_json({"error": str(error)}, HTTPStatus.NOT_FOUND)
        if parsed.path == "/api/mirrors/catalog":
            return self.send_json(mirror_catalog())
        if parsed.path == "/api/mirrors/probe":
            try:
                return self.send_json(mirror_probe(
                    clean(query.get("mirror", [""])[0]),
                    clean(query.get("system", [""])[0]),
                    clean(query.get("version", [""])[0]),
                    clean(query.get("arch", [""])[0]),
                ))
            except CatalogError as error:
                return self.send_json({"error": str(error)}, HTTPStatus.BAD_REQUEST)
        if parsed.path == "/sitemap.xml": return self.send_file("sitemap.xml")
        if parsed.path == "/api/legal-documents":
            return self.send_json({"documents": LEGAL_DOCUMENTS})
        if parsed.path == "/api/announcements":
            announcements = [
                item for item in state.get("announcements", [])
                if isinstance(item, dict) and item.get("published", True)
            ]
            announcements.sort(key=lambda item: clean(item.get("published_at") or item.get("created_at")), reverse=True)
            return self.send_json({"announcements": announcements[:6]})
        if parsed.path in ("/api/site", "/api/posts", "/api/search"):
            posts = state["posts"] if self.admin_port else self.visible_posts(state); page, pagination = self.post_page(posts, query)
            visible_posts = self.visible_posts(state)
            categories = sorted({p.get("category") for p in visible_posts if p.get("category")})
            tag_counts = {}
            for visible_post in visible_posts:
                for tag in {clean(value) for value in visible_post.get("tags", []) if clean(value)}:
                    tag_counts[tag] = tag_counts.get(tag, 0) + 1
            tags = sorted(tag_counts)
            site_stats = {
                "posts": len(visible_posts),
                "words": sum(text_word_count(post.get("content", "")) for post in visible_posts),
                "views": sum(max(0, int(post.get("views", 0) or 0)) for post in visible_posts),
            }
            user = self.current_user()
            carousel_posts = [item for item in posts if item.get("published") and item.get("carousel")][:10]
            carousel = carousel_posts if self.admin_port else [public_post_for_viewer(item, user) for item in carousel_posts]
            post_payload = page if self.admin_port else [public_post_for_viewer(item, user) for item in page]
            return self.send_json({"profile": state["profile"], "posts": post_payload, "carousel": carousel, "pagination": pagination, "categories": categories, "tags": tags, "tag_counts": tag_counts, "stats": site_stats, "theme": seasonal_theme(state["profile"]), "turnstile_sitekey": TURNSTILE_SITEKEY, "oauth_providers": oauth_provider_settings(), "admin": self.admin_port, "visitor_port": PORT})
        if parsed.path.startswith("/api/posts/"):
            post_id = parsed.path.rsplit("/", 1)[-1]; post = next((p for p in state["posts"] if p.get("id") == post_id or p.get("slug") == post_id), None)
            if not post or (not self.admin_port and not is_visible(post)): return self.send_json({"error": "文章不存在"}, 404)
            if not self.admin_port:
                with LOCK: post["views"] = int(post.get("views", 0)) + 1; save_state(state)
            user = self.current_user()
            comments = [c for c in state["comments"] if c.get("post_id") == post.get("id") and (self.admin_port or c.get("approved", True))]
            comments.sort(key=lambda c: (not bool(c.get("pinned")), clean(c.get("created_at")), clean(c.get("id"))))
            users_by_id = {u.get("id"): u for u in state["users"]}
            post_payload = post if self.admin_port else public_post(post)
            if not self.admin_port:
                post_payload["liked"] = bool(user and "user:" + user.get("id", "") in post.get("liked_by", []))
                post_payload["favorited"] = bool(user and post.get("id") in (user.get("favorites") or []))
            return self.send_json({"post": post_payload, "comments": [public_comment(c, user, users_by_id.get(c.get("user_id"))) for c in comments]})
        if parsed.path == "/api/comments":
            post_id = clean(query.get("post", [""])[0]); comments = [c for c in state["comments"] if (not post_id or c.get("post_id") == post_id) and (self.admin_port or c.get("approved", True))]
            comments.sort(key=lambda c: (not bool(c.get("pinned")), clean(c.get("created_at")), clean(c.get("id"))))
            user = self.current_user()
            users_by_id = {u.get("id"): u for u in state["users"]}
            return self.send_json({"comments": [public_comment(c, user, users_by_id.get(c.get("user_id"))) for c in comments], "user": public_user(user) if user else None})
        if parsed.path == "/api/me/favorites":
            user = self.current_user()
            if not user: return self.send_json({"error": "请先登录"}, HTTPStatus.UNAUTHORIZED)
            favorite_ids = list(user.get("favorites") or [])
            posts_by_id = {post.get("id"): post for post in self.visible_posts(state)}
            favorites = [public_post_for_viewer(posts_by_id[post_id], user) for post_id in reversed(favorite_ids) if post_id in posts_by_id]
            return self.send_json({"posts": favorites})
        if parsed.path == "/api/me": return self.send_json({"user": account_user(self.current_user()) if self.current_user() else None})
        if parsed.path.startswith("/api/users/"):
            identifier = unquote(parsed.path.rsplit("/", 1)[-1]).lower()
            target = next((u for u in state["users"] if u.get("id", "").lower() == identifier or u.get("username", "").lower() == identifier), None)
            if not target: return self.send_json({"error": "用户不存在"}, 404)
            approved_comments = [c for c in state["comments"] if c.get("user_id") == target.get("id") and c.get("approved", True)]
            return self.send_json({"user": public_user(target), "stats": {"comments": len(approved_comments), "joined_at": target.get("created_at", "")}})
        if parsed.path == "/api/friends":
            friends = [
                public_friend_link(item) for item in state.get("friend_links", [])
                if isinstance(item, dict) and item.get("approved", True) and valid_external_url(item.get("url"))
            ]
            return self.send_json({
                "friends": friends,
                "total": len(friends),
                "source": "https://blog.liveout.cn/friends",
            })
        if parsed.path == "/api/thoughts":
            thoughts = [
                item for item in state.get("thoughts", [])
                if isinstance(item, dict) and (self.admin_port or item.get("published", True))
            ]
            thoughts.sort(key=lambda item: item.get("created_at", ""), reverse=True)
            viewer = self.current_user()
            return self.send_json({"thoughts": [public_thought(item, viewer) for item in thoughts]})
        if parsed.path == "/api/admin/themes":
            if not self.require_admin(): return
            return self.send_json(theme_catalog(state["profile"]))
        if parsed.path == "/api/admin/account":
            if not self.require_admin(): return
            config = load_admin_config()
            return self.send_json({"username": config.get("username", ""), "updated_at": config.get("updated_at", "")})
        if parsed.path == "/api/admin/summary":
            if not self.require_admin(): return
            return self.send_json({"users": len(state["users"]), "posts": len(state["posts"]), "published": len(self.visible_posts(state)), "comments": len(state["comments"]), "views": sum(int(p.get("views", 0)) for p in state["posts"]), "likes": sum(int(p.get("likes", 0)) for p in state["posts"]), "profile": state["profile"]})
        if parsed.path == "/api/admin/announcements":
            if not self.require_admin(): return
            announcements = sorted(state.get("announcements", []), key=lambda item: clean(item.get("created_at")), reverse=True)
            return self.send_json({"announcements": announcements})
        if parsed.path == "/api/admin/comments":
            if not self.require_admin(): return
            post_titles = {}
            for post in state["posts"]:
                for key in (post.get("id"), post.get("slug")):
                    if key:
                        post_titles[key] = clean(post.get("title")) or "未命名文章"
            comments = []
            for comment in sorted(state.get("comments", []), key=lambda item: clean(item.get("created_at")), reverse=True):
                item = dict(comment)
                item["source"] = "guestbook" if comment.get("post_id") == "about" else "article"
                item["post_title"] = "留言区" if item["source"] == "guestbook" else post_titles.get(comment.get("post_id"), "文章评论")
                comments.append(item)
            return self.send_json({"comments": comments})
        if parsed.path == "/api/admin/reports":
            if not self.require_admin(): return
            reports = sorted(state.get("reports", []), key=lambda item: item.get("created_at", ""), reverse=True)
            return self.send_json({"reports": [report_view(report, state) for report in reports]})
        if parsed.path == "/api/admin/friend-applications":
            if not self.require_admin(): return
            applications = sorted(
                state.get("friend_applications", []),
                key=lambda item: (item.get("status") != "pending", item.get("created_at", "")),
                reverse=False,
            )
            return self.send_json({"applications": applications})
        if parsed.path == "/api/admin/users":
            if not self.require_admin(): return
            comment_counts = {}
            for comment in state.get("comments", []):
                comment_counts[comment.get("user_id")] = comment_counts.get(comment.get("user_id"), 0) + 1
            users = []
            for user in state.get("users", []):
                users.append({**account_user(user), "comment_count": comment_counts.get(user.get("id"), 0), "muted": user_is_muted(user)})
            users.sort(key=lambda item: item.get("created_at", ""), reverse=True)
            return self.send_json({"users": users})
        if parsed.path == "/api/archive":
            groups = {}
            visible_posts = self.visible_posts(state)
            for p in visible_posts: groups.setdefault((p.get("published_at", "")[:4] or "未知", p.get("published_at", "")[5:7] or "00"), []).append(public_post(p))
            updated_posts = [p for p in visible_posts if parse_time(p.get("updated_at"))]
            published_posts = [p for p in visible_posts if parse_time(p.get("published_at") or p.get("updated_at"))]
            latest_updated = max(updated_posts, key=lambda p: parse_time(p.get("updated_at")), default=None)
            latest_published = max(published_posts, key=lambda p: parse_time(p.get("published_at") or p.get("updated_at")), default=None)
            return self.send_json({
                "archive": [{"year": y, "month": m, "posts": v} for (y, m), v in sorted(groups.items(), reverse=True)],
                "stats": {
                    "total": len(visible_posts),
                    "latest_updated_at": clean(latest_updated.get("updated_at")) if latest_updated else "",
                    "latest_published_at": clean((latest_published or {}).get("published_at") or (latest_published or {}).get("updated_at")),
                },
            })
        return self.send_error(404)

    def do_POST(self):
        parsed = urlparse(self.path)
        if parsed.path == "/api/uploads": return self.handle_upload()
        if parsed.path == "/api/me/avatar": return self.handle_avatar_upload()
        if parsed.path == "/api/comment/image": return self.handle_comment_image_upload()
        try: payload = self.read_json()
        except (ValueError, json.JSONDecodeError, UnicodeDecodeError): return self.send_json({"error": "请求格式无效"}, 400)
        if parsed.path == "/api/logout":
            SESSIONS.pop(self.cookie_token(), None); return self.send_json({"ok": True}, headers={"Set-Cookie": "blog_session=; Max-Age=0; HttpOnly; SameSite=Lax; Path=/"})
        if parsed.path == "/api/login": return self.send_json({"ok": True, "admin": True}) if self.admin_port else self.send_json({"error": "管理接口仅在管理端口提供"}, 404)
        if parsed.path == "/api/user/login":
            identity, password = clean(payload.get("identity")).lower(), clean(payload.get("password")); state = load_state(); user = next((u for u in state["users"] if identity in (u.get("email"), u.get("username", "").lower()) and verify_password(password, u.get("password_hash", ""))), None)
            if not user: return self.send_json({"error": "账号或密码不正确"}, 401)
            if user.get("banned"):
                return self.send_json({"error": "账号已被封禁，请联系管理员", "moderation_reason": user.get("moderation_reason", "")}, HTTPStatus.FORBIDDEN)
            token = secrets.token_urlsafe(32); SESSIONS[token] = user["id"]; return self.send_json({"user": account_user(user)}, headers={"Set-Cookie": f"blog_session={token}; Max-Age=2592000; HttpOnly; SameSite=Lax; Path=/"})
        if parsed.path == "/api/auth/send-code":
            email = clean(payload.get("email")).lower()
            purpose = clean(payload.get("purpose"), "register").lower()
            if purpose not in {"register", "password_reset"}:
                return self.send_json({"error": "验证码用途无效"}, 400)
            if not valid_email(email): return self.send_json({"error": "请输入有效的邮箱地址"}, 400)
            expected_action = "register" if purpose == "register" else "password_reset"
            if not verify_turnstile(payload.get("cf-turnstile-response"), expected_action):
                return self.send_json({"error": "人机验证未通过，请完成验证后重试。"}, 403)
            if not all((SMTP_HOST, SMTP_USERNAME, SMTP_PASSWORD, SMTP_FROM)):
                return self.send_json({"error": "邮箱服务尚未配置，请联系管理员。"}, 503)
            state = load_state()
            account_exists = any(user.get("email") == email for user in state["users"])
            if purpose == "register" and account_exists:
                return self.send_json({"error": "该邮箱已注册，请直接登录。"}, 409)
            allowed, retry_after = reserve_email_send(email, self.client_address[0])
            if not allowed:
                return self.send_json({"error": f"请求过于频繁，请在 {retry_after} 秒后重试。"}, 429, {"Retry-After": str(retry_after)})
            if purpose == "password_reset" and not account_exists:
                return self.send_json({"ok": True, "message": "如果该邮箱已注册，验证码将发送到邮箱。"})
            code = f"{secrets.randbelow(1_000_000):06d}"
            sender = send_registration_email if purpose == "register" else send_password_reset_email
            if not sender(email, code):
                return self.send_json({"error": "验证码邮件发送失败，请稍后重试。"}, 502)
            with LOCK:
                EMAIL_CODES[email] = {
                    "digest": email_code_digest(email, code),
                    "expires_at": time.time() + EMAIL_CODE_TTL_SECONDS,
                    "attempts": 0,
                    "purpose": purpose,
                }
            return self.send_json({"ok": True, "message": "验证码已发送，请查收邮箱。"})
        if parsed.path == "/api/register":
            username, email, password = clean(payload.get("username")), clean(payload.get("email")).lower(), clean(payload.get("password"))
            if not verify_turnstile(payload.get("cf-turnstile-response")): return self.send_json({"error": "人机验证未通过，请完成 Cloudflare Turnstile 验证后重试。"}, 403)
            email_code = clean(payload.get("email_code"))
            if len(username) < 2 or len(password) < 8 or not valid_email(email) or not re.fullmatch(r"\d{6}", email_code): return self.send_json({"error": "用户名、邮箱、验证码或密码格式不正确"}, 400)
            with LOCK:
                state = load_state()
                if any(u.get("email") == email or u.get("username", "").lower() == username.lower() for u in state["users"]): return self.send_json({"error": "用户名或邮箱已注册"}, 409)
                if not verify_email_code(email, email_code, purpose="register"): return self.send_json({"error": "邮箱验证码无效或已过期，请重新获取。"}, 400)
                user = {"id": secrets.token_hex(8), "username": username, "email": email, "password_hash": hash_password(password), "signature": "", "gender": "保密", "birthday": "", "created_at": now_iso()}; state["users"].append(user); save_state(state); EMAIL_CODES.pop(email, None)
            token = secrets.token_urlsafe(32); SESSIONS[token] = user["id"]; return self.send_json({"user": account_user(user)}, 201, {"Set-Cookie": f"blog_session={token}; Max-Age=2592000; HttpOnly; SameSite=Lax; Path=/"})
        if parsed.path == "/api/user/reset-password":
            email = clean(payload.get("email")).lower()
            email_code = clean(payload.get("email_code"))
            password = payload.get("password", "")
            confirm_password = payload.get("confirm_password", "")
            if not valid_email(email) or not re.fullmatch(r"\d{6}", email_code) or not isinstance(password, str) or len(password) < 8:
                return self.send_json({"error": "邮箱、验证码或新密码格式不正确"}, 400)
            if password != confirm_password:
                return self.send_json({"error": "两次输入的密码不一致"}, 400)
            if not verify_turnstile(payload.get("cf-turnstile-response"), "password_reset"):
                return self.send_json({"error": "人机验证未通过，请完成 Cloudflare Turnstile 验证后重试。"}, 403)
            with LOCK:
                state = load_state()
                user = next((item for item in state["users"] if item.get("email") == email), None)
                if not user or not verify_email_code(email, email_code, consume=True, purpose="password_reset"):
                    return self.send_json({"error": "邮箱验证码无效或已过期，请重新获取。"}, 400)
                user["password_hash"] = hash_password(password)
                user["password_updated_at"] = now_iso()
                save_state(state)
                for token, user_id in list(SESSIONS.items()):
                    if user_id == user.get("id"):
                        SESSIONS.pop(token, None)
            return self.send_json({"ok": True, "message": "密码已重置，请使用新密码登录。"})
        if parsed.path == "/api/oauth/send-code":
            pending = get_oauth_pending(payload.get("oauth_token"))
            if not pending:
                return self.send_json({"error": "绑定请求已过期，请重新授权第三方账号"}, HTTPStatus.GONE)
            email = clean(payload.get("email")).lower()
            if not valid_email(email):
                return self.send_json({"error": "请输入有效的邮箱地址"}, HTTPStatus.BAD_REQUEST)
            if not verify_turnstile(payload.get("cf-turnstile-response"), "oauth_bind"):
                return self.send_json({"error": "人机验证未通过，请完成验证后重试。"}, HTTPStatus.FORBIDDEN)
            if not all((SMTP_HOST, SMTP_USERNAME, SMTP_PASSWORD, SMTP_FROM)):
                return self.send_json({"error": "邮箱服务尚未配置，请联系管理员。"}, HTTPStatus.SERVICE_UNAVAILABLE)
            allowed, retry_after = reserve_email_send(email, self.client_address[0])
            if not allowed:
                return self.send_json({"error": f"请求过于频繁，请在 {retry_after} 秒后重试。"}, HTTPStatus.TOO_MANY_REQUESTS, {"Retry-After": str(retry_after)})
            code = f"{secrets.randbelow(1_000_000):06d}"
            if not send_oauth_bind_email(email, code):
                return self.send_json({"error": "验证码邮件发送失败，请稍后重试。"}, HTTPStatus.BAD_GATEWAY)
            with LOCK:
                EMAIL_CODES[email] = {
                    "digest": email_code_digest(email, code),
                    "expires_at": time.time() + EMAIL_CODE_TTL_SECONDS,
                    "attempts": 0,
                    "purpose": "oauth_bind",
                }
            return self.send_json({"ok": True, "message": "验证码已发送，请查收邮箱。"})
        if parsed.path == "/api/oauth/bind":
            pending = get_oauth_pending(payload.get("oauth_token"))
            if not pending:
                return self.send_json({"error": "绑定请求已过期，请重新授权第三方账号"}, HTTPStatus.GONE)
            email = clean(payload.get("email")).lower()
            email_code = clean(payload.get("email_code"))
            if not valid_email(email) or not re.fullmatch(r"\d{6}", email_code):
                return self.send_json({"error": "邮箱或验证码格式不正确"}, HTTPStatus.BAD_REQUEST)
            with LOCK:
                state = load_state()
                if not verify_email_code(email, email_code, consume=True, purpose="oauth_bind"):
                    return self.send_json({"error": "邮箱验证码无效或已过期，请重新获取。"}, HTTPStatus.BAD_REQUEST)
                provider = pending.get("provider")
                identity = pending.get("identity") or {}
                user = next((item for item in state["users"] if clean(item.get("email")).lower() == email), None)
                created = False
                if user:
                    if user.get("banned"):
                        return self.send_json({"error": "账号已被封禁，请联系管理员"}, HTTPStatus.FORBIDDEN)
                    try:
                        attach_oauth_connection(state, user, provider, identity)
                    except OAuthFlowError as error:
                        return self.send_json({"error": "该第三方账号已绑定其他邮箱账号" if str(error) == "oauth_conflict" else "该邮箱已绑定其他第三方账号"}, HTTPStatus.CONFLICT)
                else:
                    user = {
                        "id": secrets.token_hex(8),
                        "username": unique_oauth_username(state, identity, provider),
                        "email": email,
                        "password_hash": "",
                        "signature": "",
                        "gender": "保密",
                        "birthday": "",
                        "avatar_url": clean(identity.get("avatar_url"))[:1000],
                        "oauth_connections": {},
                        "email_verified_at": now_iso(),
                        "created_at": now_iso(),
                    }
                    try:
                        attach_oauth_connection(state, user, provider, identity)
                    except OAuthFlowError:
                        return self.send_json({"error": "该第三方账号已绑定其他邮箱账号"}, HTTPStatus.CONFLICT)
                    state["users"].append(user)
                    created = True
                save_state(state)
                OAUTH_PENDING.pop(clean(payload.get("oauth_token")), None)
                EMAIL_CODES.pop(email, None)
                cookie = self.issue_user_session(user)
            return self.send_json({"ok": True, "created": created, "user": account_user(user)}, HTTPStatus.CREATED if created else HTTPStatus.OK, {"Set-Cookie": cookie})
        if parsed.path == "/api/oauth/unbind":
            user = self.current_user()
            if not user:
                return self.send_json({"error": "请先登录"}, HTTPStatus.UNAUTHORIZED)
            provider = clean(payload.get("provider")).lower()
            if provider not in {"github", "qq"}:
                return self.send_json({"error": "第三方账号类型无效"}, HTTPStatus.BAD_REQUEST)
            with LOCK:
                state = load_state()
                target = next((item for item in state["users"] if item.get("id") == user.get("id")), None)
                if not target:
                    return self.send_json({"error": "账号不存在"}, HTTPStatus.UNAUTHORIZED)
                connections = target.get("oauth_connections") or {}
                connections.pop(provider, None)
                target["oauth_connections"] = connections
                save_state(state)
            return self.send_json({"ok": True, "user": account_user(target)})
        if parsed.path == "/api/comment":
            user = self.current_user()
            if not user: return self.send_json({"error": "请先登录"}, 401)
            if user.get("banned"):
                return self.send_json({"error": "账号已被封禁，无法发表评论"}, HTTPStatus.FORBIDDEN)
            if user_is_muted(user):
                return self.send_json({"error": "账号当前处于禁言状态，暂时无法发表评论", "muted_until": user.get("muted_until", "")}, HTTPStatus.FORBIDDEN)
            post_id, content = clean(payload.get("post_id")), clean(payload.get("content"))
            image_urls, invalid_images = gallery_urls_from_payload(payload, valid_comment_image_url)
            if invalid_images:
                return self.send_json({"error": f"评论图片无效、已失效，或超过 {MAX_GALLERY_IMAGES} 张上限"}, HTTPStatus.BAD_REQUEST)
            if (not content and not image_urls) or not post_id: return self.send_json({"error": "评论内容或图片不能为空"}, 400)
            parent_id = clean(payload.get("parent_id"))
            with LOCK:
                state = load_state()
                if post_id != "about" and not any(p.get("id") == post_id or p.get("slug") == post_id for p in state["posts"]): return self.send_json({"error": "文章不存在"}, 404)
                if parent_id:
                    parent = next((c for c in state["comments"] if c.get("id") == parent_id and c.get("post_id") == post_id), None)
                    if not parent: return self.send_json({"error": "回复的评论不存在"}, 400)
                    target_comment = parent if parent.get("parent_id") else None
                    parent_id = parent.get("parent_id") or parent["id"]
                else:
                    target_comment = None
                moderation_flags = comment_moderation_flags(content)
                original_content = content[:2000]
                public_content = mask_comment_filter_words(original_content, moderation_flags)
                comment = {"id": secrets.token_hex(8), "post_id": post_id, "user_id": user["id"], "username": user["username"], "content": public_content, "moderation_original": original_content if moderation_flags else "", "image_url": image_urls[0] if image_urls else "", "image_urls": image_urls, "parent_id": parent_id, "reply_to_id": target_comment["id"] if target_comment else "", "reply_to_username": target_comment.get("username", "") if target_comment else "", "reply_to_content": clean(target_comment.get("content"))[:180] if target_comment else "", "approved": True, "review_status": "pending" if moderation_flags else "approved", "review_requested": False, "review_requested_at": "", "reviewed_at": "", "moderation_flags": moderation_flags, "pinned": False, "likes": 0, "liked_by": [], "created_at": now_iso()}
                state["comments"].append(comment); save_state(state)
            return self.send_json({
                "comment": public_comment(comment, user, user),
                "pending_review": bool(moderation_flags),
                "message": "评论已发布，含屏蔽词的部分已用星号隐藏，正在等待人工审核；审核无误后将恢复原文。" if moderation_flags else "评论已发布。",
            }, 201)
        if re.fullmatch(r"/api/comments/[a-f0-9]+/request-review", parsed.path):
            user = self.current_user()
            if not user:
                return self.send_json({"error": "请先登录"}, HTTPStatus.UNAUTHORIZED)
            comment_id = parsed.path.split("/")[-2]
            requested_at = now_iso()
            with LOCK:
                state = load_state()
                comment = next((item for item in state.get("comments", []) if item.get("id") == comment_id), None)
                if not comment:
                    return self.send_json({"error": "评论不存在"}, HTTPStatus.NOT_FOUND)
                if comment.get("user_id") != user.get("id"):
                    return self.send_json({"error": "只能为自己的评论催审"}, HTTPStatus.FORBIDDEN)
                if comment.get("review_status") != "pending":
                    return self.send_json({"error": "该评论当前无需人工审核"}, HTTPStatus.CONFLICT)
                if comment.get("review_requested"):
                    return self.send_json({"error": "该评论已经催审，请耐心等待", "review_requested": True}, HTTPStatus.CONFLICT)
                comment["review_requested"] = True
                comment["review_requested_at"] = requested_at
                post_title = "留言区" if comment.get("post_id") == "about" else next((clean(post.get("title")) for post in state.get("posts", []) if post.get("id") == comment.get("post_id") or post.get("slug") == comment.get("post_id")), "文章评论")
                email_comment = {**comment, "post_title": post_title}
                save_state(state)
            email_sent = send_comment_review_request_email(email_comment, user)
            if not email_sent:
                with LOCK:
                    state = load_state()
                    current = next((item for item in state.get("comments", []) if item.get("id") == comment_id), None)
                    if current and current.get("review_requested_at") == requested_at:
                        current["review_requested"] = False
                        current["review_requested_at"] = ""
                        save_state(state)
                return self.send_json({"error": "催审邮件发送失败，请稍后重试"}, HTTPStatus.SERVICE_UNAVAILABLE)
            return self.send_json({"ok": True, "message": "已邮件提醒管理员尽快审核，每条评论仅能催审一次。"})
        if parsed.path == "/api/friend-applications":
            name = clean(payload.get("name"))[:80]
            url = clean(payload.get("url"))[:500]
            description = clean(payload.get("description"))[:240]
            avatar = clean(payload.get("avatar"))[:1000]
            email = clean(payload.get("email")).lower()[:254]
            if len(name) < 2 or not valid_external_url(url) or not valid_email(email):
                return self.send_json({"error": "请填写有效的网站名称、链接和联系邮箱"}, HTTPStatus.BAD_REQUEST)
            if avatar and not valid_external_url(avatar):
                return self.send_json({"error": "头像地址必须是有效的 HTTP 或 HTTPS 链接"}, HTTPStatus.BAD_REQUEST)
            normalized_url = normalize_friend_url(url)
            with LOCK:
                state = load_state()
                existing_urls = {normalize_friend_url(item.get("url")) for item in state.get("friend_links", [])}
                pending_urls = {
                    normalize_friend_url(item.get("url"))
                    for item in state.get("friend_applications", [])
                    if item.get("status") == "pending"
                }
                if normalized_url in existing_urls or normalized_url in pending_urls:
                    return self.send_json({"error": "该网站已在友链列表中或正在等待审批"}, HTTPStatus.CONFLICT)
                now = time.time()
                key = "ip:" + self.client_address[0]
                recent = [stamp for stamp in FRIEND_APPLICATION_SUBMISSIONS.get(key, []) if now - stamp < 3600]
                if len(recent) >= 5:
                    return self.send_json({"error": "友链申请提交过于频繁，请稍后再试"}, HTTPStatus.TOO_MANY_REQUESTS)
                FRIEND_APPLICATION_SUBMISSIONS[key] = recent + [now]
                application = {
                    "id": secrets.token_hex(8),
                    "name": name,
                    "url": url,
                    "description": description,
                    "avatar": avatar,
                    "address": clean(urlparse(url).netloc.replace("www.", ""), "")[:120],
                    "email": email,
                    "status": "pending",
                    "created_at": now_iso(),
                    "reviewed_at": "",
                }
                state.setdefault("friend_applications", []).append(application)
                save_state(state)
            return self.send_json({"ok": True, "message": "友链申请已提交，管理员审批后会显示在友链页面", "application": application}, HTTPStatus.CREATED)
        if parsed.path == "/api/reports":
            user = self.current_user()
            target_type = clean(payload.get("target_type")).lower()
            target_id = clean(payload.get("target_id"))
            reason = clean(payload.get("reason")).lower()
            details = clean(payload.get("details"))[:1000]
            anonymous_token = clean(payload.get("anonymous_token"))
            if target_type not in {"user", "comment"} or not target_id:
                return self.send_json({"error": "举报目标无效"}, HTTPStatus.BAD_REQUEST)
            if reason not in REPORT_REASONS:
                return self.send_json({"error": "请选择举报原因"}, HTTPStatus.BAD_REQUEST)
            if user:
                reporter_id = user.get("id", "")
            else:
                fingerprint = anonymous_token if re.fullmatch(r"[a-zA-Z0-9-]{20,64}", anonymous_token) else (
                    f"{self.client_address[0]}|{self.headers.get('User-Agent', '')}"
                )
                reporter_id = "anonymous:" + hashlib.sha256(fingerprint.encode()).hexdigest()[:24]
            with LOCK:
                state = load_state()
                if target_type == "user":
                    target_user = next((item for item in state["users"] if item.get("id") == target_id), None)
                    if not target_user:
                        return self.send_json({"error": "举报的用户不存在"}, HTTPStatus.NOT_FOUND)
                    target_user_id = target_user.get("id")
                else:
                    target_comment = next((item for item in state["comments"] if item.get("id") == target_id), None)
                    if not target_comment:
                        return self.send_json({"error": "举报的评论不存在"}, HTTPStatus.NOT_FOUND)
                    target_user_id = target_comment.get("user_id")
                if user and target_user_id == user.get("id"):
                    return self.send_json({"error": "不能举报自己的账号或评论"}, HTTPStatus.BAD_REQUEST)
                duplicate = any(
                    item.get("reporter_id") == reporter_id
                    and item.get("target_type") == target_type
                    and item.get("target_id") == target_id
                    and item.get("status") == "open"
                    for item in state.get("reports", [])
                )
                if duplicate:
                    return self.send_json({"error": "你已举报该目标，管理员处理前无需重复提交"}, HTTPStatus.CONFLICT)
                open_count = sum(1 for item in state.get("reports", []) if item.get("reporter_id") == reporter_id and item.get("status") == "open")
                if open_count >= 20:
                    return self.send_json({"error": "待处理的举报过多，请等待管理员处理后再提交"}, HTTPStatus.TOO_MANY_REQUESTS)
                if not user:
                    now = time.time()
                    submission_key = "ip:" + self.client_address[0]
                    recent = [stamp for stamp in REPORT_SUBMISSIONS.get(submission_key, []) if now - stamp < 3600]
                    if len(recent) >= 40:
                        return self.send_json({"error": "匿名举报提交过于频繁，请稍后再试"}, HTTPStatus.TOO_MANY_REQUESTS)
                    REPORT_SUBMISSIONS[submission_key] = recent + [now]
                report = {
                    "id": secrets.token_hex(8),
                    "reporter_id": reporter_id,
                    "target_type": target_type,
                    "target_id": target_id,
                    "target_user_id": target_user_id,
                    "reason": reason,
                    "details": details,
                    "status": "open",
                    "created_at": now_iso(),
                    "resolved_at": "",
                    "resolved_by": "",
                    "resolution": "",
                }
                state.setdefault("reports", []).append(report)
                save_state(state)
            return self.send_json({"ok": True, "message": "举报已提交，管理员会尽快处理", "report": report}, HTTPStatus.CREATED)
        if re.fullmatch(r"/api/comments/[a-f0-9]+/like", parsed.path):
            user = self.current_user()
            if not user: return self.send_json({"error": "请先登录"}, 401)
            comment_id = parsed.path.split("/")[-2]
            actor = "user:" + user["id"]
            with LOCK:
                state = load_state()
                comment = next((c for c in state["comments"] if c.get("id") == comment_id and c.get("approved", True)), None)
                if not comment: return self.send_json({"error": "评论不存在"}, 404)
                liked_by = comment.setdefault("liked_by", [])
                if actor in liked_by:
                    liked_by.remove(actor); comment["likes"] = max(0, int(comment.get("likes", 0)) - 1); liked = False
                else:
                    liked_by.append(actor); comment["likes"] = int(comment.get("likes", 0)) + 1; liked = True
                save_state(state)
            return self.send_json({"likes": int(comment.get("likes", 0)), "liked": liked})
        if re.fullmatch(r"/api/thoughts/[a-f0-9]+/like", parsed.path):
            user = self.current_user()
            if not user: return self.send_json({"error": "请先登录"}, HTTPStatus.UNAUTHORIZED)
            thought_id = parsed.path.split("/")[-2]
            actor = "user:" + user["id"]
            with LOCK:
                state = load_state()
                thought = next((item for item in state.get("thoughts", []) if item.get("id") == thought_id and item.get("published", True)), None)
                if not thought: return self.send_json({"error": "日常记录不存在"}, HTTPStatus.NOT_FOUND)
                liked_by = thought.setdefault("liked_by", [])
                if actor in liked_by:
                    liked_by.remove(actor)
                    thought["likes"] = max(0, int(thought.get("likes", 0)) - 1)
                    liked = False
                else:
                    liked_by.append(actor)
                    thought["likes"] = int(thought.get("likes", 0)) + 1
                    liked = True
                save_state(state)
            return self.send_json({"likes": int(thought.get("likes", 0)), "liked": liked})
        favorite_match = re.fullmatch(r"/api/posts/([^/]+)/favorite", parsed.path)
        if favorite_match:
            user = self.current_user()
            if not user:
                return self.send_json({"error": "请先登录"}, HTTPStatus.UNAUTHORIZED)
            post_identifier = unquote(favorite_match.group(1))
            with LOCK:
                state = load_state()
                post = next((item for item in state.get("posts", []) if post_identifier in {item.get("id"), item.get("slug")} and is_visible(item)), None)
                if not post:
                    return self.send_json({"error": "文章不存在"}, HTTPStatus.NOT_FOUND)
                target_user = next((item for item in state.get("users", []) if item.get("id") == user.get("id")), None)
                if not target_user:
                    return self.send_json({"error": "账号不存在"}, HTTPStatus.UNAUTHORIZED)
                favorites = [post_id for post_id in target_user.get("favorites", []) if clean(post_id)]
                if post["id"] in favorites:
                    favorites = [post_id for post_id in favorites if post_id != post["id"]]
                    favorited = False
                else:
                    favorites.append(post["id"])
                    favorited = True
                target_user["favorites"] = favorites
                save_state(state)
            return self.send_json({"favorited": favorited, "post_id": post["id"], "favorites": favorites})
        if parsed.path.startswith("/api/posts/") and parsed.path.endswith("/like"):
            post_id = parsed.path.split("/")[-2]; actor = clean(self.headers.get("X-Like-Actor"))[:160]; user = self.current_user(); actor = "user:" + user["id"] if user else ("anon:" + actor if actor else "anon:" + secrets.token_urlsafe(18))
            with LOCK:
                state = load_state(); post = next((p for p in state["posts"] if p.get("id") == post_id), None)
                if not post: return self.send_json({"error": "文章不存在"}, 404)
                liked_by = post.setdefault("liked_by", []); already = actor in liked_by
                if already:
                    liked_by.remove(actor)
                    post["likes"] = max(0, int(post.get("likes", 0)) - 1)
                else:
                    liked_by.append(actor)
                    post["likes"] = int(post.get("likes", 0)) + 1
                save_state(state)
            headers = {"X-Like-Actor": actor}
            return self.send_json({"likes": int(post.get("likes", 0)), "liked": not already, "already_liked": already}, headers=headers)
        if parsed.path == "/api/posts":
            if not self.require_admin(): return
            title = clean(payload.get("title"))
            if not title: return self.send_json({"error": "标题不能为空"}, 400)
            cover_url = clean(payload.get("cover_url"))
            if cover_url and not valid_image_reference(cover_url):
                return self.send_json({"error": "文章封面地址无效"}, HTTPStatus.BAD_REQUEST)
            stamp = now_iso(); fmt = clean(payload.get("format"), "html"); raw = clean(payload.get("content")); content = render_markdown(raw) if fmt == "markdown" else sanitize_rich_text(raw)
            post = {"id": make_id(title), "slug": clean(payload.get("slug")) or make_id(title), "title": title, "excerpt": clean(payload.get("excerpt")), "content": content, "source_content": raw, "format": fmt, "tags": [clean(t) for t in payload.get("tags", []) if clean(t)], "category": clean(payload.get("category"), "未分类"), "author": clean(payload.get("author"), "StarIsle"), "published": bool(payload.get("published")), "pinned": bool(payload.get("pinned")), "carousel": bool(payload.get("carousel")), "cover_url": cover_url, "created_at": stamp, "updated_at": stamp, "published_at": clean(payload.get("published_at")) or stamp, "scheduled_at": clean(payload.get("scheduled_at")), "views": 0, "likes": 0, "liked_by": []}
            with LOCK: state = load_state(); state["posts"].append(post); save_state(state)
            return self.send_json({"post": post}, 201)
        if parsed.path == "/api/admin/theme":
            if not self.require_admin(): return
            key = clean(payload.get("theme"))
            if key != "auto" and key not in THEME_BY_KEY:
                return self.send_json({"error": "请选择有效的节气主题"}, 400)
            with LOCK:
                state = load_state(); state["profile"]["home_theme"] = key; save_state(state)
            return self.send_json(theme_catalog(state["profile"]))
        if re.fullmatch(r"/api/admin/friend-applications/[a-f0-9]+", parsed.path):
            if not self.require_admin(): return
            application_id = parsed.path.rsplit("/", 1)[-1]
            action = clean(payload.get("action")).lower()
            if action not in {"approve", "reject"}:
                return self.send_json({"error": "无效的友链审批操作"}, HTTPStatus.BAD_REQUEST)
            with LOCK:
                state = load_state()
                application = next(
                    (item for item in state.get("friend_applications", []) if item.get("id") == application_id),
                    None,
                )
                if not application:
                    return self.send_json({"error": "友链申请不存在"}, HTTPStatus.NOT_FOUND)
                if application.get("status") != "pending":
                    return self.send_json({"error": "该友链申请已经处理"}, HTTPStatus.CONFLICT)
                application["reviewed_at"] = now_iso()
                if action == "reject":
                    application["status"] = "rejected"
                else:
                    normalized_url = normalize_friend_url(application.get("url"))
                    if any(normalize_friend_url(item.get("url")) == normalized_url for item in state.get("friend_links", [])):
                        return self.send_json({"error": "相同网址已在友链列表中"}, HTTPStatus.CONFLICT)
                    application["status"] = "approved"
                    state.setdefault("friend_links", []).append({
                        "id": "friend-app-" + application["id"],
                        **public_friend_link(application),
                        "source": "application",
                        "approved": True,
                        "created_at": application.get("created_at", now_iso()),
                    })
                save_state(state)
            email_sent = False
            if action == "approve" and valid_email(clean(application.get("email"))):
                email_sent = send_friend_application_approved_email(application.get("email"), application)
            return self.send_json({"ok": True, "application": application, "email_sent": email_sent})
        if parsed.path == "/api/admin/thoughts":
            if not self.require_admin(): return
            content = clean(payload.get("content"))[:500]
            mood = clean(payload.get("mood"), "日常")[:20]
            image_urls, invalid_images = gallery_urls_from_payload(payload, valid_image_reference)
            if invalid_images:
                return self.send_json({"error": f"日常图片地址无效，或超过 {MAX_GALLERY_IMAGES} 张上限"}, HTTPStatus.BAD_REQUEST)
            if not content and not image_urls:
                return self.send_json({"error": "日常内容或图片不能为空"}, HTTPStatus.BAD_REQUEST)
            thought = {
                "id": secrets.token_hex(8),
                "content": content,
                "image_url": image_urls[0] if image_urls else "",
                "image_urls": image_urls,
                "mood": mood,
                "published": bool(payload.get("published", True)),
                "likes": 0,
                "liked_by": [],
                "created_at": now_iso(),
                "updated_at": now_iso(),
            }
            with LOCK:
                state = load_state()
                state.setdefault("thoughts", []).append(thought)
                save_state(state)
            return self.send_json({"thought": thought}, HTTPStatus.CREATED)
        if parsed.path == "/api/admin/announcements":
            if not self.require_admin(): return
            title_zh = clean(payload.get("title_zh"))[:120]
            body_zh = clean(payload.get("body_zh"))[:2000]
            if not title_zh or not body_zh:
                return self.send_json({"error": "公告标题和内容不能为空"}, HTTPStatus.BAD_REQUEST)
            stamp = now_iso()
            published = bool(payload.get("published", True))
            announcement = {
                "id": secrets.token_hex(8),
                "title_zh": title_zh,
                "title_en": clean(payload.get("title_en"))[:120],
                "body_zh": body_zh,
                "body_en": clean(payload.get("body_en"))[:2000],
                "published": published,
                "source": "manual",
                "source_ids": [],
                "created_at": stamp,
                "updated_at": stamp,
                "published_at": stamp if published else "",
            }
            with LOCK:
                state = load_state()
                state.setdefault("announcements", []).insert(0, announcement)
                save_state(state)
            return self.send_json({"announcement": announcement}, HTTPStatus.CREATED)
        if parsed.path == "/api/admin/profile":
            if not self.require_admin(): return
            with LOCK:
                state = load_state(); keys = ("name", "name_en", "eyebrow", "eyebrow_en", "subtitle", "subtitle_en", "bio", "bio_en", "hero_cta", "hero_cta_en", "posts_eyebrow", "posts_heading", "posts_heading_en", "about_eyebrow", "about_eyebrow_en", "about_heading", "about_heading_en", "about_name", "about_name_en", "about_dialog_kicker", "about_dialog_kicker_en", "about_dialog_status", "about_dialog_status_en", "about_dialog_idle", "about_dialog_idle_en", "about_dialog_hint", "about_dialog_hint_en", "about_dialogues_zh", "about_dialogues_en", "about_body", "about_body_en", "location", "copyright", "footer_note", "footer_note_en", "logo_url", "avatar_url", "social_links", "support_eyebrow", "support_eyebrow_en", "support_title", "support_title_en", "support_body", "support_body_en", "support_note", "support_note_en", "alipay_qr_url", "wechat_qr_url", "paypal_url", "donation_asset_version", "ui_palette", "ui_accent", "ui_width", "ui_width_custom", "ui_corner", "ui_corner_custom", "ui_card_style", "ui_density", "ui_hero_layout", "ui_motion")
                for key in keys:
                    if key in payload: state["profile"][key] = payload[key] if key == "social_links" else clean(payload[key])[:500]
                save_state(state)
            return self.send_json({"profile": state["profile"]})
        if parsed.path == "/api/admin/account":
            if not self.require_admin(): return
            current_password = payload.get("current_password")
            username = payload.get("username")
            new_password = payload.get("new_password", "")
            confirm_password = payload.get("confirm_password", "")
            if not isinstance(current_password, str) or not isinstance(new_password, str) or not isinstance(confirm_password, str):
                return self.send_json({"error": "账号设置格式无效"}, 400)
            username = username.strip() if isinstance(username, str) else ""
            if not valid_admin_username(username):
                return self.send_json({"error": "管理员名称需为 3-32 位字母、数字、点、短横线或下划线，并以字母或数字开头"}, 400)
            if new_password and not valid_admin_password(new_password):
                return self.send_json({"error": "新密码需为 8-128 个字符，且不能包含控制字符"}, 400)
            if new_password != confirm_password:
                return self.send_json({"error": "两次输入的新密码不一致"}, 400)
            with LOCK:
                config = load_admin_config()
                if not verify_password(current_password, config.get("password_hash", "")):
                    return self.send_json({"error": "当前密码不正确"}, HTTPStatus.FORBIDDEN)
                changed = username != config.get("username") or bool(new_password)
                if not changed:
                    return self.send_json({"error": "管理员名称和新密码均未修改"}, 400)
                config["username"] = username
                if new_password:
                    config["password_hash"] = hash_password(new_password)
                config["updated_at"] = now_iso()
                save_admin_config(config)
            return self.send_json({"ok": True, "username": username, "reauth_required": True})
        if re.fullmatch(r"/api/admin/users/[a-f0-9]+/moderation", parsed.path):
            if not self.require_admin(): return
            user_id = parsed.path.split("/")[-2]
            action = clean(payload.get("action")).lower()
            reason = clean(payload.get("reason"))
            duration_hours = payload.get("duration_hours", 0)
            with LOCK:
                state = load_state()
                target = next((item for item in state["users"] if item.get("id") == user_id), None)
                if not target:
                    return self.send_json({"error": "用户不存在"}, HTTPStatus.NOT_FOUND)
                try:
                    entry = moderate_user(state, target, action, reason, duration_hours)
                except ValueError as error:
                    return self.send_json({"error": str(error)}, HTTPStatus.BAD_REQUEST)
                if action == "ban":
                    for token, session_user_id in list(SESSIONS.items()):
                        if session_user_id == user_id:
                            SESSIONS.pop(token, None)
                for report in state.get("reports", []):
                    if report.get("target_user_id") == user_id and report.get("status") == "open" and action in {"mute", "ban"}:
                        report["status"] = "resolved"
                        report["resolved_at"] = now_iso()
                        report["resolved_by"] = "admin"
                        report["resolution"] = action
                save_state(state)
            return self.send_json({"ok": True, "user": account_user(target), "log": entry})
        if re.fullmatch(r"/api/admin/reports/[a-f0-9]+", parsed.path):
            if not self.require_admin(): return
            report_id = parsed.path.rsplit("/", 1)[-1]
            action = clean(payload.get("action")).lower()
            if action not in {"resolve", "dismiss"}:
                return self.send_json({"error": "无效的举报处理操作"}, HTTPStatus.BAD_REQUEST)
            with LOCK:
                state = load_state()
                report = next((item for item in state.get("reports", []) if item.get("id") == report_id), None)
                if not report:
                    return self.send_json({"error": "举报记录不存在"}, HTTPStatus.NOT_FOUND)
                report["status"] = "resolved" if action == "resolve" else "dismissed"
                report["resolved_at"] = now_iso()
                report["resolved_by"] = "admin"
                report["resolution"] = action
                save_state(state)
            return self.send_json({"ok": True, "report": report_view(report, state)})
        if parsed.path.startswith("/api/admin/comments/"):
            if not self.require_admin(): return
            cid = parsed.path.rsplit("/", 1)[-1]
            with LOCK:
                state = load_state(); comment = next((c for c in state["comments"] if c.get("id") == cid), None)
                if not comment: return self.send_json({"error": "评论不存在"}, 404)
                if payload.get("review_action") == "approve":
                    original = clean(comment.get("moderation_original"))
                    if original:
                        comment["content"] = original
                    comment["approved"] = True
                    comment["review_status"] = "approved"
                    comment["reviewed_at"] = now_iso()
                    comment["moderation_original"] = ""
                for key in ("approved", "pinned"):
                    if key in payload: comment[key] = bool(payload[key])
                save_state(state)
            return self.send_json({"comment": comment})
        return self.send_error(404)

    def do_PUT(self):
        parsed = urlparse(self.path)
        try: payload = self.read_json()
        except (ValueError, json.JSONDecodeError, UnicodeDecodeError): return self.send_json({"error": "请求格式无效"}, 400)
        if parsed.path == "/api/me":
            user = self.current_user()
            if not user: return self.send_json({"error": "请先登录"}, 401)
            with LOCK:
                state = load_state(); target = next(u for u in state["users"] if u["id"] == user["id"])
                for key in ("signature", "gender", "birthday"):
                    if key in payload: target[key] = clean(payload[key])[:500]
                save_state(state)
            return self.send_json({"user": account_user(target)})
        if re.fullmatch(r"/api/admin/announcements/[a-z0-9-]+", parsed.path):
            if not self.require_admin(): return
            announcement_id = parsed.path.rsplit("/", 1)[-1]
            with LOCK:
                state = load_state()
                announcement = next((item for item in state.get("announcements", []) if item.get("id") == announcement_id), None)
                if not announcement:
                    return self.send_json({"error": "公告不存在"}, HTTPStatus.NOT_FOUND)
                for key, limit in (("title_zh", 120), ("title_en", 120), ("body_zh", 2000), ("body_en", 2000)):
                    if key in payload:
                        announcement[key] = clean(payload[key])[:limit]
                if not clean(announcement.get("title_zh")) or not clean(announcement.get("body_zh")):
                    return self.send_json({"error": "公告标题和内容不能为空"}, HTTPStatus.BAD_REQUEST)
                if "published" in payload:
                    was_published = bool(announcement.get("published"))
                    announcement["published"] = bool(payload.get("published"))
                    if announcement["published"] and not was_published:
                        announcement["published_at"] = now_iso()
                announcement["updated_at"] = now_iso()
                save_state(state)
            return self.send_json({"announcement": announcement})
        if re.fullmatch(r"/api/admin/thoughts/[a-f0-9]+", parsed.path):
            if not self.require_admin(): return
            thought_id = parsed.path.rsplit("/", 1)[-1]
            with LOCK:
                state = load_state()
                thought = next((item for item in state.get("thoughts", []) if item.get("id") == thought_id), None)
                if not thought:
                    return self.send_json({"error": "日常记录不存在"}, HTTPStatus.NOT_FOUND)
                if "content" in payload:
                    content = clean(payload.get("content"))[:500]
                    thought["content"] = content
                if "image_urls" in payload or "image_url" in payload:
                    image_urls, invalid_images = gallery_urls_from_payload(payload, valid_image_reference)
                    if invalid_images:
                        return self.send_json({"error": f"日常图片地址无效，或超过 {MAX_GALLERY_IMAGES} 张上限"}, HTTPStatus.BAD_REQUEST)
                    thought["image_urls"] = image_urls
                    thought["image_url"] = image_urls[0] if image_urls else ""
                if not clean(thought.get("content")) and not thought.get("image_urls"):
                    return self.send_json({"error": "日常内容或图片不能为空"}, HTTPStatus.BAD_REQUEST)
                if "mood" in payload:
                    thought["mood"] = clean(payload.get("mood"), "日常")[:20]
                if "published" in payload:
                    thought["published"] = bool(payload.get("published"))
                thought["updated_at"] = now_iso()
                save_state(state)
            return self.send_json({"thought": thought})
        if not parsed.path.startswith("/api/posts/") or not self.require_admin(): return self.send_json({"error": "管理接口仅在管理端口提供"}, 401)
        post_id = parsed.path.rsplit("/", 1)[-1]
        with LOCK:
            state = load_state(); post = next((p for p in state["posts"] if p.get("id") == post_id), None)
            if not post: return self.send_json({"error": "文章不存在"}, 404)
            for key in ("title", "excerpt", "slug", "category", "author", "scheduled_at", "published_at"):
                if key in payload: post[key] = clean(payload[key])
            if "tags" in payload: post["tags"] = [clean(t) for t in payload["tags"] if clean(t)]
            if "published" in payload: post["published"] = bool(payload["published"])
            if "pinned" in payload: post["pinned"] = bool(payload["pinned"])
            if "carousel" in payload: post["carousel"] = bool(payload["carousel"])
            if "cover_url" in payload:
                cover_url = clean(payload.get("cover_url"))
                if cover_url and not valid_image_reference(cover_url):
                    return self.send_json({"error": "文章封面地址无效"}, HTTPStatus.BAD_REQUEST)
                post["cover_url"] = cover_url
            if "format" in payload: post["format"] = clean(payload["format"])
            if "content" in payload:
                post["source_content"] = clean(payload["content"]); post["content"] = render_markdown(post["source_content"]) if post.get("format") == "markdown" else sanitize_rich_text(post["source_content"])
            post["updated_at"] = now_iso(); save_state(state)
        return self.send_json({"post": post})

    def do_DELETE(self):
        parsed_path = urlparse(self.path).path
        if re.fullmatch(r"/api/admin/announcements/[a-z0-9-]+", parsed_path):
            if not self.require_admin(): return
            announcement_id = parsed_path.rsplit("/", 1)[-1]
            with LOCK:
                state = load_state()
                before = len(state.get("announcements", []))
                state["announcements"] = [item for item in state.get("announcements", []) if item.get("id") != announcement_id]
                save_state(state)
            return self.send_json({"ok": before != len(state["announcements"])})
        if re.fullmatch(r"/api/comments/[a-f0-9]+", parsed_path):
            user = self.current_user()
            if not user:
                return self.send_json({"error": "请先登录"}, HTTPStatus.UNAUTHORIZED)
            comment_id = parsed_path.rsplit("/", 1)[-1]
            with LOCK:
                state = load_state()
                comment = next((item for item in state.get("comments", []) if item.get("id") == comment_id), None)
                if not comment:
                    return self.send_json({"error": "评论不存在"}, HTTPStatus.NOT_FOUND)
                if comment.get("user_id") != user.get("id"):
                    return self.send_json({"error": "只能删除自己的评论"}, HTTPStatus.FORBIDDEN)
                for reply in state.get("comments", []):
                    if reply.get("parent_id") == comment_id:
                        reply["parent_id"] = ""
                state["comments"] = [item for item in state.get("comments", []) if item.get("id") != comment_id]
                save_state(state)
            return self.send_json({"ok": True, "deleted_id": comment_id})
        if parsed_path == "/api/me":
            user = self.current_user()
            if not user: return self.send_json({"error": "请先登录"}, HTTPStatus.UNAUTHORIZED)
            token = self.cookie_token()
            with LOCK:
                state = load_state()
                state["users"] = [item for item in state["users"] if item.get("id") != user.get("id")]
                state["comments"] = [item for item in state["comments"] if item.get("user_id") != user.get("id")]
                for post in state["posts"]:
                    liked_by = post.setdefault("liked_by", [])
                    user_actor = "user:" + user["id"]
                    if user_actor in liked_by:
                        post["liked_by"] = [actor for actor in liked_by if actor != user_actor]
                        post["likes"] = max(0, int(post.get("likes", 0)) - 1)
                for comment in state["comments"]:
                    liked_by = comment.setdefault("liked_by", [])
                    user_actor = "user:" + user["id"]
                    if user_actor in liked_by:
                        comment["liked_by"] = [actor for actor in liked_by if actor != user_actor]
                        comment["likes"] = max(0, int(comment.get("likes", 0)) - 1)
                save_state(state)
                SESSIONS.pop(token, None)
                EMAIL_CODES.pop(clean(user.get("email")).lower(), None)
            return self.send_json({"ok": True}, headers={"Set-Cookie": "blog_session=; Max-Age=0; HttpOnly; SameSite=Lax; Path=/"})
        if re.fullmatch(r"/api/admin/thoughts/[a-f0-9]+", urlparse(self.path).path):
            if not self.require_admin(): return
            thought_id = urlparse(self.path).path.rsplit("/", 1)[-1]
            with LOCK:
                state = load_state()
                before = len(state.get("thoughts", []))
                state["thoughts"] = [item for item in state.get("thoughts", []) if item.get("id") != thought_id]
                save_state(state)
            return self.send_json({"ok": before != len(state["thoughts"])})
        if self.path.startswith("/api/admin/comments/"):
            if not self.require_admin(): return
            cid = self.path.rsplit("/", 1)[-1]
            with LOCK:
                state = load_state(); removed_ids = {cid}; removed_ids.update(c.get("id") for c in state["comments"] if c.get("parent_id") == cid); state["comments"] = [c for c in state["comments"] if c.get("id") not in removed_ids]; save_state(state)
            return self.send_json({"ok": True})
        if not self.path.startswith("/api/posts/") or not self.require_admin(): return self.send_json({"error": "管理接口仅在管理端口提供"}, 401)
        post_id = self.path.rsplit("/", 1)[-1]
        with LOCK:
            state = load_state(); before = len(state["posts"]); state["posts"] = [p for p in state["posts"] if p.get("id") != post_id]
            for user in state.get("users", []):
                if isinstance(user.get("favorites"), list):
                    user["favorites"] = [favorite_id for favorite_id in user["favorites"] if favorite_id != post_id]
            save_state(state)
        return self.send_json({"ok": before != len(state["posts"])})


def main():
    guest = ThreadingHTTPServer((os.getenv("GUEST_BIND_HOST", "0.0.0.0"), PORT), BlogHandler); admin = ThreadingHTTPServer((os.getenv("ADMIN_BIND_HOST", "127.0.0.1"), ADMIN_PORT), BlogHandler)
    threading.Thread(target=admin.serve_forever, daemon=True).start(); print(f"Meterial Extra guest :{PORT}, admin :{ADMIN_PORT}"); guest.serve_forever()


if __name__ == "__main__": main()
