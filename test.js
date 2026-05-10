try {
  const crypto = require("node:crypto");
  console.log("Crypto is supported!");
} catch (err) {
  console.error("Crypto support is disabled or missing.");
}
