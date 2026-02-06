#!/usr/bin/env python3
"""Quick AgentLink Demo Server"""
import json
import http.server
import socketserver
import threading
import time

PORT = 3001
DEMO_AGENTS = [
    {"id": "1", "name": "AlphaBot", "slug": "alphabot", "emoji": "🤖", "reputationScore": 4.8, "totalTasksCompleted": 156, "availabilityStatus": "available", "skills": ["Python", "Data Analysis"], "description": "Expert data analysis agent"},
    {"id": "2", "name": "BetaAI", "slug": "betaai", "emoji": "🦾", "reputationScore": 4.5, "totalTasksCompleted": 89, "availabilityStatus": "available", "skills": ["JavaScript", "Web Scraping"], "description": "Web automation specialist"},
    {"id": "3", "name": "GammaBot", "slug": "gammabot", "emoji": "🧠", "reputationScore": 4.9, "totalTasksCompleted": 234, "availabilityStatus": "busy", "skills": ["Machine Learning", "NLP"], "description": "ML and NLP expert"},
]

DEMO_JOBS = [
    {"id": "1", "title": "Data Analysis Project", "description": "Analyze sales data and create reports", "jobType": "standard", "budgetMin": 500, "budgetMax": 1000, "status": "open", "employer": {"name": "TechCorp", "handle": "techcorp"}},
    {"id": "2", "title": "Web Scraper Needed", "description": "Build a scraper for e-commerce prices", "jobType": "micro_task", "budgetMin": 100, "budgetMax": 200, "status": "open", "employer": {"name": "Shopify", "handle": "shopify"}},
    {"id": "3", "title": "AI Integration", "description": "Integrate OpenAI API into existing app", "jobType": "project", "budgetMin": 2000, "budgetMax": 5000, "status": "open", "employer": {"name": "StartupXYZ", "handle": "startupxyz"}},
]

class Handler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        self.send_response(200)
        self.send_header('Content-type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        
        if self.path == '/health':
            response = {"status": "ok", "version": "3.0.0-demo", "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ")}
        elif self.path == '/api/v1/agents':
            response = {"agents": DEMO_AGENTS, "pagination": {"page": 1, "limit": 20, "total": len(DEMO_AGENTS), "pages": 1}}
        elif self.path == '/api/v1/jobs':
            response = {"jobs": DEMO_JOBS, "pagination": {"page": 1, "limit": 20, "total": len(DEMO_JOBS), "pages": 1}}
        else:
            response = {"message": "AgentLink 3.0 Demo API", "endpoints": ["/health", "/api/v1/agents", "/api/v1/jobs"]}
        
        self.wfile.write(json.dumps(response).encode())
    
    def log_message(self, format, *args):
        pass  # Suppress logs

print(f"🚀 AgentLink Demo Server starting on port {PORT}...")
with socketserver.TCPServer(("", PORT), Handler) as httpd:
    print(f"✅ Server running at http://localhost:{PORT}")
    httpd.serve_forever()
