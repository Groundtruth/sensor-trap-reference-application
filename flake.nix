{
  inputs.nixpkgs.url = "github:NixOS/nixpkgs/nixos-22.11";
  inputs.flake-utils.url = "github:numtide/flake-utils";

  outputs = {
    self,
    nixpkgs,
    flake-utils,
  }:
    flake-utils.lib.eachDefaultSystem (
      system: let
        pkgs = nixpkgs.legacyPackages.${system};
      in rec {
        devShell = pkgs.mkShell {
          PROXYCHAINS_SOCKS5_PORT = "1080";
          PROXYCHAINS_QUIET_MODE = "1";
          LD_PRELOAD = "${pkgs.proxychains}/lib/libproxychains4.so";
          nativeBuildInputs = [
            (pkgs.yarn.overrideAttrs (old: {
              buildInputs = [ pkgs.nodejs-18_x ];
            }))
            pkgs.nodejs-18_x
            pkgs.nodePackages.typescript-language-server
          ];
        };
      }
    );
}

