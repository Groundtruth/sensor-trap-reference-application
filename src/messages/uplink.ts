import { z } from "zod";

/**
 * Schema for an uplink message
 *
 * Manually converted from https://www.thethingsindustries.com/docs/reference/data-formats/#uplink-messages
 */
export const uplinkSchema = z.object({
  /// Device IDs
  end_device_ids: z.object({
    /// Device ID (e.g. "dev1")
    device_id: z.string(),
    application_ids: z.object({
      /// Application ID (e.g. "app1")
      application_id: z.string(),
    }),
    /// DevEUI of the end device (e.g. "0004A30B001C0530")
    dev_eui: z.string(),
    /// JoinEUI of the end device (also known as AppEUI in LoRaWAN versions below 1.1) (e.g. "800000000000000C")
    join_eui: z.string(),
    /// Device address known by the Network Server (e.g. "00BCB929")
    dev_addr: z.string(),
  }),
  /// Correlation identifiers of the message (e.g. "as:up:01...")
  correlation_ids: z.string().array(),
  /// ISO 8601 UTC timestamp at which the message has been received by the Application Server
  received_at: z.string().datetime(),
  uplink_message: z.object({
    /// Join Server issued identifier for the session keys used by this uplink (e.g. "AXA50...")
    session_key_id: z.string(),
    /// Frame counter (e.g. 1)
    f_cnt: z.number().optional(),
    /// Frame port (e.g. 1)
    f_port: z.number().optional(),
    /// Frame payload (Base64) (e.g. "gkHe")
    frm_payload: z.string().optional(),
    /// Decoded payload object, decoded by the device payload formatter
    decoded_payload: z.any(),
    /// A list of metadata for each antenna of each gateway that received this message
    rx_metadata: z
      .object({
        gateway_ids: z.object({
          /// Gateway ID (e.g. "gtw1")
          gateway_id: z.string(),
          /// Gateway EUI (e.g. "9C5C8E00001A05C4")
          eui: z.string(),
        }),
        /// ISO 8601 UTC timestamp at which the uplink has been received by the gateway
        time: z.string().datetime(),
        /// Timestamp of the gateway concentrator when the message has been received (e.g. 2463457000)
        timestamp: z.number(),
        /// Received signal strength indicator (dBm) (e.g. -35)
        rssi: z.number(),
        /// Received signal strength indicator of the channel (dBm) (e.g. -35)
        channel_rssi: z.number(),
        /// Signal-to-noise ratio (dB) (e.g. 5.2)
        snr: z.number(),
        /// Uplink token injected by gateway, Gateway Server or fNS (e.g. "ChIKEA...")
        uplink_token: z.string(),
        /// Index of the gateway channel that received the message (e.g. 2)
        channel_index: z.number().optional(), // Sometimes this is undefined, I think when the channel index is actually zero
        /// Gateway location metadata (only for gateways with location set to public)
        location: z.object({
          /// Location latitude (e.g. 37.97155556731436)
          latitude: z.number(),
          /// Location longitude (e.g. 23.72678801175413)
          longitude: z.number(),
          /// Location altitude (e.g. 2)
          altitude: z.number().optional(),
          /// Location source. SOURCE_REGISTRY is the location from the Identity Server.
          source: z.string(),
        }),
        /// ISO 8601 UTC timestamp at which the message has been received by the gateway
        received_at: z.string(),
      })
      .array(),
    /// Settings for the transmission
    settings: z.object({
      /// Data rate settings
      data_rate: z.object({
        /// LoRa modulation settings
        lora: z.object({
          /// Bandwidth (Hz) (e.g. 125000)
          bandwidth: z.number(),
          /// Spreading factor (e.g. 7)
          spreading_factor: z.number(),
          /// LoRa coding rate (e.g. "4/6")
          coding_rate: z.string(),
        }),
      }),
      /// Frequency (Hz) (e.g. "868300000")
      frequency: z.string(),
      /// ISO 8601 UTC timestamp at which the uplink has been received by the gateway
      time: z.string().datetime(),
      /// Timestamp of the gateway concentrator when the message has been received (e.g. 2463457000)
      timestamp: z.number(),
    }),
    /// Time-on-air, calculated by the Network Server using payload size and transmission settings (e.g. "0.056576s")
    consumed_airtime: z.string(),
    /// End device location metadata
    locations: z
      .object({
        user: z.object({
          /// Location latitude (e.g. 37.97155556731436)
          latitude: z.number(),
          /// Location longitude (e.g. 23.72678801175413)
          longitude: z.number(),
          /// Location altitude (e.g. 10)
          altitude: z.number().optional(),
          /// Location source. SOURCE_REGISTRY is the location from the Identity Server.
          source: z.string(),
        }),
      })
      .optional(),
    /// End device version information
    version_ids: z
      .object({
        /// Device brand (e.g. "the-things-products")
        brand_id: z.string(),
        /// Device model (e.g. "the-things-uno")
        model_id: z.string(),
        /// Device hardware version (e.g. "1.0")
        hardware_version: z.string(),
        /// Device firmware version (e.g. "quickstart")
        firmware_version: z.string(),
        /// Supported band ID (e.g. "EU_863_870")
        band_id: z.string(),
      })
      .optional(),
    /// Network information
    network_ids: z.object({
      /// Network ID (e.g. "000013")
      net_id: z.string(),
      /// Tenant ID (e.g. "tenant1")
      tenant_id: z.string(),
      /// Cluster ID (e.g. "eu1")
      cluster_id: z.string(),
      /// Cluster ID (e.g. "eu1.cloud.thethings.network")
      cluster_address: z.string(),
    }),
  }),
  /// Signals if the message is coming from the Network Server or is simulated.
  simulated: z.boolean().optional(),
});

export type Uplink = z.infer<typeof uplinkSchema>;
