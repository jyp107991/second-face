"""A remote zip read by byte ranges into a sparse local file (disk is only used for the members fetched).
Usage: python3 lazyzip.py open <url> <size> <local>      # fetch the central directory, list members
       python3 lazyzip.py get <url> <local> <member> <out dir> [<member> ...]"""
import os, subprocess, sys, zipfile


def fetch(url, local, start, end):
    r = subprocess.run(['curl', '-sSL', '-r', f'{start}-{end}', url, '-o', local + '.part'], capture_output=True, text=True)
    if r.returncode: raise SystemExit(r.stderr[-300:])
    with open(local, 'r+b') as f:
        f.seek(start); f.write(open(local + '.part', 'rb').read())
    os.remove(local + '.part')


def open_zip(url, size, local):
    if not os.path.exists(local):
        with open(local, 'wb') as f: f.truncate(size)             # sparse
        tail = min(size, 2_000_000)                                # the central directory sits at the end
        fetch(url, local, size - tail, size - 1)
    return zipfile.ZipFile(local)


if __name__ == '__main__':
    cmd = sys.argv[1]
    if cmd == 'open':
        url, size, local = sys.argv[2], int(sys.argv[3]), sys.argv[4]
        zf = open_zip(url, size, local)
        names = zf.namelist(); print(len(names), 'members;', names[:3], '...', names[-1])
        total = sum(i.compress_size for i in zf.infolist()); print('avg member', total // max(len(names), 1))
    else:
        url, local, out = sys.argv[2], sys.argv[3], sys.argv[4]
        members = sys.argv[5:]
        zf = zipfile.ZipFile(local)
        os.makedirs(out, exist_ok=True)
        for m in members:
            info = zf.getinfo(m)
            start = info.header_offset; end = start + 30 + len(info.filename.encode()) + 2048 + info.compress_size + 64
            fetch(url, local, start, min(end, os.path.getsize(local) - 1))
            with zf.open(info) as src, open(os.path.join(out, os.path.basename(m)), 'wb') as dst: dst.write(src.read())
        print('got', len(members))
