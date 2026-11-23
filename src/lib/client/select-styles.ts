"use client";

import type { StylesConfig } from "react-select";

export interface SimpleSelectOption {
  value: string;
  label: string;
}

/** Style react-select solid kontras tinggi sesuai standar UI (tanpa transparansi). */
export const solidFilterSelectStyles: StylesConfig<SimpleSelectOption, false> = {
  control: (base, state) => ({
    ...base,
    minHeight: "34px",
    height: "34px",
    borderRadius: "0.75rem",
    backgroundColor: "#ffffff",
    borderColor: state.isFocused ? "#005BAC" : "#cbd5e1",
    borderWidth: "2px",
    fontSize: "12px",
    fontWeight: 700,
    boxShadow: "none",
    "&:hover": {
      borderColor: state.isFocused ? "#005BAC" : "#94a3b8",
    },
  }),
  valueContainer: (base) => ({
    ...base,
    padding: "0 10px",
  }),
  input: (base) => ({
    ...base,
    margin: 0,
    padding: 0,
    color: "#0f172a",
    fontWeight: 700,
  }),
  placeholder: (base) => ({
    ...base,
    color: "#334155",
    fontWeight: 700,
  }),
  singleValue: (base) => ({
    ...base,
    color: "#0f172a",
    fontWeight: 700,
  }),
  menu: (base) => ({
    ...base,
    backgroundColor: "#ffffff",
    border: "2px solid #cbd5e1",
    borderRadius: "0.75rem",
    boxShadow: "0 10px 25px -5px rgba(15, 23, 42, 0.12)",
    zIndex: 70,
    fontSize: "12px",
  }),
  menuPortal: (base) => ({
    ...base,
    zIndex: 9999,
  }),
  option: (base, state) => ({
    ...base,
    backgroundColor: state.isSelected
      ? "#005BAC"
      : state.isFocused
        ? "#e2e8f0"
        : "#ffffff",
    color: state.isSelected ? "#ffffff" : "#0f172a",
    fontWeight: state.isSelected ? 800 : 600,
    cursor: "pointer",
  }),
  indicatorsContainer: (base) => ({
    ...base,
    height: "30px",
  }),
  clearIndicator: (base) => ({
    ...base,
    padding: "4px",
    color: "#64748b",
    cursor: "pointer",
    "&:hover": { color: "#e11d48" },
  }),
  dropdownIndicator: (base) => ({
    ...base,
    padding: "4px 6px",
    color: "#475569",
    cursor: "pointer",
  }),
  indicatorSeparator: () => ({ display: "none" }),
};
