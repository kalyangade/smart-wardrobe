import { useState } from "react";

const SAMPLE_WARDROBE = [
  { id: 1, name: "Navy Polo Shirt", category: "Tops", color: "#1a2a5e", colorName: "Navy", pattern: "Solid", style: "Casual", price: 35, image: "👕", timesWorn: 12 },
  { id: 2, name: "White Oxford Shirt", category: "Tops", color: "#f5f5f0", colorName: "White", pattern: "Solid", style: "Formal", price: 55, image: "👔", timesWorn: 8 },
  { id: 3, name: "Navy V-Neck Tee", category: "Tops", color: "#1a2a5e", colorName: "Navy", pattern: "Solid", style: "Casual", price: 20, image: "👕", timesWorn: 15 },
  { id: 4, name: "Navy Crew Neck Tee", category: "Tops", color: "#192a56", colorName: "Navy", pattern: "Solid", style: "Casual", price: 18, image: "👕", timesWorn: 10 },
  { id: 5, name: "Dark Blue Henley", category: "Tops", color: "#1e3a6e", colorName: "Navy", pattern: "Solid", style: "Casual", price: 28, image: "👕", timesWorn: 6 },
  { id: 6, name: "Black Slim Jeans", category: "Bottoms", color: "#1a1a1a", colorName: "Black", pattern: "Solid", style: "Casual", price: 60, image: "👖", timesWorn: 20 },
  { id: 7, name: "Khaki Chinos", category: "Bottoms", color: "#c2a878", colorName: "Khaki", pattern: "Solid", style: "Smart Casual", price: 45, image: "👖", timesWorn: 14 },
  { id: 8, name: "Gray Joggers", category: "Bottoms", color: "#808080", colorName: "Gray", pattern: "Solid", style: "Sporty", price: 30, image: "👖", timesWorn: 18 },
  { id: 9, name: "White Sneakers", category: "Shoes", color: "#ffffff", colorName: "White", pattern: "Solid", style: "Casual", price: 85, image: "👟", timesWorn: 25 },
  { id: 10, name: "Brown Loafers", category: "Shoes", color: "#6b3a2a", colorName: "Brown", pattern: "Solid", style: "Formal", price: 95, image: "👞", timesWorn: 7 },
  { id: 11, name: "Black Watch", category: "Accessories", color: "#0a0a0a", colorName: "Black", pattern: "Solid", style: "Formal", price: 120, image: "⌚", timesWorn: 30 },
  { id: 12, name: "Striped Scarf", category: "Accessories", color: "#c0392b", colorName: "Red", pattern: "Striped", style: "Casual", price: 25, image: "🧣", timesWorn: 3 },
];

const OUTFITS = [
  { name: "Casual Friday", items: [1, 6, 9], occasion: "Work Casual", score: 92 },
  { name: "Smart Evening", items: [2, 7, 10, 11], occasion: "Date Night", score: 95 },
  { name: "Weekend Chill", items: [3, 8, 9], occasion: "Weekend", score: 88 },
];

const DEALS = [
  { name: "Olive Chinos", store: "Amazon", price: 32, originalPrice: 50, discount: 36, match: "Goes with your White Oxford Shirt", image: "👖", color: "#556b2f" },
  { name: "Gray Blazer", store: "Nordstrom", price: 89, originalPrice: 145, discount: 39, match: "Pairs with Khaki Chinos + Brown Loafers", image: "🧥", color: "#696969" },
  { name: "Tan Belt", store: "Macy's", price: 19, originalPrice: 35, discount: 46, match: "Completes 3 of your outfits", image: "🪢", color: "#d2a679" },
];

const DUPLICATE_WARNINGS = [
  { color: "Navy", category: "Tops", count: 4, items: ["Navy Polo Shirt", "Navy V-Neck Tee", "Navy Crew Neck Tee", "Dark Blue Henley"] },
];

