{
  description = "flatten-tool - a CLI tool to flatten directory structures";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
    bun2nix.url = "github:nix-community/bun2nix";
  };

  outputs =
    {
      self,
      nixpkgs,
      flake-utils,
      bun2nix,
    }:
    flake-utils.lib.eachDefaultSystem (
      system:
      let
        pkgs = nixpkgs.legacyPackages.${system};
        bunPkgs = import ./bun-packages.nix {
          inherit (pkgs)
            copyPathToStore
            fetchFromGitHub
            fetchgit
            fetchurl
            ;
        };

        # Create node_modules as a separate derivation using Nix expressions
        nodeModules = pkgs.runCommand "flatten-tool-node-modules" { } ''
          mkdir -p $out/node_modules
          ${builtins.concatStringsSep "\n" (
            builtins.attrValues (
              builtins.mapAttrs (name: path: "ln -s ${path} $out/node_modules/${name}") bunPkgs
            )
          )}
        '';
      in
      {
        packages.flatten-tool = pkgs.stdenv.mkDerivation {
          pname = "flatten-tool";
          version = "1.0.0";
          src = ./.;
          nativeBuildInputs = [ pkgs.bun ];
          buildPhase = ''
            export HOME=$TMPDIR
            ln -s ${nodeModules}/node_modules node_modules
            bun build ./index.ts --compile --outfile flatten-tool
          '';
          installPhase = ''
            mkdir -p $out/bin
            cp flatten-tool $out/bin/
          '';
        };
        packages.default = self.packages.${system}.flatten-tool;
        apps.default = {
          type = "app";
          program = "${self.packages.${system}.flatten-tool}/bin/flatten-tool";
        };
      }
    );
}
