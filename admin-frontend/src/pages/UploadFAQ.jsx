import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "react-query";
import {
  Upload,
  FileText,
  Trash2,
  Download,
  AlertCircle,
  CheckCircle,
  Clock,
  XCircle,
} from "lucide-react";
import { adminAPI } from "../services/api";
import LoadingSpinner from "../components/LoadingSpinner";
import UploadProgress from "../components/UploadProgress";
import toast from "react-hot-toast";

const UploadFAQ = () => {
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [activeUploads, setActiveUploads] = useState([]);
  const fileInputRef = useRef(null);
  const queryClient = useQueryClient();

  // Fetch documents
  const { data: documents, isLoading } = useQuery(
    "documents",
    async () => {
      const response = await adminAPI.getDocuments({ limit: 50 });
      return response.data;
    },
    {
      refetchInterval: 5000, // Refetch every 5 seconds to show processing status
    }
  );

  // Delete document mutation
  const deleteDocumentMutation = useMutation(
    (documentId) => adminAPI.deleteDocument(documentId),
    {
      onSuccess: () => {
        queryClient.invalidateQueries("documents");
        toast.success("Document deleted successfully");
      },
      onError: (error) => {
        toast.error(error.response?.data?.error || "Failed to delete document");
      },
    }
  );

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleFiles = async (files) => {
    const formData = new FormData();
    const validFiles = [];

    Array.from(files).forEach((file) => {
      // Validate file type
      const allowedTypes = ["text/plain", "text/csv", "application/pdf"];
      if (!allowedTypes.includes(file.type)) {
        toast.error(
          `Invalid file type: ${file.name}. Only TXT, CSV, and PDF files are allowed.`
        );
        return;
      }

      // Validate file size (10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast.error(`File too large: ${file.name}. Maximum size is 10MB.`);
        return;
      }

      formData.append("documents", file);
      validFiles.push(file);
    });

    if (formData.getAll("documents").length === 0) {
      return;
    }

    setUploading(true);
    try {
      const response = await adminAPI.uploadDocuments(formData);

      // Handle 202 response with upload IDs
      if (response.data && response.data.results) {
        const uploads = response.data.results
          .filter((result) => result.status === "received" && result.uploadId)
          .map((result) => ({
            uploadId: result.uploadId,
            filename: result.filename,
          }));

        setActiveUploads((prev) => [...prev, ...uploads]);

        if (uploads.length > 0) {
          // Success toast will be shown after processing completes
          console.log(`${uploads.length} file(s) queued for processing`);
        }

        // Show errors for failed uploads
        response.data.results
          .filter((result) => result.status === "failed")
          .forEach((result) => {
            toast.error(`${result.filename}: ${result.error}`);
          });
      }
    } catch (error) {
      toast.error(error.response?.data?.error || "Failed to upload documents");
    } finally {
      setUploading(false);
    }
  };

  const handleFileInput = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFiles(e.target.files);
    }
  };

  const handleDelete = (documentId) => {
    if (window.confirm("Are you sure you want to delete this document?")) {
      deleteDocumentMutation.mutate(documentId);
    }
  };

  const handleUploadComplete = (uploadId, data) => {
    console.log(`Upload completed: ${uploadId}`, data);
    // Remove from active uploads
    setActiveUploads((prev) =>
      prev.filter((upload) => upload.uploadId !== uploadId)
    );
    // Force immediate refresh of document list
    queryClient.invalidateQueries("documents");
    queryClient.refetchQueries("documents");
    toast.success(
      `✓ Document indexed: ${data.chunkCount} chunks, ${data.embeddingCount} embeddings`
    );
  };

  const handleUploadError = (uploadId, error) => {
    console.error(`Upload failed: ${uploadId}`, error);
    // Remove from active uploads
    setActiveUploads((prev) =>
      prev.filter((upload) => upload.uploadId !== uploadId)
    );
    // Refresh document list to show failed status
    queryClient.invalidateQueries("documents");
    toast.error(`Upload failed: ${error}`);
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

  const formatFileSize = (bytes) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
          Upload FAQ Documents
        </h1>
        <p className="mt-1 text-xs sm:text-sm text-gray-500">
          Upload your FAQ documents to train your chatbot. Supported formats:
          TXT, CSV, PDF
        </p>
      </div>

      {/* Upload Area */}
      <div className="card">
        <div className="card-body">
          <div
            className={`relative border-2 border-dashed rounded-lg p-6 transition-colors ${
              dragActive
                ? "border-primary-400 bg-primary-50"
                : "border-gray-300 hover:border-gray-400"
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".txt,.csv,.pdf"
              onChange={handleFileInput}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              disabled={uploading}
            />

            <div className="text-center">
              <Upload className="mx-auto h-12 w-12 text-gray-400" />
              <div className="mt-4">
                <p className="text-sm text-gray-600">
                  <span className="font-medium text-primary-600 hover:text-primary-500">
                    Click to upload
                  </span>{" "}
                  or drag and drop
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  TXT, CSV, PDF files up to 10MB each
                </p>
              </div>
            </div>
          </div>

          {uploading && (
            <div className="mt-4 flex items-center justify-center">
              <LoadingSpinner size="sm" className="mr-2" />
              <span className="text-sm text-gray-600">
                Uploading documents...
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Active Uploads Progress */}
      {activeUploads.length > 0 && (
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-medium text-gray-900">
              Processing Uploads
            </h3>
          </div>
          <div className="card-body">
            <div className="space-y-3">
              {activeUploads.map((upload) => (
                <UploadProgress
                  key={upload.uploadId}
                  uploadId={upload.uploadId}
                  filename={upload.filename}
                  onComplete={handleUploadComplete}
                  onError={handleUploadError}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Documents List */}
      <div className="card">
        <div className="card-header">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900">
              Uploaded Documents
            </h3>
            {documents?.documents?.length > 0 && (
              <span className="text-sm text-gray-500">
                {documents.documents.length} document(s)
                {documents.pagination?.total > documents.documents.length &&
                  ` of ${documents.pagination.total} total`}
              </span>
            )}
          </div>
        </div>
        <div className="card-body">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <LoadingSpinner size="lg" />
            </div>
          ) : documents?.documents?.length > 0 ? (
            <div className="space-y-4">
              {documents.documents.map((doc) => (
                <div
                  key={doc._id}
                  className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 border border-gray-200 rounded-lg gap-3"
                >
                  <div className="flex items-start sm:items-center space-x-3 flex-1 min-w-0">
                    <div className="flex-shrink-0 mt-0.5 sm:mt-0">
                      {getStatusIcon(doc.processingStatus)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-medium text-gray-900 truncate">
                        {doc.originalName}
                      </h4>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500 mt-1">
                        <span className="whitespace-nowrap">
                          {formatFileSize(doc.fileSize)}
                        </span>
                        <span className="whitespace-nowrap">
                          {doc.chunkCount} chunks
                        </span>
                        <span className="whitespace-nowrap">
                          {doc.embeddingCount} embeddings
                        </span>
                        <span className="hidden sm:inline whitespace-nowrap">
                          Uploaded {formatDate(doc.createdAt)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end space-x-3 flex-shrink-0">
                    <div className="flex items-center space-x-2">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                          doc.processingStatus
                        )}`}
                      >
                        {doc.processingStatus}
                      </span>

                      {doc.processingStatus === "processing" && (
                        <div className="text-xs text-gray-500 font-medium">
                          {doc.chunkCount > 0
                            ? Math.round(
                                (doc.embeddingCount / doc.chunkCount) * 100
                              )
                            : 0}
                          %
                        </div>
                      )}
                    </div>

                    <button
                      onClick={() => handleDelete(doc._id)}
                      className="text-red-600 hover:text-red-800 transition-colors p-1"
                      disabled={deleteDocumentMutation.isLoading}
                      aria-label="Delete document"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <FileText className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">
                No documents uploaded
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                Get started by uploading your first FAQ document.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Tips */}
      <div className="card">
        <div className="card-header">
          <h3 className="text-base sm:text-lg font-medium text-gray-900">
            Upload Tips
          </h3>
        </div>
        <div className="card-body">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div>
              <h4 className="text-sm font-medium text-gray-900">
                Supported Formats
              </h4>
              <ul className="mt-2 text-sm text-gray-600 space-y-1">
                <li>
                  • <strong>TXT:</strong> Plain text files with FAQ content
                </li>
                <li>
                  • <strong>CSV:</strong> Structured data with question/answer
                  columns
                </li>
                <li>
                  • <strong>PDF:</strong> Documents with extractable text
                </li>
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-medium text-gray-900">
                Best Practices
              </h4>
              <ul className="mt-2 text-sm text-gray-600 space-y-1">
                <li>• Keep documents under 10MB each</li>
                <li>• Use clear, concise language</li>
                <li>• Include relevant keywords</li>
                <li>• Organize content logically</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UploadFAQ;
