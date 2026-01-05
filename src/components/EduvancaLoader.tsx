import React from "react";

export const EduvancaLoader = ({ size = 70 }: { size?: number }) => {
  const ringSize = size + 16; // outer ring slightly bigger

  return (
    <div className="flex items-center justify-center">
      <div className="relative" style={{ width: ringSize, height: ringSize }}>
        
        {/* Rotating ring */}
        <div
          className="absolute rounded-full animate-spin"
          style={{
            width: ringSize,
            height: ringSize,
            border: "5px solid #ffb3b3", // light pink
            borderTopColor: "#ff4d4d",    // red highlight
            borderRadius: "50%",
          }}
        />

        {/* Pink circle */}
        <div
          className="absolute rounded-full flex items-center justify-center"
          style={{
            width: size,
            height: size,
            top: 8,
            left: 8,
            backgroundColor: "#ffb3b3", // soft pink
          }}
        >
          {/* E Letter */}
          <span
            style={{
              fontSize: size * 0.6,
              color: "#ff3333",       // red
              fontWeight: 800,
              fontFamily: "'Comic Sans MS', 'Marker Felt', sans-serif",
            }}
          >
            E
          </span>
        </div>
      </div>
    </div>
  );
};
