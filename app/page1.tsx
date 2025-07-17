"use client"

import { useState, useEffect } from "react"
import { NetworkTrafficChart } from "@/components/network-traffic-chart"
import { PacketAnalyzer } from "@/components/packet-analyzer"
import { AnomalyDetector } from "@/components/anomaly-detector"
import { LogMonitor } from "@/components/log-monitor"
import { NetworkStats } from "@/components/network-stats"
// import VernetMonitor from "@/components/tshark-monitor"
import { UserProfile } from "@/components/user-profile"
import { LoginForm } from "@/components/login-form"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Activity, User } from "lucide-react"
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

export default function NetworkDashboard() {
  const { user, isLoading } = useAuth()
  const [networkData, setNetworkData] = useState<NetworkData[]>([])
  const [vernetLogs, setVernetLogs] = useState<VernetLog[]>([])
  const [isMonitoring, setIsMonitoring] = useState(false)
  const [anomalies, setAnomalies] = useState<NetworkData[]>([])
  const [stats, setStats] = useState({
    totalPackets: 0,
    totalBytes: 0,
    anomalyCount: 0,
    activeConnections: 0,
  })

  // Simulate real-time data updates
  useEffect(() => {
    if (!isMonitoring) return

    const interval = setInterval(() => {
      const newData: NetworkData = {
        timestamp: new Date().toISOString(),
        packets: Math.floor(Math.random() * 1000) + 100,
        bytes: Math.floor(Math.random() * 50000) + 1000,
        protocol: ["TCP", "UDP", "HTTP", "HTTPS"][Math.floor(Math.random() * 4)],
        source: `192.168.1.${Math.floor(Math.random() * 255)}`,
        destination: `10.0.0.${Math.floor(Math.random() * 255)}`,
        anomaly: Math.random() > 0.85,
        severity: ["low", "medium", "high"][Math.floor(Math.random() * 3)] as "low" | "medium" | "high",
      }

      setNetworkData((prev) => [...prev.slice(-99), newData])

      if (newData.anomaly) {
        setAnomalies((prev) => [...prev.slice(-19), newData])
      }

      setStats((prev) => ({
        totalPackets: prev.totalPackets + newData.packets,
        totalBytes: prev.totalBytes + newData.bytes,
        anomalyCount: newData.anomaly ? prev.anomalyCount + 1 : prev.anomalyCount,
        activeConnections: Math.floor(Math.random() * 50) + 10,
      }))
    }, 2000)

    return () => clearInterval(interval)
  }, [isMonitoring])

  // Show loading screen while checking authentication
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

  // Show login form if not authenticated
  if (!user) {
    return <LoginForm />
  }

  const toggleMonitoring = () => {
    setIsMonitoring(!isMonitoring)
    if (!isMonitoring) {
      setNetworkData([])
      setAnomalies([])
      setVernetLogs([])
      setStats({ totalPackets: 0, totalBytes: 0, anomalyCount: 0, activeConnections: 0 })
    }
  }

  const handleVernetLog = (log: VernetLog) => {
    setVernetLogs((prev) => [...prev.slice(-99), log])

    // Convert Vernet log to NetworkData format for integration
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

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Network Traffic Monitor</h1>
            <p className="text-muted-foreground">Real-time network analysis with ML-powered anomaly detection</p>
          </div>
          <div className="flex items-center gap-4">
            <Badge variant={isMonitoring ? "default" : "secondary"} className="px-3 py-1">
              <Activity className="w-4 h-4 mr-1" />
              {isMonitoring ? "Monitoring Active" : "Monitoring Stopped"}
            </Badge>
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

        {/* Main Dashboard */}
        <Tabs defaultValue="traffic" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="traffic">Network Traffic</TabsTrigger>
            <TabsTrigger value="packets">Packet Analysis</TabsTrigger>
            {/* <TabsTrigger value="vernet">Tshar Monitor</TabsTrigger> */}
            <TabsTrigger value="anomalies">Anomaly Detection</TabsTrigger>
            <TabsTrigger value="logs">Live Logs</TabsTrigger>
          </TabsList>

          <TabsContent value="traffic" className="space-y-6">
            <NetworkTrafficChart data={networkData} />
          </TabsContent>

          <TabsContent value="packets" className="space-y-6">
            <PacketAnalyzer data={networkData} />
          </TabsContent>

          {/* <TabsContent value="vernet" className="space-y-6">
            <VernetMonitor onLogReceived={handleVernetLog} />
          </TabsContent> */}

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
