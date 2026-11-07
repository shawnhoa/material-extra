"""Server-side catalogs for the Minecraft library and operating-system mirrors."""
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone
from pathlib import Path
from urllib import request as urllib_request
from urllib.error import HTTPError, URLError
from urllib.parse import quote, urlencode
import json
import os
import re
import threading
import time


ROOT = Path(__file__).parent
CACHE_DIR = Path(os.getenv("DATA_DIR", "/data")) / "catalog-cache"
MOJANG_MANIFEST = "https://piston-meta.mojang.com/mc/game/version_manifest_v2.json"
MCAPPX_BEDROCK = "https://data.mcappx.com/v2/bedrock.json"
MCARC_API = "https://api.mcarc.top"
MCARC_SITE = "https://mc233.endyun.ltd/"
MCARC_MAJOR_GROUPS = (
    "26.x", "1.21.x", "1.20.x", "1.19.x", "1.18.x", "1.17.x",
    "1.16.x", "1.15.x", "1.14.x", "1.13.x", "1.12.x", "1.11.x",
    "1.10.x", "1.9.x", "1.8.x", "1.7.x", "1.6.x", "1.5.x",
    "1.4.x", "1.3.x", "1.2.x", "1.1.x", "1.0.x",
)
CACHE_SECONDS = 900
MAX_RESPONSE_BYTES = 6 * 1024 * 1024
LOCK = threading.RLock()
MEMORY_CACHE = {}
MIRROR_DATA = json.loads((ROOT / "mirror-catalog.json").read_text(encoding="utf-8"))


class CatalogError(Exception):
    pass


def _cache_paths(key):
    safe = re.sub(r"[^a-z0-9_-]+", "-", key.lower()).strip("-") or "catalog"
    return MEMORY_CACHE, CACHE_DIR / (safe + ".json")


def _fetch_json(url, cache_key, max_age=CACHE_SECONDS, method="GET", form=None):
    now = time.time()
    memory, disk = _cache_paths(cache_key)
    cache_id = method.upper() + ":" + cache_key
    with LOCK:
        cached = memory.get(cache_id)
        if cached and now - cached[0] < max_age:
            return cached[1]
    request_data = urlencode(form).encode() if form is not None else None
    request = urllib_request.Request(
        url,
        data=request_data,
        method=method.upper(),
        headers={
            "Accept": "application/json",
            "User-Agent": "StarIsleBlog/3.2 catalog",
            **({"Content-Type": "application/x-www-form-urlencoded"} if request_data else {}),
        },
    )
    try:
        with urllib_request.urlopen(request, timeout=15) as response:
            raw = response.read(MAX_RESPONSE_BYTES + 1)
        if len(raw) > MAX_RESPONSE_BYTES:
            raise CatalogError("上游目录超过允许大小")
        data = json.loads(raw.decode("utf-8"))
    except (OSError, URLError, HTTPError, ValueError, UnicodeDecodeError) as error:
        with LOCK:
            stale = memory.get(cache_id)
        if stale:
            return stale[1]
        try:
            return json.loads(disk.read_text(encoding="utf-8"))
        except (OSError, ValueError, json.JSONDecodeError):
            raise CatalogError("上游数据暂时不可用") from error
    with LOCK:
        memory[cache_id] = (now, data)
    try:
        CACHE_DIR.mkdir(parents=True, exist_ok=True)
        temporary = disk.with_suffix(".tmp")
        temporary.write_text(
            json.dumps(data, ensure_ascii=False, separators=(",", ":")),
            encoding="utf-8",
        )
        temporary.replace(disk)
    except OSError:
        pass
    return data


def _java_versions():
    manifest = _fetch_json(MOJANG_MANIFEST, "minecraft-java-manifest")
    versions = []
    for item in manifest.get("versions", []):
        version_type = str(item.get("type", ""))
        channel = version_type if version_type in {"release", "snapshot"} else "legacy"
        versions.append(
            {
                "id": str(item.get("id", "")),
                "edition": "java",
                "channel": channel,
                "channel_label": {
                    "release": "正式版",
                    "snapshot": "测试版",
                    "legacy": "旧版",
                }[channel],
                "type": version_type,
                "release_time": item.get("releaseTime") or item.get("time") or "",
                "manifest": item.get("url", ""),
            }
        )
    return versions, manifest.get("latest", {})


