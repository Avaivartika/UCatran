"""Safe Moodle presentation data and course/section library organization."""
import base64
import hashlib
import re
import time
import json
from pathlib import Path
from urllib.parse import urljoin, urlparse, urlunparse, parse_qsl, urlencode
from bs4 import BeautifulSoup, NavigableString, Comment


def public_url(value, base):
    url = urlparse(urljoin(base + '/', str(value or '')))
    if url.scheme not in ('https', 'http') or url.username or url.password:
        return ''
    return urlunparse(url._replace(query=urlencode([(k, v) for k, v in parse_qsl(url.query) if k.lower() not in ('token', 'wstoken')])) )


def rich_content(html, base):
    """Return a small DOM description. Never pass scripts, styles or HTML to the UI."""
    soup = BeautifulSoup(str(html or '')[:150000], 'html.parser')
    for bad in soup(['script', 'style', 'iframe', 'object', 'embed', 'form', 'input', 'button', 'svg']):
        bad.decompose()
    allowed = {'p', 'div', 'span', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'strong', 'b', 'em', 'i', 'u', 'blockquote', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 'br', 'hr', 'a', 'img'}
    budget = [1500]
    def visit(node, depth=0):
        if budget[0] <= 0 or depth > 24 or isinstance(node, Comment): return []
        budget[0] -= 1
        if isinstance(node, NavigableString): return [{'text': str(node)}]
        children = [item for child in node.children for item in visit(child, depth + 1)]
        tag = node.name
        if tag not in allowed: return children
        result = {'tag': tag, 'children': children}
        if tag == 'a': result['url'] = public_url(node.get('href', ''), base) if node.get('href') else ''
        if tag == 'img':
            result['url'] = public_url(node.get('src', ''), base) if node.get('src') and '@@PLUGINFILE@@' not in node.get('src', '') else ''
            result['alt'] = str(node.get('alt') or '课程图片')[:200]
        if tag in ('th', 'td'):
            for attr in ('colspan', 'rowspan'):
                if str(node.get(attr, '')).isdigit(): result[attr] = min(20, int(node[attr]))
        return [result]
    return [item for child in soup.children for item in visit(child)]


def course_image_url(course, base):
    for file in course.get('overviewfiles', []):
        if file.get('isimage') or str(file.get('mimetype', '')).startswith('image/'):
            return public_url(file.get('fileurl'), base)
    return public_url(course.get('courseimage'), base) if course.get('courseimage') else ''


def image_data(moodle, url):
    """Cache authenticated raster images outside the document library."""
    url = public_url(url, moodle.settings.base_url)
    parsed, origin = urlparse(url), urlparse(moodle.settings.base_url)
    if parsed.scheme != 'https' or parsed.netloc != origin.netloc or not parsed.path.startswith(('/pluginfile.php/', '/webservice/pluginfile.php/')):
        raise ValueError('课程图片必须来自当前 Moodle 站点')
    folder = moodle.settings.home / 'course-images'
    folder.mkdir(parents=True, exist_ok=True)
    target = folder / (hashlib.sha256(url.encode()).hexdigest() + '.image')
    if target.exists() and time.time() - target.stat().st_mtime > 86400:
        target.unlink()
    if not target.exists(): moodle.download(url, target, max_bytes=5 * 1024 * 1024)
    raw = target.read_bytes()
    mime = 'image/png' if raw.startswith(b'\x89PNG\r\n\x1a\n') else 'image/jpeg' if raw.startswith(b'\xff\xd8\xff') else 'image/gif' if raw.startswith((b'GIF87a', b'GIF89a')) else 'image/webp' if raw.startswith(b'RIFF') and raw[8:12] == b'WEBP' else ''
    if not mime:
        target.unlink(missing_ok=True)
        raise ValueError('课程图片格式不受支持')
    return {'data': 'data:' + mime + ';base64,' + base64.b64encode(raw).decode()}


def safe_component(value, maximum=64):
    name = re.sub(r'[<>:"/\\|?*\x00-\x1f]', '_', str(value)).strip(' .')[:maximum].rstrip(' .')
    if not name or name in ('.', '..'): name = '未命名'
    if name.split('.')[0].upper() in {'CON', 'PRN', 'AUX', 'NUL', *('COM'+str(i) for i in range(1,10)), *('LPT'+str(i) for i in range(1,10))}: name = '_' + name
    return name


def course_folder(root, course):
    return Path(root) / 'Moodle' / safe_component(str(course['id']) + ' · ' + course['fullname'])


def destination(root, course, section, filename, module=None):
    root = Path(root).resolve()
    folder = course_folder(root, course) / safe_component(str(section.get('section', section.get('id', 0))).zfill(2) + ' · ' + str(section.get('name') or '课程资料'), 40)
    if module: folder /= safe_component(str(module['id']) + ' · ' + str(module.get('name') or '资料'), 32)
    folder = folder.resolve()
    if not folder.is_relative_to(root): raise ValueError('资料目录超出资料库')
    name = safe_component(filename, 1024)
    # Leave headroom for Windows' legacy MAX_PATH and the atomic .partial suffix.
    available = min(140, max(24, 235 - len(str(folder))))
    if len(name) > available:
        suffix = Path(name).suffix[:15]
        digest = hashlib.sha256(str(filename).encode()).hexdigest()[:8]
        name = name[:max(1, available-len(suffix)-9)].rstrip(' .') + '-' + digest + suffix
    return folder / name


