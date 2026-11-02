"""Black people from every source side by side, same studio, for the owner's review (owner, 2026-11-02: "find more real
Black assets; consider the most realistic Black faces drafted in this project's history, select the best and restore them
alongside the Rocketbox models and the newly found external assets; Black people only").
One sheet per sex; each source a band, each person their front and three-quarter renders:
  1. Rocketbox's own Black people as shipped (every distinct face the library has);
  2. the best of this project's earlier drafts (chosen by eye; tiles cut from the sheets they were judged on);
  3. external: VALID's Black people (Google/UCF, MIT) and Ava-256's Black people (Meta, CC BY-NC 4.0: real people
     captured in a dome; shown as captured, a face without eyeballs, hair or the back of the head).
Usage: python3 qa_black_sources.py <spec json> <out dir>
  spec: {"women": [[band title, [[label, front png, three png], ...]], ...], "men": [...]}"""
import json, os, sys
from PIL import Image, ImageDraw, ImageFont

FONT = ImageFont.load_default()
W, H = 150, 188
CROP = (42, 15, 342, 390)       # studio renders at 75 % (384 x 480): the head and shoulders


def tile(p):
    if not p or not os.path.exists(p): return Image.new('RGB', (W, H), (90, 90, 90))
    im = Image.open(p).convert('RGB')
    if im.size == (W, H): return im                                  # already a tile (cut from an earlier sheet)
    sx = im.width / 384.0
    return im.crop(tuple(int(v * sx) for v in CROP)).resize((W, H))


def sheet(bands, title, out):
    cols = 5                                                         # people a row, two tiles each
    rows = sum(1 + (len(p) + cols - 1) // cols for _, p in bands)
    s = Image.new('RGB', (cols * 2 * W, 26 + rows * (H + 16)), (236, 234, 230)); g = ImageDraw.Draw(s)
    g.text((6, 6), title, fill=(20, 20, 20), font=FONT)
    y = 26
    for band, people in bands:
        g.rectangle((0, y, cols * 2 * W, y + H + 15), fill=(214, 210, 200)); g.text((8, y + 6), band, fill=(10, 10, 10), font=FONT)
        y += 22
        for k, (label, front, three) in enumerate(people):
            if k and k % cols == 0: y += H + 16
            x = (k % cols) * 2 * W
            s.paste(tile(front), (x, y + 14)); s.paste(tile(three), (x + W, y + 14))
            g.rectangle((x, y, x + 2 * W - 1, y + 13), fill=(250, 250, 248)); g.text((x + 3, y + 1), label[:48], fill=(20, 20, 20), font=FONT)
        y += H + 16
    s = s.crop((0, 0, s.width, y)); s.save(out, quality=88); print('wrote', out, s.size)


if __name__ == '__main__':
    spec = json.load(open(sys.argv[1])); os.makedirs(sys.argv[2], exist_ok=True)
    for sex in ('women', 'men'):
        sheet(spec[sex], f'Black {sex} from every source, same studio: (1) Rocketbox as shipped; (2) the best earlier drafts; (3) external sources. Front | three-quarters.',
              os.path.join(sys.argv[2], f'qa_black_sources_{sex}.jpg'))
