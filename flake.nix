{
  description = "flatten-tool - a CLI tool to flatten directory structures";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs =
    {
      self,
      nixpkgs,
      flake-utils,
    }:
    flake-utils.lib.eachDefaultSystem (
      system:
      let
        pkgs = nixpkgs.legacyPackages.${system};
      in
      {
        packages.flatten-tool = pkgs.stdenv.mkDerivation {
          pname = "flatten-tool";
          version = "1.0.0";
          src = ./.;
          nativeBuildInputs = [ pkgs.bun ];
          buildInputs = [ pkgs.makeWrapper ];
          installPhase = ''
            mkdir -p $out/bin
            cp index.ts $out/
            makeWrapper ${pkgs.bun}/bin/bun $out/bin/flatten-tool \
              --add-flags $out/index.ts
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
