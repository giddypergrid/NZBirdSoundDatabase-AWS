import React from "react";

interface AIBorderProps {
  children: React.ReactNode;
  /** Show the small "AI" badge in the top-right corner. */
  showBadge?: boolean;
  className?: string;
  /** Kept for API compatibility; no visual effect. */
  rounded?: "pill" | "lg";
}

/**
 * Adds a small "AI" badge in the top-right corner of the wrapped element
 * to signal that the control is powered by an ML model (semantic search,
 * sound matching, etc.).
 */
const AIBorder: React.FC<AIBorderProps> = ({
  children,
  showBadge = true,
  className = "",
}) => {
  return (
    <span className={`relative inline-block ${className}`}>
      {children}
      {showBadge && (
        <span
          className="absolute -top-2 -right-1 z-10 px-1 py-[1px] rounded-md text-[8px] font-bold tracking-wider
                     bg-blue-500 text-white shadow-md pointer-events-none select-none"
        >
          AI
        </span>
      )}
    </span>
  );
};

export default AIBorder;
