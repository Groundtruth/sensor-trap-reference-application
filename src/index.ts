import http from "node:http";
import util from "node:util";
import { defaults, createSensorRecord } from "./api";
import { uplinkSchema } from "./messages/uplink";
import { pino } from "pino";
import { port, trapApiUrl } from "./config";
import { deviceFromDevEUI } from "./sensors";
import { wrapHandle, type Request } from "./util";
import { decodeUplink, decodedUplinkDataSchema } from "./message";
import { getAuthHeaders } from "./auth";

// Set the Trap.NZ API's connection information
defaults.baseUrl = trapApiUrl;

const globalLogger = pino();

async function handle({ body, logger }: Request, res: http.ServerResponse) {
  const parsedBody = uplinkSchema.safeParse(body);
  if (parsedBody.success) {
    const message = parsedBody.data;

    logger.info({ message }, "Received uplink message");

    if (message.uplink_message.f_port !== 1) {
      logger.info(
        { fPort: message.uplink_message.f_port },
        "Uplink message for unknown port, discarding"
      );
      res.statusCode = 200;
      res.end();
      return;
    }

    const strongestMetadata = message.uplink_message.rx_metadata.reduce(
      (acc, cur) => (cur.snr > acc.snr ? cur : acc)
    );

    const rawPayload = message.uplink_message.frm_payload;

    if (rawPayload === undefined) {
      logger.warn("Received uplink message with no payload");
      res.statusCode = 422;
      res.end();
      return;
    }

    const payloadBytes = [...Buffer.from(rawPayload, "base64").values()];

    const payload = decodeUplink({
      bytes: payloadBytes,
      fPort: message.uplink_message.f_port,
    });

    if (payload.errors !== undefined) {
      logger.error(
        { decodeErrors: payload.errors },
        "Failed to decode uplink message"
      );
      res.statusCode = 422;
      res.end();
      return;
    }

    logger.info({ locallyDecodedPayload: payload }, "Locally decoded payload");

    if (message.uplink_message.decoded_payload !== undefined) {
      logger.info(
        { providedDecodedPayload: message.uplink_message.decoded_payload },
        "A decoded payload was provided from the network server"
      );

      const parsedDecodedPayload = decodedUplinkDataSchema.safeParse(
        message.uplink_message.decoded_payload
      );
      if (parsedDecodedPayload.success === false) {
        logger.warn(
          { errors: parsedDecodedPayload.error },
          "The provided decoded payload does not match our schema"
        );
      } else if (
        parsedDecodedPayload.data.event !== payload.data.event ||
        parsedDecodedPayload.data.status !== payload.data.status ||
        parsedDecodedPayload.data.battery !== payload.data.battery
      ) {
        logger.warn(
          "The provided decoded payload does not match our locally decoded payload"
        );
      }
    }

    const device = await deviceFromDevEUI(
      message.end_device_ids.dev_eui,
      logger
    );

    if (device === undefined) {
      logger.warn({ devEUI: message.end_device_ids.dev_eui }, "Unknown DevEUI");
      res.statusCode = 404;
      res.end();
      return;
    }

    const response = await createSensorRecord(
      {
        sensor_id: device.trapnz_id,
        date: new Date().toISOString(),
        event: payload.data.event,
        status: payload.data.status,
        network: "TTN",
        gateway: strongestMetadata.gateway_ids.gateway_id,
        rssi: strongestMetadata.rssi,
        sequence: message.uplink_message.f_cnt,
        battery_voltage: payload.data.battery,
        snr: strongestMetadata.snr,
        timeout: device.timeout,
      } as const,
      {
        headers: await getAuthHeaders(logger),
      }
    );

    if (response.status !== 201) {
      logger.error({ response }, "Failed to create sensor record");
    } else {
      logger.info("Created sensor record");
    }
  } else {
    logger.info({ error: parsedBody.error }, "Failed to parse body");
  }

  res.statusCode = 204;
  res.end();
}

const app = http.createServer(wrapHandle(handle, globalLogger));

const server = app.listen(port);
globalLogger.info({ port, trapApiUrl }, "Listening...");

const close: NodeJS.SignalsListener = async (signal) => {
  globalLogger.info({ signal }, "Closing server due to signal...");
  await util.promisify(server.close).bind(server)();
  globalLogger.info("Server closed");
  process.exit(0);
};

process.once("SIGTERM", close);
process.once("SIGINT", close);
