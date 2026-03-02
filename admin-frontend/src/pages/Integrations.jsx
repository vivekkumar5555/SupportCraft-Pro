import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "react-query";
import {
  MessageCircle,
  Instagram,
  Save,
  CheckCircle2,
  XCircle,
  Copy,
  ExternalLink,
  Eye,
  EyeOff,
  Info,
  Loader2,
} from "lucide-react";
import { adminAPI } from "../services/api";
import LoadingSpinner from "../components/LoadingSpinner";
import toast from "react-hot-toast";

const STATUS_BADGE = {
  connected: (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700">
      <CheckCircle2 className="h-3.5 w-3.5" /> Connected
    </span>
  ),
  disconnected: (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600">
      <XCircle className="h-3.5 w-3.5" /> Not Connected
    </span>
  ),
};

const TokenInput = ({ value, onChange, placeholder }) => {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <input
        type={visible ? "text" : "password"}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="input pr-10 font-mono text-sm"
      />
      <button
        type="button"
        onClick={() => setVisible(!visible)}
        className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
      >
        {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
};

const CopyButton = ({ text, label }) => {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success(`${label} copied!`);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button onClick={handleCopy} className="btn-secondary text-xs py-1 px-2">
      {copied ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  );
};

const Integrations = () => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("whatsapp");

  // Fetch social settings
  const { data: socialData, isLoading } = useQuery(
    "socialSettings",
    () => adminAPI.getSocialSettings().then((r) => r.data),
    { refetchOnWindowFocus: false }
  );

  // WhatsApp state
  const [waForm, setWaForm] = useState(null);
  const waSettings = socialData?.whatsapp || {};
  const waFormState = waForm || {
    enabled: waSettings.enabled || false,
    phoneNumberId: waSettings.phoneNumberId || "",
    accessToken: "",
    businessAccountId: waSettings.businessAccountId || "",
  };

  // Instagram state
  const [igForm, setIgForm] = useState(null);
  const igSettings = socialData?.instagram || {};
  const igFormState = igForm || {
    enabled: igSettings.enabled || false,
    pageId: igSettings.pageId || "",
    accessToken: "",
    igUserId: igSettings.igUserId || "",
  };

  // Mutations
  const waMutation = useMutation(
    (data) => adminAPI.updateWhatsApp(data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries("socialSettings");
        setWaForm(null);
        toast.success("WhatsApp settings saved!");
      },
      onError: (err) => toast.error(err.response?.data?.error || "Failed to save"),
    }
  );

  const igMutation = useMutation(
    (data) => adminAPI.updateInstagram(data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries("socialSettings");
        setIgForm(null);
        toast.success("Instagram settings saved!");
      },
      onError: (err) => toast.error(err.response?.data?.error || "Failed to save"),
    }
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const webhookBase = socialData?.webhookBaseUrl || "https://your-domain.com/api/webhook";

  const tabs = [
    { id: "whatsapp", name: "WhatsApp", icon: MessageCircle, color: "text-green-600" },
    { id: "instagram", name: "Instagram", icon: Instagram, color: "text-pink-600" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Social Integrations</h1>
        <p className="mt-1 text-sm text-gray-500">
          Connect WhatsApp and Instagram to auto-reply using your uploaded documents
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
                <Icon className={`h-4 w-4 mr-2 ${activeTab === tab.id ? tab.color : ""}`} />
                {tab.name}
              </button>
            );
          })}
        </nav>
      </div>

      {/* ─── WhatsApp Tab ──────────────────────────────────────────────────── */}
      {activeTab === "whatsapp" && (
        <div className="space-y-6">
          {/* Status Card */}
          <div className="card">
            <div className="card-header flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-green-100">
                  <MessageCircle className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <h3 className="text-lg font-medium text-gray-900">WhatsApp Business</h3>
                  <p className="text-sm text-gray-500">Auto-reply to WhatsApp messages</p>
                </div>
              </div>
              {waSettings.enabled && waSettings.hasAccessToken
                ? STATUS_BADGE.connected
                : STATUS_BADGE.disconnected}
            </div>
          </div>

          {/* Setup Instructions */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Info className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-blue-800 space-y-2">
                <p className="font-medium">Setup Instructions:</p>
                <ol className="list-decimal list-inside space-y-1">
                  <li>
                    Go to{" "}
                    <a
                      href="https://developers.facebook.com/apps/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline font-medium inline-flex items-center gap-1"
                    >
                      Meta Developer Portal <ExternalLink className="h-3 w-3" />
                    </a>
                  </li>
                  <li>Create a Meta App → Add WhatsApp product</li>
                  <li>Get your Phone Number ID and Access Token from the WhatsApp settings</li>
                  <li>Set the webhook URL below in Meta's webhook configuration</li>
                  <li>Subscribe to <code className="bg-blue-100 px-1 rounded">messages</code> webhook field</li>
                </ol>
              </div>
            </div>
          </div>

          {/* Webhook URL */}
          <div className="card">
            <div className="card-body">
              <label className="label">Webhook URL (use this in Meta Developer Portal)</label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={`${webhookBase}/whatsapp`}
                  readOnly
                  className="input bg-gray-50 font-mono text-sm flex-1"
                />
                <CopyButton text={`${webhookBase}/whatsapp`} label="Webhook URL" />
              </div>

              <label className="label mt-4">Verify Token (use this in Meta webhook config)</label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={waSettings.verifyToken || "Loading..."}
                  readOnly
                  className="input bg-gray-50 font-mono text-sm flex-1"
                />
                <CopyButton text={waSettings.verifyToken || ""} label="Verify Token" />
              </div>
            </div>
          </div>

          {/* Configuration Form */}
          <div className="card">
            <div className="card-header">
              <h3 className="text-lg font-medium text-gray-900">Configuration</h3>
            </div>
            <div className="card-body space-y-4">
              <div>
                <label className="label">Phone Number ID</label>
                <input
                  type="text"
                  value={waFormState.phoneNumberId}
                  onChange={(e) =>
                    setWaForm({ ...waFormState, phoneNumberId: e.target.value })
                  }
                  className="input font-mono text-sm"
                  placeholder="e.g. 1234567890123456"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Found in WhatsApp → API Setup → Phone Number ID
                </p>
              </div>

              <div>
                <label className="label">Business Account ID (optional)</label>
                <input
                  type="text"
                  value={waFormState.businessAccountId}
                  onChange={(e) =>
                    setWaForm({ ...waFormState, businessAccountId: e.target.value })
                  }
                  className="input font-mono text-sm"
                  placeholder="e.g. 1234567890123456"
                />
              </div>

              <div>
                <label className="label">
                  Permanent Access Token
                  {waSettings.hasAccessToken && (
                    <span className="ml-2 text-xs text-green-600 font-normal">(saved)</span>
                  )}
                </label>
                <TokenInput
                  value={waFormState.accessToken}
                  onChange={(e) =>
                    setWaForm({ ...waFormState, accessToken: e.target.value })
                  }
                  placeholder={waSettings.hasAccessToken ? "••••••••  (leave blank to keep current)" : "Paste your access token"}
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={waFormState.enabled}
                    onChange={(e) =>
                      setWaForm({ ...waFormState, enabled: e.target.checked })
                    }
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
                  <span className="ml-3 text-sm font-medium text-gray-700">
                    Enable WhatsApp auto-reply
                  </span>
                </label>
              </div>
            </div>
            <div className="card-footer">
              <button
                onClick={() => waMutation.mutate(waFormState)}
                disabled={waMutation.isLoading}
                className="btn-primary"
              >
                {waMutation.isLoading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Save WhatsApp Settings
              </button>
            </div>
          </div>

          {/* Connection Status */}
          {waSettings.connectedAt && (
            <div className="text-xs text-gray-500">
              Connected since: {new Date(waSettings.connectedAt).toLocaleDateString()}
            </div>
          )}
        </div>
      )}

      {/* ─── Instagram Tab ─────────────────────────────────────────────────── */}
      {activeTab === "instagram" && (
        <div className="space-y-6">
          {/* Status Card */}
          <div className="card">
            <div className="card-header flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-pink-100">
                  <Instagram className="h-5 w-5 text-pink-600" />
                </div>
                <div>
                  <h3 className="text-lg font-medium text-gray-900">Instagram Messaging</h3>
                  <p className="text-sm text-gray-500">Auto-reply to Instagram DMs</p>
                </div>
              </div>
              {igSettings.enabled && igSettings.hasAccessToken
                ? STATUS_BADGE.connected
                : STATUS_BADGE.disconnected}
            </div>
          </div>

          {/* Setup Instructions */}
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Info className="h-5 w-5 text-purple-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-purple-800 space-y-2">
                <p className="font-medium">Setup Instructions:</p>
                <ol className="list-decimal list-inside space-y-1">
                  <li>
                    Go to{" "}
                    <a
                      href="https://developers.facebook.com/apps/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline font-medium inline-flex items-center gap-1"
                    >
                      Meta Developer Portal <ExternalLink className="h-3 w-3" />
                    </a>
                  </li>
                  <li>Create/use a Meta App → Add Instagram product</li>
                  <li>Connect your Instagram Business/Creator account</li>
                  <li>Get your Page ID and Access Token</li>
                  <li>Set the webhook URL below and subscribe to <code className="bg-purple-100 px-1 rounded">messages</code></li>
                </ol>
              </div>
            </div>
          </div>

          {/* Webhook URL */}
          <div className="card">
            <div className="card-body">
              <label className="label">Webhook URL (use this in Meta Developer Portal)</label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={`${webhookBase}/instagram`}
                  readOnly
                  className="input bg-gray-50 font-mono text-sm flex-1"
                />
                <CopyButton text={`${webhookBase}/instagram`} label="Webhook URL" />
              </div>

              <label className="label mt-4">Verify Token</label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={igSettings.verifyToken || "Loading..."}
                  readOnly
                  className="input bg-gray-50 font-mono text-sm flex-1"
                />
                <CopyButton text={igSettings.verifyToken || ""} label="Verify Token" />
              </div>
            </div>
          </div>

          {/* Configuration Form */}
          <div className="card">
            <div className="card-header">
              <h3 className="text-lg font-medium text-gray-900">Configuration</h3>
            </div>
            <div className="card-body space-y-4">
              <div>
                <label className="label">Facebook Page ID</label>
                <input
                  type="text"
                  value={igFormState.pageId}
                  onChange={(e) =>
                    setIgForm({ ...igFormState, pageId: e.target.value })
                  }
                  className="input font-mono text-sm"
                  placeholder="e.g. 1234567890123456"
                />
                <p className="mt-1 text-xs text-gray-500">
                  The Facebook Page linked to your Instagram account
                </p>
              </div>

              <div>
                <label className="label">Instagram User ID (optional)</label>
                <input
                  type="text"
                  value={igFormState.igUserId}
                  onChange={(e) =>
                    setIgForm({ ...igFormState, igUserId: e.target.value })
                  }
                  className="input font-mono text-sm"
                  placeholder="e.g. 1234567890123456"
                />
              </div>

              <div>
                <label className="label">
                  Page Access Token
                  {igSettings.hasAccessToken && (
                    <span className="ml-2 text-xs text-green-600 font-normal">(saved)</span>
                  )}
                </label>
                <TokenInput
                  value={igFormState.accessToken}
                  onChange={(e) =>
                    setIgForm({ ...igFormState, accessToken: e.target.value })
                  }
                  placeholder={igSettings.hasAccessToken ? "••••••••  (leave blank to keep current)" : "Paste your page access token"}
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={igFormState.enabled}
                    onChange={(e) =>
                      setIgForm({ ...igFormState, enabled: e.target.checked })
                    }
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-pink-500"></div>
                  <span className="ml-3 text-sm font-medium text-gray-700">
                    Enable Instagram auto-reply
                  </span>
                </label>
              </div>
            </div>
            <div className="card-footer">
              <button
                onClick={() => igMutation.mutate(igFormState)}
                disabled={igMutation.isLoading}
                className="btn-primary"
              >
                {igMutation.isLoading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Save Instagram Settings
              </button>
            </div>
          </div>

          {igSettings.connectedAt && (
            <div className="text-xs text-gray-500">
              Connected since: {new Date(igSettings.connectedAt).toLocaleDateString()}
            </div>
          )}
        </div>
      )}

      {/* How it works */}
      <div className="card">
        <div className="card-body">
          <h3 className="text-sm font-medium text-gray-900 mb-3">How Auto-Reply Works</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
            <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary-100 text-primary-600 font-bold text-xs flex-shrink-0">
                1
              </div>
              <div>
                <p className="font-medium text-gray-900">User sends a message</p>
                <p className="mt-1">On WhatsApp or Instagram DM</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary-100 text-primary-600 font-bold text-xs flex-shrink-0">
                2
              </div>
              <div>
                <p className="font-medium text-gray-900">Bot searches documents</p>
                <p className="mt-1">Uses the same PDFs you uploaded</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary-100 text-primary-600 font-bold text-xs flex-shrink-0">
                3
              </div>
              <div>
                <p className="font-medium text-gray-900">Auto-reply sent</p>
                <p className="mt-1">Relevant answer sent instantly</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Integrations;
