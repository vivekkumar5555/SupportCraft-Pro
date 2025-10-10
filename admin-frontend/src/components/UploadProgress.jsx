import { useEffect, useState } from "react";
import { CheckCircle, XCircle, Clock, Loader, AlertCircle } from "lucide-react";
import { adminAPI } from "../services/api";
import PropTypes from "prop-types";

const UploadProgress = ({ uploadId, filename, onComplete, onError }) => {
  const [status, setStatus] = useState({
    status: "pending",
    progress: 0,
    message: "Initializing...",
    error: null,
  });

  useEffect(() => {
    if (!uploadId) return;

    let pollInterval;
    let isMounted = true;

    const pollStatus = async () => {
      try {
        const response = await adminAPI.getUploadStatus(uploadId);

        if (!isMounted) return;

        setStatus({
          status: response.data.status,
          progress: response.data.progress,
          message: response.data.message,
          error: response.data.error,
          chunkCount: response.data.chunkCount,
          embeddingCount: response.data.embeddingCount,
        });

        // Stop polling if completed or failed
        if (response.data.status === "completed") {
          clearInterval(pollInterval);
          if (onComplete) {
            onComplete(uploadId, response.data);
          }
        } else if (response.data.status === "failed") {
          clearInterval(pollInterval);
          if (onError) {
            onError(uploadId, response.data.error);
          }
        }
      } catch (error) {
        console.error("Error polling upload status:", error);
        if (!isMounted) return;

        // Don't stop polling on error - might be temporary
        setStatus((prev) => ({
          ...prev,
          message: "Error checking status, retrying...",
        }));
      }
    };

    // Initial poll
    pollStatus();

    // Poll every 2 seconds
    pollInterval = setInterval(pollStatus, 2000);

    return () => {
      isMounted = false;
      clearInterval(pollInterval);
    };
  }, [uploadId, onComplete, onError]);

  const getStatusIcon = () => {
    switch (status.status) {
      case "completed":
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case "failed":
        return <XCircle className="h-5 w-5 text-red-500" />;
      case "processing":
        return <Loader className="h-5 w-5 text-blue-500 animate-spin" />;
      case "pending":
        return <Clock className="h-5 w-5 text-yellow-500" />;
      default:
        return <AlertCircle className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusColor = () => {
    switch (status.status) {
      case "completed":
        return "bg-green-100 border-green-300";
      case "failed":
        return "bg-red-100 border-red-300";
      case "processing":
        return "bg-blue-100 border-blue-300";
      case "pending":
        return "bg-yellow-100 border-yellow-300";
      default:
        return "bg-gray-100 border-gray-300";
    }
  };

  return (
    <div className={`border rounded-lg p-4 ${getStatusColor()}`}>
      <div className="flex items-start space-x-3">
        <div className="flex-shrink-0 mt-1">{getStatusIcon()}</div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 truncate">
            {filename}
          </p>

          <p className="text-xs text-gray-600 mt-1">{status.message}</p>

          {status.status === "processing" && (
            <div className="mt-2">
              <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                <span>Progress</span>
                <span>{status.progress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${status.progress}%` }}
                />
              </div>
              {status.embeddingCount > 0 && (
                <p className="text-xs text-gray-500 mt-1">
                  {status.embeddingCount} / {status.chunkCount} chunks processed
                </p>
              )}
            </div>
          )}

          {status.status === "completed" && (
            <p className="text-xs text-green-600 mt-1">
              ✓ Indexed {status.chunkCount} chunks with {status.embeddingCount}{" "}
              embeddings
            </p>
          )}

          {status.status === "failed" && status.error && (
            <p className="text-xs text-red-600 mt-1">✗ Error: {status.error}</p>
          )}
        </div>
      </div>
    </div>
  );
};

UploadProgress.propTypes = {
  uploadId: PropTypes.string.isRequired,
  filename: PropTypes.string.isRequired,
  onComplete: PropTypes.func,
  onError: PropTypes.func,
};

export default UploadProgress;