def _bedrock_versions():
    data = _fetch_json(MCAPPX_BEDROCK, "minecraft-bedrock-mcappx")
    raw_versions = data.get("From_mcappx.com", {})
    versions = []
    for version_id, item in raw_versions.items():
        if not isinstance(item, dict):
            continue
        raw_type = str(item.get("Type", ""))
        variations = item.get("Variations") if isinstance(item.get("Variations"), list) else []
        architectures = sorted(
            {
                str(variation.get("Arch", "")).strip()
                for variation in variations
                if isinstance(variation, dict) and variation.get("Arch")
            }
        )
        versions.append(
            {
                "id": str(version_id),
                "edition": "bedrock",
                "channel": "release" if raw_type.lower() == "release" else "testing",
                "channel_label": "正式版" if raw_type.lower() == "release" else "测试版",
                "type": raw_type,
                "build_type": str(item.get("BuildType", "")),
                "store_version": str(item.get("ID", "")),
                "release_time": str(item.get("Date", "")),
                "architectures": architectures,
            }
        )

    def version_key(item):
        parts = re.split(r"[._-]", item.get("id", ""))
        numeric = tuple(int(part) if part.isdigit() else 0 for part in parts[:5])
        return (item.get("release_time", ""), numeric)

    versions.sort(key=version_key, reverse=True)
    return versions, {"creation_time": data.get("CreationTime", "")}


def _mcarc_version(item):
    links = item.get("link") if isinstance(item.get("link"), dict) else {}
    sizes = [part.strip() for part in str(item.get("file_size", "")).split("/") if part.strip()]
    architecture_order = ["ARMv7", "ARMv8"]
    downloads = []
    architecture_names = []
    for provider, variants in links.items():
        if not isinstance(variants, dict):
            continue
        for architecture, url in variants.items():
            architecture = str(architecture).strip()
            url = str(url).strip()
            if not re.fullmatch(r"(?:ARMv7|ARMv8|ARM64|x86(?:_64)?)", architecture, re.I):
                continue
            if not re.fullmatch(r"https?://\S+", url):
                continue
            if architecture not in architecture_names:
                architecture_names.append(architecture)
            size_index = architecture_order.index(architecture) if architecture in architecture_order else 0
            downloads.append(
                {
                    "provider": str(provider),
                    "architecture": architecture,
                    "url": url,
                    "label": f"{provider} · {architecture}",
                    "size": sizes[size_index] if size_index < len(sizes) else "",
                }
            )
    architecture_names.sort(key=lambda value: (architecture_order.index(value) if value in architecture_order else 9, value))
    downloads.sort(
        key=lambda value: (
            str(value["provider"]).lower(),
            architecture_order.index(value["architecture"]) if value["architecture"] in architecture_order else 9,
        )
    )
    version_all = str(item.get("version_all") or item.get("version") or "").strip()
    is_beta = bool(item.get("is_beta"))
    return {
        "id": version_all,
        "edition": "bedrock",
        "platform": "android",
        "channel": "testing" if is_beta else "release",
        "channel_label": "测试版" if is_beta else "正式版",
        "type": "APK",
        "build_type": "APK",
        "store_version": str(item.get("version", "")),
        "release_time": str(item.get("update_time", "")),
        "architectures": architecture_names,
        "file_size": item.get("file_size", ""),
        "downloads": downloads,
        "page_url": MCARC_SITE + "download/",
        "source": "MC版本库 · MCARC",
        "source_url": MCARC_SITE,
    }


def _mcarc_group_versions(group, beta=None):
    form = {"v": group}
    if beta in {0, 1}:
        form["b"] = str(beta)
    data = _fetch_json(
        MCARC_API + "/get_version",
        f"mcarc-get-{group.replace('.', '-')}-{beta if beta is not None else 'all'}",
        method="POST",
        form=form,
    )
    if data.get("status") != 200 or not isinstance(data.get("message"), list):
        raise CatalogError(str(data.get("message") or "MCARC 大版本接口返回异常"))
    return data["message"]


