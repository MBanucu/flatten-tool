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

        # Function to get package directory name from full name
        packageName =
          name:
          let
            parts = builtins.filter builtins.isString (builtins.split "@" name);
          in
          if builtins.length parts >= 3 && builtins.head parts == "" then
            "@" + builtins.elemAt parts 1 + "/" + builtins.elemAt parts 2
          else
            builtins.head parts;

        # Create node_modules as a separate derivation by unpacking packages
        nodeModules = pkgs.runCommand "flatten-tool-node-modules" { } ''
          mkdir -p $out/node_modules
          ${builtins.concatStringsSep "\n" (
            builtins.attrValues (
              builtins.mapAttrs (
                name: path:
                let
                  pkgDir = packageName name;
                in
                "mkdir -p $out/node_modules/${pkgDir}; tar -xzf ${path} -C $out/node_modules/${pkgDir} --strip-components=1"
              ) bunPkgs
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
            cp -r ${nodeModules}/node_modules node_modules
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
