# Sensor Trap Reference Application

This repo demonstrates a simple server which receives messages from sensors on a LoRaWAN network and creates corresponding sensor records on Trap.NZ.

## TTN Webhook

The application listens for HTTP POST requests from an instance of [The Things Stack](https://github.com/TheThingsNetwork/lorawan-stack).
Further information about the webhook interface can be found in [The Things Network's documentation](https://www.thethingsindustries.com/docs/integrations/webhooks/).

## Trap.NZ API Client

The file `openapi.yaml` is a copy of the live API spec.
It is used to generate API client code using [oazapfts](https://github.com/oazapfts/oazapfts) in `src/api.ts`.

The API connection is controlled by environment variables;
* `TRAP_API_URL` specifies the base URL of the Trap.NZ API (e.g. https://api2.trap.nz/),
* `TRAP_API_CLIENT_ID` specifies the OAuth client ID for authenticating with the Trap.NZ API,
* `TRAP_API_CLIENT_SECRET` specifies the OAuth client secret for authenticating with the Trap.NZ API,
* `TRAP_API_USERNAME` specifies the username of the Trap.NZ sensor provider account,
* `TRAP_API_PASSWORD` specifies the password of the Trap.NZ sensor provider account, and
* `TRAP_API_AUTHORIZATION` specifies the contents of the `Authorization` header sent with requests (this overrides OAuth based authentication).

A sensor provider account is a regular Trap.NZ account which is enabled as a sensor provider with a particular provider name.
To get sensor provider permissions and request an OAuth client and secret, [contact us](https://www.trap.nz/contact).

## Device Configuration

Incoming messages are associated with a device configuration using their LoRaWAN DevEUI, which is unique per device.
The file specified in the environment variable `DEVICE_FILE` should contain a list of device configurations, consisting of the corresponding Trap.NZ sensor ID and the timeout value.
An incoming message is matched against the list of devices to determine the device configuration.
The file is reloaded for every message, so the configuration can be changed dynamically.

## Build

This project uses [Yarn](https://yarnpkg.com/) with Plug'n'Play dependencies, so you shouldn't need to download anything extra.
To build, run `yarn run build`.
This will produce a standalone file in `build/index.js`.

## Logging

Informative, warning, and error messages are logged to stdout as JSON encoded lines with the [pino](https://github.com/pinojs/pino) logging library.
All messages contain a "level" key.
Messages from a live deployment with a level >= 50 should cause an alert, as they relate to a failure in passing messages to Trap.NZ.
Messages from a live deployment with a level >= 40 should be monitored, as they might indicate issues with configuration.