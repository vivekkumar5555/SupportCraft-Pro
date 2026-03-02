import { useState, useMemo } from "react";
import { useAuth } from "../hooks/useAuth.jsx";
import { Bot, Eye, EyeOff, Mail, Lock, User, Building2, Globe, ArrowRight } from "lucide-react";
import LoadingSpinner from "../components/LoadingSpinner";

const PasswordStrength = ({ password }) => {
  const strength = useMemo(() => {
    if (!password) return 0;
    let s = 0;
    if (password.length >= 6) s++;
    if (password.length >= 10) s++;
    if (/[A-Z]/.test(password)) s++;
    if (/[0-9]/.test(password)) s++;
    if (/[^A-Za-z0-9]/.test(password)) s++;
    return Math.min(s, 4);
  }, [password]);

  if (!password) return null;

  const labels = ["Weak", "Fair", "Good", "Strong"];
  const colors = ["bg-red-500", "bg-amber-500", "bg-blue-500", "bg-green-500"];

  return (
    <div className="mt-2">
      <div className="flex gap-1">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-all duration-300 ${
              i < strength ? colors[strength - 1] : "bg-gray-200"
            }`}
          />
        ))}
      </div>
      <p className={`mt-1 text-xs ${strength <= 1 ? "text-red-500" : strength === 2 ? "text-amber-500" : "text-green-600"}`}>
        {labels[strength - 1] || "Too short"}
      </p>
    </div>
  );
};

const Login = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    name: "",
    tenantName: "",
    domain: "",
  });
  const [errors, setErrors] = useState({});

  const { login, register } = useAuth();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.email) {
      newErrors.email = "Email is required";
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = "Please enter a valid email";
    }

    if (!formData.password) {
      newErrors.password = "Password is required";
    } else if (formData.password.length < 6) {
      newErrors.password = "Must be at least 6 characters";
    }

    if (!isLogin) {
      if (!formData.name) newErrors.name = "Name is required";
      if (!formData.tenantName) newErrors.tenantName = "Company name is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    try {
      const result = isLogin
        ? await login({ email: formData.email, password: formData.password })
        : await register({
            email: formData.email,
            password: formData.password,
            name: formData.name,
            tenantName: formData.tenantName,
            domain: formData.domain,
          });

      if (!result.success) {
        setErrors({ submit: result.error });
      }
    } catch {
      setErrors({ submit: "An unexpected error occurred" });
    } finally {
      setLoading(false);
    }
  };

  const switchMode = () => {
    setIsLogin(!isLogin);
    setErrors({});
  };

  const InputIcon = ({ icon: Icon }) => (
    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
      <Icon className="h-4 w-4 text-gray-400" />
    </div>
  );

  return (
    <div className="min-h-screen flex bg-gray-50">
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary-600 via-primary-700 to-indigo-800 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-20 w-72 h-72 rounded-full bg-white/20 blur-3xl" />
          <div className="absolute bottom-20 right-20 w-96 h-96 rounded-full bg-white/10 blur-3xl" />
        </div>
        <div className="relative flex flex-col justify-center px-16 text-white">
          <div className="flex items-center gap-3 mb-8">
            <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm">
              <Bot className="h-7 w-7" />
            </div>
            <span className="text-2xl font-bold">Support Widget</span>
          </div>
          <h1 className="text-4xl font-bold leading-tight mb-6">
            AI-Powered Customer
            <br />
            Support Automation
          </h1>
          <p className="text-lg text-primary-100 leading-relaxed max-w-md">
            Upload your documents and let AI handle customer queries across your
            website, WhatsApp, and Instagram — all from one dashboard.
          </p>
          <div className="mt-12 grid grid-cols-3 gap-6">
            {[
              { val: "24/7", label: "Availability" },
              { val: "3", label: "Platforms" },
              { val: "<1s", label: "Response Time" },
            ].map((stat) => (
              <div key={stat.label}>
                <div className="text-3xl font-bold">{stat.val}</div>
                <div className="text-sm text-primary-200 mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex justify-center mb-8">
            <div className="flex items-center gap-2">
              <Bot className="h-10 w-10 text-primary-600" />
              <span className="text-xl font-bold text-gray-900">Support Widget</span>
            </div>
          </div>

          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-gray-900">
              {isLogin ? "Welcome back" : "Create your account"}
            </h2>
            <p className="mt-2 text-sm text-gray-500">
              {isLogin
                ? "Sign in to manage your AI chatbot"
                : "Get started with AI-powered customer support"}
            </p>
          </div>

          <form className="space-y-5" onSubmit={handleSubmit}>
            {!isLogin && (
              <>
                <div>
                  <label htmlFor="name" className="label">Full Name</label>
                  <div className="relative">
                    <InputIcon icon={User} />
                    <input
                      id="name"
                      name="name"
                      type="text"
                      value={formData.name}
                      onChange={handleChange}
                      className={`input pl-10 ${errors.name ? "border-red-300 focus:border-red-500 focus:ring-red-500/20" : ""}`}
                      placeholder="John Doe"
                    />
                  </div>
                  {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
                </div>

                <div>
                  <label htmlFor="tenantName" className="label">Company Name</label>
                  <div className="relative">
                    <InputIcon icon={Building2} />
                    <input
                      id="tenantName"
                      name="tenantName"
                      type="text"
                      value={formData.tenantName}
                      onChange={handleChange}
                      className={`input pl-10 ${errors.tenantName ? "border-red-300 focus:border-red-500 focus:ring-red-500/20" : ""}`}
                      placeholder="Acme Inc."
                    />
                  </div>
                  {errors.tenantName && <p className="mt-1 text-sm text-red-600">{errors.tenantName}</p>}
                </div>

                <div>
                  <label htmlFor="domain" className="label">Website Domain <span className="text-gray-400 font-normal">(optional)</span></label>
                  <div className="relative">
                    <InputIcon icon={Globe} />
                    <input
                      id="domain"
                      name="domain"
                      type="text"
                      value={formData.domain}
                      onChange={handleChange}
                      className="input pl-10"
                      placeholder="example.com"
                    />
                  </div>
                </div>
              </>
            )}

            <div>
              <label htmlFor="email" className="label">Email Address</label>
              <div className="relative">
                <InputIcon icon={Mail} />
                <input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  className={`input pl-10 ${errors.email ? "border-red-300 focus:border-red-500 focus:ring-red-500/20" : ""}`}
                  placeholder="you@company.com"
                />
              </div>
              {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email}</p>}
            </div>

            <div>
              <label htmlFor="password" className="label">Password</label>
              <div className="relative">
                <InputIcon icon={Lock} />
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  value={formData.password}
                  onChange={handleChange}
                  className={`input pl-10 pr-10 ${errors.password ? "border-red-300 focus:border-red-500 focus:ring-red-500/20" : ""}`}
                  placeholder={isLogin ? "Enter your password" : "Create a strong password"}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && <p className="mt-1 text-sm text-red-600">{errors.password}</p>}
              {!isLogin && <PasswordStrength password={formData.password} />}
            </div>

            {errors.submit && (
              <div className="rounded-lg bg-red-50 border border-red-200 p-4">
                <p className="text-sm text-red-700">{errors.submit}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-2.5 text-base"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <LoadingSpinner size="sm" />
                  {isLogin ? "Signing in..." : "Creating account..."}
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  {isLogin ? "Sign in" : "Create account"}
                  <ArrowRight className="h-4 w-4" />
                </span>
              )}
            </button>
          </form>

          <div className="mt-8 text-center">
            <p className="text-sm text-gray-500">
              {isLogin ? "Don't have an account?" : "Already have an account?"}{" "}
              <button
                type="button"
                onClick={switchMode}
                className="font-semibold text-primary-600 hover:text-primary-500 transition-colors"
              >
                {isLogin ? "Sign up" : "Sign in"}
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
