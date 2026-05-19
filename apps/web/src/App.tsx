import { Navigate, Route, Routes } from "react-router-dom";

import "./App.css";

import { EditorPage } from "./pages/EditorPage";
import { ProjectionPage } from "./pages/ProjectionPage";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<EditorPage />} />
      <Route path="/projection/:projectId" element={<ProjectionPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
