"""Kleiner Entwicklungsserver fuer die Strafenkasse.

Der eingebaute http.server schickt keine Cache-Anweisung. Browser raten dann
selbst, wie lange eine Datei frisch ist - und Safari haelt auf dem iPhone hart
an der alten Fassung fest, was beim Testen wie "die Aenderung wirkt nicht"
aussieht. Dieser Server sagt ausdruecklich: nichts aufheben.

    python serve.py [port]

Fuer den Betrieb auf GitHub Pages ist er nicht gedacht - dort uebernimmt der
Service Worker die Versionierung.
"""

import os
import sys
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path


class OhneCache(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, must-revalidate')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()


def main() -> None:
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8778
    ordner = Path(__file__).resolve().parent
    os.chdir(ordner)
    handler = partial(OhneCache, directory=str(ordner))
    with ThreadingHTTPServer(('0.0.0.0', port), handler) as server:
        print(f'Strafenkasse laeuft auf http://0.0.0.0:{port} (Ordner: {ordner})')
        try:
            server.serve_forever()
        except KeyboardInterrupt:
            print('\nbeendet')


if __name__ == '__main__':
    main()
