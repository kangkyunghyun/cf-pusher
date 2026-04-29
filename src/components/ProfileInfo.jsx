/* eslint-disable no-undef */
import { useState, useEffect } from "react";
import { fetchUserInfo } from "../services/codeforcesService";
import { FaPowerOff, FaUser } from "react-icons/fa6";
import { CheckCircle2, AlertCircle, Loader2, Info } from "lucide-react";
import cfLogo from "../assets/cf.svg";

const APP_CF_OAUTH_CLIENT_ID =
  import.meta.env.VITE_CF_OAUTH_CLIENT_ID || "8MSpWYVSzdl3HD4rIwwcdPKBIUu8WIZp";
const CF_OAUTH_EXCHANGE_URL =
  import.meta.env.VITE_CF_OAUTH_EXCHANGE_URL ||
  "https://cfpusher-backend.onrender.com/auth/codeforces/exchange";

const ProfileInfo = ({ onHandleSubmit }) => {
  const [handle, setHandle] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [apiSecret, setApiSecret] = useState("");
  const [userInfo, setUserInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});

  useEffect(() => {
    chrome.storage.sync.get(
      ["cf_handle", "cf_oauth_profile", "cf_apiKey", "cf_apiSecret"],
      (result) => {
        const storedHandle = result.cf_handle;
        const storedProfile = result.cf_oauth_profile;
        const storedApiKey = result.cf_apiKey;
        const storedApiSecret = result.cf_apiSecret;

        if (storedApiKey) setApiKey(storedApiKey);
        if (storedApiSecret) setApiSecret(storedApiSecret);
        if (storedHandle) setHandle(storedHandle);

        if (storedHandle && storedProfile) {
          setUserInfo(storedProfile);
          onHandleSubmit(storedHandle);
          return;
        }

        if (storedHandle) {
          setLoading(true);
          fetchUserInfo(storedHandle)
            .then((user) => {
              if (user) {
                setUserInfo(user);
                chrome.storage.sync.set({ cf_oauth_profile: user });
                onHandleSubmit(user.handle);
              }
            })
            .catch((err) => {
              console.error("Auto session restore failed:", err);
            })
            .finally(() => {
              setLoading(false);
            });
        }
      },
    );
  }, [onHandleSubmit]);

  const validateForm = () => {
    const errors = {};
    if (!handle.trim()) errors.handle = "Handle is required";
    if (!apiKey.trim()) errors.apiKey = "API Key is required";
    if (!apiSecret.trim()) errors.apiSecret = "API Secret is required";
    
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    setError("");

    try {
      const user = await fetchUserInfo(handle.trim());
      if (!user) {
        throw new Error("Could not find a Codeforces user with that handle.");
      }

      setUserInfo(user);
      chrome.storage.sync.set({
        cf_handle: user.handle,
        cf_apiKey: apiKey.trim(),
        cf_apiSecret: apiSecret.trim(),
        cf_oauth_profile: user,
      });

      onHandleSubmit(user.handle);
    } catch (err) {
      console.error("Login failed:", err);
      setError(err.message || "Failed to connect to Codeforces.");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    chrome.storage.sync.remove([
      "cf_handle",
      "cf_apiKey",
      "cf_apiSecret",
      "cf_oauth_profile",
      "cf_oauth_idToken"
    ]);
    setUserInfo(null);
    setHandle("");
    setApiKey("");
    setApiSecret("");
    onHandleSubmit(null);
  };

  if (loading) {
    return (
      <div className="w-full flex justify-center py-8">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
          <p className="text-sm text-gray-500">Connecting to Codeforces...</p>
        </div>
      </div>
    );
  }

  if (userInfo) {
    const getRankColor = (rank) => {
      if (!rank) return "text-gray-600";
      const rankLower = rank.toLowerCase();
      if (rankLower.includes("newbie")) return "text-gray-600";
      if (rankLower.includes("pupil")) return "text-green-600";
      if (rankLower.includes("specialist")) return "text-cyan-600";
      if (rankLower.includes("expert")) return "text-blue-600";
      if (rankLower.includes("candidate master")) return "text-purple-600";
      if (rankLower.includes("master") || rankLower.includes("international master")) return "text-orange-600";
      if (rankLower.includes("grandmaster")) return "text-red-600";
      return "text-gray-600";
    };

    return (
      <div className="w-full flex justify-center mb-6">
        <div className="w-full max-w-sm bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle2 className="w-5 h-5 text-green-500" />
            <span className="text-sm font-medium text-green-600">Connected</span>
          </div>
          <div className="text-center">
            {userInfo.avatar && (
              <img src={userInfo.avatar} alt="Profile" className="w-16 h-16 rounded-full mx-auto mb-3 border" />
            )}
            <h3 className="font-bold text-lg mb-1">{userInfo.handle}</h3>
            <p className={`text-sm font-medium ${getRankColor(userInfo.rank)}`}>{userInfo.rank || "Unrated"}</p>
            <div className="mt-4">
              <button onClick={handleLogout} className="flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm mx-auto">
                <FaPowerOff className="w-3 h-3" /> Logout
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full flex justify-center mb-6">
      <div className="w-full max-w-sm bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6 shadow-sm">
        <div className="text-center mb-4">
          <h2 className="font-bold text-lg">Connect to Codeforces</h2>
          <p className="text-xs text-gray-500 mt-1">
            Get your keys from <a href="https://codeforces.com/settings/api" target="_blank" rel="noreferrer" className="text-blue-500 underline">codeforces.com/settings/api</a>
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-3">
          <div>
            <label className="block text-xs font-medium mb-1">Handle</label>
            <input
              type="text"
              value={handle}
              onChange={(e) => setHandle(e.target.value)}
              placeholder="e.g. tourist"
              className="w-full px-3 py-2 border rounded-lg text-sm dark:bg-gray-800"
            />
            {fieldErrors.handle && <p className="text-[10px] text-red-500 mt-1">{fieldErrors.handle}</p>}
          </div>

          <div>
            <label className="block text-xs font-medium mb-1">API Key</label>
            <input
              type="text"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Your API Key"
              className="w-full px-3 py-2 border rounded-lg text-sm dark:bg-gray-800"
            />
            {fieldErrors.apiKey && <p className="text-[10px] text-red-500 mt-1">{fieldErrors.apiKey}</p>}
          </div>

          <div>
            <label className="block text-xs font-medium mb-1">API Secret</label>
            <input
              type="password"
              value={apiSecret}
              onChange={(e) => setApiSecret(e.target.value)}
              placeholder="Your API Secret"
              className="w-full px-3 py-2 border rounded-lg text-sm dark:bg-gray-800"
            />
            {fieldErrors.apiSecret && <p className="text-[10px] text-red-500 mt-1">{fieldErrors.apiSecret}</p>}
          </div>

          {error && <p className="text-xs text-red-500 text-center">{error}</p>}

          <button type="submit" className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium">
            Connect Account
          </button>
        </form>
      </div>
    </div>
  );
};

export default ProfileInfo;
