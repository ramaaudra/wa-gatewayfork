// Initialize stagewise toolbar for development mode only
(function () {
  // Check if we're in development mode
  const isDevelopment =
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1" ||
    window.location.hostname.includes(".local");

  if (isDevelopment) {
    // Function to initialize the toolbar once the script is loaded
    window.initStagewiseToolbar = function () {
      // Configure the toolbar
      const stagewiseConfig = {
        plugins: [],
      };

      // Initialize the toolbar
      if (window.stagewise && window.stagewise.initToolbar) {
        window.stagewise.initToolbar(stagewiseConfig);
        console.log("Stagewise toolbar initialized in development mode");
      } else {
        console.error("Stagewise toolbar module not found");
      }
    };

    // Load the stagewise script dynamically
    const script = document.createElement("script");
    script.src =
      "/node_modules/@stagewise/toolbar/dist/stagewise-toolbar.umd.js";
    script.onload = window.initStagewiseToolbar;
    script.onerror = function () {
      console.error("Failed to load stagewise toolbar script");
    };
    document.head.appendChild(script);
  }
})();
