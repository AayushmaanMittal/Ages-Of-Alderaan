import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"

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

interface PacketAnalyzerProps {
  data: NetworkData[]
}

export function PacketAnalyzer({ data }: PacketAnalyzerProps) {
  const getProtocolColor = (protocol: string) => {
    switch (protocol) {
      case "TCP":
        return "bg-blue-100 text-blue-800"
      case "UDP":
        return "bg-green-100 text-green-800"
      case "HTTP":
        return "bg-yellow-100 text-yellow-800"
      case "HTTPS":
        return "bg-purple-100 text-purple-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getSeverityColor = (severity?: string) => {
    switch (severity) {
      case "high":
        return "bg-red-100 text-red-800"
      case "medium":
        return "bg-orange-100 text-orange-800"
      case "low":
        return "bg-yellow-100 text-yellow-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Packet Analysis</CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[600px]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Timestamp</TableHead>
                <TableHead>Protocol</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Destination</TableHead>
                <TableHead>Packets</TableHead>
                <TableHead>Bytes</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data
                .slice(-20)
                .reverse()
                .map((packet, index) => (
                  <TableRow key={index} className={packet.anomaly ? "bg-red-50" : ""}>
                    <TableCell className="font-mono text-sm">
                      {new Date(packet.timestamp).toLocaleTimeString()}
                    </TableCell>
                    <TableCell>
                      <Badge className={getProtocolColor(packet.protocol)}>{packet.protocol}</Badge>
                    </TableCell>
                    <TableCell className="font-mono text-sm">{packet.source}</TableCell>
                    <TableCell className="font-mono text-sm">{packet.destination}</TableCell>
                    <TableCell>{packet.packets.toLocaleString()}</TableCell>
                    <TableCell>{(packet.bytes / 1024).toFixed(2)} KB</TableCell>
                    <TableCell>
                      {packet.anomaly ? (
                        <Badge className={getSeverityColor(packet.severity)}>Anomaly ({packet.severity})</Badge>
                      ) : (
                        <Badge variant="outline">Normal</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
