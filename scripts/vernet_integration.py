import asyncio
import websockets
from datetime import datetime
import json
import subprocess
import sys
import os

class VernetServer:
    def __init__(self):
        self.TSHARK_PATH = r"C:\Program Files\Wireshark\tshark.exe"  # Adjust if needed
        
    async def handler(self, websocket):
        print("🌐 Client connected.")
        try:
            async for log in self.capture_packets():
                await websocket.send(json.dumps(log))
                print(f"📤 Sent log: {log}")
        except websockets.ConnectionClosed:
            print("❌ Client disconnected.")
        except Exception as e:
            print(f"❌ Error in handler: {e}")
    
    async def capture_packets(self):
        # Check if tshark exists
        if not os.path.exists(self.TSHARK_PATH):
            print(f"❌ tshark not found at {self.TSHARK_PATH}")
            print("Please install Wireshark or update the TSHARK_PATH")
            return
        
        cmd = [
            self.TSHARK_PATH,
            '-i', '5',                   # ⚠️ Update with correct interface index
            '-l',                        # Line buffered
            '-T', 'fields',              # Output each packet as line of fields
            '-E', 'separator=|',         # Use | to split fields
            '-e', 'frame.time',
            '-e', 'ip.src',
            '-e', 'ip.dst',
            '-e', 'ip.proto',
            '-e', 'frame.len',
            '-e', 'tcp.port',
            '-e', 'udp.port'
        ]
        
        try:
            proc = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            print("📡 Started packet capture...")
            
            while True:
                line = await proc.stdout.readline()
                if not line:
                    break
                log = self.parse_line(line.decode().strip())
                if log:
                    yield log
                    
        except Exception as e:
            print(f"❌ Error starting tshark: {e}")
            # Let's check what interfaces are available
            await self.list_interfaces()
    
    async def list_interfaces(self):
        """List available network interfaces"""
        try:
            cmd = [self.TSHARK_PATH, '-D']
            proc = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            stdout, stderr = await proc.communicate()
            
            if stdout:
                print("📋 Available network interfaces:")
                print(stdout.decode())
            if stderr:
                print(f"❌ Error listing interfaces: {stderr.decode()}")
                
        except Exception as e:
            print(f"❌ Error listing interfaces: {e}")
    
    def parse_line(self, line):
        if not line.strip():
            return None
            
        parts = line.split('|')
        if len(parts) < 5:
            return None  # Incomplete packet
        
        timestamp, src, dst, proto, length = parts[:5]
        tcp_port = parts[5] if len(parts) > 5 else ''
        udp_port = parts[6] if len(parts) > 6 else ''
        port = tcp_port or udp_port or '0'
        
        return {
            'timestamp': datetime.now().isoformat(),
            'level': 'INFO',
            'source': src or '0.0.0.0',
            'destination': dst or '0.0.0.0',
            'protocol': self.protocol_name(proto),
            'port': port,
            'bytes': length,
            'sessionId': f"sess_{hash(line) % 100000}",
            'connectionState': 'LIVE'
        }
    
    def protocol_name(self, proto_num):
        return {'1': 'ICMP', '6': 'TCP', '17': 'UDP'}.get(proto_num, 'UNKNOWN')

async def main():
    server = VernetServer()
    
    # Test if we can list interfaces first
    print("🔍 Checking network interfaces...")
    await server.list_interfaces()
    
    try:
        async with websockets.serve(server.handler, "localhost", 8765):
            print("✅ WebSocket server running at ws://localhost:8765")
            print("Press Ctrl+C to stop the server")
            await asyncio.Future()  # Run forever
    except Exception as e:
        print(f"❌ Failed to start server: {e}")

if __name__ == "__main__":
    try:
        # Check if we're in a Jupyter notebook
        import nest_asyncio
        nest_asyncio.apply()
        print("📝 Running in Jupyter/IPython environment")
    except ImportError:
        print("📝 Running in standard Python environment")
    
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n👋 Server stopped by user")
    except Exception as e:
        print(f"❌ Error starting server: {e}")
        sys.exit(1)