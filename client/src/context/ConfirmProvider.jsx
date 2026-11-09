import { useCallback, useRef, useState } from "react";
import { ConfirmContext } from "./ConfirmContext";
import ConfirmDialog from "../components/ConfirmDialog";

export function ConfirmProvider({ children }) {
  const [options, setOptions] = useState(null);
  const resolver = useRef(null);

  const confirm = useCallback((opts) => {
    return new Promise((resolve) => {
      resolver.current = resolve; 
      setOptions(opts);           
    });
  }, []);

  function close(result) {
    resolver.current?.(result);   
    resolver.current = null;
    setOptions(null);
  }

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <ConfirmDialog options={options} onClose={close} />
    </ConfirmContext.Provider>
  );
}