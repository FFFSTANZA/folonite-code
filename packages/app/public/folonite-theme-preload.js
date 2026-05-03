;(function () {
  var themeKey = "folonite-theme-id"
  var schemeKey = "folonite-color-scheme"
  var cssLightKey = "folonite-theme-css-light"
  var cssDarkKey = "folonite-theme-css-dark"
  var scheme = "light"

  try {
    var storedTheme = localStorage.getItem(themeKey)
    if (storedTheme !== "folonite") {
      localStorage.setItem(themeKey, "folonite")
      localStorage.removeItem(cssLightKey)
      localStorage.removeItem(cssDarkKey)
    }

    var storedScheme = localStorage.getItem(schemeKey)
    if (storedScheme === "light" || storedScheme === "dark") {
      scheme = storedScheme
    } else if (storedScheme === "system") {
      scheme =
        window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
    } else {
      localStorage.setItem(schemeKey, "light")
    }
  } catch (_err) {
    // Private mode / blocked storage / non-browser environment: the app still
    // needs the dataset attributes below so the first paint is not unstyled.
  }

  document.documentElement.dataset.theme = "folonite"
  document.documentElement.dataset.colorScheme = scheme
})()
