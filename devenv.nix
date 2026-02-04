{ pkgs, ... }:

{
  # Enable packages (matches your current devShell)
  packages = [
    pkgs.bashInteractive
    pkgs.bun
    pkgs.biome
  ];

  # Optional: Enable TypeScript language support (since your project uses TS)
  languages.typescript.enable = true;

  # Optional: Add custom enterShell hook (e.g., for setup messages)
  enterShell = ''
    echo "Welcome to the flatten-tool dev environment!"
    echo "Bun version: $(bun --version)"
    echo "Biome version: $(biome --version)"
  '';

  # Optional: Define scripts (e.g., shortcuts for common commands)
  scripts = {
    test.exec = "bun test";
    lint.exec = "bun run lint";
    format.exec = "bun run format";
  };

  # Optional: If you want automatic processes (e.g., a watcher)
  # processes.watch.exec = "bun test --watch";
}
