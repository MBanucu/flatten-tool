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
        bunPackages = bun2nix.lib.${system}.mkBunPackageSet {
          pname = "flatten-tool";
          src = ./.;
        };
      in
      {
        packages.flatten-tool = pkgs.stdenv.mkDerivation {
          pname = "flatten-tool";
          version = "1.0.0";
          src = ./.;
          nativeBuildInputs = [ bunPackages.bun ];
          buildPhase = ''
            export HOME=$TMPDIR
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
