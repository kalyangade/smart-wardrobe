import { useState, useEffect, useRef } from "react";

// ─── API helpers ────────────────────────────────────────────────────────────
// In development: empty string → Vite proxy handles it (localhost:8000)
// In production:  VITE_API_URL = your Render backend URL
const BASE = import.meta.env.VITE_API_URL || "";

const api = {
  get: (url) => fetch(BASE + url).then((r) => r.json()),
  post: (url, body) =>
    fetch(BASE + url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }).then((r) => r.json()),
  put: (url, body) =>
    fetch(BASE + url, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }).then((r) => r.json()),
  delete: (url) => fetch(BASE + url, { method: "DELETE" }).then((r) => r.json()),
  upload: (url, formData) =>
    fetch(BASE + url, { method: "POST", body: formData }).then((r) => r.json()),
};

// ─── Loading spinner ─────────────────────────────────────────────────────────
function Spinner() {
  return (
    <div style={{ textAlign: "center", padding: 40, color: "#888" }}>
      <div
        style={{
          width: 32,
          height: 32,
          border: "3px solid #e0e0e0",
          borderTop: "3px solid #2d4a3e",
          borderRadius: "50%",
          animation: "spin 0.8s linear infinite",
          margin: "0 auto 12px",
        }}
      />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      Loading...
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function SmartWardrobe() {
  const [activeTab, setActiveTab] = useState("wardrobe");
  const [filterCat, setFilterCat] = useState("All");

  // Data state
  const [wardrobe, setWardrobe] = useState([]);
  const [outfits, setOutfits] = useState([]);
  const [deals, setDeals] = useState([]);
  const [budget, setBudget] = useState({ monthly_limit: 200, spent_this_month: 0, remaining: 200, percent_used: 0, is_over_budget: false, is_warning: false, days_left_in_month: 30 });
  const [purchases, setPurchases] = useState([]);
  const [analytics, setAnalytics] = useState({ summary: null, categories: [], colors: [], mostWorn: [], leastWorn: [] });
  const [styleSuggestions, setStyleSuggestions] = useState([]);
  const [duplicates, setDuplicates] = useState([]);

  // UI state
  const [loading, setLoading] = useState({});
  const [selectedOutfit, setSelectedOutfit] = useState(null);
  const [showUpload, setShowUpload] = useState(false);
  const [showDupeAlert, setShowDupeAlert] = useState(true);
  const [uploadStep, setUploadStep] = useState(0);
  const [uploadResult, setUploadResult] = useState(null);
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadPrice, setUploadPrice] = useState("");
  const [uploadError, setUploadError] = useState("");
  const [budgetInput, setBudgetInput] = useState(200);
  const fileInputRef = useRef();

  const setLoad = (key, val) => setLoading((p) => ({ ...p, [key]: val }));

  // ── Fetch functions ─────────────────────────────────────────────────────────
  const fetchWardrobe = () => api.get("/api/clothing").then(setWardrobe).catch(() => {});
  const fetchBudget = () =>
    Promise.all([
      api.get("/api/budget/status"),
      api.get("/api/budget/purchases"),
    ]).then(([status, purch]) => {
      setBudget(status);
      setBudgetInput(status.monthly_limit);
      setPurchases(purch);
    }).catch(() => {});
  const fetchDeals = () => api.get("/api/deals").then(setDeals).catch(() => {});
  const fetchOutfits = () => api.get("/api/outfits").then(setOutfits).catch(() => {});
  const fetchAnalytics = () =>
    Promise.all([
      api.get("/api/analytics/summary"),
      api.get("/api/analytics/categories"),
      api.get("/api/analytics/colors"),
      api.get("/api/analytics/most-worn"),
      api.get("/api/analytics/least-worn"),
      api.get("/api/analytics/duplicates"),
    ]).then(([summary, categories, colors, mostWorn, leastWorn, dupes]) => {
      setAnalytics({ summary, categories, colors, mostWorn, leastWorn });
      setDuplicates(dupes);
    }).catch(() => {});
  const fetchStyleSuggestions = () => api.get("/api/style-suggestions").then(setStyleSuggestions).catch(() => {});

  // Load on mount
  useEffect(() => { fetchWardrobe(); fetchBudget(); }, []);
  useEffect(() => { if (activeTab === "deals") fetchDeals(); }, [activeTab]);
  useEffect(() => { if (activeTab === "outfits") fetchOutfits(); }, [activeTab]);
  useEffect(() => { if (activeTab === "analytics") fetchAnalytics(); }, [activeTab]);
  useEffect(() => { if (activeTab === "styles") fetchStyleSuggestions(); }, [activeTab]);

  // ── Upload flow ─────────────────────────────────────────────────────────────
  const openUpload = () => {
    setShowUpload(true);
    setUploadStep(0);
    setUploadFile(null);
    setUploadPrice("");
    setUploadError("");
    setUploadResult(null);
  };

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadFile(file);
    setUploadStep(1);
  };

  const handleUploadSubmit = async () => {
    if (!uploadFile) return;
    setUploadStep(2); // "analyzing" screen
    setUploadError("");

    const formData = new FormData();
    formData.append("file", uploadFile);
    formData.append("price", uploadPrice || "0");

    try {
      const result = await api.upload("/api/clothing/upload", formData);
      if (result.detail) {
        setUploadError(result.detail);
        setUploadStep(1);
        return;
      }
      setUploadResult(result);
      setUploadStep(3); // results screen
    } catch {
      setUploadError("Upload failed. Is the backend running?");
      setUploadStep(1);
    }
  };

  const confirmAddToWardrobe = () => {
    setShowUpload(false);
    fetchWardrobe();
    fetchBudget();
  };

  // ── Outfit generation ───────────────────────────────────────────────────────
  const generateOutfits = async () => {
    setLoad("outfits", true);
    try {
      const newOutfits = await api.post("/api/outfits/generate", { occasion: "Casual", style: "Casual", count: 3 });
      if (Array.isArray(newOutfits)) setOutfits((prev) => [...newOutfits, ...prev]);
    } catch {}
    setLoad("outfits", false);
  };

  const outfitFeedback = async (outfitId, feedback) => {
    await api.put(`/api/outfits/${outfitId}/feedback`, { feedback });
    fetchWardrobe(); // worn counts may have changed
  };

  // ── Budget ──────────────────────────────────────────────────────────────────
  const updateBudget = async (val) => {
    setBudgetInput(val);
    await api.put("/api/budget/settings", { monthly_limit: val });
    fetchBudget();
  };

  // ── Style suggestions ───────────────────────────────────────────────────────
  const generateStyleSuggestions = async (focus) => {
    setLoad("styles", true);
    try {
      const sug = await api.post("/api/style-suggestions/generate", { focus });
      if (Array.isArray(sug)) setStyleSuggestions((prev) => [...sug, ...prev]);
    } catch {}
    setLoad("styles", false);
  };

  // ── Deals refresh ───────────────────────────────────────────────────────────
  const refreshDeals = async () => {
    setLoad("deals", true);
    await api.post("/api/deals/refresh", {}).catch(() => {});
    setTimeout(() => { fetchDeals(); setLoad("deals", false); }, 5000);
  };

  // ── Derived values ──────────────────────────────────────────────────────────
  const categories = ["All", "Tops", "Bottoms", "Shoes", "Accessories", "Outerwear"];
  const filtered = filterCat === "All" ? wardrobe : wardrobe.filter((i) => i.category === filterCat);
  const catCounts = wardrobe.reduce((acc, i) => { acc[i.category] = (acc[i.category] || 0) + 1; return acc; }, {});
  const totalValue = wardrobe.reduce((s, i) => s + (i.price || 0), 0);

  const tabs = [
    { id: "wardrobe", label: "My Wardrobe", icon: "👕" },
    { id: "outfits", label: "Outfit Ideas", icon: "✨" },
    { id: "deals", label: "Smart Deals", icon: "🏷️" },
    { id: "budget", label: "Budget", icon: "💰" },
    { id: "analytics", label: "Analytics", icon: "📊" },
    { id: "styles", label: "Style Tips", icon: "💡" },
  ];

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: "100vh", fontFamily: "'DM Sans', sans-serif", background: "#f7f6f3", color: "#1a1a1a" }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&family=Playfair+Display:wght@700&display=swap" rel="stylesheet" />

      {/* Header */}
      <div style={{ background: "linear-gradient(135deg, #1a2a2e 0%, #2d4a3e 100%)", padding: "24px 32px", color: "white" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 28, margin: 0 }}>Smart Wardrobe</h1>
            <p style={{ margin: "4px 0 0", opacity: 0.7, fontSize: 14 }}>Your closet, smarter.</p>
          </div>
          <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
            <div style={{ background: "rgba(255,255,255,0.12)", borderRadius: 12, padding: "8px 16px", fontSize: 13 }}>
              <span style={{ opacity: 0.7 }}>Items:</span> <strong>{wardrobe.length}</strong>
              <span style={{ margin: "0 8px", opacity: 0.3 }}>|</span>
              <span style={{ opacity: 0.7 }}>Value:</span> <strong>${totalValue.toFixed(0)}</strong>
            </div>
            <button onClick={openUpload} style={{ background: "#e8833a", border: "none", color: "white", borderRadius: 10, padding: "10px 20px", fontWeight: 700, fontSize: 14, cursor: "pointer", fontFamily: "inherit" }}>
              + Add Clothes
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ background: "white", borderBottom: "1px solid #e8e6e1", position: "sticky", top: 0, zIndex: 10 }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex" }}>
          {tabs.map((t) => (
            <button key={t.id} onClick={() => setActiveTab(t.id)}
              style={{ flex: 1, padding: "14px 8px", border: "none", borderBottom: activeTab === t.id ? "3px solid #2d4a3e" : "3px solid transparent", background: "none", cursor: "pointer", fontFamily: "inherit", fontSize: 13, fontWeight: activeTab === t.id ? 700 : 400, color: activeTab === t.id ? "#1a2a2e" : "#888" }}>
              <span style={{ marginRight: 4 }}>{t.icon}</span>{t.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "24px 16px" }}>

        {/* Duplicate warnings */}
        {showDupeAlert && duplicates.map((d, i) => (
          <div key={i} style={{ background: "#fff3e0", border: "1px solid #ffb74d", borderRadius: 12, padding: "16px 20px", marginBottom: 20, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ fontSize: 28 }}>⚠️</span>
              <div>
                <strong style={{ color: "#e65100" }}>Duplicate Alert: You have {d.count} {d.color_family} {d.category}!</strong>
                <p style={{ margin: "4px 0 0", fontSize: 13, color: "#666" }}>{d.items.join(", ")} — Consider a different color next time.</p>
              </div>
            </div>
            <button onClick={() => setShowDupeAlert(false)} style={{ background: "none", border: "none", fontSize: 18, cursor: "pointer", color: "#999" }}>✕</button>
          </div>
        ))}

        {/* ── UPLOAD MODAL ──────────────────────────────────────────────────── */}
        {showUpload && (
          <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.5)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ background: "white", borderRadius: 20, padding: 32, width: 440, maxWidth: "90vw" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                <h2 style={{ margin: 0, fontFamily: "'Playfair Display', serif" }}>Add Clothing</h2>
                <button onClick={() => setShowUpload(false)} style={{ background: "none", border: "none", fontSize: 22, cursor: "pointer" }}>✕</button>
              </div>

              {/* Step 0 — pick a photo */}
              {uploadStep === 0 && (
                <div>
                  <div
                    style={{ border: "2px dashed #ccc", borderRadius: 16, padding: "48px 24px", textAlign: "center", cursor: "pointer", background: "#fafaf8" }}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <span style={{ fontSize: 48 }}>📸</span>
                    <p style={{ fontWeight: 600, margin: "12px 0 4px" }}>Upload a photo of your clothing</p>
                    <p style={{ color: "#888", fontSize: 13 }}>JPG, PNG or WebP — max 10MB</p>
                    <input ref={fileInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleFileSelect} />
                  </div>
                </div>
              )}

              {/* Step 1 — confirm file + enter price */}
              {uploadStep === 1 && uploadFile && (
                <div>
                  <div style={{ background: "#f7f6f3", borderRadius: 12, padding: 16, marginBottom: 16, textAlign: "center" }}>
                    <img
                      src={URL.createObjectURL(uploadFile)}
                      alt="preview"
                      style={{ maxHeight: 180, maxWidth: "100%", borderRadius: 10, objectFit: "cover" }}
                    />
                    <p style={{ marginTop: 10, fontWeight: 600, fontSize: 14 }}>{uploadFile.name}</p>
                  </div>
                  {uploadError && (
                    <div style={{ background: "#fee2e2", borderRadius: 10, padding: 12, marginBottom: 12, color: "#b91c1c", fontSize: 13 }}>
                      ⚠️ {uploadError}
                    </div>
                  )}
                  <label style={{ fontSize: 13, fontWeight: 600 }}>Purchase Price ($)</label>
                  <input
                    type="number"
                    value={uploadPrice}
                    onChange={(e) => setUploadPrice(e.target.value)}
                    placeholder="0.00"
                    style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid #ddd", marginTop: 4, marginBottom: 16, fontSize: 15, fontFamily: "inherit", boxSizing: "border-box" }}
                  />
                  <div style={{ display: "flex", gap: 10 }}>
                    <button onClick={() => setUploadStep(0)} style={{ flex: 1, padding: 12, background: "#f7f6f3", border: "none", borderRadius: 10, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
                      ← Change Photo
                    </button>
                    <button onClick={handleUploadSubmit} style={{ flex: 2, padding: 12, background: "#2d4a3e", color: "white", border: "none", borderRadius: 10, fontWeight: 700, fontSize: 15, cursor: "pointer", fontFamily: "inherit" }}>
                      🤖 Analyze with AI →
                    </button>
                  </div>
                </div>
              )}

              {/* Step 2 — analyzing */}
              {uploadStep === 2 && (
                <div style={{ textAlign: "center", padding: "20px 0" }}>
                  <div style={{ fontSize: 48, marginBottom: 16 }}>🤖</div>
                  <div
                    style={{ width: 40, height: 40, border: "4px solid #e0e0e0", borderTop: "4px solid #2d4a3e", borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 16px" }}
                  />
                  <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                  <p style={{ fontWeight: 600, color: "#166534", fontSize: 16 }}>AI is analyzing your photo...</p>
                  <p style={{ fontSize: 13, color: "#666", marginTop: 6 }}>Detecting category, color, pattern & style</p>
                </div>
              )}

              {/* Step 3 — results */}
              {uploadStep === 3 && uploadResult && (
                <div>
                  {/* Photo preview */}
                  {uploadFile && (
                    <img
                      src={URL.createObjectURL(uploadFile)}
                      alt="uploaded"
                      style={{ width: "100%", maxHeight: 160, objectFit: "cover", borderRadius: 12, marginBottom: 14 }}
                    />
                  )}

                  {/* AI tags */}
                  <div style={{ background: "#f7f6f3", borderRadius: 12, padding: 16, marginBottom: 14 }}>
                    <p style={{ fontWeight: 700, margin: "0 0 12px" }}>🏷️ AI Auto-Tagged:</p>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                      {[
                        ["Category", uploadResult.ai_tags?.category],
                        ["Color", uploadResult.ai_tags?.color_name],
                        ["Pattern", uploadResult.ai_tags?.pattern],
                        ["Style", uploadResult.ai_tags?.style],
                      ].map(([k, v]) => (
                        <div key={k} style={{ background: "white", borderRadius: 8, padding: "8px 12px" }}>
                          <span style={{ fontSize: 11, color: "#888" }}>{k}</span>
                          <div style={{ fontWeight: 600 }}>{v || "—"}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Duplicate warning */}
                  {uploadResult.duplicate_warning && (
                    <div style={{ background: "#fff3e0", borderRadius: 12, padding: 12, marginBottom: 14, fontSize: 13 }}>
                      <strong>⚠️ {uploadResult.duplicate_warning.message}</strong>
                    </div>
                  )}

                  {/* Budget status */}
                  {uploadResult.budget_status && (
                    <div style={{ background: uploadResult.budget_status.is_over_budget ? "#fee2e2" : "#f0fdf4", borderRadius: 12, padding: 12, marginBottom: 14, fontSize: 13 }}>
                      <strong>{uploadResult.budget_status.is_over_budget ? "🚨" : "💰"} {uploadResult.budget_status.message}</strong>
                    </div>
                  )}

                  <button onClick={confirmAddToWardrobe} style={{ width: "100%", padding: 14, background: "#2d4a3e", color: "white", border: "none", borderRadius: 10, fontWeight: 700, fontSize: 15, cursor: "pointer", fontFamily: "inherit" }}>
                    ✓ Added to Wardrobe!
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── WARDROBE TAB ───────────────────────────────────────────────────── */}
        {activeTab === "wardrobe" && (
          <div>
            <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
              {categories.map((cat) => (
                <button key={cat} onClick={() => setFilterCat(cat)}
                  style={{ padding: "8px 18px", borderRadius: 20, border: filterCat === cat ? "2px solid #2d4a3e" : "1px solid #ddd", background: filterCat === cat ? "#2d4a3e" : "white", color: filterCat === cat ? "white" : "#444", fontWeight: 600, cursor: "pointer", fontSize: 13, fontFamily: "inherit" }}>
                  {cat} {cat !== "All" && catCounts[cat] ? <span style={{ opacity: 0.6 }}>({catCounts[cat]})</span> : null}
                </button>
              ))}
            </div>

            {filtered.length === 0 ? (
              <div style={{ textAlign: "center", padding: 60, color: "#888" }}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>👕</div>
                <p style={{ fontWeight: 600, marginBottom: 8 }}>Your wardrobe is empty</p>
                <p style={{ fontSize: 14 }}>Click "+ Add Clothes" to upload your first item</p>
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 16 }}>
                {filtered.map((item) => (
                  <div key={item.id} style={{ background: "white", borderRadius: 14, padding: 16, boxShadow: "0 1px 4px rgba(0,0,0,0.06)", cursor: "pointer" }}>
                    <div style={{ background: "#f7f6f3", borderRadius: 10, height: 160, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 12, overflow: "hidden" }}>
                      {item.image_path ? (
                        <img src={`${BASE}/${item.image_path}`} alt={item.name} style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 10 }} />
                      ) : (
                        <span style={{ fontSize: 56 }}>👕</span>
                      )}
                    </div>
                    <h3 style={{ margin: "0 0 6px", fontSize: 15 }}>{item.name}</h3>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                      <div style={{ width: 14, height: 14, borderRadius: "50%", background: item.color_hex || "#888", border: "1px solid #ddd" }} />
                      <span style={{ fontSize: 12, color: "#888" }}>{item.color_name} · {item.pattern}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: 12, color: "#888" }}>Worn {item.times_worn}x · ${item.cost_per_wear}/wear</span>
                      <span style={{ fontSize: 11, background: "#f0f0ec", borderRadius: 6, padding: "3px 8px", fontWeight: 600 }}>{item.style}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── OUTFITS TAB ─────────────────────────────────────────────────────── */}
        {activeTab === "outfits" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h2 style={{ fontFamily: "'Playfair Display', serif", margin: 0 }}>AI Outfit Suggestions</h2>
              <button onClick={generateOutfits} disabled={loading.outfits} style={{ background: "#2d4a3e", color: "white", border: "none", borderRadius: 10, padding: "10px 20px", fontWeight: 700, fontSize: 14, cursor: "pointer", fontFamily: "inherit", opacity: loading.outfits ? 0.6 : 1 }}>
                {loading.outfits ? "Generating..." : "🔄 Generate New"}
              </button>
            </div>

            {outfits.length === 0 && !loading.outfits ? (
              <div style={{ textAlign: "center", padding: 60, color: "#888" }}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>✨</div>
                <p style={{ fontWeight: 600, marginBottom: 8 }}>No outfits yet</p>
                <p style={{ fontSize: 14, marginBottom: 20 }}>Add at least 2 items to your wardrobe, then generate outfits</p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {outfits.map((outfit, i) => (
                  <div key={outfit.id} style={{ background: "white", borderRadius: 16, padding: 20, boxShadow: "0 1px 4px rgba(0,0,0,0.06)", cursor: "pointer" }}
                    onClick={() => setSelectedOutfit(selectedOutfit === outfit.id ? null : outfit.id)}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                      <div>
                        <h3 style={{ margin: 0, fontSize: 17 }}>{outfit.name}</h3>
                        <span style={{ fontSize: 12, color: "#888" }}>{outfit.occasion}</span>
                      </div>
                      <div style={{ background: "#f0fdf4", color: "#166534", borderRadius: 20, padding: "6px 14px", fontWeight: 700, fontSize: 14 }}>
                        {outfit.style_score}% match
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                      {outfit.items?.map((oi) => oi.item && (
                        <div key={oi.clothing_item_id} style={{ background: "#f7f6f3", borderRadius: 12, padding: 10, flex: "1 1 120px", textAlign: "center", minWidth: 100 }}>
                          {oi.item.image_path ? (
                            <img src={`/${oi.item.image_path}`} alt={oi.item.name} style={{ width: 60, height: 60, objectFit: "cover", borderRadius: 8, marginBottom: 6 }} />
                          ) : (
                            <div style={{ fontSize: 32, marginBottom: 6 }}>👕</div>
                          )}
                          <div style={{ fontSize: 12, fontWeight: 600 }}>{oi.item.name}</div>
                        </div>
                      ))}
                    </div>
                    {selectedOutfit === outfit.id && (
                      <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
                        <button onClick={(e) => { e.stopPropagation(); outfitFeedback(outfit.id, "loved"); }}
                          style={{ flex: 1, padding: 10, background: outfit.feedback === "loved" ? "#2d4a3e" : "#f7f6f3", color: outfit.feedback === "loved" ? "white" : "#444", border: "none", borderRadius: 8, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
                          👍 Love it
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); outfitFeedback(outfit.id, "skipped"); }}
                          style={{ flex: 1, padding: 10, background: "#f7f6f3", color: "#444", border: "none", borderRadius: 8, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
                          👎 Skip
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); outfitFeedback(outfit.id, "worn"); }}
                          style={{ flex: 1, padding: 10, background: "#f7f6f3", color: "#444", border: "none", borderRadius: 8, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
                          📅 Wore this
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── DEALS TAB ──────────────────────────────────────────────────────── */}
        {activeTab === "deals" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <h2 style={{ fontFamily: "'Playfair Display', serif", margin: 0 }}>Smart Deals For You</h2>
              <button onClick={refreshDeals} disabled={loading.deals}
                style={{ background: "#2d4a3e", color: "white", border: "none", borderRadius: 10, padding: "10px 16px", fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "inherit", opacity: loading.deals ? 0.6 : 1 }}>
                {loading.deals ? "Refreshing..." : "🔄 Refresh Deals"}
              </button>
            </div>
            <p style={{ color: "#888", fontSize: 14, marginBottom: 20 }}>
              {loading.deals ? "Scanning Amazon, ASOS, Gap for sale items..." : "Items on sale that match your wardrobe gaps."}
            </p>

            {deals.length === 0 ? (
              <div style={{ textAlign: "center", padding: 60, color: "#888" }}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>🏷️</div>
                <p style={{ fontWeight: 600, marginBottom: 8 }}>No deals loaded yet</p>
                <p style={{ fontSize: 14, marginBottom: 20 }}>Click "Refresh Deals" to scan for sale items</p>
                <button onClick={refreshDeals} style={{ background: "#e8833a", color: "white", border: "none", borderRadius: 10, padding: "12px 24px", fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                  🔍 Find Deals Now
                </button>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {deals.map((deal) => (
                  <div key={deal.id} style={{ background: "white", borderRadius: 16, padding: 20, boxShadow: "0 1px 4px rgba(0,0,0,0.06)", display: "flex", gap: 16, alignItems: "center" }}>
                    <div style={{ background: "#f7f6f3", borderRadius: 12, width: 80, height: 80, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, overflow: "hidden" }}>
                      {deal.image_url ? (
                        <img src={deal.image_url} alt={deal.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      ) : (
                        <span style={{ fontSize: 36 }}>🛍️</span>
                      )}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
                        <div>
                          <h3 style={{ margin: "0 0 2px", fontSize: 16 }}>{deal.name}</h3>
                          <span style={{ fontSize: 12, color: "#888" }}>from {deal.store}</span>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <div style={{ fontWeight: 700, fontSize: 18, color: "#c0392b" }}>${deal.price}</div>
                          <div style={{ fontSize: 12, color: "#888", textDecoration: "line-through" }}>${deal.original_price}</div>
                        </div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
                        <div style={{ width: 14, height: 14, borderRadius: "50%", background: deal.color_hex || "#888", border: "1px solid #ddd" }} />
                        <span style={{ background: "#fef3c7", color: "#92400e", fontSize: 11, fontWeight: 600, borderRadius: 6, padding: "2px 8px" }}>{deal.discount_percent}% OFF</span>
                        {deal.match_reason && <span style={{ fontSize: 12, color: "#2d4a3e", fontWeight: 500 }}>✓ {deal.match_reason}</span>}
                      </div>
                    </div>
                    {deal.url && (
                      <a href={deal.url} target="_blank" rel="noreferrer"
                        style={{ background: "#e8833a", color: "white", border: "none", borderRadius: 10, padding: "10px 16px", fontWeight: 700, fontSize: 13, cursor: "pointer", whiteSpace: "nowrap", fontFamily: "inherit", textDecoration: "none" }}>
                        View Deal →
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── BUDGET TAB ─────────────────────────────────────────────────────── */}
        {activeTab === "budget" && (
          <div>
            <h2 style={{ fontFamily: "'Playfair Display', serif", margin: "0 0 20px" }}>Clothing Budget</h2>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>
              <div style={{ background: "white", borderRadius: 16, padding: 24, boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
                <p style={{ fontSize: 13, color: "#888", margin: "0 0 4px" }}>Monthly Budget</p>
                <div style={{ fontSize: 36, fontWeight: 700, fontFamily: "'Playfair Display', serif" }}>${budgetInput}</div>
                <input type="range" min="50" max="1000" step="10" value={budgetInput}
                  onChange={(e) => setBudgetInput(Number(e.target.value))}
                  onMouseUp={(e) => updateBudget(Number(e.target.value))}
                  onTouchEnd={(e) => updateBudget(Number(e.target.value))}
                  style={{ width: "100%", marginTop: 8, accentColor: "#2d4a3e" }} />
                <p style={{ fontSize: 12, color: "#888", marginTop: 4 }}>Slide to update your budget</p>
              </div>
              <div style={{ background: "white", borderRadius: 16, padding: 24, boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
                <p style={{ fontSize: 13, color: "#888", margin: "0 0 4px" }}>Spent This Month</p>
                <div style={{ fontSize: 36, fontWeight: 700, fontFamily: "'Playfair Display', serif", color: budget.is_over_budget ? "#c0392b" : "#1a1a1a" }}>
                  ${budget.spent_this_month?.toFixed(0)}
                </div>
                <div style={{ background: "#f0f0ec", borderRadius: 8, height: 10, marginTop: 12, overflow: "hidden" }}>
                  <div style={{ background: budget.is_over_budget ? "#c0392b" : budget.is_warning ? "#f39c12" : "#27ae60", height: "100%", borderRadius: 8, width: `${Math.min(budget.percent_used || 0, 100)}%`, transition: "width 0.5s" }} />
                </div>
                <p style={{ fontSize: 12, color: "#888", marginTop: 6 }}>
                  {budget.is_over_budget
                    ? `$${Math.abs(budget.remaining).toFixed(0)} over budget!`
                    : `$${budget.remaining?.toFixed(0)} remaining · ${budget.days_left_in_month} days left`}
                </p>
              </div>
            </div>

            {budget.is_warning && (
              <div style={{ background: "#fef3c7", border: "1px solid #f59e0b", borderRadius: 12, padding: 16, marginBottom: 20, display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 24 }}>💡</span>
                <div>
                  <strong style={{ color: "#92400e" }}>Budget Tip: </strong>
                  <span style={{ fontSize: 13, color: "#666" }}>
                    You've used {budget.percent_used?.toFixed(0)}% of your budget with {budget.days_left_in_month} days left this month.
                  </span>
                </div>
              </div>
            )}

            <h3 style={{ marginBottom: 12 }}>Recent Purchases</h3>
            <div style={{ background: "white", borderRadius: 16, overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
              {purchases.length === 0 ? (
                <div style={{ padding: 24, textAlign: "center", color: "#888", fontSize: 14 }}>No purchases recorded this month</div>
              ) : (
                purchases.slice(0, 10).map((p, i) => (
                  <div key={p.id} style={{ padding: "14px 20px", borderBottom: i < purchases.length - 1 ? "1px solid #f0f0ec" : "none", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{p.item_name}</div>
                      <span style={{ fontSize: 12, color: "#888" }}>
                        {new Date(p.purchased_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })} · {p.category}
                      </span>
                    </div>
                    <div style={{ fontWeight: 700, fontSize: 15 }}>-${p.amount?.toFixed(0)}</div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* ── ANALYTICS TAB ──────────────────────────────────────────────────── */}
        {activeTab === "analytics" && (
          <div>
            <h2 style={{ fontFamily: "'Playfair Display', serif", margin: "0 0 20px" }}>Wardrobe Analytics</h2>
            {!analytics.summary ? (
              <Spinner />
            ) : (
              <>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 24 }}>
                  {[
                    { label: "Total Items", value: analytics.summary.total_items, sub: "in your wardrobe" },
                    { label: "Total Value", value: `$${analytics.summary.total_value}`, sub: "invested in clothes" },
                    { label: "Avg Cost/Wear", value: `$${analytics.summary.avg_cost_per_wear}`, sub: "across all items" },
                  ].map((s) => (
                    <div key={s.label} style={{ background: "white", borderRadius: 16, padding: 20, textAlign: "center", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
                      <div style={{ fontSize: 32, fontWeight: 700, fontFamily: "'Playfair Display', serif" }}>{s.value}</div>
                      <div style={{ fontSize: 14, fontWeight: 600, marginTop: 4 }}>{s.label}</div>
                      <div style={{ fontSize: 12, color: "#888" }}>{s.sub}</div>
                    </div>
                  ))}
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                  {/* Category breakdown */}
                  <div style={{ background: "white", borderRadius: 16, padding: 20, boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
                    <h3 style={{ margin: "0 0 16px", fontSize: 15 }}>Category Breakdown</h3>
                    {analytics.categories.map((cat) => (
                      <div key={cat.category} style={{ marginBottom: 12 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}>
                          <span>{cat.category}</span><span style={{ fontWeight: 600 }}>{cat.count} items</span>
                        </div>
                        <div style={{ background: "#f0f0ec", borderRadius: 6, height: 8, overflow: "hidden" }}>
                          <div style={{ background: "#2d4a3e", height: "100%", borderRadius: 6, width: `${cat.percentage}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Color distribution */}
                  <div style={{ background: "white", borderRadius: 16, padding: 20, boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
                    <h3 style={{ margin: "0 0 16px", fontSize: 15 }}>Color Distribution</h3>
                    {analytics.colors.map((c) => (
                      <div key={c.color_name} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                        <div style={{ width: 20, height: 20, borderRadius: "50%", background: c.color_hex, border: "1px solid #ddd", flexShrink: 0 }} />
                        <span style={{ fontSize: 13, flex: 1 }}>{c.color_name}</span>
                        <span style={{ fontSize: 13, fontWeight: 600 }}>{c.count}</span>
                        {c.is_oversaturated && <span style={{ fontSize: 11, background: "#fee2e2", color: "#b91c1c", borderRadius: 6, padding: "2px 6px" }}>Too many!</span>}
                      </div>
                    ))}
                  </div>

                  {/* Most worn */}
                  <div style={{ background: "white", borderRadius: 16, padding: 20, boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
                    <h3 style={{ margin: "0 0 16px", fontSize: 15 }}>Most Worn Items</h3>
                    {analytics.mostWorn.map((item, i) => (
                      <div key={item.id} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: "#888", width: 18 }}>#{i + 1}</span>
                        {item.image_path ? (
                          <img src={`${BASE}/${item.image_path}`} alt={item.name} style={{ width: 32, height: 32, borderRadius: 6, objectFit: "cover" }} />
                        ) : <span style={{ fontSize: 20 }}>👕</span>}
                        <span style={{ fontSize: 13, flex: 1 }}>{item.name}</span>
                        <span style={{ fontSize: 13, fontWeight: 600 }}>{item.times_worn}x</span>
                      </div>
                    ))}
                    {analytics.mostWorn.length === 0 && <p style={{ color: "#888", fontSize: 13 }}>Wear your clothes to see stats</p>}
                  </div>

                  {/* Least worn */}
                  <div style={{ background: "white", borderRadius: 16, padding: 20, boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
                    <h3 style={{ margin: "0 0 16px", fontSize: 15 }}>Least Worn — Consider Donating?</h3>
                    {analytics.leastWorn.map((item) => (
                      <div key={item.id} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                        {item.image_path ? (
                          <img src={`${BASE}/${item.image_path}`} alt={item.name} style={{ width: 32, height: 32, borderRadius: 6, objectFit: "cover" }} />
                        ) : <span style={{ fontSize: 20 }}>👕</span>}
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 13 }}>{item.name}</div>
                          <div style={{ fontSize: 11, color: "#888" }}>${item.cost_per_wear}/wear</div>
                        </div>
                        <span style={{ fontSize: 13, fontWeight: 600, color: "#c0392b" }}>{item.times_worn}x</span>
                      </div>
                    ))}
                    {analytics.leastWorn.length === 0 && <p style={{ color: "#888", fontSize: 13 }}>No data yet</p>}
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* ── STYLE TIPS TAB ─────────────────────────────────────────────────── */}
        {activeTab === "styles" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 10 }}>
              <h2 style={{ fontFamily: "'Playfair Display', serif", margin: 0 }}>AI Style Suggestions</h2>
              <div style={{ display: "flex", gap: 8 }}>
                {["occasion", "color_variety", "capsule_wardrobe"].map((focus) => (
                  <button key={focus} onClick={() => generateStyleSuggestions(focus)} disabled={loading.styles}
                    style={{ background: "#2d4a3e", color: "white", border: "none", borderRadius: 10, padding: "10px 14px", fontWeight: 600, fontSize: 12, cursor: "pointer", fontFamily: "inherit", opacity: loading.styles ? 0.6 : 1 }}>
                    {focus === "occasion" ? "🎭 By Occasion" : focus === "color_variety" ? "🎨 Add Color" : "💎 Capsule"}
                  </button>
                ))}
              </div>
            </div>

            {loading.styles && <Spinner />}

            {styleSuggestions.length === 0 && !loading.styles ? (
              <div style={{ textAlign: "center", padding: 60, color: "#888" }}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>💡</div>
                <p style={{ fontWeight: 600, marginBottom: 8 }}>No style suggestions yet</p>
                <p style={{ fontSize: 14 }}>Click one of the buttons above — AI will analyze your wardrobe and suggest what to buy next</p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {styleSuggestions.map((s) => (
                  <div key={s.id} style={{ background: "white", borderRadius: 16, padding: 24, boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: 12 }}>
                      <div style={{ flex: 1 }}>
                        <span style={{ fontSize: 11, fontWeight: 600, background: "#f0fdf4", color: "#166534", borderRadius: 6, padding: "3px 10px" }}>{s.occasion || s.focus}</span>
                        <p style={{ margin: "10px 0 0", fontSize: 15, lineHeight: 1.6 }}>{s.suggestion_text}</p>
                      </div>
                    </div>
                    {s.missing_items?.length > 0 && (
                      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 12 }}>
                        {s.missing_items.map((item, i) => (
                          <div key={i} style={{ background: "#f7f6f3", borderRadius: 10, padding: "10px 14px", fontSize: 13 }}>
                            <div style={{ fontWeight: 600 }}>{item.name}</div>
                            <div style={{ color: "#888", fontSize: 12 }}>{item.category} · {item.why}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
