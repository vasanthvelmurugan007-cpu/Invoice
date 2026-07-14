"use client";

import React, { useState, useEffect, useRef } from "react";
import { searchHSN } from "../app/actions/hsn";

interface HsnAutocompleteProps {
  value: string;
  onChange: (value: string, gstRate: number) => void;
  placeholder?: string;
  className?: string;
}

export function HsnAutocomplete({ value, onChange, placeholder = "Search HSN/SAC...", className = "" }: HsnAutocompleteProps) {
  const [query, setQuery] = useState(value || "");
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Sync internal query state with external value changes
  useEffect(() => {
    setQuery(value || "");
  }, [value]);

  // Debounced search logic
  useEffect(() => {
    if (!query) {
      setSuggestions([]);
      return;
    }

    const timer = setTimeout(async () => {
      const results = await searchHSN(query);
      setSuggestions(results || []);
    }, 250);

    return () => clearTimeout(timer);
  }, [query]);

  // Click outside to close handler
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (item: any) => {
    setQuery(item.code);
    onChange(item.code, Number(item.gstRate) / 100); // gstRate stored as rate x 100 (e.g. 1800 -> 18)
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} style={{ position: "relative" }} className={className}>
      <input
        type="text"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setIsOpen(true);
          // Still report raw typing changes to parent
          onChange(e.target.value, 5); // Default back to 5% if custom/unrecognized
        }}
        onFocus={() => setIsOpen(true)}
        placeholder={placeholder}
        style={{
          width: "100%",
          padding: "8px 12px",
          borderRadius: "var(--border-radius-md, 6px)",
          border: "0.5px solid var(--color-border-tertiary)",
          background: "rgba(255, 255, 255, 0.03)",
          color: "var(--color-text-primary)",
          fontSize: "13px",
          outline: "none"
        }}
      />
      
      {isOpen && suggestions.length > 0 && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            right: 0,
            marginTop: "6px",
            zIndex: 9999,
            maxHeight: "220px",
            overflowY: "auto",
            borderRadius: "var(--border-radius-md, 6px)",
            border: "0.5px solid var(--color-border-tertiary)",
            background: "var(--color-background-tertiary, #030712)",
            boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.5)",
            backdropFilter: "blur(8px)"
          }}
        >
          {suggestions.map((item) => (
            <div
              key={item.id || item.code}
              onClick={() => handleSelect(item)}
              style={{
                padding: "8px 12px",
                cursor: "pointer",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: "10px",
                borderBottom: "0.5px solid rgba(255, 255, 255, 0.05)"
              }}
              className="hover-bg-accent"
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <span style={{ fontWeight: 600, color: "var(--color-text-info)" }}>{item.code}</span>
                  <span
                    style={{
                      fontSize: "9px",
                      padding: "2px 5px",
                      borderRadius: "3px",
                      background: "rgba(255,255,255,0.08)",
                      color: "var(--color-text-secondary)"
                    }}
                  >
                    {item.type}
                  </span>
                </div>
                <div
                  style={{
                    fontSize: "11px",
                    color: "var(--color-text-secondary)",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    marginTop: "2px"
                  }}
                  title={item.description}
                >
                  {item.description}
                </div>
              </div>
              <div
                style={{
                  fontSize: "11px",
                  fontWeight: 600,
                  padding: "4px 8px",
                  borderRadius: "9999px",
                  background: "rgba(99, 102, 241, 0.15)",
                  color: "#818cf8"
                }}
              >
                {Number(item.gstRate) / 100}%
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
