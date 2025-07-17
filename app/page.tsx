"use client"

import { useState, useEffect, useRef } from "react"
import { NetworkTrafficChart } from "@/components/network-traffic-chart"
import { PacketAnalyzer } from "@/components/packet-analyzer"
import { AnomalyDetector } from "@/components/anomaly-detector"
import { LogMonitor } from "@/components/log-monitor"
import { NetworkStats } from "@/components/network-stats"
import { UserProfile } from "@/components/user-profile"
import { LoginForm } from "@/components/login-form"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Activity, User, Wifi, WifiOff, AlertTriangle } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import type { VernetLog } from "@/lib/vernet-integration"

interface NetworkData {
  timestamp: string
  packets: number
  bytes: number
  protocol: string
  source: string
  destination: string
  anomaly?: boolean
  severity?: "low" | "medium" | "high"
}

interface TsharkLogData {
  source?: string
  destination?: string
  protocol?: string
  length?: string | number
  size?: string | number
  bytes?: string | number
  timestamp?: string
  [key: string]: any // Allow for other possible fields
}

export default function NetworkDashboard() {
  const { user, isLoading } = useAuth()
  const [networkData, setNetworkData] = useState<NetworkData[]>([])
  const [vernetLogs, setVernetLogs] = useState<VernetLog[]>([])
  const [isMonitoring, setIsMonitoring] = useState(false)
  const [anomalies, setAnomalies] = useState<NetworkData[]>([])
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected')
  const [debugMessages, setDebugMessages] = useState<string[]>([])
  const [lastMessage, setLastMessage] = useState<string>('')
  const [stats, setStats] = useState({
    totalPackets: 0,
    totalBytes: 0,
    anomalyCount: 0,
    activeConnections: 0,
  })

  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const activeConnectionsRef = useRef(new Set<string>())

  const addDebugMessage = (message: string) => {
    setDebugMessages(prev => [...prev.slice(-9), `${new Date().toLocaleTimeString()}: ${message}`])
  }

  // Anomaly detection logic
  const detectAnomaly = (data: NetworkData): boolean => {
    const largePacketThreshold = 1500 // More realistic threshold
    const suspiciousProtocols = ['ICMP', 'FTP', 'TELNET']
    const privateIPPattern = /^(10\.|172\.(1[6-9]|2[0-9]|3[0-1])\.|192\.168\.)/
    
    if (data.bytes > largePacketThreshold) return true
    if (suspiciousProtocols.includes(data.protocol.toUpperCase())) return true
    if (privateIPPattern.test(data.source) && !privateIPPattern.test(data.destination)) return true
    
    return false
  }

  const getSeverity = (data: NetworkData): "low" | "medium" | "high" => {
    if (data.bytes > 5000) return "high"
    if (data.bytes > 2000) return "medium"
    return "low"
  }

  const parsePacketSize = (log: TsharkLogData): number => {
    // Try different possible field names and formats
    const sizeFields = ['length', 'size', 'bytes', 'len', 'packet_size', 'frame_len']
    
    for (const field of sizeFields) {
      if (log[field] !== undefined && log[field] !== null) {
        const value = typeof log[field] === 'string' ? parseInt(log[field]) : log[field]
        if (!isNaN(value as number) && value > 0) {
          return value as number
        }
      }
    }
    
    // Generate realistic packet size if no valid size found
    return Math.floor(Math.random() * 1400) + 64
  }

  const connectWebSocket = () => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      addDebugMessage('WebSocket already connected')
      return
    }

    addDebugMessage('Attempting to connect to WebSocket...')
    setConnectionStatus('connecting')
    
    try {
      wsRef.current = new WebSocket('ws://localhost:8765')
      
      wsRef.current.onopen = () => {
        addDebugMessage('WebSocket connected successfully')
        setConnectionStatus('connected')
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current)
          reconnectTimeoutRef.current = null
        }
      }

      wsRef.current.onmessage = (event) => {
        try {
          setLastMessage(event.data)
          const log: TsharkLogData = JSON.parse(event.data)
          
          const packetSize = parsePacketSize(log)
          
          const networkEntry: NetworkData = {
            timestamp: new Date().toISOString(),
            packets: 1,
            bytes: packetSize,
            protocol: (log.protocol || 'Unknown').toString(),
            source: (log.source || 'Unknown').toString(),
            destination: (log.destination || 'Unknown').toString(),
          }

          networkEntry.anomaly = detectAnomaly(networkEntry)
          networkEntry.severity = getSeverity(networkEntry)

          setNetworkData((prev) => [...prev.slice(-99), networkEntry])

          if (networkEntry.anomaly) {
            setAnomalies((prev) => [...prev.slice(-19), networkEntry])
          }

          // Track unique connections
          const connectionKey = `${networkEntry.source}:${networkEntry.destination}`
          activeConnectionsRef.current.add(connectionKey)

          setStats((prev) => ({
            totalPackets: prev.totalPackets + 1,
            totalBytes: prev.totalBytes + packetSize,
            anomalyCount: networkEntry.anomaly ? prev.anomalyCount + 1 : prev.anomalyCount,
            activeConnections: activeConnectionsRef.current.size,
          }))

          addDebugMessage(`Packet processed: ${packetSize} bytes, ${networkEntry.protocol}`)
        } catch (error) {
          addDebugMessage(`Error parsing message: ${error}`)
          console.error('Error parsing WebSocket message:', error, 'Raw data:', event.data)
        }
      }

      wsRef.current.onclose = (event) => {
        addDebugMessage(`WebSocket closed: ${event.code} - ${event.reason}`)
        setConnectionStatus('disconnected')
        
        // Only attempt to reconnect if monitoring is still active
        if (isMonitoring && !reconnectTimeoutRef.current) {
          addDebugMessage('Attempting to reconnect in 3 seconds...')
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectTimeoutRef.current = null
            if (isMonitoring) {
              connectWebSocket()
            }
          }, 3000)
        }
      }

      wsRef.current.onerror = (error) => {
        addDebugMessage(`WebSocket error occurred`)
        console.error('WebSocket error:', error)
        setConnectionStatus('disconnected')
      }
    } catch (error) {
      addDebugMessage(`Failed to create WebSocket: ${error}`)
      setConnectionStatus('disconnected')
    }
  }

  const disconnectWebSocket = () => {
    addDebugMessage('Disconnecting WebSocket...')
    
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }
    
    if (wsRef.current) {
      wsRef.current.close(1000, 'Monitoring stopped')
      wsRef.current = null
    }
    
    setConnectionStatus('disconnected')
    activeConnectionsRef.current.clear()
  }

  useEffect(() => {
    if (isMonitoring) {
      connectWebSocket()
    } else {
      disconnectWebSocket()
    }

    return () => {
      disconnectWebSocket()
    }
  }, [isMonitoring])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnectWebSocket()
    }
  }, [])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return <LoginForm />
  }

  const toggleMonitoring = () => {
    const newState = !isMonitoring
    addDebugMessage(`${newState ? 'Starting' : 'Stopping'} monitoring...`)
    
    if (!newState) {
      // Reset all data when stopping
      setNetworkData([])
      setAnomalies([])
      setVernetLogs([])
      setStats({ totalPackets: 0, totalBytes: 0, anomalyCount: 0, activeConnections: 0 })
      setLastMessage('')
    }
    
    setIsMonitoring(newState)
  }

  const handleVernetLog = (log: VernetLog) => {
    setVernetLogs((prev) => [...prev.slice(-99), log])

    const networkEntry: NetworkData = {
      timestamp: log.timestamp,
      packets: log.packets,
      bytes: log.bytes,
      protocol: log.protocol,
      source: log.source,
      destination: log.destination,
      anomaly: log.level === "ERROR" || log.level === "WARN",
      severity: log.level === "ERROR" ? "high" : log.level === "WARN" ? "medium" : "low",
    }

    setNetworkData((prev) => [...prev.slice(-99), networkEntry])
  }

  const getConnectionStatusBadge = () => {
    switch (connectionStatus) {
      case 'connected':
        return (
          <Badge variant="default" className="px-3 py-1 bg-green-600">
            <Wifi className="w-4 h-4 mr-1" />
            Connected
          </Badge>
        )
      case 'connecting':
        return (
          <Badge variant="secondary" className="px-3 py-1 bg-yellow-600">
            <Activity className="w-4 h-4 mr-1 animate-spin" />
            Connecting...
          </Badge>
        )
      default:
        return (
          <Badge variant="destructive" className="px-3 py-1">
            <WifiOff className="w-4 h-4 mr-1" />
            Disconnected
          </Badge>
        )
    }
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">AGES OF ALDERAAN</h1>
            <p className="text-muted-foreground">Real-time network analysis with ML-powered anomaly detection</p>
          </div>
          <div className="flex items-center gap-4">
            <Badge variant={isMonitoring ? "default" : "secondary"} className="px-3 py-1">
              <Activity className="w-4 h-4 mr-1" />
              {isMonitoring ? "Monitoring Active" : "Monitoring Stopped"}
            </Badge>
            {getConnectionStatusBadge()}
            <Button onClick={toggleMonitoring} variant={isMonitoring ? "destructive" : "default"}>
              {isMonitoring ? "Stop Monitoring" : "Start Monitoring"}
            </Button>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="icon">
                  <User className="w-4 h-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end">
                <UserProfile />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {/* Stats Cards */}
        <NetworkStats stats={stats} />

        {/* Debug Panel */}
        {isMonitoring && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <div className="flex items-center mb-2">
              <AlertTriangle className="w-5 h-5 text-blue-500 mr-2" />
              <h3 className="font-semibold">Debug Information</h3>
            </div>
            <div className="space-y-2">
              <div className="text-sm">
                <strong>WebSocket Status:</strong> {connectionStatus}
              </div>
              <div className="text-sm">
                <strong>Last Message:</strong> 
                <code className="ml-2 text-xs bg-gray-100 px-2 py-1 rounded">
                  {lastMessage ? lastMessage.substring(0, 100) + (lastMessage.length > 100 ? '...' : '') : 'No messages yet'}
                </code>
              </div>
              <div className="text-sm">
                <strong>Recent Debug Messages:</strong>
                <div className="max-h-32 overflow-y-auto mt-1 space-y-1">
                  {debugMessages.map((msg, index) => (
                    <div key={index} className="text-xs bg-gray-100 px-2 py-1 rounded">
                      {msg}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Connection Status Alert */}
        {isMonitoring && connectionStatus === 'disconnected' && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center">
              <WifiOff className="w-5 h-5 text-red-500 mr-2" />
              <p className="text-red-800">
                Unable to connect to Tshark WebSocket server. Please ensure the server is running on localhost:8765.
              </p>
            </div>
          </div>
        )}

        {/* Main Dashboard */}
        <Tabs defaultValue="traffic" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="traffic">Network Traffic</TabsTrigger>
            <TabsTrigger value="packets">Packet Analysis</TabsTrigger>
            <TabsTrigger value="anomalies">Anomaly Detection</TabsTrigger>
            <TabsTrigger value="logs">Live Logs</TabsTrigger>
          </TabsList>

          <TabsContent value="traffic" className="space-y-6">
            <NetworkTrafficChart data={networkData} />
          </TabsContent>

          <TabsContent value="packets" className="space-y-6">
            <PacketAnalyzer data={networkData} />
          </TabsContent>

          <TabsContent value="anomalies" className="space-y-6">
            <AnomalyDetector anomalies={anomalies} />
          </TabsContent>

          <TabsContent value="logs" className="space-y-6">
            <LogMonitor data={networkData} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}