import json
import urllib.request
import urllib.error
from typing import Optional
from django.conf import settings


def translate_text(text: str, target: str, source: str = 'auto') -> Optional[str]:
    """
    Translate text to target language using LibreTranslate-compatible API.
    Returns translated text, or None on fatal error.
    """
    if not text:
        return ''
    data = json.dumps({
        'q': text,
        'source': source,
        'target': target,
        **({'api_key': settings.TRANSLATE_API_KEY} if getattr(settings, 'TRANSLATE_API_KEY', '') else {})
    }).encode('utf-8')
    req = urllib.request.Request(
        settings.TRANSLATE_API_URL,
        data=data,
        headers={'Content-Type': 'application/json'}
    )
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            payload = json.loads(resp.read().decode('utf-8'))
            # LibreTranslate returns { "translatedText": "..." }
            return payload.get('translatedText') or payload.get('translated_text')
    except urllib.error.HTTPError as e:
        # Log-able in real app; here we swallow to avoid breaking saves
        return None
    except Exception:
        return None


def ensure_en_zh(text: str) -> dict:
    """Return a dict with 'en' and 'zh' translations for the given text."""
    en = translate_text(text, 'en') or text
    zh = translate_text(text, 'zh') or text
    return {'en': en, 'zh': zh}
