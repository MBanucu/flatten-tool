{ pkgs, ... }:

{
  # Enable packages (matches your current devShell)
  packages = [
    pkgs.bashInteractive
    pkgs.biome
  ];
  languages.javascript.bun.enable = true;
  languages.javascript.bun.install.enable = true;

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
    unittest = {
      exec = "bun test $@"; # pass arguments (e.g. test --watch)
      description = "Run all tests with Bun";
    };

    lint = {
      exec = "biome lint .";
      description = "Run Biome lint";
    };

    format = {
      exec = "biome format --write .";
      description = "Format code with Biome";
    };

    check = {
      exec = "biome check --write .";
      description = "Format + lint in one go";
    };
  };

  # Optional: If you want automatic processes (e.g., a watcher)
  # processes.watch.exec = "bun test --watch";
}
