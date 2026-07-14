import React from "react";
import ReactDOM from "react-dom/client";

import { App } from "./App"; // {}：具名导出，表示从 App.tsx 中导入 App 函数
import "./styles/global.css";
//! ：告诉 TypeScript：确认这里不会是 null
ReactDOM.createRoot(document.getElementById("root")!).render( 
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
