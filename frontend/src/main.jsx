import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import "./product-detail.css";

function Root() {
  const [dark, setDark] = useState(() => localStorage.getItem("odynza-theme") === "dark");

  useEffect(() => {
    document.documentElement.dataset.theme = dark ? "dark" : "light";
    document.documentElement.style.colorScheme = dark ? "dark" : "light";
    localStorage.setItem("odynza-theme", dark ? "dark" : "light");
  }, [dark]);

  return <App dark={dark} setDark={setDark} />;
}

createRoot(document.getElementById("root")).render(<Root />);
