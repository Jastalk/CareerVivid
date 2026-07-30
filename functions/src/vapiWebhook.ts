import { onRequest } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";

interface VapiWebhookPayload {
  message?: {
    type?: string;
    [key: string]: any;
  };
  [key: string]: any;
}

export const vapiWebhook = onRequest(
  {
    region: "us-west1",
    invoker: "public",
    memory: "512MiB",
    timeoutSeconds: 15,
  },
  async (req, res) => {
    // 1. Only accept POST requests
    if (req.method !== "POST") {
      res.status(405).send("Method Not Allowed");
      return;
    }

    try {
      const payload = req.body as VapiWebhookPayload;
      const messageType = payload.message?.type;

      logger.info(`Received Vapi webhook event`, {
        messageType,
        payload,
      });

      // 2. Process events based on message.type
      switch (messageType) {
        case "status-update":
          logger.info("Processing status-update event", {
            status: payload.message?.status,
            callId: payload.message?.call?.id,
          });
          break;

        case "assistant-request":
          logger.info("Processing assistant-request event", {
            callId: payload.message?.call?.id,
          });
          break;

        case "end-of-call-report":
          logger.info("Processing end-of-call-report event", {
            callId: payload.message?.call?.id,
            duration: payload.message?.duration,
            recordingUrl: payload.message?.recordingUrl,
          });
          break;

        default:
          logger.info(`Unhandled Vapi message type: ${messageType}`, { payload });
          break;
      }

      // 3. Return 200 OK immediately after fast processing
      res.status(200).json({ status: "ok" });
    } catch (error: any) {
      logger.error("Error processing Vapi webhook", { error: error.message });
      // Always return 200 OK to prevent Vapi from retrying/timing out on errors
      res.status(200).json({ status: "error", message: error.message });
    }
  }
);
