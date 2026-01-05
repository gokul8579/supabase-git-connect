import React, { createContext, useContext, useState } from "react";
import { EduvancaLoader } from "@/components/EduvancaLoader";

interface LoaderContextType {
  showLoader: () => void;
  hideLoader: () => void;
}

const LoaderContext = createContext<LoaderContextType | null>(null);

export const useGlobalLoader = () => useContext(LoaderContext)!;

export const GlobalLoaderProvider = ({ children }: { children: React.ReactNode }) => {
  const [visible, setVisible] = useState(false);

  const showLoader = () => setVisible(true);
  const hideLoader = () => setVisible(false);

  return (
    <LoaderContext.Provider value={{ showLoader, hideLoader }}>
      {/* CONTENT */}
      {children}

      {/* GLOBAL LOADER OVERLAY */}
      {visible && (
        <div className="fixed inset-0 bg-white/60 backdrop-blur-sm flex items-center justify-center z-[9999]">
          <EduvancaLoader size={80} />
        </div>
      )}
    </LoaderContext.Provider>
  );
};
