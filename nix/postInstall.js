if (require('fs').existsSync('/etc/os-release') && require('fs').readFileSync('/etc/os-release', 'utf8').includes('ID=nixos')) {
    require('child_process').execSync('rm -rf node_modules/@biomejs', { stdio: 'inherit' });
}