def locate_resource(moodle, course_id, module_id, url):
    course = moodle.find_course(str(course_id))
    for section in moodle.course_contents(course['id']):
        for module in section.get('modules', []):
            if str(module.get('id')) != str(module_id): continue
            for file in module.get('contents', []):
                if file.get('type') == 'file' and public_url(file.get('fileurl'), moodle.settings.base_url) == public_url(url, moodle.settings.base_url):
                    return course, section, module, file
    raise ValueError('该资料不属于所选课程活动，请刷新课程后重试')


def download_resource(moodle, args):
    course, section, module, file = locate_resource(moodle, args['courseId'], args['moduleId'], args['url'])
    root = moodle.settings.download_dir.resolve()
    dest = destination(root, course, section, file.get('filename') or 'file', module)
    manifest = moodle.settings.home / 'download-records.json'
    try: records = json.loads(manifest.read_text(encoding='utf8'))
    except (OSError, ValueError): records = {}
    url = public_url(file['fileurl'], moodle.settings.base_url)
    version = hashlib.sha256((url + ':' + str(file.get('timemodified') or file.get('filesize') or '')).encode()).hexdigest()
    key = str(dest.relative_to(root))
    if dest.exists() and records.get(key, {}).get('version') != version:
        dest = dest.with_name(dest.stem[:100] + '-' + version[:8] + dest.suffix)
        key = str(dest.relative_to(root))
    if dest.exists():
        if records.get(key, {}).get('version') == version:
            return {'path':str(dest),'exists':True,'course':course['fullname'],'section':section['name']}
        raise ValueError('本地存在同名文件，已保留原文件，请在资料库核对后重试')
    dest.parent.mkdir(parents=True, exist_ok=True)
    size = moodle.download(url, dest)
    records[key] = {'version':version,'name':file.get('filename') or dest.name,'course':course['fullname'],'section':section['name'],'activity':module.get('name',''),'sourceFolder':file.get('filepath','/'),'downloadedAt':time.time()}
    temp = manifest.with_suffix('.tmp')
    temp.write_text(json.dumps(records, ensure_ascii=False), encoding='utf8');temp.replace(manifest)
    return {'path':str(dest),'bytes':size,'course':course['fullname'],'section':section['name']}


def organize_downloads(moodle):
    """Move only legacy loose Moodle downloads whose course can be identified uniquely."""
    root = moodle.settings.download_dir.resolve()
    legacy = root / 'Moodle'
    loose = [p for p in legacy.glob('*') if p.is_file() and not p.is_symlink() and not p.name.endswith('.partial')]
    if not loose: return {'moved': 0, 'unmatched': 0, 'ambiguous': 0, 'failed': 0}
    candidates, failed = {}, 0
    for course in moodle.courses():
        try: sections = moodle.course_contents(course['id'])
        except Exception:
            # Unknown courses may contain colliding filenames. Do not guess.
            return {'moved': 0, 'unmatched': len(loose), 'ambiguous': 0, 'failed': 1}
        for section in sections:
            for module in section.get('modules', []):
                for file in module.get('contents', []):
                    if file.get('type') != 'file': continue
                    name = re.sub(r'[^\w.\- ()\u4e00-\u9fff]', '_', str(file.get('filename', 'file')))[:160]
                    url = file.get('fileurl', '')
                    hashed = Path(name).stem + '-' + hashlib.sha256(url.encode()).hexdigest()[:8] + Path(name).suffix
                    for old_name in (name, hashed):
                        candidates.setdefault(old_name, {})[(course['id'], section['id'], url)] = (course, section, file)
    moved = unmatched = ambiguous = 0
    for source in loose:
        matches = list(candidates.get(source.name, {}).values())
        if not matches: unmatched += 1; continue
        if len(matches) != 1: ambiguous += 1; continue
        course, section, file = matches[0]
        dest = destination(root, course, section, file.get('filename') or source.name)
        # Check resolved source and destination immediately before the Windows move.
        if not source.resolve().is_relative_to(root) or not dest.resolve().is_relative_to(root): failed += 1; continue
        if dest.exists():
            dest = dest.with_name(dest.stem + '-已有下载-' + hashlib.sha256(str(source).encode()).hexdigest()[:6] + dest.suffix)
        if dest.exists(): failed += 1; continue
        try:
            dest.parent.mkdir(parents=True, exist_ok=True)
            source.rename(dest)
            moved += 1
        except OSError: failed += 1
    return {'moved': moved, 'unmatched': unmatched, 'ambiguous': ambiguous, 'failed': failed}
