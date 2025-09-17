"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Upload,
  FileText,
  Users,
  MessageSquare,
  Globe,
  AlertCircle,
  CheckCircle,
  Trash2,
  Download,
  RefreshCw,
} from "lucide-react"

interface Document {
  id: string
  title: string
  filename: string
  size: number
  uploadDate: string
  status: "indexed" | "processing" | "error"
  chunks: number
}

interface HandoffRequest {
  id: string
  userId: string
  timestamp: string
  status: "pending" | "assigned" | "resolved"
  assignedTo?: string
  conversation: Array<{ sender: string; message: string; timestamp: string }>
  priority: "low" | "medium" | "high"
}

interface SystemStats {
  totalDocuments: number
  totalChunks: number
  totalQueries: number
  avgResponseTime: number
  activeUsers: number
  handoffRequests: number
}

export function AdminDashboard() {
  const [documents, setDocuments] = useState<Document[]>([])
  const [handoffRequests, setHandoffRequests] = useState<HandoffRequest[]>([])
  const [systemStats, setSystemStats] = useState<SystemStats>({
    totalDocuments: 0,
    totalChunks: 0,
    totalQueries: 0,
    avgResponseTime: 0,
    activeUsers: 0,
    handoffRequests: 0,
  })
  const [isLoading, setIsLoading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    setIsLoading(true)
    try {
      // Load documents
      const docsResponse = await fetch("/api/admin/documents")
      if (docsResponse.ok) {
        const docsData = await docsResponse.json()
        setDocuments(docsData.documents || [])
      }

      // Load handoff requests
      const handoffResponse = await fetch("/api/admin/handoffs")
      if (handoffResponse.ok) {
        const handoffData = await handoffResponse.json()
        setHandoffRequests(handoffData.requests || [])
      }

      // Load system stats
      const statsResponse = await fetch("/api/admin/stats")
      if (statsResponse.ok) {
        const statsData = await statsResponse.json()
        setSystemStats(statsData)
      }
    } catch (error) {
      console.error("[v0] Failed to load dashboard data:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleFileUpload = async () => {
    if (!selectedFile) return

    setIsLoading(true)
    setUploadProgress(0)

    try {
      const formData = new FormData()
      formData.append("file", selectedFile)

      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => Math.min(prev + 10, 90))
      }, 200)

      const response = await fetch("/api/admin/upload", {
        method: "POST",
        body: formData,
      })

      clearInterval(progressInterval)
      setUploadProgress(100)

      if (response.ok) {
        const result = await response.json()
        console.log("[v0] Upload successful:", result)
        await loadDashboardData() // Refresh data
        setSelectedFile(null)
        setUploadProgress(0)
      } else {
        throw new Error("Upload failed")
      }
    } catch (error) {
      console.error("[v0] Upload error:", error)
      setUploadProgress(0)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteDocument = async (docId: string) => {
    try {
      const response = await fetch(`/api/admin/documents/${docId}`, {
        method: "DELETE",
      })

      if (response.ok) {
        setDocuments((prev) => prev.filter((doc) => doc.id !== docId))
      }
    } catch (error) {
      console.error("[v0] Delete error:", error)
    }
  }

  const handleAssignHandoff = async (requestId: string, volunteerId: string) => {
    try {
      const response = await fetch(`/api/admin/handoffs/${requestId}/assign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ volunteerId }),
      })

      if (response.ok) {
        await loadDashboardData()
      }
    } catch (error) {
      console.error("[v0] Assignment error:", error)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "indexed":
      case "resolved":
        return "bg-green-100 text-green-800"
      case "processing":
      case "pending":
        return "bg-yellow-100 text-yellow-800"
      case "error":
        return "bg-red-100 text-red-800"
      case "assigned":
        return "bg-blue-100 text-blue-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "bg-red-100 text-red-800"
      case "medium":
        return "bg-yellow-100 text-yellow-800"
      case "low":
        return "bg-green-100 text-green-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-card border-b border-border p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-card-foreground">Admin Dashboard</h1>
            <p className="text-muted-foreground">Multilingual Education Chatbot Management</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={loadDashboardData} disabled={isLoading}>
              <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Badge variant="secondary" className="bg-primary/10 text-primary">
              Admin Panel
            </Badge>
          </div>
        </div>
      </div>

      <div className="p-6">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Documents</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{systemStats.totalDocuments}</div>
              <p className="text-xs text-muted-foreground">{systemStats.totalChunks} chunks indexed</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Queries</CardTitle>
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{systemStats.totalQueries}</div>
              <p className="text-xs text-muted-foreground">{systemStats.avgResponseTime}ms avg response</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{systemStats.activeUsers}</div>
              <p className="text-xs text-muted-foreground">Currently online</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Handoff Requests</CardTitle>
              <AlertCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{systemStats.handoffRequests}</div>
              <p className="text-xs text-muted-foreground">Pending human assistance</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="documents" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="documents">Documents</TabsTrigger>
            <TabsTrigger value="handoffs">Handoffs</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          {/* Documents Tab */}
          <TabsContent value="documents" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Document Management</CardTitle>
                <CardDescription>Upload and manage knowledge base documents</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Upload Section */}
                <div className="border-2 border-dashed border-border rounded-lg p-6">
                  <div className="text-center space-y-4">
                    <Upload className="mx-auto h-12 w-12 text-muted-foreground" />
                    <div>
                      <Label htmlFor="file-upload" className="cursor-pointer">
                        <span className="text-sm font-medium text-primary hover:text-primary/80">
                          Choose file to upload
                        </span>
                        <Input
                          id="file-upload"
                          type="file"
                          className="hidden"
                          accept=".txt,.pdf,.doc,.docx"
                          onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                        />
                      </Label>
                      <p className="text-xs text-muted-foreground mt-1">
                        Supports TXT, PDF, DOC, DOCX files up to 10MB
                      </p>
                    </div>
                    {selectedFile && (
                      <div className="space-y-2">
                        <p className="text-sm">Selected: {selectedFile.name}</p>
                        <Button onClick={handleFileUpload} disabled={isLoading}>
                          {isLoading ? "Uploading..." : "Upload Document"}
                        </Button>
                        {uploadProgress > 0 && (
                          <div className="w-full max-w-xs mx-auto">
                            <Progress value={uploadProgress} className="w-full" />
                            <p className="text-xs text-center mt-1">{uploadProgress}%</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Documents List */}
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold">Uploaded Documents</h3>
                  {documents.length === 0 ? (
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        No documents uploaded yet. Upload your first document to get started.
                      </AlertDescription>
                    </Alert>
                  ) : (
                    <div className="space-y-2">
                      {documents.map((doc) => (
                        <Card key={doc.id}>
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-3">
                                <FileText className="h-5 w-5 text-muted-foreground" />
                                <div>
                                  <p className="font-medium">{doc.title}</p>
                                  <p className="text-sm text-muted-foreground">
                                    {doc.filename} • {(doc.size / 1024).toFixed(1)} KB • {doc.chunks} chunks
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center space-x-2">
                                <Badge className={getStatusColor(doc.status)}>{doc.status}</Badge>
                                <Button variant="ghost" size="sm">
                                  <Download className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDeleteDocument(doc.id)}
                                  className="text-destructive hover:text-destructive"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Handoffs Tab */}
          <TabsContent value="handoffs" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Human Handoff Requests</CardTitle>
                <CardDescription>Manage user requests for human assistance</CardDescription>
              </CardHeader>
              <CardContent>
                {handoffRequests.length === 0 ? (
                  <Alert>
                    <CheckCircle className="h-4 w-4" />
                    <AlertDescription>
                      No pending handoff requests. All users are being served by the chatbot.
                    </AlertDescription>
                  </Alert>
                ) : (
                  <div className="space-y-4">
                    {handoffRequests.map((request) => (
                      <Card key={request.id}>
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="space-y-2">
                              <div className="flex items-center space-x-2">
                                <Badge className={getStatusColor(request.status)}>{request.status}</Badge>
                                <Badge className={getPriorityColor(request.priority)}>{request.priority}</Badge>
                                <span className="text-sm text-muted-foreground">
                                  User: {request.userId} • {new Date(request.timestamp).toLocaleString()}
                                </span>
                              </div>
                              <div className="text-sm">
                                <p className="font-medium">Recent conversation:</p>
                                <div className="mt-1 space-y-1 max-h-32 overflow-y-auto">
                                  {request.conversation.slice(-3).map((msg, idx) => (
                                    <p key={idx} className="text-xs">
                                      <span className="font-medium">{msg.sender}:</span> {msg.message}
                                    </p>
                                  ))}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              {request.status === "pending" && (
                                <Select onValueChange={(value) => handleAssignHandoff(request.id, value)}>
                                  <SelectTrigger className="w-40">
                                    <SelectValue placeholder="Assign to..." />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="volunteer1">Volunteer 1</SelectItem>
                                    <SelectItem value="volunteer2">Volunteer 2</SelectItem>
                                    <SelectItem value="admin">Admin</SelectItem>
                                  </SelectContent>
                                </Select>
                              )}
                              <Button variant="outline" size="sm">
                                View Full Chat
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>Query Analytics</CardTitle>
                  <CardDescription>Most common user queries and intents</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Fee Information</span>
                      <div className="flex items-center space-x-2">
                        <Progress value={85} className="w-20" />
                        <span className="text-sm text-muted-foreground">85%</span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Admission Process</span>
                      <div className="flex items-center space-x-2">
                        <Progress value={72} className="w-20" />
                        <span className="text-sm text-muted-foreground">72%</span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Timetable Queries</span>
                      <div className="flex items-center space-x-2">
                        <Progress value={58} className="w-20" />
                        <span className="text-sm text-muted-foreground">58%</span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Contact Information</span>
                      <div className="flex items-center space-x-2">
                        <Progress value={45} className="w-20" />
                        <span className="text-sm text-muted-foreground">45%</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Language Distribution</CardTitle>
                  <CardDescription>User queries by language</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center space-x-2">
                        <Globe className="h-4 w-4" />
                        <span className="text-sm">English</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Progress value={60} className="w-20" />
                        <span className="text-sm text-muted-foreground">60%</span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <div className="flex items-center space-x-2">
                        <Globe className="h-4 w-4" />
                        <span className="text-sm">Hindi</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Progress value={25} className="w-20" />
                        <span className="text-sm text-muted-foreground">25%</span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <div className="flex items-center space-x-2">
                        <Globe className="h-4 w-4" />
                        <span className="text-sm">Marathi</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Progress value={10} className="w-20" />
                        <span className="text-sm text-muted-foreground">10%</span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <div className="flex items-center space-x-2">
                        <Globe className="h-4 w-4" />
                        <span className="text-sm">Marwari</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Progress value={5} className="w-20" />
                        <span className="text-sm text-muted-foreground">5%</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>System Configuration</CardTitle>
                  <CardDescription>Configure chatbot behavior and settings</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="confidence-threshold">Confidence Threshold</Label>
                    <Input
                      id="confidence-threshold"
                      type="number"
                      min="0"
                      max="1"
                      step="0.1"
                      defaultValue="0.7"
                      placeholder="0.7"
                    />
                    <p className="text-xs text-muted-foreground">Minimum confidence score for automated responses</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="max-results">Max Search Results</Label>
                    <Input id="max-results" type="number" min="1" max="10" defaultValue="5" />
                    <p className="text-xs text-muted-foreground">Maximum documents to retrieve for each query</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="default-language">Default Response Language</Label>
                    <Select defaultValue="en">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="en">English</SelectItem>
                        <SelectItem value="hi">Hindi</SelectItem>
                        <SelectItem value="mr">Marathi</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <Button className="w-full">Save Configuration</Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>System Status</CardTitle>
                  <CardDescription>Current system health and performance</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Vector Database</span>
                    <Badge className="bg-green-100 text-green-800">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Online
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm">Translation Service</span>
                    <Badge className="bg-green-100 text-green-800">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Online
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm">NLU Engine</span>
                    <Badge className="bg-green-100 text-green-800">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Online
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm">Cache Service</span>
                    <Badge className="bg-green-100 text-green-800">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Online
                    </Badge>
                  </div>

                  <div className="pt-4 border-t">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm">Memory Usage</span>
                      <span className="text-sm text-muted-foreground">2.1 GB / 4 GB</span>
                    </div>
                    <Progress value={52} />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm">Storage Usage</span>
                      <span className="text-sm text-muted-foreground">1.8 GB / 10 GB</span>
                    </div>
                    <Progress value={18} />
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
