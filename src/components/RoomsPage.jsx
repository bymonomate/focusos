// ⚠️ IMPORTANT
// Copy the function below and paste it at the VERY END of your existing RoomsPage.jsx file.
// Do NOT replace your file — just append this.

export function getStoredFocusRooms() {
  try {
    return JSON.parse(localStorage.getItem('focus-os-focus-rooms')) || [];
  } catch {
    return [];
  }
}
