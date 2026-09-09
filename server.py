"""
KYBERA — Python Server
Routes: /, /configurator, /order, /gallery, /admin
"""

from http.server import HTTPServer, SimpleHTTPRequestHandler
import os

PORT = 8000
DIR = os.path.dirname(os.path.abspath(__file__))
os.chdir(DIR)

PAGES = {
    '/': 'pages/landing.html',
    '/configurator': 'pages/configurator.html',
    '/order': 'pages/order.html',
    '/gallery': 'pages/gallery.html',
    '/admin': 'pages/admin.html',
}

class KyberaHandler(SimpleHTTPRequestHandler):
    def do_GET(self):
        path = self.path.split('?')[0]

        if path in PAGES:
            filepath = os.path.join(DIR, PAGES[path])
            if os.path.exists(filepath):
                self.send_response(200)
                self.send_header('Content-Type', 'text/html; charset=utf-8')
                self.end_headers()
                with open(filepath, 'rb') as f:
                    self.wfile.write(f.read())
                return

        super().do_GET()

if __name__ == '__main__':
    print(f'\n  KYBERA Server running at http://localhost:{PORT}\n')
    print(f'  Routes:')
    for route, page in PAGES.items():
        print(f'    http://localhost:{PORT}{route}  ->  {page}')
    print()
    server = HTTPServer(('0.0.0.0', PORT), KyberaHandler)
    server.serve_forever()
