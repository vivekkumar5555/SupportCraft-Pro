import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "react-query";
import { useAuth } from "../hooks/useAuth.jsx";
import {
  Save,
  Copy,
  Check,
  Palette,
  Bot,
  MessageSquare,
  Globe,
  Settings as SettingsIcon,
} from "lucide-react";
import { adminAPI } from "../services/api";
import LoadingSpinner from "../components/LoadingSpinner";
import toast from "react-hot-toast";

const Settings = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState("branding");

  // Get tenant data from localStorage
  const tenant = JSON.parse(localStorage.getItem("tenant") || "{}");

  // Fetch analytics to get widget key
  const { data: analytics } = useQuery("analytics", adminAPI.getAnalytics);

  // Update settings mutation
  const updateSettingsMutation = useMutation(
    (data) => adminAPI.updateSettings(data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries("analytics");
        toast.success("Settings updated successfully");
      },
      onError: (error) => {
        toast.error(error.response?.data?.error || "Failed to update settings");
      },
    }
  );

  const [brandSettings, setBrandSettings] = useState({
    primaryColor: tenant.brandSettings?.primaryColor || "#3B82F6",
    secondaryColor: tenant.brandSettings?.secondaryColor || "#1E40AF",
    botName: tenant.brandSettings?.botName || "Support Bot",
    logoUrl: tenant.brandSettings?.logoUrl || "",
    welcomeMessage:
      tenant.brandSettings?.welcomeMessage ||
      "Hello! How can I help you today?",
    placeholderText:
      tenant.brandSettings?.placeholderText || "Type your message...",
  });

  const [generalSettings, setGeneralSettings] = useState({
    responseDelay: tenant.settings?.responseDelay || 1000,
    enableTypingIndicator: tenant.settings?.enableTypingIndicator !== false,
    maxUploadSize: tenant.settings?.maxUploadSize || 10485760, // 10MB
    allowedFileTypes: tenant.settings?.allowedFileTypes || [
      "txt",
      "csv",
      "pdf",
    ],
  });

  const handleBrandSettingsChange = (field, value) => {
    setBrandSettings((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleGeneralSettingsChange = (field, value) => {
    setGeneralSettings((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSaveBrandSettings = () => {
    updateSettingsMutation.mutate({
      brandSettings,
    });
  };

  const handleSaveGeneralSettings = () => {
    updateSettingsMutation.mutate({
      settings: generalSettings,
    });
  };

  const copyWidgetCode = async () => {
    const widgetCode = `<script src="https://your-domain.com/widget/loader.js" data-widget-key="${tenant.widgetKey}"></script>`;

    try {
      await navigator.clipboard.writeText(widgetCode);
      setCopied(true);
      toast.success("Widget code copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error("Failed to copy widget code");
    }
  };

  const tabs = [
    { id: "branding", name: "Branding", icon: Palette },
    { id: "general", name: "General", icon: SettingsIcon },
    { id: "widget", name: "Widget Code", icon: Globe },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="mt-1 text-sm text-gray-500">
          Configure your chatbot widget and brand settings
        </p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? "border-primary-500 text-primary-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                <Icon className="h-4 w-4 mr-2" />
                {tab.name}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Branding Settings */}
      {activeTab === "branding" && (
        <div className="space-y-6">
          <div className="card">
            <div className="card-header">
              <h3 className="text-lg font-medium text-gray-900">
                Brand Settings
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                Customize the appearance of your chatbot widget
              </p>
            </div>
            <div className="card-body space-y-6">
              {/* Colors */}
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div>
                  <label className="label">Primary Color</label>
                  <div className="flex items-center space-x-3">
                    <input
                      type="color"
                      value={brandSettings.primaryColor}
                      onChange={(e) =>
                        handleBrandSettingsChange(
                          "primaryColor",
                          e.target.value
                        )
                      }
                      className="h-10 w-20 rounded border border-gray-300"
                    />
                    <input
                      type="text"
                      value={brandSettings.primaryColor}
                      onChange={(e) =>
                        handleBrandSettingsChange(
                          "primaryColor",
                          e.target.value
                        )
                      }
                      className="input flex-1"
                      placeholder="#3B82F6"
                    />
                  </div>
                </div>

                <div>
                  <label className="label">Secondary Color</label>
                  <div className="flex items-center space-x-3">
                    <input
                      type="color"
                      value={brandSettings.secondaryColor}
                      onChange={(e) =>
                        handleBrandSettingsChange(
                          "secondaryColor",
                          e.target.value
                        )
                      }
                      className="h-10 w-20 rounded border border-gray-300"
                    />
                    <input
                      type="text"
                      value={brandSettings.secondaryColor}
                      onChange={(e) =>
                        handleBrandSettingsChange(
                          "secondaryColor",
                          e.target.value
                        )
                      }
                      className="input flex-1"
                      placeholder="#1E40AF"
                    />
                  </div>
                </div>
              </div>

              {/* Bot Name */}
              <div>
                <label className="label">Bot Name</label>
                <input
                  type="text"
                  value={brandSettings.botName}
                  onChange={(e) =>
                    handleBrandSettingsChange("botName", e.target.value)
                  }
                  className="input"
                  placeholder="Support Bot"
                />
              </div>

              {/* Logo URL */}
              <div>
                <label className="label">Logo URL (optional)</label>
                <input
                  type="url"
                  value={brandSettings.logoUrl}
                  onChange={(e) =>
                    handleBrandSettingsChange("logoUrl", e.target.value)
                  }
                  className="input"
                  placeholder="https://example.com/logo.png"
                />
              </div>

              {/* Welcome Message */}
              <div>
                <label className="label">Welcome Message</label>
                <textarea
                  value={brandSettings.welcomeMessage}
                  onChange={(e) =>
                    handleBrandSettingsChange("welcomeMessage", e.target.value)
                  }
                  className="input"
                  rows={3}
                  placeholder="Hello! How can I help you today?"
                />
              </div>

              {/* Placeholder Text */}
              <div>
                <label className="label">Input Placeholder Text</label>
                <input
                  type="text"
                  value={brandSettings.placeholderText}
                  onChange={(e) =>
                    handleBrandSettingsChange("placeholderText", e.target.value)
                  }
                  className="input"
                  placeholder="Type your message..."
                />
              </div>
            </div>
            <div className="card-footer">
              <button
                onClick={handleSaveBrandSettings}
                disabled={updateSettingsMutation.isLoading}
                className="btn-primary"
              >
                {updateSettingsMutation.isLoading ? (
                  <LoadingSpinner size="sm" className="mr-2" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Save Brand Settings
              </button>
            </div>
          </div>
        </div>
      )}

      {/* General Settings */}
      {activeTab === "general" && (
        <div className="space-y-6">
          <div className="card">
            <div className="card-header">
              <h3 className="text-lg font-medium text-gray-900">
                General Settings
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                Configure chatbot behavior and file upload settings
              </p>
            </div>
            <div className="card-body space-y-6">
              {/* Response Delay */}
              <div>
                <label className="label">Response Delay (milliseconds)</label>
                <input
                  type="number"
                  value={generalSettings.responseDelay}
                  onChange={(e) =>
                    handleGeneralSettingsChange(
                      "responseDelay",
                      parseInt(e.target.value)
                    )
                  }
                  className="input"
                  min="0"
                  max="5000"
                  step="100"
                />
                <p className="mt-1 text-sm text-gray-500">
                  How long to wait before showing the bot's response (0-5000ms)
                </p>
              </div>

              {/* Typing Indicator */}
              <div>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={generalSettings.enableTypingIndicator}
                    onChange={(e) =>
                      handleGeneralSettingsChange(
                        "enableTypingIndicator",
                        e.target.checked
                      )
                    }
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <span className="ml-2 text-sm font-medium text-gray-700">
                    Enable typing indicator
                  </span>
                </label>
                <p className="mt-1 text-sm text-gray-500">
                  Show a typing indicator while the bot is processing responses
                </p>
              </div>

              {/* Max Upload Size */}
              <div>
                <label className="label">Maximum Upload Size (bytes)</label>
                <input
                  type="number"
                  value={generalSettings.maxUploadSize}
                  onChange={(e) =>
                    handleGeneralSettingsChange(
                      "maxUploadSize",
                      parseInt(e.target.value)
                    )
                  }
                  className="input"
                  min="1048576"
                  max="104857600"
                  step="1048576"
                />
                <p className="mt-1 text-sm text-gray-500">
                  Maximum file size for document uploads (1MB - 100MB)
                </p>
              </div>

              {/* Allowed File Types */}
              <div>
                <label className="label">Allowed File Types</label>
                <div className="space-y-2">
                  {["txt", "csv", "pdf"].map((type) => (
                    <label key={type} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={generalSettings.allowedFileTypes.includes(
                          type
                        )}
                        onChange={(e) => {
                          const newTypes = e.target.checked
                            ? [...generalSettings.allowedFileTypes, type]
                            : generalSettings.allowedFileTypes.filter(
                                (t) => t !== type
                              );
                          handleGeneralSettingsChange(
                            "allowedFileTypes",
                            newTypes
                          );
                        }}
                        className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      />
                      <span className="ml-2 text-sm text-gray-700 uppercase">
                        {type}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <div className="card-footer">
              <button
                onClick={handleSaveGeneralSettings}
                disabled={updateSettingsMutation.isLoading}
                className="btn-primary"
              >
                {updateSettingsMutation.isLoading ? (
                  <LoadingSpinner size="sm" className="mr-2" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Save General Settings
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Widget Code */}
      {activeTab === "widget" && (
        <div className="space-y-6">
          <div className="card">
            <div className="card-header">
              <h3 className="text-lg font-medium text-gray-900">
                Widget Integration
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                Copy and paste this code into your website to embed the chatbot
              </p>
            </div>
            <div className="card-body space-y-6">
              {/* Widget Key */}
              <div>
                <label className="label">Widget Key</label>
                <div className="flex items-center space-x-3">
                  <input
                    type="text"
                    value={tenant.widgetKey || "Loading..."}
                    readOnly
                    className="input bg-gray-50"
                  />
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(tenant.widgetKey);
                      toast.success("Widget key copied!");
                    }}
                    className="btn-secondary"
                  >
                    <Copy className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Embed Code */}
              <div>
                <label className="label">Embed Code</label>
                <div className="space-y-3">
                  <textarea
                    value={`<script src="https://your-domain.com/widget/loader.js" data-widget-key="${tenant.widgetKey}"></script>`}
                    readOnly
                    className="input font-mono text-sm"
                    rows={3}
                  />
                  <button onClick={copyWidgetCode} className="btn-primary">
                    {copied ? (
                      <Check className="h-4 w-4 mr-2" />
                    ) : (
                      <Copy className="h-4 w-4 mr-2" />
                    )}
                    {copied ? "Copied!" : "Copy Embed Code"}
                  </button>
                </div>
              </div>

              {/* Instructions */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="text-sm font-medium text-blue-900 mb-2">
                  Integration Instructions
                </h4>
                <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
                  <li>Copy the embed code above</li>
                  <li>
                    Paste it before the closing &lt;/body&gt; tag of your
                    website
                  </li>
                  <li>The chatbot will automatically appear on your site</li>
                  <li>Customize the appearance using the brand settings</li>
                </ol>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;