export default function SmartWardrobe() {
  const [activeTab, setActiveTab] = useState("wardrobe");
  const [filterCat, setFilterCat] = useState("All");
  const [budget, setBudget] = useState(200);
  const [spent, setSpent] = useState(142);
  const [selectedOutfit, setSelectedOutfit] = useState(null);
  const [showUpload, setShowUpload] = useState(false);
  const [showDupeAlert, setShowDupeAlert] = useState(true);
  const [uploadStep, setUploadStep] = useState(0);

  const totalItems = SAMPLE_WARDROBE.length;
  const totalValue = SAMPLE_WARDROBE.reduce((s, i) => s + i.price, 0);
  const categories = ["All", "Tops", "Bottoms", "Shoes", "Accessories"];
  const filtered = filterCat === "All" ? SAMPLE_WARDROBE : SAMPLE_WARDROBE.filter(i => i.category === filterCat);

  const colorCounts = {};
  SAMPLE_WARDROBE.forEach(i => {
    const key = `${i.colorName} ${i.category}`;
    colorCounts[key] = (colorCounts[key] || 0) + 1;
  });

  const catCounts = {};
  SAMPLE_WARDROBE.forEach(i => { catCounts[i.category] = (catCounts[i.category] || 0) + 1; });

  const tabs = [
    { id: "wardrobe", label: "My Wardrobe", icon: "👕" },
    { id: "outfits", label: "Outfit Ideas", icon: "✨" },
    { id: "deals", label: "Smart Deals", icon: "🏷️" },
    { id: "budget", label: "Budget", icon: "💰" },
    { id: "analytics", label: "Analytics", icon: "📊" },
  ];

  return (
    <div style={{ minHeight: "100vh", fontFamily: "'DM Sans', sans-serif", background: "#f7f6f3", color: "#1a1a1a" }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&family=Playfair+Display:wght@700&display=swap" rel="stylesheet" />
      
      {/* Header */}
      <div style={{ background: "linear-gradient(135deg, #1a2a2e 0%, #2d4a3e 100%)", padding: "24px 32px", color: "white" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 28, margin: 0, letterSpacing: "-0.5px" }}>Smart Wardrobe</h1>
            <p style={{ margin: "4px 0 0", opacity: 0.7, fontSize: 14 }}>Your closet, smarter.</p>
          </div>
          <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
            <div style={{ background: "rgba(255,255,255,0.12)", borderRadius: 12, padding: "8px 16px", fontSize: 13 }}>
              <span style={{ opacity: 0.7 }}>Items:</span> <strong>{totalItems}</strong>
              <span style={{ margin: "0 8px", opacity: 0.3 }}>|</span>
              <span style={{ opacity: 0.7 }}>Value:</span> <strong>${totalValue}</strong>
            </div>
            <button onClick={() => { setShowUpload(true); setUploadStep(0); }} style={{ background: "#e8833a", border: "none", color: "white", borderRadius: 10, padding: "10px 20px", fontWeight: 700, fontSize: 14, cursor: "pointer", fontFamily: "inherit" }}>
              + Add Clothes
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ background: "white", borderBottom: "1px solid #e8e6e1", position: "sticky", top: 0, zIndex: 10 }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", gap: 0 }}>
          {tabs.map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)}
              style={{ flex: 1, padding: "14px 8px", border: "none", borderBottom: activeTab === t.id ? "3px solid #2d4a3e" : "3px solid transparent", background: "none", cursor: "pointer", fontFamily: "inherit", fontSize: 14, fontWeight: activeTab === t.id ? 700 : 400, color: activeTab === t.id ? "#1a2a2e" : "#888", transition: "all 0.2s" }}>
              <span style={{ marginRight: 6 }}>{t.icon}</span>{t.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "24px 16px" }}>

        {/* DUPLICATE WARNING */}
        {showDupeAlert && DUPLICATE_WARNINGS.map((d, i) => (
          <div key={i} style={{ background: "#fff3e0", border: "1px solid #ffb74d", borderRadius: 12, padding: "16px 20px", marginBottom: 20, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ fontSize: 28 }}>⚠️</span>
              <div>
                <strong style={{ color: "#e65100" }}>Duplicate Alert: You have {d.count} {d.color} {d.category}!</strong>
                <p style={{ margin: "4px 0 0", fontSize: 13, color: "#666" }}>{d.items.join(", ")} — Consider a different color next time you shop.</p>
              </div>
            </div>
            <button onClick={() => setShowDupeAlert(false)} style={{ background: "none", border: "none", fontSize: 18, cursor: "pointer", color: "#999" }}>✕</button>
          </div>
        ))}

        {/* UPLOAD MODAL */}
        {showUpload && (
          <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.5)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ background: "white", borderRadius: 20, padding: 32, width: 420, maxWidth: "90vw" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                <h2 style={{ margin: 0, fontFamily: "'Playfair Display', serif" }}>Add Clothing</h2>
                <button onClick={() => setShowUpload(false)} style={{ background: "none", border: "none", fontSize: 22, cursor: "pointer" }}>✕</button>
              </div>
              
              {uploadStep === 0 && (
                <div>
                  <div style={{ border: "2px dashed #ccc", borderRadius: 16, padding: "48px 24px", textAlign: "center", cursor: "pointer", background: "#fafaf8" }} onClick={() => setUploadStep(1)}>
                    <span style={{ fontSize: 48 }}>📸</span>
                    <p style={{ fontWeight: 600, margin: "12px 0 4px" }}>Upload a photo of your clothing</p>
                    <p style={{ color: "#888", fontSize: 13 }}>Take a photo or choose from gallery</p>
                  </div>
                </div>
              )}
              
              {uploadStep === 1 && (
                <div>
                  <div style={{ background: "#f0fdf4", borderRadius: 12, padding: 16, marginBottom: 16, textAlign: "center" }}>
                    <span style={{ fontSize: 36 }}>🤖</span>
                    <p style={{ fontWeight: 600, color: "#166534", margin: "8px 0 4px" }}>AI is analyzing your photo...</p>
                    <p style={{ fontSize: 13, color: "#666" }}>Detecting category, color, pattern, and style</p>
                  </div>
                  <button onClick={() => setUploadStep(2)} style={{ width: "100%", padding: 14, background: "#2d4a3e", color: "white", border: "none", borderRadius: 10, fontWeight: 700, fontSize: 15, cursor: "pointer", fontFamily: "inherit" }}>
                    See Results →
                  </button>
                </div>
              )}

              {uploadStep === 2 && (
                <div>
                  <div style={{ background: "#f7f6f3", borderRadius: 12, padding: 16, marginBottom: 16 }}>
                    <p style={{ fontWeight: 700, margin: "0 0 12px" }}>🏷️ AI Auto-Tagged:</p>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                      {[["Category", "Tops"], ["Color", "Red"], ["Pattern", "Solid"], ["Style", "Casual"]].map(([k,v]) => (
                        <div key={k} style={{ background: "white", borderRadius: 8, padding: "8px 12px" }}>
                          <span style={{ fontSize: 11, color: "#888" }}>{k}</span>
                          <div style={{ fontWeight: 600 }}>{v}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div style={{ background: "#fff3e0", borderRadius: 12, padding: 12, marginBottom: 16, fontSize: 13 }}>
                    <strong>⚠️ Similar item detected!</strong> You already own 4 navy/dark blue tops. This red one is a great choice for variety!
                  </div>
                  <label style={{ fontSize: 13, fontWeight: 600 }}>Purchase Price ($)</label>
                  <input type="number" defaultValue="25" style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid #ddd", marginTop: 4, marginBottom: 16, fontSize: 15, fontFamily: "inherit", boxSizing: "border-box" }} />
                  <button onClick={() => setShowUpload(false)} style={{ width: "100%", padding: 14, background: "#2d4a3e", color: "white", border: "none", borderRadius: 10, fontWeight: 700, fontSize: 15, cursor: "pointer", fontFamily: "inherit" }}>
                    ✓ Add to Wardrobe
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* WARDROBE TAB */}
        {activeTab === "wardrobe" && (
          <div>
            <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
              {categories.map(cat => (
                <button key={cat} onClick={() => setFilterCat(cat)}
                  style={{ padding: "8px 18px", borderRadius: 20, border: filterCat === cat ? "2px solid #2d4a3e" : "1px solid #ddd", background: filterCat === cat ? "#2d4a3e" : "white", color: filterCat === cat ? "white" : "#444", fontWeight: 600, cursor: "pointer", fontSize: 13, fontFamily: "inherit" }}>
                  {cat} {cat !== "All" && <span style={{ opacity: 0.6 }}>({catCounts[cat] || 0})</span>}
                </button>
              ))}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 16 }}>
              {filtered.map(item => (
                <div key={item.id} style={{ background: "white", borderRadius: 14, padding: 16, boxShadow: "0 1px 4px rgba(0,0,0,0.06)", cursor: "pointer", transition: "transform 0.2s, box-shadow 0.2s" }}
                  onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-3px)"; e.currentTarget.style.boxShadow = "0 6px 20px rgba(0,0,0,0.1)"; }}
                  onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 1px 4px rgba(0,0,0,0.06)"; }}>
                  <div style={{ background: "#f7f6f3", borderRadius: 10, height: 140, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 56, marginBottom: 12 }}>
                    {item.image}
                  </div>
                  <h3 style={{ margin: "0 0 6px", fontSize: 15 }}>{item.name}</h3>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                    <div style={{ width: 14, height: 14, borderRadius: "50%", background: item.color, border: item.colorName === "White" ? "1px solid #ccc" : "none" }} />
                    <span style={{ fontSize: 12, color: "#888" }}>{item.colorName} · {item.pattern}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8 }}>
                    <span style={{ fontSize: 12, color: "#888" }}>Worn {item.timesWorn}x · ${(item.price / item.timesWorn).toFixed(2)}/wear</span>
                    <span style={{ fontSize: 11, background: "#f0f0ec", borderRadius: 6, padding: "3px 8px", fontWeight: 600 }}>{item.style}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* OUTFITS TAB */}
        {activeTab === "outfits" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h2 style={{ fontFamily: "'Playfair Display', serif", margin: 0 }}>AI Outfit Suggestions</h2>
              <button style={{ background: "#2d4a3e", color: "white", border: "none", borderRadius: 10, padding: "10px 20px", fontWeight: 700, fontSize: 14, cursor: "pointer", fontFamily: "inherit" }}>🔄 Generate New</button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {OUTFITS.map((outfit, i) => {
                const outfitItems = outfit.items.map(id => SAMPLE_WARDROBE.find(w => w.id === id));
                return (
                  <div key={i} style={{ background: "white", borderRadius: 16, padding: 20, boxShadow: "0 1px 4px rgba(0,0,0,0.06)", cursor: "pointer" }}
                    onClick={() => setSelectedOutfit(selectedOutfit === i ? null : i)}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                      <div>
                        <h3 style={{ margin: 0, fontSize: 17 }}>{outfit.name}</h3>
                        <span style={{ fontSize: 12, color: "#888" }}>{outfit.occasion}</span>
                      </div>
                      <div style={{ background: "#f0fdf4", color: "#166534", borderRadius: 20, padding: "6px 14px", fontWeight: 700, fontSize: 14 }}>
                        {outfit.score}% match
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 12 }}>
                      {outfitItems.map(item => (
                        <div key={item.id} style={{ background: "#f7f6f3", borderRadius: 12, padding: 12, flex: 1, textAlign: "center" }}>
                          <div style={{ fontSize: 36, marginBottom: 6 }}>{item.image}</div>
                          <div style={{ fontSize: 12, fontWeight: 600 }}>{item.name}</div>
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 4, marginTop: 4 }}>
                            <div style={{ width: 10, height: 10, borderRadius: "50%", background: item.color, border: item.colorName === "White" ? "1px solid #ccc" : "none" }} />
                            <span style={{ fontSize: 11, color: "#888" }}>{item.colorName}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                    {selectedOutfit === i && (
                      <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
                        <button style={{ flex: 1, padding: 10, background: "#2d4a3e", color: "white", border: "none", borderRadius: 8, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>👍 Love it</button>
                        <button style={{ flex: 1, padding: 10, background: "#f7f6f3", color: "#444", border: "none", borderRadius: 8, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>👎 Skip</button>
                        <button style={{ flex: 1, padding: 10, background: "#f7f6f3", color: "#444", border: "none", borderRadius: 8, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>📅 Wear today</button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* DEALS TAB */}
        {activeTab === "deals" && (
          <div>
            <h2 style={{ fontFamily: "'Playfair Display', serif", margin: "0 0 8px" }}>Smart Deals For You</h2>
            <p style={{ color: "#888", fontSize: 14, marginBottom: 20 }}>Items that match your wardrobe gaps and style — currently on sale.</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {DEALS.map((deal, i) => (
                <div key={i} style={{ background: "white", borderRadius: 16, padding: 20, boxShadow: "0 1px 4px rgba(0,0,0,0.06)", display: "flex", gap: 16, alignItems: "center" }}>
                  <div style={{ background: "#f7f6f3", borderRadius: 12, width: 80, height: 80, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 40, flexShrink: 0 }}>
                    {deal.image}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
                      <div>
                        <h3 style={{ margin: "0 0 2px", fontSize: 16 }}>{deal.name}</h3>
                        <span style={{ fontSize: 12, color: "#888" }}>from {deal.store}</span>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontWeight: 700, fontSize: 18, color: "#c0392b" }}>${deal.price}</div>
                        <div style={{ fontSize: 12, color: "#888", textDecoration: "line-through" }}>${deal.originalPrice}</div>
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8 }}>
                      <div style={{ width: 14, height: 14, borderRadius: "50%", background: deal.color, border: "1px solid #ddd" }} />
                      <span style={{ background: "#fef3c7", color: "#92400e", fontSize: 11, fontWeight: 600, borderRadius: 6, padding: "2px 8px" }}>{deal.discount}% OFF</span>
                      <span style={{ fontSize: 12, color: "#2d4a3e", fontWeight: 500 }}>✓ {deal.match}</span>
                    </div>
                  </div>
                  <button style={{ background: "#e8833a", color: "white", border: "none", borderRadius: 10, padding: "10px 16px", fontWeight: 700, fontSize: 13, cursor: "pointer", whiteSpace: "nowrap", fontFamily: "inherit" }}>View Deal →</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* BUDGET TAB */}
        {activeTab === "budget" && (
          <div>
            <h2 style={{ fontFamily: "'Playfair Display', serif", margin: "0 0 20px" }}>Clothing Budget</h2>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>
              <div style={{ background: "white", borderRadius: 16, padding: 24, boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
                <p style={{ fontSize: 13, color: "#888", margin: "0 0 4px" }}>Monthly Budget</p>
                <div style={{ fontSize: 36, fontWeight: 700, fontFamily: "'Playfair Display', serif" }}>${budget}</div>
                <input type="range" min="50" max="500" step="10" value={budget} onChange={e => setBudget(Number(e.target.value))}
                  style={{ width: "100%", marginTop: 8, accentColor: "#2d4a3e" }} />
              </div>
              <div style={{ background: "white", borderRadius: 16, padding: 24, boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
                <p style={{ fontSize: 13, color: "#888", margin: "0 0 4px" }}>Spent This Month</p>
                <div style={{ fontSize: 36, fontWeight: 700, fontFamily: "'Playfair Display', serif", color: spent > budget ? "#c0392b" : "#1a1a1a" }}>${spent}</div>
                <div style={{ background: "#f0f0ec", borderRadius: 8, height: 10, marginTop: 12, overflow: "hidden" }}>
                  <div style={{ background: spent > budget ? "#c0392b" : spent > budget * 0.8 ? "#f39c12" : "#27ae60", height: "100%", borderRadius: 8, width: `${Math.min((spent / budget) * 100, 100)}%`, transition: "width 0.5s" }} />
                </div>
                <p style={{ fontSize: 12, color: "#888", marginTop: 6 }}>${budget - spent > 0 ? `$${budget - spent} remaining` : `$${spent - budget} over budget!`}</p>
              </div>
            </div>

            <h3 style={{ marginBottom: 12 }}>Recent Purchases</h3>
            <div style={{ background: "white", borderRadius: 16, overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
              {[
                { item: "White Sneakers", date: "Mar 28", amount: 85, cat: "Shoes" },
                { item: "Gray Joggers", date: "Mar 15", amount: 30, cat: "Bottoms" },
                { item: "Dark Blue Henley", date: "Mar 8", amount: 27, cat: "Tops" },
              ].map((p, i) => (
                <div key={i} style={{ padding: "14px 20px", borderBottom: i < 2 ? "1px solid #f0f0ec" : "none", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{p.item}</div>
                    <span style={{ fontSize: 12, color: "#888" }}>{p.date} · {p.cat}</span>
                  </div>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>-${p.amount}</div>
                </div>
              ))}
            </div>

            {spent > budget * 0.8 && (
              <div style={{ background: "#fef3c7", border: "1px solid #f59e0b", borderRadius: 12, padding: 16, marginTop: 16, display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 24 }}>💡</span>
                <div>
                  <strong style={{ color: "#92400e" }}>Budget Tip:</strong>
                  <span style={{ fontSize: 13, color: "#666" }}> You've spent {Math.round((spent/budget)*100)}% of your budget. There are 5 days left this month. Consider waiting for next month before new purchases.</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ANALYTICS TAB */}
        {activeTab === "analytics" && (
          <div>
            <h2 style={{ fontFamily: "'Playfair Display', serif", margin: "0 0 20px" }}>Wardrobe Analytics</h2>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 24 }}>
              {[
                { label: "Total Items", value: totalItems, sub: "in your wardrobe" },
                { label: "Total Value", value: `$${totalValue}`, sub: "invested in clothes" },
                { label: "Avg Cost/Wear", value: `$${(totalValue / SAMPLE_WARDROBE.reduce((s,i) => s + i.timesWorn, 0)).toFixed(2)}`, sub: "across all items" },
              ].map((s, i) => (
                <div key={i} style={{ background: "white", borderRadius: 16, padding: 20, textAlign: "center", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
                  <div style={{ fontSize: 32, fontWeight: 700, fontFamily: "'Playfair Display', serif" }}>{s.value}</div>
                  <div style={{ fontSize: 14, fontWeight: 600, marginTop: 4 }}>{s.label}</div>
                  <div style={{ fontSize: 12, color: "#888" }}>{s.sub}</div>
                </div>
              ))}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              {/* Category Breakdown */}
              <div style={{ background: "white", borderRadius: 16, padding: 20, boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
                <h3 style={{ margin: "0 0 16px", fontSize: 15 }}>Category Breakdown</h3>
                {Object.entries(catCounts).map(([cat, count]) => (
                  <div key={cat} style={{ marginBottom: 12 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}>
                      <span>{cat}</span><span style={{ fontWeight: 600 }}>{count} items</span>
                    </div>
                    <div style={{ background: "#f0f0ec", borderRadius: 6, height: 8, overflow: "hidden" }}>
                      <div style={{ background: "#2d4a3e", height: "100%", borderRadius: 6, width: `${(count / totalItems) * 100}%` }} />
                    </div>
                  </div>
                ))}
              </div>

              {/* Color Distribution */}
              <div style={{ background: "white", borderRadius: 16, padding: 20, boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
                <h3 style={{ margin: "0 0 16px", fontSize: 15 }}>Color Distribution</h3>
                {(() => {
                  const colors = {};
                  SAMPLE_WARDROBE.forEach(i => { colors[i.colorName] = colors[i.colorName] || { count: 0, hex: i.color }; colors[i.colorName].count++; });
                  return Object.entries(colors).sort((a,b) => b[1].count - a[1].count).map(([name, data]) => (
                    <div key={name} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                      <div style={{ width: 20, height: 20, borderRadius: "50%", background: data.hex, border: name === "White" ? "1px solid #ccc" : "none", flexShrink: 0 }} />
                      <span style={{ fontSize: 13, flex: 1 }}>{name}</span>
                      <span style={{ fontSize: 13, fontWeight: 600 }}>{data.count}</span>
                      {data.count >= 3 && <span style={{ fontSize: 11, background: "#fee2e2", color: "#b91c1c", borderRadius: 6, padding: "2px 6px" }}>Too many!</span>}
                    </div>
                  ));
                })()}
              </div>

              {/* Most Worn */}
              <div style={{ background: "white", borderRadius: 16, padding: 20, boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
                <h3 style={{ margin: "0 0 16px", fontSize: 15 }}>Most Worn Items</h3>
                {[...SAMPLE_WARDROBE].sort((a,b) => b.timesWorn - a.timesWorn).slice(0,5).map((item, i) => (
                  <div key={item.id} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: "#888", width: 16 }}>#{i+1}</span>
                    <span style={{ fontSize: 20 }}>{item.image}</span>
                    <span style={{ fontSize: 13, flex: 1 }}>{item.name}</span>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>{item.timesWorn}x</span>
                  </div>
                ))}
              </div>

              {/* Least Worn */}
              <div style={{ background: "white", borderRadius: 16, padding: 20, boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
                <h3 style={{ margin: "0 0 16px", fontSize: 15 }}>Least Worn — Consider Donating?</h3>
                {[...SAMPLE_WARDROBE].sort((a,b) => a.timesWorn - b.timesWorn).slice(0,5).map((item, i) => (
                  <div key={item.id} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                    <span style={{ fontSize: 20 }}>{item.image}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13 }}>{item.name}</div>
                      <div style={{ fontSize: 11, color: "#888" }}>${(item.price / item.timesWorn).toFixed(2)} per wear</div>
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 600, color: "#c0392b" }}>{item.timesWorn}x</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
