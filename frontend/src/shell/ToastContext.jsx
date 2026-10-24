import { createContext, useCallback, useContext, useRef, useState } from "react";

// Preview-only links (e.g. "Reports — next screen") pop a toast, same as the
// HTML build's data-toast behaviour.
const ToastContext = createContext(() => {});

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }) {
  const [msg, setMsg] = useState("");
  const [show, setShow] = useState(false);
  const timer = useRef(null);

  const toast = useCallback((text) => {
    setMsg(text);
    setShow(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setShow(false), 2200);
  }, []);

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className={`toast${show ? " show" : ""}`} role="status" aria-live="polite">
        {msg}
      </div>
    </ToastContext.Provider>
  );
}
