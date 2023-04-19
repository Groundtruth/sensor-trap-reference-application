import { z } from "zod";

const configSchema = z
  .object({
    PORT: z.string().regex(/^\d+$/),
    TRAP_API_URL: z.string(),
    DEVICE_FILE: z.string(),
  })
  .and(
    z.union([
      z.object({
        TRAP_API_AUTHORIZATION: z.string(),
      }),
      z.object({
        TRAP_API_CLIENT_ID: z.string(),
        TRAP_API_CLIENT_SECRET: z.string(),
        TRAP_API_USERNAME: z.string(),
        TRAP_API_PASSWORD: z.string(),
      }),
    ])
  );

const config = configSchema.parse(process.env);

export const port = config.PORT;
export const trapApiUrl = config.TRAP_API_URL;

export type TrapApiAuth =
  | {
      authorization: string;
    }
  | {
      clientId: string;
      clientSecret: string;
      username: string;
      password: string;
    };
export const trapApiAuth: TrapApiAuth =
  "TRAP_API_AUTHORIZATION" in config
    ? {
        authorization: config.TRAP_API_AUTHORIZATION,
      }
    : {
        clientId: config.TRAP_API_CLIENT_ID,
        clientSecret: config.TRAP_API_CLIENT_SECRET,
        username: config.TRAP_API_USERNAME,
        password: config.TRAP_API_PASSWORD,
      };
export const deviceFile = config.DEVICE_FILE;
