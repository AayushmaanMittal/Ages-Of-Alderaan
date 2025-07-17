"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { AlertTriangle, Brain, Play, RefreshCw } from "lucide-react"
import { useState } from "react"

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

interface AnomalyDetectorProps {
  anomalies: NetworkData[]
}

export function AnomalyDetector({ anomalies }: AnomalyDetectorProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [modelStatus, setModelStatus] = useState<"idle" | "running" | "completed">("idle")

  const runMLAnalysis = async () => {
    setIsAnalyzing(true)
    setModelStatus("running")

    // Simulate ML model execution
    setTimeout(() => {
      setIsAnalyzing(false)
      setModelStatus("completed")
    }, 3000)
  }

  const getSeverityColor = (severity?: string) => {
    switch (severity) {
      case "high":
        return "bg-red-100 text-red-800 border-red-200"
      case "medium":
        return "bg-orange-100 text-orange-800 border-orange-200"
      case "low":
        return "bg-yellow-100 text-yellow-800 border-yellow-200"
      default:
        return "bg-gray-100 text-gray-800 border-gray-200"
    }
  }

  const getAnomalyDescription = (data: NetworkData) => {
    if (data.packets > 800) return "High packet volume detected"
    if (data.bytes > 40000) return "Unusual data transfer size"
    if (data.protocol === "UDP" && data.packets > 500) return "Suspicious UDP traffic"
    return "Pattern anomaly detected"
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <Card className="lg:col-span-1">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="w-5 h-5" />
            ML Model Control
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Model Status:</span>
              <Badge variant={modelStatus === "running" ? "default" : "outline"}>
                {modelStatus === "running" ? "Analyzing" : modelStatus === "completed" ? "Ready" : "Idle"}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Anomalies Found:</span>
              <span className="text-sm font-bold text-destructive">{anomalies.length}</span>
            </div>
          </div>

          <Button onClick={runMLAnalysis} disabled={isAnalyzing} className="w-full">
            {isAnalyzing ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Play className="w-4 h-4 mr-2" />
                Run ML Analysis
              </>
            )}
          </Button>

          <div className="text-xs text-muted-foreground">
            Python ML model integration for real-time anomaly detection using machine learning algorithms.
          </div>
        </CardContent>
      </Card>

      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-destructive" />
            Detected Anomalies
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[500px]">
            {anomalies.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                No anomalies detected yet. Start monitoring to see results.
              </div>
            ) : (
              <div className="space-y-4">
                {anomalies
                  .slice()
                  .reverse()
                  .map((anomaly, index) => (
                    <div key={index} className={`p-4 rounded-lg border ${getSeverityColor(anomaly.severity)}`}>
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4" />
                          <span className="font-medium">{getAnomalyDescription(anomaly)}</span>
                        </div>
                        <Badge className={getSeverityColor(anomaly.severity)}>{anomaly.severity?.toUpperCase()}</Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="font-medium">Time:</span> {new Date(anomaly.timestamp).toLocaleString()}
                        </div>
                        <div>
                          <span className="font-medium">Protocol:</span> {anomaly.protocol}
                        </div>
                        <div>
                          <span className="font-medium">Source:</span> {anomaly.source}
                        </div>
                        <div>
                          <span className="font-medium">Destination:</span> {anomaly.destination}
                        </div>
                        <div>
                          <span className="font-medium">Packets:</span> {anomaly.packets.toLocaleString()}
                        </div>
                        <div>
                          <span className="font-medium">Bytes:</span> {(anomaly.bytes / 1024).toFixed(2)} KB
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  )
}
