import { useState, useEffect } from "react";
import { useQuery } from "react-query";
import {
  FileText,
  Upload,
  MessageSquare,
  Users,
  TrendingUp,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
} from "lucide-react";
import { adminAPI, chatAPI } from "../services/api";
import LoadingSpinner from "../components/LoadingSpinner";
import ChatTest from "../components/ChatTest";

const Dashboard = () => {
  const [testMessage, setTestMessage] = useState("");
  const [testResponse, setTestResponse] = useState(null);
  const [testing, setTesting] = useState(false);

  // Fetch analytics data
  const { data: analytics, isLoading: analyticsLoading } = useQuery(
    "analytics",
    adminAPI.getAnalytics,
    {
      refetchInterval: 30000, // Refetch every 30 seconds
    }
  );

  // Fetch documents
  const { data: documents, isLoading: documentsLoading } = useQuery(
    "documents",
    () => adminAPI.getDocuments({ limit: 5 }),
    {
      refetchInterval: 30000,
    }
  );

  const handleTestChat = async () => {
    if (!testMessage.trim()) return;

    setTesting(true);
    try {
      const response = await chatAPI.testQuery(testMessage);
      setTestResponse(response.data);
    } catch (error) {
      console.error("Test chat error:", error);
    } finally {
      setTesting(false);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case "processing":
        return <Clock className="h-5 w-5 text-yellow-500" />;
      case "failed":
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <AlertCircle className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "completed":
        return "text-green-600 bg-green-100";
      case "processing":
        return "text-yellow-600 bg-yellow-100";
      case "failed":
        return "text-red-600 bg-red-100";
      default:
        return "text-gray-600 bg-gray-100";
    }
  };

  if (analyticsLoading || documentsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500">
          Overview of your support widget and knowledge base
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <div className="card">
          <div className="card-body">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <FileText className="h-8 w-8 text-primary-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Total Documents
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {analytics?.analytics?.documents?.reduce(
                      (sum, doc) => sum + doc.count,
                      0
                    ) || 0}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-body">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <TrendingUp className="h-8 w-8 text-green-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Total Embeddings
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {analytics?.analytics?.totalEmbeddings || 0}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-body">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <CheckCircle className="h-8 w-8 text-blue-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Processed Documents
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {analytics?.analytics?.documents?.find(
                      (d) => d._id === "completed"
                    )?.count || 0}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-body">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <MessageSquare className="h-8 w-8 text-purple-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Widget Status
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">Active</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Recent Documents */}
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-medium text-gray-900">
              Recent Documents
            </h3>
          </div>
          <div className="card-body">
            {documents?.documents?.length > 0 ? (
              <div className="space-y-4">
                {documents.documents.map((doc) => (
                  <div
                    key={doc._id}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center">
                      {getStatusIcon(doc.processingStatus)}
                      <div className="ml-3">
                        <p className="text-sm font-medium text-gray-900">
                          {doc.originalName}
                        </p>
                        <p className="text-sm text-gray-500">
                          {(doc.fileSize / (1024 * 1024)).toFixed(2)} MB •{" "}
                          {doc.chunkCount} chunks
                        </p>
                      </div>
                    </div>
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                        doc.processingStatus
                      )}`}
                    >
                      {doc.processingStatus}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6">
                <FileText className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">
                  No documents
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  Get started by uploading your first FAQ document.
                </p>
                <div className="mt-6">
                  <a href="/upload" className="btn-primary">
                    <Upload className="h-4 w-4 mr-2" />
                    Upload Document
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Chat Test */}
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-medium text-gray-900">Test Chat</h3>
          </div>
          <div className="card-body">
            <ChatTest />
          </div>
        </div>
      </div>

      {/* Document Status Overview */}
      {analytics?.analytics?.documents?.length > 0 && (
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-medium text-gray-900">
              Document Status
            </h3>
          </div>
          <div className="card-body">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {analytics.analytics.documents.map((status) => (
                <div key={status._id} className="text-center">
                  <div className="text-2xl font-bold text-gray-900">
                    {status.count}
                  </div>
                  <div className="text-sm text-gray-500 capitalize">
                    {status._id}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