def _mcarc_search_values(query, beta=None):
    params = {"s": query, "m": "1"}
    if beta in {0, 1}:
        params["b"] = str(beta)
    query_string = urlencode(params)
    data = _fetch_json(
        MCARC_API + "/search_version?" + query_string,
        f"mcarc-search-{quote(query, safe='')}-{beta if beta is not None else 'all'}",
    )
    if data.get("status") != 200 or not isinstance(data.get("message"), list):
        raise CatalogError(str(data.get("message") or "MCARC 搜索接口返回异常"))
    return data["message"]


def _mcarc_version_group(version):
    parts = [int(part) for part in version.strip().split(".") if part.isdigit()]
    if len(parts) >= 3 and parts[0] == 1 and parts[1] >= 22:
        return f"{parts[1]}.x"
    if len(parts) >= 2 and parts[0] == 26:
        return "26.x"
    if len(parts) >= 2:
        return f"{parts[0]}.{parts[1]}.x"
    return "26.x"


def _mcarc_versions(query="", channel="all"):
    beta = 0 if channel == "release" else 1 if channel == "testing" else None
    normalized_query = query.strip().lower()
    raw_items = []
    if re.fullmatch(r"\d+(?:\.\d+){1,3}", normalized_query):
        raw_items = _mcarc_group_versions(_mcarc_version_group(normalized_query), beta)
    else:
        results = {}
        successful_groups = 0
        with ThreadPoolExecutor(max_workers=6) as pool:
            futures = {
                pool.submit(_mcarc_group_versions, group, beta): group
                for group in MCARC_MAJOR_GROUPS
            }
            for future in as_completed(futures):
                try:
                    results[futures[future]] = future.result()
                    successful_groups += 1
                except Exception:
                    results[futures[future]] = []
        if not successful_groups:
            raise CatalogError("MCARC 版本接口暂时不可用")
        for group in MCARC_MAJOR_GROUPS:
            raw_items.extend(results.get(group, []))
    versions = []
    seen = set()
    for item in raw_items:
        if not isinstance(item, dict):
            continue
        version = _mcarc_version(item)
        if not version["id"] or version["id"] in seen:
            continue
        if normalized_query and normalized_query not in version["id"].lower() and normalized_query not in version["store_version"].lower():
            continue
        if channel != "all" and version["channel"] != channel:
            continue
        seen.add(version["id"])
        versions.append(version)

    def version_key(version):
        numeric = tuple(
            int(part) if part.isdigit() else 0
            for part in re.split(r"[._-]", version.get("id", ""))[:6]
        )
        return (numeric, version.get("release_time", ""))

    versions.sort(key=version_key, reverse=True)
    return versions, {
        "source": "MC版本库 · MCARC",
        "source_url": MCARC_SITE,
        "asset_type": "APK",
        "providers": sorted({download["provider"] for version in versions for download in version["downloads"]}),
    }


