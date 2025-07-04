"use client"

import { useState, useEffect } from "react"
import { fetchStreams, fetchDetections, fetchAlerts } from "@/utils/api"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { supabase } from "@/utils/supabase"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  LayoutDashboard,
  Video,
  AlertTriangle,
  Settings,
  Bell,
  User,
  Play,
  Pause,
  Eye,
  Clock,
  Activity,
  Zap,
  Sun,
  Moon,
} from "lucide-react"

type Stream = {
  id: string
  name: string
  thumbnail?: string
  status: "active" | "offline"
  detectionCount: number
  uptime: string
  lastDetection: string
}

type Detection = {
  id: number
  type: string
  confidence: number
  timestamp: string
  bbox: {
    x: number
    y: number
    width: number
    height: number
  }
}

type Alert = {
  id: number
  type: string
  stream: string
  severity: "high" | "medium" | "low"
  timestamp: string
}

type Video = {
  id: string
  filename: string
  storage_url: string
  uploaded_at: string
}

type Summary = {
  total_frames: number
  object_counts: Record<string, number>
  top_frames: { frame: number; objects: string[] }[]
  classification?: string[]  // ✅ optional array of strings
  alerts?: { type: string; confidence: number; timestamp: string }[]  // ✅ optional array of alerts
  summary_text?: string  // ✅ optional string summary
}

