import { z } from "zod";

export type EncodedUplink = {
  bytes: number[];
  fPort: number;
};

const events = ["Sprung", "Set", "Heartbeat"] as const;
export type Event = (typeof events)[number];

const statuses = ["Sprung", "Set"] as const;
export type Status = (typeof statuses)[number];

export const decodedUplinkDataSchema = z.object({
  event: z.enum(events),
  status: z.enum(statuses),
  battery: z.number(),
});

export type DecodedUplink =
  | {
      data: z.infer<typeof decodedUplinkDataSchema>;
      warnings?: string[];
      errors?: never;
    }
  | {
      warnings?: string[];
      errors: string[];
    };

export function decodeUplink(input: EncodedUplink): DecodedUplink {
  const [a, b] = input.bytes;
  if (a === undefined || b === undefined) {
    return {
      errors: ["Uplink message too short"],
    };
  }

  // The top two bits of the first byte are the event index
  const eventIndex = (a >> 6) & 0x03;
  const event = events[eventIndex];
  // The second top two bits of the first byte are the status index
  const statusIndex = (a >> 4) & 0x03;
  const status = statuses[statusIndex];

  if (event === undefined || status === undefined) {
    return {
      errors: [
        ...(event === undefined ? `Unknown event (index ${eventIndex})` : []),
        ...(status === undefined
          ? `Unknown status (index ${statusIndex})`
          : []),
      ],
    };
  }

  // The last four bits of the first byte are the top four bits of the battery value
  // The second byte is the low eight bits of the battery value
  const batteryUnscaled = ((a & 0x0f) << 8) + b;
  // The battery value is scaled by 1.1mV
  const battery = (batteryUnscaled * 1.1) / 1000;

  return {
    data: { event, status, battery },
  };
}
