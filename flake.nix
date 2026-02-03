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

        # Read and parse package.json
        pkgJson = builtins.fromJSON (builtins.readFile ./package.json);
      in
      {
        packages.flatten-tool = pkgs.stdenv.mkDerivation {
          pname = pkgJson.name or "flatten-tool"; # Fallback if no 'name' in package.json
          version = pkgJson.version or "0.0.0"; # Fallback if no 'version'
          src = ./.;
          nativeBuildInputs = [ pkgs.bun ];
          buildInputs = [ pkgs.makeWrapper ];
          installPhase = ''
            mkdir -p $out/bin
            cp index.ts package.json $out/
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
