import { Signature } from "@hubspot/api-client";
import { config } from "./config.js";

const MAX_REQUEST_AGE_MS = 5 * 60 * 1000;

export function verifyHubSpotRequest(req, res, next) {
  const signature = req.header("X-HubSpot-Signature-v3");
  const timestamp = req.header("X-HubSpot-Request-Timestamp");

  if (!signature || !timestamp) {
    return res.status(401).json({ error: "Missing HubSpot signature headers." });
  }

  if (Number(timestamp) < Date.now() - MAX_REQUEST_AGE_MS) {
    return res.status(401).json({ error: "Request timestamp is too old." });
  }

  const isValid = Signature.isValid({
    signatureVersion: "v3",
    signature,
    method: req.method,
    clientSecret: config.hubspotClientSecret,
    requestBody: req.rawBody ?? "",
    url: `${config.publicBaseUrl}${req.originalUrl}`,
    timestamp
  });

  if (!isValid) {
    return res.status(401).json({ error: "Invalid HubSpot signature." });
  }

  next();
}
