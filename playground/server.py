#!/usr/bin/env python3
"""
Simple HTTP server for the Options Greeks Playground
Run this file to start the interactive learning platform
"""

import http.server
import socketserver
import os
import webbrowser
from pathlib import Path

# Configuration
PORT = 8085
DIRECTORY = "public"

class MyHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)
    
    def end_headers(self):
        # Add CORS headers for local development
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate')
        super().end_headers()

def main():
    # Change to the playground directory
    script_dir = Path(__file__).parent
    os.chdir(script_dir)
    
    # Check if public directory exists
    if not os.path.exists(DIRECTORY):
        print(f"Error: '{DIRECTORY}' directory not found!")
        print("Make sure you're running this from the playground directory.")
        return
    
    # Start server
    with socketserver.TCPServer(("", PORT), MyHTTPRequestHandler) as httpd:
        url = f"http://localhost:{PORT}"
        print("=" * 60)
        print("🚀 Options Greeks Interactive Playground")
        print("=" * 60)
        print(f"\n✅ Server running at: {url}")
        print(f"📁 Serving files from: {os.path.abspath(DIRECTORY)}")
        print("\n📚 Features:")
        print("   • Live Greeks Calculator with real-time charts")
        print("   • 6-module comprehensive course (24 lessons)")
        print("   • Interactive practice exercises and quizzes")
        print("   • Trading challenges and simulations")
        print("\n💡 Press Ctrl+C to stop the server")
        print("=" * 60)
        
        # Open browser
        # try:
        #     webbrowser.open(url)
        #     print(f"\n🌐 Opening {url} in your browser...")
        # except:
        #     print(f"\n🌐 Open {url} in your browser to get started")
        
        print("\n")
        
        # Serve forever
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\n\n👋 Server stopped. Thanks for learning!")
            print("=" * 60)

if __name__ == "__main__":
    main()
