"""Serve the puzzle leaderboard behind the site's reverse proxy."""
import json
import os
import sqlite3
import uuid
from contextlib import closing
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

DATABASE = Path(os.environ.get("SCORES_DB", Path.home() / ".local/share/casse-tete/scores.db"))
INITIAL = [0, 12, 14, 24, 26, 30, 32]


def cells(piece, position):
    x, y = position % 6, position // 6
    return {(x + i, y + j) for i in range(2) for j in range(2 if piece < 3 else 1)}


FLOOR = {(x, y) for x in range(6) for y in range(8)
         if (x < 2 and y < 6) or y == 2 or (2 <= x < 4 and y >= 2)}


def checked_score(data):
    if not isinstance(data, dict):
        raise ValueError()
    name, seconds, moves = data.get("name"), data.get("seconds"), data.get("moves")
    if not isinstance(name, str) or not 1 <= len(name.strip()) <= 24 or not name.isprintable():
        raise ValueError()
    if type(seconds) is not int or not 0 <= seconds <= 315360000:
        raise ValueError()
    if not isinstance(moves, list) or not 1 <= len(moves) <= 10000:
        raise ValueError()
    run = str(uuid.UUID(str(data.get("run"))))
    state = INITIAL.copy()
    for move in moves:
        if not isinstance(move, list) or len(move) != 2 or any(type(n) is not int for n in move):
            raise ValueError()
        piece, end = move
        if state[0] == 38 or not 0 <= piece < len(state) or not 0 <= end < 48:
            raise ValueError()
        start = state[piece]
        dx, dy = end % 6 - start % 6, end // 6 - start // 6
        if bool(dx) == bool(dy):
            raise ValueError()
        step = (1 if dx > 0 else -1) if dx else (6 if dy > 0 else -6)
        occupied = set().union(*(cells(i, pos) for i, pos in enumerate(state) if i != piece))
        for pos in range(start + step, end + step, step):
            if not cells(piece, pos) <= FLOOR - occupied:
                raise ValueError()
        state[piece] = end
    if state[0] != 38:
        raise ValueError()
    return run, name.strip(), len(moves), seconds


class Scores(BaseHTTPRequestHandler):
    def reply(self, status, data):
        body = json.dumps(data).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def handle_scores(self, submit):
        if self.path != "/casse-tete/api/scores":
            return self.reply(404, {})
        try:
            with closing(sqlite3.connect(DATABASE)) as db, db:
                if submit:
                    size = int(self.headers.get("Content-Length", 0))
                    if self.headers.get_content_type() != "application/json" or not 0 < size <= 150000:
                        return self.reply(400, {})
                    score = checked_score(json.loads(self.rfile.read(size)))
                    db.execute("INSERT INTO scores VALUES (?, ?, ?, ?) ON CONFLICT(run) DO NOTHING", score)
                db.row_factory = sqlite3.Row
                rows = db.execute("SELECT name, moves, seconds FROM scores ORDER BY moves, seconds, rowid LIMIT 10")
                result = [dict(row) for row in rows]
        except (ValueError, RecursionError):
            return self.reply(400, {})
        except sqlite3.Error:
            return self.reply(503, {})
        self.reply(200, result)

    def do_GET(self):
        self.handle_scores(False)

    def do_POST(self):
        self.handle_scores(True)


if __name__ == "__main__":
    DATABASE.parent.mkdir(mode=0o700, parents=True, exist_ok=True)
    with closing(sqlite3.connect(DATABASE)) as db:
        db.execute("CREATE TABLE IF NOT EXISTS scores (run TEXT PRIMARY KEY, name TEXT NOT NULL, moves INTEGER NOT NULL, seconds INTEGER NOT NULL)")
        db.execute("CREATE INDEX IF NOT EXISTS ranking ON scores(moves, seconds)")
    ThreadingHTTPServer(("127.0.0.1", int(os.environ.get("SCORES_PORT", 18766))), Scores).serve_forever()
