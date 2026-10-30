"""Reference boards (the plausibility gate, docs/PEOPLE_REALISM.md §3.3): each person's portrait beside four real faces
of their sex, ancestry and age band (FairFace, Kärkkäinen and Joo 2021, CC BY 4.0: the faces nearest their group's median
proportions, fairface_stats.json), with the gate's verdict under them. The owner judges people from these sheets.
Usage: python3 board.py <unity/test-results> <FairFace validation.parquet> <out.jpg> [id,id,...]"""
import io, json, os, sys
from PIL import Image, ImageDraw

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from gate import FAIRFACE, band


def main(results, parquet, out, ids=None):
    import pyarrow.parquet as pq
    F = json.load(open(os.path.join(HERE, 'fairface_stats.json')))
    G = {p['id']: p for p in json.load(open(os.path.join(results, 'people_gate.json')))['people']}
    who = [G[i] for i in ids if i in G] if ids else [p for p in G.values() if p['source'].startswith('shale')]
    rows = {}
    used = {}
    for p in who:
        race = FAIRFACE.get(p['heritage'], 'white')
        key = f"{race}/{p['sex']}/{band(p['age'])}"
        g = F['groups'].get(key)
        if not g or g['n'] < 25: key = f"{race}/{p['sex']}/all"; g = F['groups'][key]
        # four of the group's neutral faces, different ones for each person of the same group (the real variety)
        k = used.get(key, 0); used[key] = k + 4
        b = g['board']
        rows[p['id']] = [b[(k + j) % len(b)] for j in range(4)]
    boxes = F.get('boxes', {})
    ours = {}
    p2 = os.path.join(results, 'people_faces2d.json')
    if os.path.exists(p2): ours = {f['Id']: f.get('box') for f in json.load(open(p2))}

    def face_crop(im, box):
        """A face's box (landmarks) grown to the frame FairFace uses: a third again round the face, 4:5."""
        w, h = im.size
        if not box: return im.crop((int(w * 0.12), int(h * 0.05), int(w * 0.88), int(h * 0.05) + int(w * 0.76 * ch / cw)))
        x0, y0, x1, y1 = box
        cx, cy = (x0 + x1) / 2, (y0 + y1) / 2 - (y1 - y0) * 0.06
        half_w = (x1 - x0) * 0.68
        half_h = half_w * ch / cw
        return im.crop((int(cx - half_w), int(cy - half_h), int(cx + half_w), int(cy + half_h)))
    need = sorted({i for b in rows.values() for i in b})
    t = pq.read_table(parquet, columns=['image'])
    imgs = {i: Image.open(io.BytesIO(t.column('image')[i].as_py()['bytes'])).convert('RGB') for i in need}
    cw, ch = 200, 250
    sheet = Image.new('RGB', (cw * 5, (ch + 44) * len(who) + 30), (24, 24, 28))
    d = ImageDraw.Draw(sheet)
    d.text((8, 8), 'Each row: ours (left), then four real people of the same sex, ancestry and age band (FairFace, CC BY 4.0)', fill=(230, 230, 230))
    for r, p in enumerate(who):
        y = 30 + r * (ch + 44)
        # as they look (with their beard), else the bare portrait the landmarks were measured on
        port = os.path.join(results, 'portraits_look', p['id'] + '.png')
        if not os.path.exists(port): port = os.path.join(results, 'portraits', p['id'] + '.png')
        if os.path.exists(port):
            sheet.paste(face_crop(Image.open(port).convert('RGB'), ours.get(p['id'])).resize((cw, ch)), (0, y))
        for k, i in enumerate(rows[p['id']]):
            sheet.paste(face_crop(imgs[i], boxes.get(str(i))).resize((cw, ch)), ((k + 1) * cw, y))
        verdict = 'PASS' if not p['fails'] else 'FAIL: ' + ', '.join(sorted({f[0].split('.')[1] for f in p['fails']}))[:150]
        d.text((6, y + ch + 4), f"{p['name']}  {p['sex']} {p['age']:.0f}  {p['heritage']}", fill=(235, 235, 235))
        d.text((6, y + ch + 20), verdict, fill=(120, 220, 120) if not p['fails'] else (240, 140, 120))
    sheet.save(out, quality=88)
    print('board', out, len(who), 'people')


if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4].split(',') if len(sys.argv) > 4 else None)
