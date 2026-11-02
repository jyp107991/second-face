"""Ava-256 (Meta, 2024; CC BY-NC 4.0; github.com/facebookresearch/ava-256): real people captured in a dome of 80 cameras,
each frame a tracked mesh (7,306 vertices, one topology: assets/face_topology.obj) and the photographed texture unwrapped
onto it (1024 px). For each capture asked for, one frame at rest with the eyes open and looking ahead (by default the first frame
of a spoken sentence; AVA_SEG below) is fetched by byte range from the public archives (no account; disk holds only the members read), its
texture colour-corrected as the authors' renderer does (gains 1.4/1.1/1.6 over 1.1, black 3/255, gamma 2, minus
15/255: multiface/ava-256 gammaCorrect), and written as <out>/<capture>/tex.png and verts.npy (millimetres).
Usage: python3 -I ava_fetch.py <out dir> <capture> [<capture> ...]   (capture: yyyymmdd--hhmm--SID)"""
import csv, io, os, subprocess, sys, zipfile
import numpy as np
from PIL import Image

B = 'https://fb-baas-f32eacb9-8abb-11eb-b2b8-4857dd089e15.s3.amazonaws.com/ava-256/4TB/'


def curl(url, *extra):
    r = subprocess.run(['curl', '-sS', '-f', '-m', '300', *extra, url], capture_output=True)
    if r.returncode: raise RuntimeError(r.stderr.decode()[-200:])
    return r.stdout


def size(url):
    h = curl(url, '-I').decode(errors='ignore')
    return int(next(l.split(':')[1] for l in h.splitlines() if l.lower().startswith('content-length')))


class RemoteZip:
    """A zip read by ranges: the central directory from the tail, each member from its own offset."""
    def __init__(self, url):
        self.url, self.n = url, size(url)
        tail = min(self.n, 3_000_000)
        self.buf = {self.n - tail: curl(url, '-r', f'{self.n - tail}-{self.n - 1}')}
        self.zf = zipfile.ZipFile(self)
        self.pos = 0

    # a minimal file object over the fetched ranges (zipfile seeks and reads)
    def seek(self, off, whence=0):
        self.pos = off if whence == 0 else (self.pos + off if whence == 1 else self.n + off); return self.pos
    def tell(self): return self.pos
    def seekable(self): return True
    def read(self, k=-1):
        if k < 0: k = self.n - self.pos
        for s, b in self.buf.items():
            if s <= self.pos and self.pos + k <= s + len(b):
                out = b[self.pos - s:self.pos - s + k]; self.pos += len(out); return out
        b = curl(self.url, '-r', f'{self.pos}-{min(self.pos + max(k, 65536), self.n) - 1}')
        self.buf[self.pos] = b; out = b[:k]; self.pos += len(out); return out

    def get(self, name):
        info = self.zf.getinfo(name)
        start = info.header_offset; end = min(start + 30 + len(info.filename.encode()) + 4096 + info.compress_size, self.n)
        self.buf[start] = curl(self.url, '-r', f'{start}-{end - 1}')
        return self.zf.read(name)


def gamma_correct(img):
    img = img * np.array([1.4, 1.1, 1.6]) / 1.1
    black, gamma = 3.0 / 255.0, 2.0
    return np.clip(((1.0 / (1 - black)) * 0.95 * np.clip(img - black, 0, 2)) ** (1.0 / gamma) - 15.0 / 255.0, 0, 1)


def ply_vertices(data):
    head, _, body = data.partition(b'end_header\n')
    lines = head.decode().splitlines(); n = int(next(l.split()[-1] for l in lines if l.startswith('element vertex')))
    props = [l.split()[-1] for l in lines if l.startswith('property')]
    if 'binary_little_endian' in head.decode():
        types = [l.split()[1] for l in lines if l.startswith('property')]
        dt = np.dtype([(p, {'float': '<f4', 'double': '<f8'}.get(t, '<f4')) for p, t in zip(props, types)])
        a = np.frombuffer(body[:n * dt.itemsize], dt)
        return np.stack([a['x'], a['y'], a['z']], -1).astype(np.float64)
    a = np.array([[float(x) for x in l.split()[:3]] for l in body.decode().splitlines()[:n]])
    return a


def main(out, captures):
    for cap in captures:
        d = os.path.join(out, cap)
        if os.path.exists(os.path.join(d, 'tex.png')): continue
        os.makedirs(d, exist_ok=True)
        base = B + cap + '/decoder/'
        rows = list(csv.DictReader(io.StringIO(curl(base + 'frame_list.csv').decode())))
        # eyes open, looking ahead, the face at rest. AVA_SEG picks the segment: 'sen' (default: the first frames of the
        # spoken sentences, read from a prompter at eye level, before the mouth moves), 'eye' (EXP_eye_neutral: the gaze
        # drills, often looking up), 'peak' (EXP_neutral_peak, as the dataset's loader: the lids often half down)
        how = os.environ.get('AVA_SEG', 'sen')
        if how == 'sen':
            segs = {}
            for r in rows:
                if r['seg_id'].startswith('SEN_'): segs.setdefault(r['seg_id'], []).append(int(r['frame_id']))
            neut = [sorted(v)[0] for k, v in sorted(segs.items())][:12]
        elif how == 'eye':
            neut = sorted(int(r['frame_id']) for r in rows if r['seg_id'] == 'EXP_eye_neutral'); neut = neut[len(neut) // 4: len(neut) // 2]
        else:
            neut = sorted(int(r['frame_id']) for r in rows if r['seg_id'] == 'EXP_neutral_peak')
        if not neut: print(cap, 'no neutral frame'); continue
        tz = RemoteZip(base + 'uv_image/color.zip'); vz = RemoteZip(base + 'kinematic_tracking/registration_vertices.zip')
        tnames, vnames = set(tz.zf.namelist()), set(vz.zf.namelist())
        order = neut if how == 'sen' else neut[len(neut) // 2:] + neut[:len(neut) // 2]
        f = next((f for f in order if f'color/{f:06d}.avif' in tnames and f'{f:06d}.ply' in vnames), None)
        if f is None: print(cap, 'neutral frames missing from the archives'); continue
        tex = np.asarray(Image.open(io.BytesIO(tz.get(f'color/{f:06d}.avif'))).convert('RGB'), np.float64) / 255.0
        Image.fromarray((gamma_correct(tex) * 255).round().astype(np.uint8)).save(os.path.join(d, 'tex.png'))
        np.save(os.path.join(d, 'verts.npy'), ply_vertices(vz.get(f'{f:06d}.ply')))
        open(os.path.join(d, 'frame.txt'), 'w').write(str(f))
        print(cap, 'frame', f, 'ok')


if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2:])
