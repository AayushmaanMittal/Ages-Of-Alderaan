import { type NextRequest, NextResponse } from "next/server"
import { spawn } from "child_process"

export async function POST(request: NextRequest) {
  try {
    const data = await request.json()

    // Call Python ML model
    const pythonProcess = spawn("python", ["scripts/anomaly_detection_model.py", JSON.stringify(data)])

    let result = ""
    let error = ""

    pythonProcess.stdout.on("data", (data) => {
      result += data.toString()
    })

    pythonProcess.stderr.on("data", (data) => {
      error += data.toString()
    })

    return new Promise((resolve) => {
      pythonProcess.on("close", (code) => {
        if (code === 0) {
          try {
            const anomalies = JSON.parse(result)
            resolve(NextResponse.json({ success: true, anomalies }))
          } catch (parseError) {
            resolve(NextResponse.json({ success: false, error: "Failed to parse ML results" }))
          }
        } else {
          resolve(NextResponse.json({ success: false, error: error || "Python script failed" }))
        }
      })
    })
  } catch (error) {
    return NextResponse.json({ success: false, error: "Failed to process request" })
  }
}
