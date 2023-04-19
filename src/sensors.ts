import { z } from "zod";
import { promises as fs } from "node:fs";
import { deviceFile } from "./config";
import type { Logger } from "pino";

const deviceSchema = z.object({
  /** The DevEUI of the device */
  dev_eui: z.string(),
  /** The Trap.NZ sensor ID of the device */
  trapnz_id: z.string(),
  /** The timeout programmed on the device */
  timeout: z.number(),
});

/** Represents a sensor device */
type Device = z.infer<typeof deviceSchema>;

/** Find sensor information corresponding to a particular DevEUI
 *
 * This implementation looks in the file specified by `DEVICE_FILE`.
 * In a more sophisticated application server implementation, this function might
 * perform a lookup in a live database.
 */
export async function deviceFromDevEUI(
  dev_eui: string,
  logger: Logger
): Promise<Device | undefined> {
  const body = await fs.readFile(deviceFile, "utf-8");
  const json = JSON.parse(body);

  const parsedDevices = deviceSchema.array().safeParse(json);

  if (parsedDevices.success === false) {
    logger.info({ error: parsedDevices.error }, "Error parsing device file");
    return undefined;
  }

  return parsedDevices.data.find((device) => device.dev_eui === dev_eui);
}
