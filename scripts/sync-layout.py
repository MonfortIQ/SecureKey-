"""Bake shared HTML fragments into standalone template pages. No runtime required."""
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parent.parent
contact = (ROOT / 'contact.html').read_text(encoding='utf-8')
icons = re.search(r'<svg\b[^>]*class="icon-library".*?</svg>', contact, re.S).group(0)
if 'id="icon-chevron"' not in icons:
    icons = icons.replace('</svg>', '<symbol id="icon-chevron" viewBox="0 0 24 24"><path d="m6 9 6 6 6-6"/></symbol></svg>')
header = (ROOT / 'partials/header.html').read_text(encoding='utf-8')
footer = (ROOT / 'partials/footer.html').read_text(encoding='utf-8')

for p in ROOT.glob('*.html'):
    s = p.read_text(encoding='utf-8')
    current = p.name
    page_header = header
    nav_current = 'services.html' if current.startswith('service-') else 'blog.html' if current.startswith('blog-details-') else current
    page_header = page_header.replace(f'<a href="{nav_current}">', f'<a href="{nav_current}" class="current" aria-current="page">')
    if current in ['index.html', 'index-2.html']:
        page_header = page_header.replace('class="home-menu-toggle"', 'class="home-menu-toggle current"')
    # Preserve body-level classes used by utility and authentication pages.
    body = re.search(r'<body([^>]*)>', s).group(0)
    if 'site-page' not in body:
        if 'class="' in body: body = body.replace('class="', 'class="site-page ', 1)
        else: body = body.replace('<body', '<body class="site-page"', 1)
    s = re.sub(r'<body[^>]*>.*?(?=<main\b)', body + '\n' + icons + '\n' + page_header + '\n  ', s, count=1, flags=re.S)
    s = re.sub(r'<main(?![^>]*\bid=)', '<main id="main-content"', s, count=1)
    s = re.sub(r'<footer\b.*?</footer>', footer, s, count=1, flags=re.S)
    # All sticky actions come from the shared footer.
    s = re.sub(r'<div class="mobile-sticky-bar"[^>]*>.*?</div>', '', s, flags=re.S)
    mobile_bars = list(re.finditer(r'<div class="contact-mobile-bar">.*?</div>', s, flags=re.S))
    for match in reversed(mobile_bars[1:]): s = s[:match.start()] + s[match.end():]
    s = re.sub(r'\s*<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons[^\"]+">', '', s)
    if 'assets/css/site-shell.css' not in s:
        s = s.replace('</head>', '  <link rel="stylesheet" href="assets/css/site-shell.css">\n</head>')
    if 'assets/icons/favicon.svg' not in s:
        s = s.replace('</head>', '  <link rel="icon" type="image/svg+xml" href="assets/icons/favicon.svg">\n</head>')
    for filename in ['bootstrap.bundle.min.js', 'theme.js', 'rtl.js', 'validation.js', 'main.js']:
        if f'src="assets/js/{filename}"' not in s:
            s = s.replace('</body>', f'  <script src="assets/js/{filename}"></script>\n</body>')
    s = s.replace('href="404.html" class="text-muted">Privacy Policy', 'href="privacy.html" class="text-muted">Privacy Policy')
    s = s.replace('href="404.html" class="text-muted">Terms', 'href="terms.html" class="text-muted">Terms')
    s = s.replace('href="404.html" class="text-primary text-decoration-none">Terms of Service', 'href="terms.html" class="text-primary text-decoration-none">Terms of Service')
    s = s.replace('href="404.html" class="text-primary text-decoration-none">Privacy Policy', 'href="privacy.html" class="text-primary text-decoration-none">Privacy Policy')
    p.write_text(s, encoding='utf-8')
print('Updated shared navigation, footer, and local styles on every HTML page.')
