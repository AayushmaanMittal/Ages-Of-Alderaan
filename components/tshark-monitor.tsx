"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Network, Play, Square, Wifi, WifiOff, Activity, AlertCircle, CheckCircle } from "lucide-react"

// Define the log structure to match the Python server
interface VernetLog {
  timestamp: string
  level: string
  source: string
  destination: string
  protocol: string
  port: string
  bytes: number
  sessionId: string
  connectionState: string
  flags: string[]
}

interface NetworkInterface {
  name: string
  ip: string
  status: string
  type: string
}

interface VernetMonitorProps {
  onLogReceived?: (log: VernetLog) => void
}

export default function VernetMonitor({ onLogReceived }: VernetMonitorProps) {
  const [isMonitoring, setIsMonitoring] = useState(false)
  const [isConnected, setIsConnected] = useState(false)
  const [logs, setLogs] = useState<VernetLog[]>([])
  const [interfaces, setInterfaces] = useState<NetworkInterface[]>([])
  const [selectedInterface, setSelectedInterface] = useState<string>("")
  const [filterLevel, setFilterLevel] = useState<string>("ALL")
  const [filterProtocol, setFilterProtocol] = useState<string>("ALL")
  const [connectionStatus, setConnectionStatus] = useState<string>("Disconnected")
  const [stats, setStats] = useState({
    totalLogs: 0,
    tcpConnections: 0,
    udpPackets: 0,
    liveConnections: 0,
    bytesTransferred: 0
  })

  const wsRef = useRef<WebSocket | null>(null)

  useEffect(() => {
    // Load network interfaces
    loadInterfaces()
    // Cleanup on component unmount
    return () => {
      if (wsRef.current) {
        wsRef.current.close()
        wsRef.current = null
      }
    }
  }, [])

  useEffect(() => {
    if (!isMonitoring) {
      if (wsRef.current) {
        wsRef.current.close()
        wsRef.current = null
      }
      setIsConnected(false)
      setConnectionStatus("Disconnected")
      return
    }

    // Create WebSocket connection
    const websocket = new WebSocket("ws://localhost:8765")
    wsRef.current = websocket
    setConnectionStatus("Connecting...")

    websocket.onopen = () => {
      console.log("✅ Connected to Vernet server")
      setIsConnected(true)
      setConnectionStatus("Connected")
    }

    websocket.onmessage = (event) => {
      try {
        const log: VernetLog = JSON.parse(event.data)
        console.log("📨 Received log:", log)
        setLogs((prev) => {
          const newLogs = [...prev.slice(-199), log] // Keep last 200 logs
          return newLogs
        })
        setStats(prev => ({
          totalLogs: prev.totalLogs + 1,
          tcpConnections: prev.tcpConnections + (log.protocol === 'TCP' ? 1 : 0),
          udpPackets: prev.udpPackets + (log.protocol === 'UDP' ? 1 : 0),
          liveConnections: prev.liveConnections + (log.connectionState === 'LIVE' ? 1 : 0),
          bytesTransferred: prev.bytesTransferred + log.bytes
        }))
        if (onLogReceived) {
          onLogReceived(log)
        }
      } catch (error) {
        console.error("❌ Error parsing log:", error)
      }
    }

    websocket.onerror = (error) => {
      console.error("❌ WebSocket error:", error)
      setConnectionStatus("Error")
      setIsConnected(false)
    }

    websocket.onclose = () => {
      console.log("🔌 WebSocket connection closed")
      setIsConnected(false)
      setConnectionStatus("Disconnected")
    }

    // Cleanup when monitoring stops
    return () => {
      if (wsRef.current) {
        wsRef.current.close()
        wsRef.current = null
      }
    }
  }, [isMonitoring])

  const loadInterfaces = async () => {
    const mockInterfaces: NetworkInterface[] = [
      { name: "eth0", ip: "192.168.1.100", status: "UP", type: "ETHERNET" },
      { name: "wlan0", ip: "192.168.1.101", status: "UP", type: "WIFI" },
      { name: "lo", ip: "127.0.0.1", status: "UP", type: "LOOPBACK" },
    ]
    setInterfaces(mockInterfaces)
    setSelectedInterface(mockInterfaces[0]?.name || "")
  }

  const toggleMonitoring = () => {
    setIsMonitoring((prev) => {
      if (!prev) {
        setLogs([]) // Clear logs when starting monitoring
        setStats({
          totalLogs: 0,
          tcpConnections: 0,
          udpPackets: 0,
          liveConnections: 0,
          bytesTransferred: 0
        })
      }
      return !prev
    })
  }

  const getLevelColor = (level: string) => {
    switch (level) {
      case "ERROR":
        return "bg-red-500 text-white"
      case "WARN":
        return "bg-yellow-500 text-white"
      case "INFO":
        return "bg-blue-500 text-white"
      case "DEBUG":
        return "bg-gray-500 text-white"
      default:
        return "bg-gray-500 text-white"
    }
  }

  const getStateColor = (state: string) => {
    switch (state) {
      case "ESTABLISHED":
        return "bg-green-500 text-white"
      case "CLOSED":
        return "bg-gray-500 text-white"
      case "LISTENING":
        return "bg-blue-500 text-white"
      case "LIVE":
        return "bg-orange-500 text-white"
      default:
        return "bg-purple-500 text-white"
    }
  }

  const getProtocolColor = (protocol: string) => {
    switch (protocol) {
      case "TCP":
        return "bg-blue-100 text-blue-800 border-blue-300"
      case "UDP":
        return "bg-green-100 text-green-800 border-green-300"
      case "HTTP":
        return "bg-purple-100 text-purple-800 border-purple-300"
      case "HTTPS":
        return "bg-indigo-100 text-indigo-800 border-indigo-300"
      default:
        return "bg-gray-100 text-gray-800 border-gray-300"
    }
  }

  const filteredLogs = logs.filter((log) => {
    if (filterLevel !== "ALL" && log.level !== filterLevel) return false
    if (filterProtocol !== "ALL" && log.protocol !== filterProtocol) return false
    return true
  })

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 B"
    const k = 1024
    const sizes = ["B", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i]
  }

  return (
    <div className="space-y-6 p-6 bg-gradient-to-br from-slate-50 to-blue-50 min-h-screen">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          Tshark Network Monitor
        </h1>
        <p className="text-gray-600 mt-2">Real-time network traffic analysis and monitoring</p>
      </div>

      {/* Control Panel */}
      <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-sm">
        <CardHeader className="bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-t-lg">
          <CardTitle className="flex items-center gap-2">
            <Network className="w-5 h-5" />
            Control Panel
            <div className="ml-auto flex items-center gap-2">
              {isConnected ? (
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" />
                  <span className="text-sm font-medium">Connected</span>
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  <span className="text-sm">{connectionStatus}</span>
                  <div className="w-2 h-2 bg-red-400 rounded-full"></div>
                </div>
              )}
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block text-gray-700">Network Interface</label>
              <Select value={selectedInterface} onValueChange={setSelectedInterface}>
                <SelectTrigger className="border-gray-300">
                  <SelectValue placeholder="Select interface" />
                </SelectTrigger>
                <SelectContent>
                  {interfaces.map((iface) => (
                    <SelectItem key={iface.name} value={iface.name}>
                      {iface.name} ({iface.ip})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block text-gray-700">Log Level</label>
              <Select value={filterLevel} onValueChange={setFilterLevel}>
                <SelectTrigger className="border-gray-300">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Levels</SelectItem>
                  <SelectItem value="ERROR">Error</SelectItem>
                  <SelectItem value="WARN">Warning</SelectItem>
                  <SelectItem value="INFO">Info</SelectItem>
                  <SelectItem value="DEBUG">Debug</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block text-gray-700">Protocol</label>
              <Select value={filterProtocol} onValueChange={setFilterProtocol}>
                <SelectTrigger className="border-gray-300">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Protocols</SelectItem>
                  <SelectItem value="TCP">TCP</SelectItem>
                  <SelectItem value="UDP">UDP</SelectItem>
                  <SelectItem value="HTTP">HTTP</SelectItem>
                  <SelectItem value="HTTPS">HTTPS</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <Button 
                onClick={toggleMonitoring} 
                className={`w-full font-semibold ${isMonitoring ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'}`}
              >
                {isMonitoring ? (
                  <>
                    <Square className="w-4 h-4 mr-2" />
                    Stop Monitoring
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 mr-2" />
                    Start Monitoring
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold">{stats.totalLogs}</div>
                <div className="text-sm opacity-90">Total Logs</div>
              </div>
              <Activity className="w-8 h-8 opacity-80" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white shadow-lg">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold">{stats.tcpConnections}</div>
                <div className="text-sm opacity-90">TCP Connections</div>
              </div>
              <Network className="w-8 h-8 opacity-80" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white shadow-lg">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold">{stats.udpPackets}</div>
                <div className="text-sm opacity-90">UDP Packets</div>
              </div>
              <Wifi className="w-8 h-8 opacity-80" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white shadow-lg">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold">{stats.liveConnections}</div>
                <div className="text-sm opacity-90">Live Connections</div>
              </div>
              <CheckCircle className="w-8 h-8 opacity-80" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-indigo-500 to-indigo-600 text-white shadow-lg">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold">{formatBytes(stats.bytesTransferred)}</div>
                <div className="text-sm opacity-90">Data Transferred</div>
              </div>
              <Activity className="w-8 h-8 opacity-80" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Network Traffic Logs */}
      <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-sm">
        <CardHeader className="bg-gradient-to-r from-slate-700 to-slate-800 text-white rounded-t-lg">
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Activity className="w-5 h-5" />
              Live Network Traffic
            </span>
            <div className="flex items-center gap-4">
              <Badge variant="outline" className="text-white border-white bg-white/20">
                {filteredLogs.length} entries
              </Badge>
              {isMonitoring && (
                <div className="flex items-center gap-2 text-sm">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                  Live
                </div>
              )}
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[500px]">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="text-left p-3 font-medium text-gray-700 border-b">Time</th>
                    <th className="text-left p-3 font-medium text-gray-700 border-b">Level</th>
                    <th className="text-left p-3 font-medium text-gray-700 border-b">Protocol</th>
                    <th className="text-left p-3 font-medium text-gray-700 border-b">Source</th>
                    <th className="text-left p-3 font-medium text-gray-700 border-b">Destination</th>
                    <th className="text-left p-3 font-medium text-gray-700 border-b">Port</th>
                    <th className="text-left p-3 font-medium text-gray-700 border-b">State</th>
                    <th className="text-left p-3 font-medium text-gray-700 border-b">Size</th>
                    <th className="text-left p-3 font-medium text-gray-700 border-b">Flags</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLogs
                    .slice(-50)
                    .reverse()
                    .map((log, index) => (
                      <tr key={index} className="border-b hover:bg-gray-50 transition-colors">
                        <td className="p-3 font-mono text-xs text-gray-600">
                          {new Date(log.timestamp).toLocaleTimeString()}
                        </td>
                        <td className="p-3">
                          <Badge className={`${getLevelColor(log.level)} text-xs font-medium`}>
                            {log.level}
                          </Badge>
                        </td>
                        <td className="p-3">
                          <Badge className={`${getProtocolColor(log.protocol)} text-xs font-medium border`}>
                            {log.protocol}
                          </Badge>
                        </td>
                        <td className="p-3 font-mono text-xs text-gray-700">{log.source}</td>
                        <td className="p-3 font-mono text-xs text-gray-700">{log.destination}</td>
                        <td className="p-3 font-mono text-xs text-gray-700">{log.port}</td>
                        <td className="p-3">
                          <Badge className={`${getStateColor(log.connectionState)} text-xs font-medium`}>
                            {log.connectionState}
                          </Badge>
                        </td>
                        <td className="p-3 font-mono text-xs text-gray-700">
                          {formatBytes(log.bytes)}
                        </td>
                        <td className="p-3">
                          <div className="flex gap-1 flex-wrap">
                            {log.flags && log.flags.map((flag, flagIndex) => (
                              <Badge key={flagIndex} variant="outline" className="text-xs bg-gray-100 text-gray-700 border-gray-300">
                                {flag}
                              </Badge>
                            ))}
                          </div>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
              {filteredLogs.length === 0 && (
                <div className="text-center py-12">
                  <div className="text-gray-400 text-lg mb-2">
                    {isMonitoring ? "⏳ Waiting for network traffic..." : "🚀 Click 'Start Monitoring' to begin"}
                  </div>
                  <div className="text-gray-500 text-sm">
                    {isMonitoring ? "Live data will appear here as network packets are captured" : "Real-time network logs will be displayed here"}
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  )
}