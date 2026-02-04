if (
  require('node:fs').existsSync('/etc/os-release') &&
  require('node:fs').readFileSync('/etc/os-release', 'utf8').includes('ID=nixos')
) {
  require('node:child_process').execSync('rm -rf node_modules/@biomejs', { stdio: 'inherit' });
}
