import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Terminal } from "lucide-react"

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

interface LogMonitorProps {
  data: NetworkData[]
}

export function LogMonitor({ data }: LogMonitorProps) {
  const generateLogEntry = (entry: NetworkData) => {
    const timestamp = new Date(entry.timestamp).toISOString()
    const status = entry.anomaly ? "ANOMALY" : "NORMAL"
    return `[${timestamp}] ${entry.protocol} ${entry.source} -> ${entry.destination} | Packets: ${entry.packets} | Bytes: ${entry.bytes} | Status: ${status}`
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Terminal className="w-5 h-5" />
          Live Network Logs
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[600px] w-full">
          <div className="font-mono text-sm space-y-1 bg-black text-green-400 p-4 rounded">
            {data.length === 0 ? (
              <div className="text-gray-500">Waiting for network data...</div>
            ) : (
              data
                .slice(-50)
                .reverse()
                .map((entry, index) => (
                  <div key={index} className={`${entry.anomaly ? "text-red-400" : "text-green-400"}`}>
                    <span className="text-gray-500">{index + 1}.</span> {generateLogEntry(entry)}
                    {entry.anomaly && (
                      <div className="ml-4 text-yellow-400">
                        └── ML Model Alert: {entry.severity?.toUpperCase()} severity anomaly detected
                      </div>
                    )}
                  </div>
                ))
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
