import base64, io, json, os, sys
from reportlab.lib.colors import HexColor
from reportlab.lib.utils import ImageReader
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas

payload = json.load(sys.stdin)
out = payload['output']
os.makedirs(os.path.dirname(out), exist_ok=True)
book = canvas.Canvas(out, pagesize=(576, 576))
book.setTitle(payload.get('title', 'PrinTale parent proof'))
navy, cream, coral = HexColor('#173452'), HexColor('#fffaf0'), HexColor('#f27c6e')
pdfmetrics.registerFont(TTFont('StorySparkText', r'C:\Windows\Fonts\arial.ttf'))
pdfmetrics.registerFont(TTFont('StorySparkBold', r'C:\Windows\Fonts\arialbd.ttf'))

def clean(text):
    return str(text or '').replace('\u2018', "'").replace('\u2019', "'").replace('\u201c', '"').replace('\u201d', '"').replace('\u2014', '-').replace('\u2013', '-')

def lines(text, font, size, width):
    words, current, output = clean(text).split(), '', []
    for word in words:
        candidate = (current + ' ' + word).strip()
        if current and book.stringWidth(candidate, font, size) > width:
            output.append(current); current = word
        else: current = candidate
    if current: output.append(current)
    return output

def image(data):
    if not data or not data.startswith('data:image/'): return None
    try: return ImageReader(io.BytesIO(base64.b64decode(data.split(',', 1)[1])))
    except Exception: return None

def cover(page, heading, copy='', art=''):
    book.setFillColor(cream); book.rect(0, 0, 576, 576, fill=1, stroke=0)
    pic = image(art)
    if pic:
        book.drawImage(pic, 0, 150, 576, 426, preserveAspectRatio=True, anchor='c', mask='auto')
    book.setFillColor(navy); book.setFont('StorySparkBold', 8); book.drawString(36, 542, clean(page))
    if not pic:
        # Story pages use centered, generous type so the parent proof remains
        # easy to read and never looks like an unfinished blank page.
        heading_lines = lines(heading, 'StorySparkBold', 23, 470)[:2]
        copy_lines = lines(copy, 'StorySparkText', 16, 470)
        if len(copy_lines) < 5: copy_lines += [''] * (5 - len(copy_lines))
        block_height = len(heading_lines) * 29 + 18 + len(copy_lines) * 23
        y = (576 + block_height) / 2
        book.setFont('StorySparkBold', 23)
        for line in heading_lines: book.drawString(53, y, line); y -= 29
        y -= 18; book.setFont('StorySparkText', 16)
        for line in copy_lines: book.drawString(53, y, line); y -= 23
    else:
        heading_lines = lines(heading, 'StorySparkBold', 25, 500)[:2]
        y = 108 + (len(heading_lines) - 1) * 29
        book.setFont('StorySparkBold', 25)
        for line in heading_lines: book.drawString(36, y, line); y -= 29
        book.setFont('StorySparkText', 12)
        for line in lines(copy, 'StorySparkText', 12, 500)[:3]: book.drawString(36, y - 10, line); y -= 16
    book.setFillColor(coral); book.setFont('StorySparkBold', 8); book.drawRightString(540, 28, 'LOW-RES PARENT PROOF - NOT FOR PRINT')
    book.showPage()

def art_page(art):
    # Artwork pages stay clean: the story appears only on the facing text page.
    book.setFillColor(cream); book.rect(0, 0, 576, 576, fill=1, stroke=0)
    pic = image(art)
    if pic: book.drawImage(pic, 0, 0, 576, 576, preserveAspectRatio=True, anchor='c', mask='auto')
    book.showPage()

title = payload.get('title', 'A PrinTale adventure')
hero = payload.get('hero', 'Your hero')
story = payload.get('story', '')
scenes = payload.get('scenes') or []
sentences = [s.strip() for s in story.replace('\n', ' ').split('.') if s.strip()] or [story]
chunks = ['. '.join(sentences[max(0, i*len(sentences)//5):max(1, (i+1)*len(sentences)//5)]) + '.' for i in range(5)]
cover('01 · COVER', title, 'Starring ' + hero, scenes[0] if scenes else '')
# Page 2 opens the first spread. The following four spreads always put the
# picture on the left/even-odd facing page and the continuation on the right.
cover('02 · CHAPTER ONE', title, chunks[0], '')
for n in range(4):
    art_page(scenes[n + 1] if len(scenes) > n + 1 else '')
    cover(f'{n * 2 + 4:02d} · THE ADVENTURE', title, chunks[n + 1], '')
art_page(payload.get('coloring', ''))
cover('12 · BACK COVER', 'The end - and the next adventure', 'A PrinTale keepsake for ' + hero, scenes[5] if len(scenes)>5 else '')
book.save()
