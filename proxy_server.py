import http.server
import socketserver
import urllib.request
import urllib.error
import json
import sys
import os

PORT = 3000
TARGET_API_HOST = "https://api.mingdao.com"

class ProxyHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def _proxy_request(self, method):
        # 拦截 /api/mingdao 开头的请求
        if self.path.startswith("/api/mingdao/"):
            # 提取真实路径 (去掉 /api/mingdao)
            real_path = self.path.replace("/api/mingdao", "")
            target_url = f"{TARGET_API_HOST}{real_path}"
            
            content_length = int(self.headers.get('Content-Length', 0))
            post_data = self.rfile.read(content_length) if content_length > 0 else None
            
            # 转发 Headers (过滤掉 Host, Origin 等)
            headers = {}
            for key, value in self.headers.items():
                if key.lower() not in ['host', 'origin', 'referer', 'content-length']:
                    headers[key] = value
            
            # 显式添加 Mingdao 需要的 Header
            headers['Host'] = 'api.mingdao.com'
            headers['Content-Type'] = 'application/json'

            print(f"[Proxy] Method: {method}, URL: {target_url}")
            print(f"[Proxy] Content-Length: {content_length}")
            if post_data:
                print(f"[Proxy] Body Preview: {post_data[:100]}")
            else:
                print(f"[Proxy] WARNING: Body is Empty/None")

            try:
                # 发起请求到明道云
                req = urllib.request.Request(target_url, data=post_data, headers=headers, method=method)
                with urllib.request.urlopen(req) as response:
                    self.send_response(response.status)
                    # 转发响应 Headers
                    for key, value in response.getheaders():
                         # 过滤掉 CORS 相关，我们自己控制
                        if key.lower() not in ['access-control-allow-origin']:
                            self.send_header(key, value)
                    
                    # 允许跨域 (解决本地 CORS)
                    self.send_header('Access-Control-Allow-Origin', '*')
                    self.send_header('Access-Control-Allow-Methods', 'POST, PUT, DELETE, OPTIONS')
                    self.send_header('Access-Control-Allow-Headers', '*')
                    self.end_headers()
                    
                    self.wfile.write(response.read())
                    
            except urllib.error.HTTPError as e:
                self.send_response(e.code)
                self.end_headers()
                self.wfile.write(e.read())
            except Exception as e:
                self.send_response(500)
                self.end_headers()
                self.wfile.write(str(e).encode())
        else:
             self.send_error(404, "Not Found")

    def do_GET(self):
        if self.path.startswith("/api/mingdao/"):
            self._proxy_request('GET')
        else:
            super().do_GET()

    def do_POST(self):
        if self.path.startswith("/api/mingdao/"):
            self._proxy_request('POST')
        else:
            super().do_POST()

    def do_PUT(self):
        self._proxy_request('PUT')

    def do_DELETE(self):
        self._proxy_request('DELETE')

    def do_PATCH(self):
        self._proxy_request('PATCH')

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, PUT, DELETE, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', '*')
        self.end_headers()

print(f"Starting Proxy Server on http://localhost:{PORT}")
print(f"Proxying /api/mingdao/* to {TARGET_API_HOST}/*")

with socketserver.TCPServer(("", PORT), ProxyHTTPRequestHandler) as httpd:
    httpd.serve_forever()
