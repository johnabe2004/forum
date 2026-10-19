// Startup file for DirectAdmin / CloudLinux "Setup Node.js App" (Passenger).
// Passenger loads the startup file with require(), which cannot load an ES
// module that uses top-level await, so this wrapper imports index.js instead.
import("./index.js").catch((error) => {
  console.error("Failed to start the API:", error);
  process.exit(1);
});
