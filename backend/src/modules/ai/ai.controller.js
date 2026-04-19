/**
 * AI Module — Controller
 * Proxies requests to the Python FastAPI AI microservice (port 8000).
 */

const http = require("http");

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || "http://localhost:8000";

/**
 * Proxy a request to the AI microservice.
 */
function proxyToAI(endpoint) {
  return async (req, res) => {
    try {
      const url = new URL(endpoint, AI_SERVICE_URL);
      const options = {
        hostname: url.hostname,
        port: url.port,
        path: url.pathname,
        method: req.method,
        headers: { "Content-Type": "application/json" },
      };

      const proxyReq = http.request(options, (proxyRes) => {
        let data = "";
        proxyRes.on("data", (chunk) => (data += chunk));
        proxyRes.on("end", () => {
          try {
            res.status(proxyRes.statusCode).json(JSON.parse(data));
          } catch {
            res.status(proxyRes.statusCode).send(data);
          }
        });
      });

      proxyReq.on("error", (err) => {
        console.error("AI service proxy error:", err.message);
        res.status(503).json({
          success: false,
          message: "AI service is unavailable. Please try again later.",
        });
      });

      if (req.body && Object.keys(req.body).length > 0) {
        proxyReq.write(JSON.stringify(req.body));
      }

      proxyReq.end();
    } catch (error) {
      console.error("AI proxy error:", error);
      res.status(500).json({ success: false, message: "AI request failed." });
    }
  };
}

// Health check for AI service
async function aiHealthCheck(req, res) {
  try {
    const url = new URL("/health", AI_SERVICE_URL);
    http.get(url.toString(), (proxyRes) => {
      let data = "";
      proxyRes.on("data", (chunk) => (data += chunk));
      proxyRes.on("end", () => {
        res.json({ success: true, aiService: JSON.parse(data) });
      });
    }).on("error", () => {
      res.json({ success: false, message: "AI service is offline." });
    });
  } catch {
    res.json({ success: false, message: "AI service is offline." });
  }
}

module.exports = { proxyToAI, aiHealthCheck };
