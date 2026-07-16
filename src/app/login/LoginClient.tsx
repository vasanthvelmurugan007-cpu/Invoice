"use client";

import { useState } from "react";
import { loginUser } from "../actions/auth";

export default function LoginClient() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return setError("Please enter email address");

    setLoading(true);
    setError("");

    try {
      const res = await loginUser(email, password);
      if (res.success) {
        if (res.role === "auditor") {
          window.location.href = "/auditor/dashboard";
        } else {
          window.location.href = "/";
        }
      } else {
        setError("Invalid credentials. Please try again.");
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handlePreFill = (role: "owner" | "auditor" | "admin" | "rahul") => {
    if (role === "rahul") {
      setEmail("rahul@invoicehub.in");
      setPassword("Iyal6183@");
    } else if (role === "admin") {
      setEmail("admin@invoicehub.com");
      setPassword("admin123");
    } else if (role === "auditor") {
      setEmail("auditor@invoicehub.com");
      setPassword("password123");
    } else {
      setEmail("owner@invoicehub.com");
      setPassword("password123");
    }
  };

  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", background: "var(--color-background-tertiary)", padding: "20px" }}>
      <div style={{
        maxWidth: 420,
        width: "100%",
        background: "rgba(15, 23, 42, 0.6)",
        backdropFilter: "blur(12px)",
        border: "1px solid rgba(255, 255, 255, 0.08)",
        borderRadius: "var(--border-radius-xl)",
        padding: "30px",
        boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.3), 0 10px 10px -5px rgba(0, 0, 0, 0.2)",
      }}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 30 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, marginBottom: 12 }}>
            <div style={{ width: 44, height: 44, borderRadius: "var(--border-radius-lg)", background: "#ffffff", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", flexShrink: 0, boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)" }}>
              <img src="/logo.png" alt="Logo" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            </div>
            <h1 style={{ fontSize: 26, fontWeight: 700, color: "var(--color-text-primary)", margin: 0 }}>InvoiceHub</h1>
          </div>
          <p style={{ fontSize: 13, color: "var(--color-text-secondary)", margin: 0 }}>GST Billing & Chartered Accountant Auditor Portal</p>
        </div>

        {error && (
          <div style={{ background: "rgba(239, 68, 68, 0.1)", border: "1px solid rgba(239, 68, 68, 0.2)", borderRadius: "var(--border-radius-md)", padding: "10px", color: "var(--color-text-danger)", fontSize: 13, marginBottom: 20, textAlign: "center" }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 500, color: "var(--color-text-secondary)", marginBottom: 6 }}>Email Address</label>
            <input
              type="email"
              placeholder="e.g. owner@invoicehub.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{ width: "100%", background: "rgba(2, 6, 23, 0.6)", border: "1px solid rgba(255, 255, 255, 0.08)", color: "var(--color-text-primary)" }}
              required
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 500, color: "var(--color-text-secondary)", marginBottom: 6 }}>Password</label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{ width: "100%", background: "rgba(2, 6, 23, 0.6)", border: "1px solid rgba(255, 255, 255, 0.08)", color: "var(--color-text-primary)" }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              padding: "10px",
              background: "var(--color-text-info)",
              color: "#ffffff",
              fontWeight: 500,
              fontSize: 14,
              border: "none",
              borderRadius: "var(--border-radius-md)",
              cursor: "pointer",
              transition: "opacity 0.15s",
              marginTop: 6
            }}
          >
            {loading ? "Logging in..." : "Log In"}
          </button>
        </form>

        <div style={{ position: "relative", margin: "25px 0 20px 0", textAlign: "center" }}>
          <div style={{ position: "absolute", top: "50%", left: 0, right: 0, height: 1, background: "rgba(255, 255, 255, 0.08)" }}></div>
          <span style={{ position: "relative", background: "rgb(19, 23, 38)", padding: "0 10px", fontSize: 11, color: "var(--color-text-secondary)", textTransform: "uppercase" }}>Demo accounts</span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <button
            onClick={() => handlePreFill("owner")}
            style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%", padding: "8px 12px", background: "rgba(255, 255, 255, 0.03)", border: "1px solid rgba(255, 255, 255, 0.05)", borderRadius: "var(--border-radius-md)", fontSize: 12, textAlign: "left" }}
          >
            <span>Standard Business Owner</span>
            <span style={{ fontSize: 11, color: "var(--color-text-secondary)" }}>Auto Fill</span>
          </button>

          <button
            onClick={() => handlePreFill("auditor")}
            style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%", padding: "8px 12px", background: "rgba(255, 255, 255, 0.03)", border: "1px solid rgba(255, 255, 255, 0.05)", borderRadius: "var(--border-radius-md)", fontSize: 12, textAlign: "left" }}
          >
            <span>CA Auditor / Accountant</span>
            <span style={{ fontSize: 11, color: "var(--color-text-secondary)" }}>Auto Fill</span>
          </button>

           <button
            onClick={() => handlePreFill("admin")}
            style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%", padding: "8px 12px", background: "rgba(99, 102, 241, 0.08)", border: "1px solid rgba(99, 102, 241, 0.15)", borderRadius: "var(--border-radius-md)", fontSize: 12, textAlign: "left" }}
          >
            <span style={{ color: "var(--color-text-info)", fontWeight: 500 }}>Admin (Pro Access)</span>
            <span style={{ fontSize: 11, color: "var(--color-text-info)" }}>Auto Fill</span>
          </button>

          <button
            onClick={() => handlePreFill("rahul")}
            style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%", padding: "8px 12px", background: "rgba(99, 102, 241, 0.12)", border: "1px solid rgba(99, 102, 241, 0.25)", borderRadius: "var(--border-radius-md)", fontSize: 12, textAlign: "left" }}
          >
            <span style={{ color: "var(--color-text-info)", fontWeight: 600 }}>Rahul (Pro User)</span>
            <span style={{ fontSize: 11, color: "var(--color-text-info)" }}>Auto Fill</span>
          </button>
        </div>
      </div>
    </div>
  );
}