export default function Dashboard() {
  const [currentView, setCurrentView] = useState("dashboard")
  const [streams, setStreams] = useState<Stream[]>([])
  const [selectedStream, setSelectedStream] = useState<Stream | null>(null)
  const [detections, setDetections] = useState<Detection[]>([])
  const [recentAlerts, setRecentAlerts] = useState<Alert[]>([])
  const [isDarkMode, setIsDarkMode] = useState(false)
  const [videos, setVideos] = useState<Video[]>([])

  useEffect(() => {
  async function loadData() {
    const [streamData, detectionData, alertData] = await Promise.all([
      fetchStreams(),
      fetchDetections(),
      fetchAlerts()
    ])
    setStreams(streamData)
    setDetections(detectionData)
    setRecentAlerts(alertData)
    setSelectedStream(streamData[0]) // Default selection
  }

  loadData()
  }, [])

  // Initialize theme from localStorage or system preference
  useEffect(() => {
    const savedTheme = localStorage.getItem("theme")
    const systemPrefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches

    if (savedTheme === "dark" || (!savedTheme && systemPrefersDark)) {
      setIsDarkMode(true)
      document.documentElement.classList.add("dark")
    } else {
      setIsDarkMode(false)
      document.documentElement.classList.remove("dark")
    }
  }, [])

 const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0]
  if (!file) return

  // ✅ Check file size (50MB limit for Supabase free tier)
  if (file.size > 50 * 1024 * 1024) {
    alert("File too large! Supabase allows max 50MB per file on free plan.")
    return
  }

  const filePath = `${Date.now()}_${file.name}`

  // ✅ Upload to Supabase Storage
  const { data, error } = await supabase.storage
    .from("videos") // Make sure bucket is named 'videos'
    .upload(filePath, file)

  if (error) {
    console.error("Upload failed", error)
    alert("Upload failed")
    return
  }

  console.log("Upload success", data)
  alert("Upload successful!")

  // ✅ Construct full public URL of uploaded video
  const publicURL = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/videos/${filePath}`
  console.log("Public URL:", publicURL)


  // ✅ Send metadata to FastAPI backend
  try {
    const response = await fetch("http://localhost:8000/videos/metadata", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        filename: file.name,
        storage_url: publicURL,
        uploaded_at: new Date().toISOString(), // Optional
      }),
    })

    if (!response.ok) {
      const errorData = await response.json()
      console.error("Metadata save failed", errorData)
      alert("Upload succeeded but metadata saving failed.")
    } else {
      console.log("Metadata saved successfully")
    }
  } catch (err) {
    console.error("Request error:", err)
    alert("Network error while saving metadata.")
  }
  }

  useEffect(() => {
  fetch("http://localhost:8000/videos/")
    .then((res) => res.json())
    .then((data) => {
      setVideos(data)
    })
    .catch((err) => {
      console.error("Error fetching videos:", err)
    })
    
  }, [])


  const handleDelete = async (videoId: string) => {
  console.log("Attempting to delete video with ID:", videoId) // ← LOG HERE

  const confirm = window.confirm("Are you sure you want to delete this video?")
  if (!confirm) {
    console.log("User cancelled the deletion.") // ← LOG HERE
    return
  }

  try {
    const res = await fetch(`http://localhost:8000/videos/${videoId}`, {
      method: "DELETE",
    })

    if (!res.ok) {
      const err = await res.json()
      console.error("Delete failed:", err) // ← LOG HERE
      alert(`Delete failed: ${err.detail}`)
      return
    }

    console.log("Video deleted successfully:", videoId) // ← LOG HERE
    alert("Deleted successfully")
    setVideos((prev) => prev.filter((v) => v.id !== videoId))
  } catch (err) {
    console.error("Delete error", err) // Already here
    alert("Network error")
  }
  }
  

  const [selectedSummary, setSelectedSummary] = useState<Summary | null>(null)
  const [loading, setLoading] = useState(false)
  const [openDialog, setOpenDialog] = useState(false)


  const handleAnalyze = async (videoId: string) => {
  setLoading(true)

  // Find the video to get the storage_url
  const video = videos.find((v) => v.id === videoId)
  if (!video) {
    alert("Video not found")
    setLoading(false)
    return
  }

  try {
    // First call: AI detection
    const detectRes = await fetch("http://localhost:8000/ai/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        video_url: video.storage_url,
        video_id: video.id,
      }),
    })

    if (!detectRes.ok) {
      const error = await detectRes.json()
      console.error("Detection failed:", error)
      alert("AI detection failed.")
      setLoading(false)
      return
    }

    // Optional: wait a bit if inference takes time
    await new Promise((resolve) => setTimeout(resolve, 3000))

    // Second call: Get summary
    const summaryRes = await fetch(`http://localhost:8000/ai/summary?video_id=${video.id}`)
    const summaryData = await summaryRes.json()
    console.log("AI summary response:", summaryData)

    setSelectedSummary(summaryData.summary)
    setOpenDialog(true)
  } catch (err) {
    console.error("Error during analysis:", err)
    alert("Error analyzing video.")
  }

  setLoading(false)
  }



  // Toggle theme function
  const toggleTheme = () => {
    const newTheme = !isDarkMode
    setIsDarkMode(newTheme)

    if (newTheme) {
      document.documentElement.classList.add("dark")
      localStorage.setItem("theme", "dark")
    } else {
      document.documentElement.classList.remove("dark")
      localStorage.setItem("theme", "light")
    }
  }

  const AnimatedBackground = () => (
    <div className="fixed inset-0 -z-10 overflow-hidden">
      {/* Main gradient background */}
      <div className="absolute inset-0 bg-white dark:bg-gradient-to-br dark:from-gray-900 dark:via-blue-900/20 dark:to-purple-900/20 transition-colors duration-500" />

      {/* Animated gradient orbs - only in dark mode */}
      <div className="absolute top-0 -left-4 w-72 h-72 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full mix-blend-multiply filter blur-xl opacity-0 dark:opacity-10 animate-blob" />
      <div className="absolute top-0 -right-4 w-72 h-72 bg-gradient-to-r from-yellow-400 to-red-400 rounded-full mix-blend-multiply filter blur-xl opacity-0 dark:opacity-10 animate-blob animation-delay-2000" />
      <div className="absolute -bottom-8 left-20 w-72 h-72 bg-gradient-to-r from-pink-400 to-orange-400 rounded-full mix-blend-multiply filter blur-xl opacity-0 dark:opacity-10 animate-blob animation-delay-4000" />
      <div className="absolute bottom-0 right-20 w-72 h-72 bg-gradient-to-r from-blue-400 to-cyan-400 rounded-full mix-blend-multiply filter blur-xl opacity-0 dark:opacity-10 animate-blob animation-delay-6000" />

      {/* Grid pattern overlay */}
      <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg width%3D%2260%22 height%3D%2260%22 viewBox%3D%220 0 60 60%22 xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cg fill%3D%22none%22 fillRule%3D%22evenodd%22%3E%3Cg fill%3D%22%239C92AC%22 fillOpacity%3D%220.02%22%3E%3Ccircle cx%3D%2230%22 cy%3D%2230%22 r%3D%221.5%22%2F%3E%3C%2Fg%3E%3C%2Fg%3E%3C%2Fsvg%3E')] dark:bg-[url('data:image/svg+xml,%3Csvg width%3D%2260%22 height%3D%2260%22 viewBox%3D%220 0 60 60%22 xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cg fill%3D%22none%22 fillRule%3D%22evenodd%22%3E%3Cg fill%3D%22%23ffffff%22 fillOpacity%3D%220.03%22%3E%3Ccircle cx%3D%2230%22 cy%3D%2230%22 r%3D%221.5%22%2F%3E%3C%2Fg%3E%3C%2Fg%3E%3C%2Fsvg%3E')]" />

      {/* Noise texture overlay */}
      <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg viewBox%3D%220 0 256 256%22 xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cfilter id%3D%22noiseFilter%22%3E%3CfeTurbulence type%3D%22fractalNoise%22 baseFrequency%3D%220.9%22 numOctaves%3D%224%22 stitchTiles%3D%22stitch%22%2F%3E%3C%2Ffilter%3E%3Crect width%3D%22100%25%22 height%3D%22100%25%22 filter%3D%22url(%23noiseFilter)%22 opacity%3D%220.02%22%2F%3E%3C%2Fsvg%3E')] mix-blend-overlay" />
    </div>
  )

  const FloatingNavbar = () => (
    <nav className="fixed top-4 left-1/2 z-50 -translate-x-1/2 w-full max-w-6xl px-4">
      <div className="flex items-center justify-between rounded-2xl border border-white/20 bg-white/10 dark:border-white/10 dark:bg-black/10 px-6 py-3 backdrop-blur-xl shadow-2xl shadow-black/10 dark:shadow-black/30">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 shadow-lg">
            <Eye className="h-4 w-4 text-white" />
          </div>
          <div className="hidden sm:flex flex-col">
            <span className="text-sm font-semibold text-gray-900 dark:text-white">VisionAI</span>
            <span className="text-xs text-gray-600 dark:text-gray-300">Video Management</span>
          </div>
        </div>

        {/* Navigation Links */}
        <div className="flex items-center gap-1 rounded-xl bg-white/20 dark:bg-black/20 p-1 backdrop-blur-sm">
          <Button
            variant={currentView === "dashboard" ? "default" : "ghost"}
            size="sm"
            onClick={() => setCurrentView("dashboard")}
            className={`gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-all ${
              currentView === "dashboard"
                ? "bg-white dark:bg-white/20 text-gray-900 dark:text-white shadow-lg"
                : "text-gray-700 dark:text-gray-200 hover:bg-white/50 dark:hover:bg-white/20 hover:text-gray-900 dark:hover:text-white"
            }`}
          >
            <LayoutDashboard className="h-4 w-4" />
            <span className="hidden sm:inline">Dashboard</span>
          </Button>
          <Button
            variant={currentView === "streams" ? "default" : "ghost"}
            size="sm"
            onClick={() => setCurrentView("streams")}
            className={`gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-all ${
              currentView === "streams"
                ? "bg-white dark:bg-white/20 text-gray-900 dark:text-white shadow-lg"
                : "text-gray-700 dark:text-gray-200 hover:bg-white/50 dark:hover:bg-white/20 hover:text-gray-900 dark:hover:text-white"
            }`}
          >
            <Video className="h-4 w-4" />
            <span className="hidden sm:inline">Streams</span>
          </Button>
          <Button
            variant={currentView === "alerts" ? "default" : "ghost"}
            size="sm"
            onClick={() => setCurrentView("alerts")}
            className={`gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-all relative ${
              currentView === "alerts"
                ? "bg-white dark:bg-white/20 text-gray-900 dark:text-white shadow-lg"
                : "text-gray-700 dark:text-gray-200 hover:bg-white/50 dark:hover:bg-white/20 hover:text-gray-900 dark:hover:text-white"
            }`}
          >
            <AlertTriangle className="h-4 w-4" />
            <span className="hidden sm:inline">Alerts</span>
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-4 w-4 rounded-full p-0 text-xs shadow-lg"
            >
              3
            </Badge>
          </Button>
          <Button
            variant={currentView === "settings" ? "default" : "ghost"}
            size="sm"
            onClick={() => setCurrentView("settings")}
            className={`gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-all ${
              currentView === "settings"
                ? "bg-white dark:bg-white/20 text-gray-900 dark:text-white shadow-lg"
                : "text-gray-700 dark:text-gray-200 hover:bg-white/50 dark:hover:bg-white/20 hover:text-gray-900 dark:hover:text-white"
            }`}
          >
            <Settings className="h-4 w-4" />
            <span className="hidden sm:inline">Settings</span>
          </Button>
        </div>

        {/* User Controls */}
        <div className="flex items-center gap-3">
          {/* Theme Toggle Button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            className="h-9 w-9 rounded-full transition-all hover:bg-white/20 dark:hover:bg-white/20 text-gray-700 dark:text-gray-200"
            aria-label={isDarkMode ? "Switch to light mode" : "Switch to dark mode"}
          >
            {isDarkMode ? <Sun className="h-4 w-4 transition-all" /> : <Moon className="h-4 w-4 transition-all" />}
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="relative h-9 w-9 rounded-full hover:bg-white/20 dark:hover:bg-white/20 text-gray-700 dark:text-gray-200"
          >
            <Bell className="h-4 w-4" />
            <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-red-500 shadow-lg"></span>
          </Button>
          <Avatar className="h-8 w-8 ring-2 ring-white/20 dark:ring-white/10">
            <AvatarImage src="/placeholder.svg?height=32&width=32" />
            <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white">
              <User className="h-4 w-4" />
            </AvatarFallback>
          </Avatar>
        </div>
      </div>
    </nav>
  )

  const DashboardView = () => (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">Dashboard</h1>
        <p className="text-gray-600 dark:text-gray-300">Monitor all your video streams and security alerts</p>
      </div>

      {/* Stats Overview */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-white/20 dark:border-white/10 bg-white/40 dark:bg-black/20 backdrop-blur-xl shadow-xl shadow-black/5 dark:shadow-black/20 transition-all hover:shadow-2xl hover:shadow-black/10 dark:hover:shadow-black/30">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-700 dark:text-gray-200">Active Streams</CardTitle>
            <Video className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">3</div>
            <p className="text-xs text-gray-600 dark:text-gray-300">+1 from yesterday</p>
          </CardContent>
        </Card>
        <Card className="border-white/20 dark:border-white/10 bg-white/40 dark:bg-black/20 backdrop-blur-xl shadow-xl shadow-black/5 dark:shadow-black/20 transition-all hover:shadow-2xl hover:shadow-black/10 dark:hover:shadow-black/30">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-700 dark:text-gray-200">Detections Today</CardTitle>
            <Activity className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">46</div>
            <p className="text-xs text-gray-600 dark:text-gray-300">+12% from yesterday</p>
          </CardContent>
        </Card>
        <Card className="border-white/20 dark:border-white/10 bg-white/40 dark:bg-black/20 backdrop-blur-xl shadow-xl shadow-black/5 dark:shadow-black/20 transition-all hover:shadow-2xl hover:shadow-black/10 dark:hover:shadow-black/30">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-700 dark:text-gray-200">System Uptime</CardTitle>
            <Zap className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">99.2%</div>
            <p className="text-xs text-gray-600 dark:text-gray-300">Last 30 days</p>
          </CardContent>
        </Card>
        <Card className="border-white/20 dark:border-white/10 bg-white/40 dark:bg-black/20 backdrop-blur-xl shadow-xl shadow-black/5 dark:shadow-black/20 transition-all hover:shadow-2xl hover:shadow-black/10 dark:hover:shadow-black/30">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-700 dark:text-gray-200">Active Alerts</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">3</div>
            <p className="text-xs text-gray-600 dark:text-gray-300">2 high priority</p>
          </CardContent>
        </Card>
      </div>
      <div className="flex justify-end">
  <Button
    className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded shadow"
    onClick={() => document.getElementById("upload-input")?.click()}
  >
    Upload Video / Stream
  </Button>
  <input
    id="upload-input"
    type="file"
    accept="video/*"
    className="hidden"
    onChange={(e) => handleFileUpload(e)}
  />
  </div>

  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mt-6">
      {videos.map((video) => (
        <div key={video.id} className="bg-white shadow rounded p-3">
          <video controls className="w-full rounded-md">
            <source src={video.storage_url} type="video/mp4" />
            Your browser does not support the video tag.
          </video>
          <div className="mt-2 text-sm font-medium text-gray-700">{video.filename}</div>
          <div className="text-xs text-gray-500">
            {new Date(video.uploaded_at).toLocaleString()}
          </div>

          {/* Action buttons */}
          <div className="flex justify-between mt-2">
            <button
              onClick={() => handleDelete(video.id)}
              className="text-red-500 text-sm hover:underline"
            >
              Delete
            </button>

           <Dialog open={openDialog} onOpenChange={setOpenDialog}>
  <DialogTrigger asChild>
    <button
      onClick={() => handleAnalyze(video.id)}
      className="text-blue-500 text-sm hover:underline"
    >
      Analyze
    </button>
  </DialogTrigger>

  <DialogContent className="max-w-2xl">
    <DialogHeader>
      <DialogTitle>Video Summary</DialogTitle>
    </DialogHeader>

    {loading ? (
      <p className="text-gray-500 text-sm">Analyzing...</p>
    ) : selectedSummary ? (
      <div className="text-sm max-h-[60vh] overflow-y-auto space-y-4">
        {/* Total Frames */}
        <p><strong>Total Frames:</strong> {selectedSummary.total_frames}</p>

        {/* Object Counts */}
        <div>
          <strong>Object Counts:</strong>
          <ul className="list-disc pl-5">
            {Object.entries(selectedSummary.object_counts).map(([object, count]) => (
              <li key={object}>{object}: {count}</li>
            ))}
          </ul>
        </div>

        {/* Top Frames */}
        <div>
          <strong>Top Frames:</strong>
          <ul className="list-disc pl-5">
            {selectedSummary.top_frames.map((frame: any) => (
              <li key={frame.frame}>
                Frame {frame.frame}: {frame.objects.join(", ")}
              </li>
            ))}
          </ul>
        </div>

        {/* Classification */}
        {selectedSummary.classification && selectedSummary.classification.length > 0 && (
          <div>
            <strong>Classification Labels:</strong>
            <ul className="list-disc pl-5">
              {selectedSummary.classification.map((label: string, idx: number) => (
                <li key={idx}>{label}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Alerts */}
        {selectedSummary.alerts && selectedSummary.alerts.length > 0 && (
          <div>
            <strong>Alerts:</strong>
            <ul className="list-disc pl-5">
              {selectedSummary.alerts.map((alert: any, idx: number) => (
                <li key={idx}>
                  {alert.type} — Confidence: {(alert.confidence * 100).toFixed(1)}% —{" "}
                  {new Date(alert.timestamp).toLocaleString()}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Summary Text */}
        {selectedSummary.summary_text && (
          <div>
            <strong>Video Summary:</strong>
            <p className="text-gray-700">{selectedSummary.summary_text}</p>
          </div>
        )}
      </div>
    ) : (
      <p className="text-gray-500 text-sm">No data available</p>
    )}
  </DialogContent>
</Dialog>


          </div>
        </div>
      ))}
    </div>


      {/* Video Streams Grid */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Video Streams</h2>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {streams.map((stream) => (
            <Card
              key={stream.id}
              className="group cursor-pointer border-white/20 dark:border-white/10 bg-white/40 dark:bg-black/20 backdrop-blur-xl shadow-xl shadow-black/5 dark:shadow-black/20 transition-all hover:shadow-2xl hover:shadow-black/10 dark:hover:shadow-black/30 hover:scale-105"
              onClick={() => {
                setSelectedStream(stream)
                setCurrentView("stream-detail")
              }}
            >
              <CardContent className="p-0">
                <div className="relative overflow-hidden rounded-t-lg">
                  <img
                    src={stream.thumbnail || "/placeholder.svg"}
                    alt={stream.name}
                    className="h-32 w-full object-cover transition-transform group-hover:scale-110"
                  />
                  <Badge
                    variant={stream.status === "active" ? "default" : "secondary"}
                    className="absolute top-2 right-2 shadow-lg"
                  >
                    {stream.status === "active" ? "Live" : "Offline"}
                  </Badge>
                </div>
                <div className="p-4 space-y-3">
                  <div className="space-y-1">
                    <h3 className="font-medium text-gray-900 dark:text-white">{stream.name}</h3>
                    <p className="text-xs text-gray-600 dark:text-gray-300">{stream.id}</p>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-600 dark:text-gray-400">Detections</span>
                      <span className="font-medium text-gray-900 dark:text-white">{stream.detectionCount}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-600 dark:text-gray-400">Uptime</span>
                      <span className="font-medium text-gray-900 dark:text-white">{stream.uptime}</span>
                    </div>
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-400">{stream.lastDetection}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Recent Alerts */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Recent Alerts</h2>
        <Card className="border-white/20 dark:border-white/10 bg-white/40 dark:bg-black/20 backdrop-blur-xl shadow-xl shadow-black/5 dark:shadow-black/20">
          <CardContent className="p-0">
            {recentAlerts.map((alert, index) => (
              <div
                key={alert.id}
                className={`flex items-center justify-between p-4 ${index !== recentAlerts.length - 1 ? "border-b border-white/10 dark:border-white/5" : ""}`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`h-2 w-2 rounded-full ${
                      alert.severity === "high"
                        ? "bg-red-500"
                        : alert.severity === "medium"
                          ? "bg-yellow-500"
                          : "bg-blue-500"
                    }`}
                  />
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{alert.type}</p>
                    <p className="text-xs text-gray-600 dark:text-gray-300">{alert.stream}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge
                    variant={
                      alert.severity === "high" ? "destructive" : alert.severity === "medium" ? "default" : "secondary"
                    }
                    className="shadow-lg"
                  >
                    {alert.severity}
                  </Badge>
                  <span className="text-xs text-gray-600 dark:text-gray-400">{alert.timestamp}</span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )

  const StreamDetailView = () => {
  if (!selectedStream) return null;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0]
  if (!file) return

  const formData = new FormData()
  formData.append("file", file)

  try {
    const res = await fetch("http://localhost:8000/videos/upload", {
      method: "POST",
      body: formData,
    })

    const data = await res.json()
    if (res.ok) {
      alert("Upload successful: " + data.filename)
    } else {
      alert("Upload failed: " + data.detail)
    }
  } catch (err) {
    alert("Upload error: " + err)
  }
}


  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
            {selectedStream.name}
          </h1>
          <p className="text-gray-600 dark:text-gray-400">Stream ID: {selectedStream.id}</p>
        </div>
        <div className="flex items-center gap-3">
          <Badge
            variant={selectedStream.status === "active" ? "default" : "secondary"}
            className="shadow-lg"
          >
            {selectedStream.status === "active" ? "Live" : "Offline"}
          </Badge>
          <Button
            variant={selectedStream.status === "active" ? "destructive" : "default"}
            className="gap-2 shadow-lg"
          >
            {selectedStream.status === "active" ? (
              <>
                <Pause className="h-4 w-4" />
                Stop Stream
              </>
            ) : (
              <>
                <Play className="h-4 w-4" />
                Start Stream
              </>
            )}
          </Button>
        </div>
      </div>


      <div className="grid gap-8 lg:grid-cols-3">
        {/* Video Preview */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="border-white/20 dark:border-white/10 bg-white/40 dark:bg-black/20 backdrop-blur-xl shadow-xl shadow-black/5 dark:shadow-black/20">
            <CardHeader>
              <CardTitle className="text-lg text-gray-900 dark:text-white">Live Preview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative aspect-video overflow-hidden rounded-lg bg-black">
                <img
                  src={selectedStream.thumbnail || "/placeholder.svg"}
                  alt={selectedStream.name}
                  className="h-full w-full object-cover"
                />
                {selectedStream.status === "active" && (
                  <div className="absolute top-4 left-4 flex items-center gap-2 rounded-full bg-red-500 px-3 py-1 text-xs font-medium text-white shadow-lg">
                    <div className="h-2 w-2 animate-pulse rounded-full bg-white" />
                    LIVE
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Stream Stats */}
        <div className="space-y-6">
          <Card className="border-white/20 dark:border-white/10 bg-white/40 dark:bg-black/20 backdrop-blur-xl shadow-xl shadow-black/5 dark:shadow-black/20">
            <CardHeader>
              <CardTitle className="text-lg text-gray-900 dark:text-white">Stream Statistics</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Resolution</span>
                <span className="text-sm font-medium text-gray-900 dark:text-white">1920x1080</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Frame Rate</span>
                <span className="text-sm font-medium text-gray-900 dark:text-white">30 FPS</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Bitrate</span>
                <span className="text-sm font-medium text-gray-900 dark:text-white">2.5 Mbps</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Uptime</span>
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  {selectedStream.uptime}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Total Detections</span>
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  {selectedStream.detectionCount}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Recent Detections */}
      <div className="space-y-4">
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Recent Detections</h3>
        <Card className="border-white/20 dark:border-white/10 bg-white/40 dark:bg-black/20 backdrop-blur-xl shadow-xl shadow-black/5 dark:shadow-black/20">
          <CardContent className="p-0">
            {detections.map((detection, index) => (
              <div
                key={detection.id}
                className={`flex items-center justify-between p-4 ${
                  index !== detections.length - 1
                    ? "border-b border-white/10 dark:border-white/5"
                    : ""
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500/20 to-purple-600/20 backdrop-blur-sm">
                    <Eye className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {detection.type} Detection
                    </p>
                    <p className="text-xs text-gray-600 dark:text-gray-300">
                      Confidence: {(detection.confidence * 100).toFixed(1)}%
                    </p>
                  </div>
                </div>
                <div className="text-right space-y-1">
                  <div className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400">
                    <Clock className="h-3 w-3" />
                    {detection.timestamp}
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-300">
                    Box: {detection.bbox.x}, {detection.bbox.y}, {detection.bbox.width}×{detection.bbox.height}
                  </p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
  };

  return (
    <div className="min-h-screen transition-colors duration-500 relative">
      <AnimatedBackground />
      <FloatingNavbar />
      <main className="container mx-auto px-4 pt-24 pb-8 relative z-10">
        {currentView === "dashboard" && <DashboardView />}
        {currentView === "stream-detail" && <StreamDetailView />}
        {currentView === "streams" && <DashboardView />}
        {currentView === "alerts" && (
          <div className="space-y-8">
            <div className="space-y-2">
              <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">Alert Center</h1>
              <p className="text-gray-600 dark:text-gray-300">Review and manage security alerts</p>
            </div>
            <Card className="border-white/20 dark:border-white/10 bg-white/40 dark:bg-black/20 backdrop-blur-xl shadow-xl shadow-black/5 dark:shadow-black/20">
              <CardContent className="p-6">
                <p className="text-gray-600 dark:text-gray-400">
                  Alert management interface would be implemented here.
                </p>
              </CardContent>
            </Card>
          </div>
        )}
        {currentView === "settings" && (
          <div className="space-y-8">
            <div className="space-y-2">
              <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">Settings</h1>
              <p className="text-gray-600 dark:text-gray-300">Configure your system preferences</p>
            </div>
            <Card className="border-white/20 dark:border-white/10 bg-white/40 dark:bg-black/20 backdrop-blur-xl shadow-xl shadow-black/5 dark:shadow-black/20">
              <CardContent className="p-6">
                <p className="text-gray-600 dark:text-gray-400">
                  System configuration options would be implemented here.
                </p>
              </CardContent>
            </Card>
          </div>
        )}
      </main>

      <style jsx>{`
        @keyframes blob {
          0% {
            transform: translate(0px, 0px) scale(1);
          }
          33% {
            transform: translate(30px, -50px) scale(1.1);
          }
          66% {
            transform: translate(-20px, 20px) scale(0.9);
          }
          100% {
            transform: translate(0px, 0px) scale(1);
          }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
        .animation-delay-6000 {
          animation-delay: 6s;
        }
      `}</style>
    </div>
  )
}
