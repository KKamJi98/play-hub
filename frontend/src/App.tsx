import { RouterProvider } from "react-router";
import { ThemeProvider } from "./context/ThemeContext";
import { DisplaySettingsProvider } from "./context/DisplaySettingsContext";
import { router } from "./router";

export default function App() {
  return (
    <ThemeProvider>
      <DisplaySettingsProvider>
        <RouterProvider router={router} />
      </DisplaySettingsProvider>
    </ThemeProvider>
  );
}
