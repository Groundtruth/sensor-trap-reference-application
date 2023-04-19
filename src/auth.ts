import type { Logger } from "pino";
import { requestAccessToken } from "./api";
import { trapApiAuth } from "./config";

let refreshToken: string | undefined = undefined;
let expiry: number | undefined = undefined;
let accessToken: string | undefined = undefined;

export async function getAuthHeaders(
  logger: Logger
): Promise<{ authorization: string }> {
  if ("authorization" in trapApiAuth) {
    return { authorization: trapApiAuth.authorization };
  }

  if (expiry !== undefined && Date.now() > expiry) {
    accessToken = undefined;
    expiry = undefined;
  }

  if (accessToken === undefined) {
    const response = await requestAccessToken(
      refreshToken !== undefined
        ? {
            grant_type: "refresh_token",
            refresh_token: refreshToken,
            client_id: trapApiAuth.clientId,
            client_secret: trapApiAuth.clientSecret,
          }
        : {
            grant_type: "password",
            username: trapApiAuth.username,
            password: trapApiAuth.password,
            client_id: trapApiAuth.clientId,
            client_secret: trapApiAuth.clientSecret,
          }
    );

    if (response.status !== 200) {
      logger.error("Failed to request access token");

      if (refreshToken !== undefined) {
        logger.info(
          "Attempting to request access token again, without refresh token"
        );
        refreshToken = undefined;
        return getAuthHeaders(logger);
      }
    } else {
      logger.info("Successfully requested access token");
      accessToken = response.data.access_token;
      refreshToken = response.data.refresh_token;
      expiry = Date.now() + Number(response.data.expires_in) * 1000;
    }
  }

  return {
    authorization: `Bearer ${accessToken}`,
  };
}