def minecraft_catalog(edition="java", platform="windows", channel="all", query="", build="", page=1, page_size=20):
    edition = (edition or "java").lower()
    platform = (platform or "windows").lower()
    if edition not in {"java", "bedrock"}:
        raise CatalogError("不支持的游戏版本类型")
    if edition == "bedrock" and platform not in {"windows", "android"}:
        raise CatalogError("不支持的基岩版平台")
    if edition == "bedrock" and platform == "android":
        page = max(1, int(page))
        page_size = min(50, max(1, int(page_size)))
        channel = (channel or "all").lower()
        versions, metadata = _mcarc_versions(query or "", channel)
        total = len(versions)
        start = (page - 1) * page_size
        return {
            "edition": edition,
            "platform": platform,
            "channel": channel,
            "query": query,
            "build": "",
            "versions": versions[start:start + page_size],
            "pagination": {
                "page": page,
                "page_size": page_size,
                "total": total,
                "pages": max(1, (total + page_size - 1) // page_size),
            },
            "metadata": metadata,
            "source": "MC版本库 · MCARC API",
            "source_url": MCARC_SITE,
            "fetched_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        }
    versions, metadata = _java_versions() if edition == "java" else _bedrock_versions()
    normalized_query = (query or "").strip().lower()
    channel = (channel or "all").lower()
    if normalized_query:
        versions = [
            item for item in versions
            if normalized_query in item.get("id", "").lower()
            or normalized_query in item.get("type", "").lower()
        ]
    if channel != "all":
        allowed = {"testing"} if channel == "testing" else {channel}
        if channel == "snapshot":
            allowed = {"snapshot"}
        versions = [item for item in versions if item.get("channel") in allowed]
    if edition == "bedrock" and build:
        versions = [
            item for item in versions
            if item.get("build_type", "").lower() == build.lower()
        ]
    page = max(1, int(page))
    page_size = min(50, max(1, int(page_size)))
    total = len(versions)
    start = (page - 1) * page_size
    return {
        "edition": edition,
        "platform": platform if edition == "bedrock" else "desktop",
        "channel": channel,
        "query": query,
        "build": build,
        "versions": versions[start:start + page_size],
        "pagination": {
            "page": page,
            "page_size": page_size,
            "total": total,
            "pages": max(1, (total + page_size - 1) // page_size),
        },
        "metadata": metadata,
        "source": "Mojang Piston" if edition == "java" else "MCAPPX data.mcappx.com/v2",
        "source_url": MOJANG_MANIFEST if edition == "java" else "https://data.mcappx.com/v2/bedrock.json",
        "fetched_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
    }


def _java_detail(version_id):
    versions, metadata = _java_versions()
    item = next((entry for entry in versions if entry["id"].lower() == version_id.lower()), None)
    if not item:
        return None
    manifest_url = item.get("manifest", "")
    if not manifest_url.startswith("https://piston-meta.mojang.com/"):
        raise CatalogError("Java 版本清单地址无效")
    manifest = _fetch_json(
        manifest_url,
        "minecraft-java-" + version_id,
        max_age=86400,
    )
    downloads = []
    for name, artifact in (manifest.get("downloads") or {}).items():
        if not isinstance(artifact, dict) or not artifact.get("url"):
            continue
        downloads.append(
            {
                "name": name,
                "url": artifact.get("url"),
                "size": artifact.get("size"),
                "sha1": artifact.get("sha1", ""),
            }
        )
    return {
        **item,
        "release_time": manifest.get("releaseTime") or item.get("release_time"),
        "java_version": manifest.get("javaVersion", {}),
        "downloads": downloads,
        "latest": metadata,
        "source": "Mojang Piston",
    }


def _bedrock_detail(version_id):
    data = _fetch_json(MCAPPX_BEDROCK, "minecraft-bedrock-mcappx")
    item = data.get("From_mcappx.com", {}).get(version_id)
    if not isinstance(item, dict):
        return None
    raw_type = str(item.get("Type", ""))
    variations = []
    for variation in item.get("Variations", []):
        if not isinstance(variation, dict):
            continue
        links = []
        seen = set()
        for index, value in enumerate(variation.get("MetaData") or []):
            value = str(value).strip()
            if not value or value in seen:
                continue
            seen.add(value)
            if value.startswith(("https://", "http://")):
                links.append({"kind": "file", "url": value, "label": "Xbox CDN"})
            elif re.fullmatch(
                r"[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}",
                value,
                re.I,
            ):
                links.append({"kind": "store-id", "url": "", "label": value})
        variations.append(
            {
                "architecture": variation.get("Arch", ""),
                "archival_status": variation.get("ArchivalStatus", 0),
                "os_build": variation.get("OSbuild", ""),
                "md5": variation.get("MD5", ""),
                "links": links,
            }
        )
    major_parts = version_id.split(".")
    major = ".".join(major_parts[:2]) if len(major_parts) > 1 else version_id
    return {
        "id": version_id,
        "edition": "bedrock",
        "channel": "release" if raw_type.lower() == "release" else "testing",
        "channel_label": "正式版" if raw_type.lower() == "release" else "测试版",
        "type": raw_type,
        "build_type": item.get("BuildType", ""),
        "store_version": item.get("ID", ""),
        "release_time": item.get("Date", ""),
        "architectures": sorted(
            variation["architecture"] for variation in variations if variation["architecture"]
        ),
        "variations": variations,
        "page_url": f"https://www.mcappx.com/bedrock/{major}/{version_id}/",
        "source": "MCAPPX",
        "source_url": "https://data.mcappx.com/v2/bedrock.json",
    }


def _android_detail(version_id):
    if not re.fullmatch(r"\d+(?:\.\d+){2,4}", version_id):
        return None
    items = _mcarc_group_versions(_mcarc_version_group(version_id))
    item = next(
        (
            entry
            for entry in items
            if isinstance(entry, dict)
            and str(entry.get("version_all", "")).lower() == version_id.lower()
        ),
        None,
    )
    if not item:
        return None
    return _mcarc_version(item)


def minecraft_version(edition, version_id, platform="windows"):
    edition = (edition or "java").lower()
    platform = (platform or "windows").lower()
    version_id = (version_id or "").strip()
    if not version_id:
        raise CatalogError("缺少版本号")
    if edition == "bedrock" and platform == "android":
        data = _android_detail(version_id)
    else:
        data = _java_detail(version_id) if edition == "java" else _bedrock_detail(version_id)
    if not data:
        raise CatalogError("没有找到该游戏版本")
    return data


def mirror_catalog():
    return MIRROR_DATA


def _find_mirror_item(mirror_id, system_id, version_id, architecture_id):
    mirror = next(
        (item for item in MIRROR_DATA["mirrors"] if item["id"] == mirror_id),
        None,
    )
    system = next(
        (item for item in MIRROR_DATA["systems"] if item["id"] == system_id),
        None,
    )
    if not mirror or not system:
        raise CatalogError("镜像站或操作系统无效")
    version = next(
        (item for item in system["versions"] if item["id"] == version_id),
        None,
    )
    architecture = next(
        (item for item in system["architectures"] if item["id"] == architecture_id),
        None,
    )
    if not version or not architecture:
        raise CatalogError("系统版本或架构无效")
    path = system["path"].format(
        version=quote(version["id"], safe=""),
        codename=quote(version.get("codename", version["id"]), safe=""),
        arch=quote(architecture["token"], safe=""),
    )
    return mirror, system, version, architecture, mirror["base"].rstrip("/") + "/" + path


def mirror_probe(mirror_id, system_id, version_id, architecture_id):
    mirror, system, version, architecture, url = _find_mirror_item(
        mirror_id,
        system_id,
        version_id,
        architecture_id,
    )
    started = time.monotonic()
    status = None
    error_message = ""
    for method, extra_headers in (
        ("HEAD", {}),
        ("GET", {"Range": "bytes=0-0"}),
    ):
        try:
            request = urllib_request.Request(
                url,
                method=method,
                headers={
                    "Accept": "text/html,application/xhtml+xml,application/octet-stream;q=0.8,*/*;q=0.5",
                    "User-Agent": "StarIsleBlog/3.2 mirror-check",
                    **extra_headers,
                },
            )
            with urllib_request.urlopen(request, timeout=10) as response:
                status = response.status
            break
        except HTTPError as error:
            status = error.code
            if error.code not in {403, 405}:
                break
        except (OSError, URLError) as error:
            error_message = str(error)
    elapsed = round((time.monotonic() - started) * 1000)
    if status is None:
        return {
            "ok": False,
            "status": 0,
            "latency_ms": elapsed,
            "url": url,
            "error": error_message or "连接失败",
        }
    return {
        "ok": 200 <= status < 400,
        "status": status,
        "latency_ms": elapsed,
        "url": url,
        "mirror": mirror["name"],
        "system": system["name"],
        "version": version["name"],
        "architecture": architecture["name"],
    }
