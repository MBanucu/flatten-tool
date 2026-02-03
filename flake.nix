{
  description = "flatten-tool - a CLI tool to flatten directory structures";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
    bun2nix.url = "github:nix-community/bun2nix";
  };

  outputs = { self, nixpkgs, flake-utils, bun2nix }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = nixpkgs.legacyPackages.${system};
        bunPkgs = import ./bun-packages.nix {
          inherit (pkgs) copyPathToStore fetchFromGitHub fetchgit fetchurl;
        };
      in {
        packages.flatten-tool = pkgs.stdenv.mkDerivation {
          pname = "flatten-tool";
          version = "1.0.0";
          src = ./.;
          nativeBuildInputs = [ pkgs.bun ];
          buildPhase = ''
            export HOME=$TMPDIR
            mkdir node_modules
            for pkg in ${builtins.concatStringsSep " " (builtins.attrNames bunPkgs)}; do
              ln -s ${bunPkgs.$pkg} node_modules/$pkg
            done
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
